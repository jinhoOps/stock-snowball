from __future__ import annotations

import csv
import json
import math
import os
import shutil
import tempfile
import uuid
import warnings
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from time import sleep as default_sleep
from typing import Any, Literal

import exchange_calendars


SCHEMA_VERSION = 4
STATIC_CALENDAR_VERSION = "4.13.2"
MAX_UNREVIEWED_DAILY_GAP_DAYS = 14


class MarketDataError(RuntimeError):
    """Base error for market-data generation failures."""


class MarketDataProviderError(MarketDataError):
    """Raised when an external provider does not return market history."""


class MarketDataValidationError(MarketDataError):
    """Raised when generated static data does not meet the data contract."""


@dataclass(frozen=True)
class AssetDefinition:
    asset_id: str
    ticker: str
    display_name: str
    currency: str
    output_filename: str
    kind: Literal["asset", "benchmark"]
    frequency: Literal["daily", "weekly"]
    exchange_calendar: Literal["XNYS", "XKRX"] | None = None


@dataclass(frozen=True)
class MarketRecord:
    date: str
    close: float
    dividend: float


@dataclass(frozen=True)
class ReviewedWeeklyCloseOverride:
    asset_id: str
    ticker: str
    date: str
    close: float
    source_url: str
    retrieved_at: str
    reason: str

    def to_dict(self) -> dict[str, object]:
        return {
            "assetId": self.asset_id,
            "ticker": self.ticker,
            "date": self.date,
            "close": self.close,
            "sourceUrl": self.source_url,
            "retrievedAt": self.retrieved_at,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ReviewedHistoricalDateRemoval:
    asset_id: str
    date: str
    source_url: str
    retrieved_at: str
    reason: str

    def to_dict(self) -> dict[str, object]:
        return {
            "assetId": self.asset_id,
            "date": self.date,
            "sourceUrl": self.source_url,
            "retrievedAt": self.retrieved_at,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ReviewedDailyGapAllowance:
    asset_id: str
    previous_date: str
    next_date: str
    source_url: str
    retrieved_at: str
    reason: str

    def to_dict(self) -> dict[str, object]:
        return {
            "assetId": self.asset_id,
            "previousDate": self.previous_date,
            "nextDate": self.next_date,
            "sourceUrl": self.source_url,
            "retrievedAt": self.retrieved_at,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ReviewedDailyBackfill:
    asset_id: str
    ticker: str
    records: tuple[MarketRecord, ...]
    source_url: str
    retrieved_at: str
    reason: str

    def to_dict(self) -> dict[str, object]:
        return {
            "assetId": self.asset_id,
            "ticker": self.ticker,
            "records": [
                {
                    "date": record.date,
                    "close": record.close,
                    "dividend": record.dividend,
                }
                for record in self.records
            ],
            "sourceUrl": self.source_url,
            "retrievedAt": self.retrieved_at,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class AssetManifestEntry:
    asset_id: str
    ticker: str
    display_name: str
    currency: str
    kind: Literal["asset", "benchmark"]
    frequency: Literal["daily", "weekly"]
    start_date: str
    end_date: str
    row_count: int
    calendar: Literal["XNYS", "XKRX"] | None = None
    expected_end_date: str | None = None

    @classmethod
    def from_records(
        cls,
        asset: AssetDefinition,
        records: list[MarketRecord],
    ) -> AssetManifestEntry:
        if not records:
            raise MarketDataValidationError(f"{asset.asset_id} has no records")
        return cls(
            asset_id=asset.asset_id,
            ticker=asset.ticker,
            display_name=asset.display_name,
            currency=asset.currency,
            kind=asset.kind,
            frequency=asset.frequency,
            start_date=records[0].date,
            end_date=records[-1].date,
            row_count=len(records),
            calendar=asset.exchange_calendar,
            expected_end_date=records[-1].date if asset.frequency == "weekly" else None,
        )

    def to_dict(self) -> dict[str, object]:
        result: dict[str, object] = {
            "assetId": self.asset_id,
            "ticker": self.ticker,
            "displayName": self.display_name,
            "currency": self.currency,
            "kind": self.kind,
            "frequency": self.frequency,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "rowCount": self.row_count,
        }
        if self.calendar is not None:
            result["calendar"] = self.calendar
        if self.expected_end_date is not None:
            result["expectedEndDate"] = self.expected_end_date
        return result


HISTORICAL_ASSETS = (
    AssetDefinition("QQQ", "QQQ", "Invesco QQQ", "USD", "qqq.csv", "asset", "daily"),
    AssetDefinition("QLD", "QLD", "ProShares Ultra QQQ", "USD", "qld.csv", "asset", "daily"),
    AssetDefinition("TQQQ", "TQQQ", "ProShares UltraPro QQQ", "USD", "tqqq.csv", "asset", "daily"),
    AssetDefinition("AMD", "AMD", "Advanced Micro Devices", "USD", "amd.csv", "asset", "daily"),
    AssetDefinition("AMDL", "AMDL", "GraniteShares 2x Long AMD Daily ETF", "USD", "amdl.csv", "asset", "daily"),
    AssetDefinition("TSLA", "TSLA", "Tesla", "USD", "tsla.csv", "asset", "daily"),
    AssetDefinition("TSLL", "TSLL", "Direxion Daily TSLA Bull 2X Shares", "USD", "tsll.csv", "asset", "daily"),
    AssetDefinition("SOXX", "SOXX", "iShares Semiconductor ETF", "USD", "soxx.csv", "asset", "daily"),
    AssetDefinition("SOXL", "SOXL", "Direxion Daily Semiconductor Bull 3X Shares", "USD", "soxl.csv", "asset", "daily"),
    AssetDefinition("SPY", "SPY", "SPDR S&P 500 ETF Trust", "USD", "spy.csv", "asset", "daily"),
    AssetDefinition("SCHD", "SCHD", "Schwab U.S. Dividend Equity ETF", "USD", "schd.csv", "asset", "daily"),
    AssetDefinition("KOSPI", "^KS200", "KOSPI 200", "KRW", "kospi.csv", "asset", "daily"),
    AssetDefinition("KOSDAQ", "^KQ11", "KOSDAQ", "KRW", "kosdaq.csv", "asset", "daily"),
    AssetDefinition("GOLD", "GC=F", "Gold Futures", "USD", "gold.csv", "asset", "daily"),
)

MARKET_BENCHMARKS = (
    AssetDefinition("NASDAQ100", "^NDX", "나스닥100", "USD", "nasdaq100.csv", "benchmark", "weekly", "XNYS"),
    AssetDefinition("SP500", "^GSPC", "S&P 500", "USD", "sp500.csv", "benchmark", "weekly", "XNYS"),
    AssetDefinition("KOSPI_INDEX", "^KS11", "코스피", "KRW", "kospi-index.csv", "benchmark", "weekly", "XKRX"),
)

ASSETS = HISTORICAL_ASSETS + MARKET_BENCHMARKS

REVIEWED_WEEKLY_CLOSE_OVERRIDES = (
    ReviewedWeeklyCloseOverride(
        "NASDAQ100", "^NDX", "2026-08-28", 29433.43,
        "https://finance.yahoo.com/quote/%5ENDX/history/", "2026-09-01T05:26:33Z",
        "yfinance daily history omitted this completed-week final trading-day close",
    ),
    ReviewedWeeklyCloseOverride(
        "SP500", "^GSPC", "2026-08-28", 7711.76,
        "https://finance.yahoo.com/quote/%5EGSPC/history/", "2026-09-01T05:26:33Z",
        "yfinance daily history omitted this completed-week final trading-day close",
    ),
    ReviewedWeeklyCloseOverride(
        "KOSPI_INDEX", "^KS11", "2026-08-28", 6788.88,
        "https://finance.yahoo.com/quote/%5EKS11/history/", "2026-09-01T05:26:33Z",
        "yfinance daily history omitted this completed-week final trading-day close",
    ),
)

REVIEWED_HISTORICAL_DATE_REMOVALS: tuple[ReviewedHistoricalDateRemoval, ...] = ()
REVIEWED_DAILY_GAP_ALLOWANCES: tuple[ReviewedDailyGapAllowance, ...] = ()
REVIEWED_DAILY_BACKFILLS = (
    ReviewedDailyBackfill(
        asset_id="KOSPI",
        ticker="^KS200",
        records=(
            MarketRecord("2026-07-20", 1032.52, 0),
            MarketRecord("2026-07-21", 1073.39, 0),
            MarketRecord("2026-07-22", 1080.22, 0),
            MarketRecord("2026-07-23", 1126.33, 0),
            MarketRecord("2026-07-24", 1055.58, 0),
            MarketRecord("2026-07-27", 1069.22, 0),
            MarketRecord("2026-07-28", 945.69, 0),
            MarketRecord("2026-07-29", 887.2, 0),
            MarketRecord("2026-07-30", 872.49, 0),
            MarketRecord("2026-07-31", 1046.81, 0),
            MarketRecord("2026-08-03", 986.72, 0),
            MarketRecord("2026-08-04", 1000.03, 0),
            MarketRecord("2026-08-05", 1038.59, 0),
            MarketRecord("2026-08-06", 982.92, 0),
            MarketRecord("2026-08-07", 974.73, 0),
            MarketRecord("2026-08-10", 977.84, 0),
            MarketRecord("2026-08-11", 987.4, 0),
            MarketRecord("2026-08-12", 1029.43, 0),
            MarketRecord("2026-08-13", 1071.24, 0),
            MarketRecord("2026-08-14", 1098.18, 0),
            MarketRecord("2026-08-18", 1082.0, 0),
            MarketRecord("2026-08-19", 1012.61, 0),
            MarketRecord("2026-08-20", 1080.98, 0),
            MarketRecord("2026-08-21", 1096.25, 0),
            MarketRecord("2026-08-24", 1054.01, 0),
            MarketRecord("2026-08-25", 1060.68, 0),
            MarketRecord("2026-08-26", 1071.16, 0),
            MarketRecord("2026-08-27", 1088.61, 0),
            MarketRecord("2026-08-28", 1065.7, 0),
            MarketRecord("2026-08-31", 1071.85, 0),
        ),
        source_url=(
            "https://fchart.stock.naver.com/sise.nhn?symbol=KPI200&timeframe=day"
            "&count=100&requestType=0"
        ),
        retrieved_at="2026-09-01T06:57:29Z",
        reason="Yahoo Finance ^KS200 history omitted valid KOSPI 200 trading dates",
    ),
)

SOURCE_PROVENANCE = {
    "provider": "Yahoo Finance",
    "client": "yfinance",
    "staticCalendar": {
        "provider": "exchange_calendars",
        "version": STATIC_CALENDAR_VERSION,
    },
    "reviewedWeeklyCloseOverrides": [
        override.to_dict() for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES
    ],
    "reviewedHistoricalDateRemovals": [
        removal.to_dict() for removal in REVIEWED_HISTORICAL_DATE_REMOVALS
    ],
    "reviewedDailyGapAllowances": [
        allowance.to_dict() for allowance in REVIEWED_DAILY_GAP_ALLOWANCES
    ],
    "reviewedDailyBackfills": [
        backfill.to_dict() for backfill in REVIEWED_DAILY_BACKFILLS
    ],
}


def fetch_history(
    asset: AssetDefinition,
    client_factory: Callable[[str], Any],
    *,
    start: date | None = None,
    end: date | None = None,
    attempts: int = 3,
    sleep: Callable[[float], None] = default_sleep,
) -> Any:
    """Fetch one daily history frame, retrying temporary provider failures."""
    if attempts < 1:
        raise ValueError("attempts must be at least 1")

    ticker = client_factory(asset.ticker)
    request: dict[str, object] = {
        "interval": "1d",
        "auto_adjust": False,
        "actions": True,
        "raise_errors": True,
    }
    if start is None:
        request["period"] = "max"
    else:
        request["start"] = start.isoformat()
        if end is not None:
            request["end"] = end.isoformat()
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return ticker.history(**request)
        except Exception as error:  # Provider exceptions are library-specific.
            last_error = error
            if attempt < attempts:
                sleep(float(attempt))

    raise MarketDataProviderError(
        f"Unable to fetch {asset.asset_id} ({asset.ticker}) after {attempts} attempts: {last_error}"
    ) from last_error


def normalize_history(
    asset_id: str,
    history: Any,
    *,
    previous_record: MarketRecord | None = None,
) -> list[MarketRecord]:
    """Create compact market records from a yfinance history frame."""
    required_columns = {"Close", "Dividends", "Stock Splits"}
    missing_columns = required_columns.difference(history.columns)
    if missing_columns:
        raise MarketDataValidationError(
            f"{asset_id} history is missing required columns: {', '.join(sorted(missing_columns))}"
        )

    records: list[MarketRecord] = []
    previous_date: str | None = None
    final_row_position = len(history.index) - 1
    for row_position, (index, row) in enumerate(history.iterrows()):
        try:
            record_date = _to_iso_date(index)
        except (TypeError, ValueError) as error:
            raise MarketDataValidationError(
                f"{asset_id} has an invalid provider date: {index!r}"
            ) from error
        if previous_date is not None and record_date <= previous_date:
            raise MarketDataValidationError(
                f"{asset_id} provider date {record_date} is not strictly increasing after {previous_date}"
            )
        previous_date = record_date
        if date.fromisoformat(record_date).weekday() >= 5:
            raise MarketDataValidationError(
                f"{asset_id} has a non-trading weekend date on {record_date}"
            )

        if previous_record is not None and record_date > previous_record.date:
            split = _finite_number(row["Stock Splits"])
            if split not in (0.0, 1.0):
                # Yahoo rebases historical closes and dividends after a split.
                # Appending the new share basis would corrupt historical returns.
                raise MarketDataValidationError(
                    f"{asset_id} split on {record_date} requires a full-history rebuild; "
                    "incremental refresh aborted to preserve the existing share basis"
                )

        close = _finite_number(row["Close"])
        if close is None or close <= 0:
            latest_valid_record = records[-1] if records else previous_record
            if row_position == final_row_position and latest_valid_record is not None:
                warnings.warn(
                    f"{asset_id} Yahoo: dropped invalid tail row {record_date} "
                    f"(Close={row['Close']!r}); latest valid close is {latest_valid_record.date}",
                    RuntimeWarning,
                    stacklevel=2,
                )
                continue
            raise MarketDataValidationError(
                f"{asset_id} close on {record_date} must be a finite positive number"
            )

        dividend = _finite_number(row["Dividends"])
        if dividend is None or dividend < 0:
            raise MarketDataValidationError(
                f"{asset_id} dividend on {record_date} must be a finite non-negative number"
            )

        records.append(MarketRecord(
            date=record_date,
            close=close,
            dividend=dividend,
        ))

    if not records and previous_record is None:
        raise MarketDataValidationError(f"{asset_id} has no trading-day records")
    return records


def completed_weekly_records(records: list[MarketRecord], as_of: date) -> list[MarketRecord]:
    """Keep the final trading-day close from each fully completed ISO week."""
    current_week_start = as_of - timedelta(days=as_of.weekday())
    completed: dict[tuple[int, int], MarketRecord] = {}
    for record in records:
        record_date = date.fromisoformat(record.date)
        week_start = record_date - timedelta(days=record_date.weekday())
        if week_start < current_week_start:
            iso = record_date.isocalendar()
            completed[(iso.year, iso.week)] = MarketRecord(record.date, record.close, 0.0)
    result = list(completed.values())
    if not result:
        raise MarketDataValidationError("benchmark has no completed weekly records")
    return result


def apply_reviewed_weekly_close_overrides(
    asset: AssetDefinition,
    records: list[MarketRecord],
) -> list[MarketRecord]:
    """Replace completed-week closes that reviewed Yahoo history showed yfinance omitted."""
    overrides = [
        override for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES
        if override.asset_id == asset.asset_id
    ]
    result = records
    for override in overrides:
        override_date = date.fromisoformat(override.date)
        override_week_start = override_date - timedelta(days=override_date.weekday())
        result = [
            record for record in result
            if date.fromisoformat(record.date)
            - timedelta(days=date.fromisoformat(record.date).weekday()) != override_week_start
        ]
        result.append(MarketRecord(override.date, override.close, 0.0))
    return sorted(result, key=lambda record: record.date)


def apply_reviewed_daily_backfills(
    asset: AssetDefinition,
    records: list[MarketRecord],
) -> list[MarketRecord]:
    """Replay reviewed daily rows that the primary provider omitted."""
    result = records
    for backfill in REVIEWED_DAILY_BACKFILLS:
        if backfill.asset_id != asset.asset_id:
            continue
        backfill_dates = {record.date for record in backfill.records}
        result = [record for record in result if record.date not in backfill_dates]
        result.extend(backfill.records)
    return sorted(result, key=lambda record: record.date)


def write_dataset(path: Path, records: Iterable[MarketRecord]) -> None:
    """Write a compact CSV through an atomic replacement."""
    rows = list(records)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        newline="",
        dir=path.parent,
        prefix=f".{path.name}.",
        delete=False,
    ) as temporary:
        writer = csv.writer(temporary, lineterminator="\n")
        writer.writerow(["date", "close", "dividend"])
        for record in rows:
            writer.writerow(
                [
                    record.date,
                    _format_number(record.close),
                    _format_number(record.dividend),
                ]
            )
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, path)


def build_manifest(
    entries: dict[str, AssetManifestEntry],
    *,
    generated_at: str | None = None,
) -> dict[str, object]:
    """Build the small provenance document committed beside the CSV files."""
    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": SOURCE_PROVENANCE,
        "generatedAt": generated_at
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "assets": {asset_id: entry.to_dict() for asset_id, entry in entries.items()},
    }


def write_manifest(
    path: Path,
    entries: dict[str, AssetManifestEntry],
    *,
    generated_at: str | None = None,
) -> None:
    _atomic_write_json(path, build_manifest(entries, generated_at=generated_at))


def validate_generated_data(
    data_dir: Path,
    *,
    as_of: date | None = None,
) -> dict[str, AssetManifestEntry]:
    """Validate all committed data files without consulting the provider."""
    manifest_path = data_dir / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise MarketDataValidationError(f"Missing {manifest_path}") from error
    except json.JSONDecodeError as error:
        raise MarketDataValidationError(f"Invalid JSON in {manifest_path}: {error}") from error

    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        raise MarketDataValidationError("manifest schemaVersion does not match")
    if manifest.get("source") != SOURCE_PROVENANCE:
        raise MarketDataValidationError(
            "manifest reviewed weekly close override provenance or other market-data provenance does not match"
        )
    generated_at = _validate_generated_at(manifest.get("generatedAt"))
    manifest_assets = manifest.get("assets")
    if not isinstance(manifest_assets, dict):
        raise MarketDataValidationError("manifest assets must be an object")

    expected_members = {asset.output_filename for asset in ASSETS} | {"manifest.json"}
    actual_members = {path.name for path in data_dir.iterdir()}
    if actual_members != expected_members:
        missing = sorted(expected_members - actual_members)
        unexpected = sorted(actual_members - expected_members)
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if unexpected:
            details.append(f"unexpected: {', '.join(unexpected)}")
        raise MarketDataValidationError(
            f"catalog directory must contain exactly the approved files ({'; '.join(details)})"
        )

    validation_date = as_of or generated_at.date()
    entries: dict[str, AssetManifestEntry] = {}
    for asset in ASSETS:
        records = _read_dataset(
            data_dir / asset.output_filename,
            asset,
            as_of=validation_date,
        )
        _validate_reviewed_daily_backfills(asset, records)
        _validate_reviewed_weekly_close_overrides(asset, records)
        if asset.frequency == "weekly":
            _validate_weekly_endpoint(asset, records, as_of=validation_date)
        expected_entry = AssetManifestEntry.from_records(asset, records)
        actual_entry = manifest_assets.get(asset.asset_id)
        if actual_entry != expected_entry.to_dict():
            _raise_manifest_difference(asset.asset_id, actual_entry, expected_entry.to_dict())
        entries[asset.asset_id] = expected_entry

    if set(manifest_assets) != set(entries):
        raise MarketDataValidationError("manifest asset IDs do not match the asset registry")
    return entries


def refresh_all(
    data_dir: Path,
    client_factory: Callable[[str], Any] | None = None,
    *,
    as_of: date | None = None,
) -> dict[str, AssetManifestEntry]:
    """Fetch, validate, and atomically install every refreshed static dataset."""
    factory = client_factory or _default_client_factory
    refresh_started_at = datetime.now(timezone.utc).replace(microsecond=0)
    refresh_date = as_of or refresh_started_at.date()
    generated_at = (
        f"{refresh_date.isoformat()}T00:00:00Z"
        if as_of is not None
        else refresh_started_at.isoformat().replace("+00:00", "Z")
    )
    data_dir.parent.mkdir(parents=True, exist_ok=True)
    incremental = data_dir.exists()
    if incremental:
        validate_generated_data(data_dir)
    staging_dir = Path(
        tempfile.mkdtemp(prefix=f".{data_dir.name}.staging-", dir=data_dir.parent)
    )
    try:
        entries: dict[str, AssetManifestEntry] = {}
        for asset in ASSETS:
            existing_records = (
                _read_dataset(data_dir / asset.output_filename, asset, as_of=refresh_date)
                if incremental
                else []
            )
            fetch_start = (
                date.fromisoformat(existing_records[-1].date) + timedelta(days=1)
                if existing_records
                else None
            )
            history = fetch_history(
                asset,
                factory,
                start=fetch_start,
                end=refresh_date + timedelta(days=1) if fetch_start is not None else None,
            )
            new_records = (
                []
                if existing_records and getattr(history, "empty", False)
                else normalize_history(
                    asset.asset_id,
                    history,
                    previous_record=existing_records[-1] if existing_records else None,
                )
            )
            records = existing_records + new_records
            records = apply_reviewed_daily_backfills(asset, records)
            if asset.frequency == "weekly":
                records = completed_weekly_records(records, as_of=refresh_date)
                records = apply_reviewed_weekly_close_overrides(asset, records)
            write_dataset(staging_dir / asset.output_filename, records)
            entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)
        write_manifest(
            staging_dir / "manifest.json",
            entries,
            generated_at=generated_at,
        )
        validate_generated_data(staging_dir)
        if data_dir.exists():
            validate_historical_date_preservation(data_dir, staging_dir)
        swap_catalog(staging_dir, data_dir)
        return entries
    finally:
        if staging_dir.exists():
            shutil.rmtree(staging_dir)


def swap_catalog(
    staging_dir: Path,
    data_dir: Path,
    replace: Callable[[Path, Path], None] = os.replace,
    validator: Callable[[Path], object] = validate_generated_data,
) -> None:
    """Install a validated catalog, restoring the previous catalog on any failure."""
    backup_dir = data_dir.parent / f".{data_dir.name}.backup-{uuid.uuid4().hex}"
    previous_catalog_exists = data_dir.exists()
    installed = False

    try:
        if previous_catalog_exists:
            replace(data_dir, backup_dir)
        replace(staging_dir, data_dir)
        installed = True
        validator(data_dir)
    except Exception as error:
        try:
            if installed and data_dir.exists():
                shutil.rmtree(data_dir)
            if backup_dir.exists():
                os.replace(backup_dir, data_dir)
        except Exception as restore_error:
            raise MarketDataError(
                f"Catalog install failed: {error}; rollback failed: {restore_error}"
            ) from error
        finally:
            if staging_dir.exists():
                shutil.rmtree(staging_dir)

        raise MarketDataError(f"Catalog install failed: {error}") from error
    else:
        if backup_dir.exists():
            shutil.rmtree(backup_dir)


def _default_client_factory(ticker: str) -> Any:
    import yfinance as yf

    return yf.Ticker(ticker)


def _read_dataset(path: Path, asset: AssetDefinition, *, as_of: date) -> list[MarketRecord]:
    try:
        with path.open(encoding="utf-8", newline="") as file:
            reader = csv.reader(file)
            header = next(reader, None)
            if header != ["date", "close", "dividend"]:
                raise MarketDataValidationError(f"{path.name} has an invalid header")

            records: list[MarketRecord] = []
            previous_date = ""
            previous_week_start: date | None = None
            for line_number, row in enumerate(reader, start=2):
                if len(row) != 3:
                    raise MarketDataValidationError(f"{path.name}:{line_number} must have three columns")
                record_date, close_text, dividend_text = row
                _validate_date(path.name, line_number, record_date)
                if record_date <= previous_date:
                    raise MarketDataValidationError(
                        f"{path.name}:{line_number} dates must be strictly increasing"
                    )
                if asset.frequency == "daily" and previous_date:
                    _validate_daily_gap(
                        asset,
                        path.name,
                        previous_date,
                        record_date,
                    )
                close = _parse_number(path.name, line_number, "close", close_text)
                dividend = _parse_number(path.name, line_number, "dividend", dividend_text)
                if close <= 0:
                    raise MarketDataValidationError(f"{path.name}:{line_number} close must be positive")
                if dividend < 0:
                    raise MarketDataValidationError(f"{path.name}:{line_number} dividend cannot be negative")
                if asset.frequency == "weekly" and dividend != 0:
                    raise MarketDataValidationError(
                        f"{path.name}:{line_number} benchmark dividend must be zero"
                    )
                if asset.frequency == "weekly":
                    parsed_date = date.fromisoformat(record_date)
                    week_start = parsed_date - timedelta(days=parsed_date.weekday())
                    if week_start == previous_week_start:
                        raise MarketDataValidationError(
                            f"{path.name}:{line_number} must contain one completed-week close per ISO week; "
                            f"{previous_date} is non-final because {record_date} is later in the same week"
                        )
                    previous_week_start = week_start
                records.append(MarketRecord(record_date, close, dividend))
                previous_date = record_date
    except FileNotFoundError as error:
        raise MarketDataValidationError(f"Missing {path}") from error

    if not records:
        raise MarketDataValidationError(f"{path.name} has no records")
    if asset.frequency == "weekly":
        current_week_start = as_of - timedelta(days=as_of.weekday())
        if date.fromisoformat(records[-1].date) >= current_week_start:
            raise MarketDataValidationError(
                f"{path.name} must not contain records from the current ISO week"
            )
    return records


def validate_historical_date_preservation(
    previous_data_dir: Path,
    candidate_data_dir: Path,
) -> None:
    """Reject a refresh that silently removes committed daily trading dates."""
    reviewed_removals = {
        (removal.asset_id, removal.date)
        for removal in REVIEWED_HISTORICAL_DATE_REMOVALS
    }
    for asset in HISTORICAL_ASSETS:
        previous_dates = _read_date_column(previous_data_dir / asset.output_filename)
        candidate_dates = _read_date_column(candidate_data_dir / asset.output_filename)
        missing_dates = sorted(
            record_date
            for record_date in previous_dates - candidate_dates
            if (asset.asset_id, record_date) not in reviewed_removals
        )
        if missing_dates:
            preview = ", ".join(missing_dates[:5])
            suffix = "..." if len(missing_dates) > 5 else ""
            raise MarketDataValidationError(
                f"{asset.asset_id} refresh would delete previously committed trading dates: "
                f"{preview}{suffix}"
            )


def _read_date_column(path: Path) -> set[str]:
    try:
        with path.open(encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            if reader.fieldnames != ["date", "close", "dividend"]:
                raise MarketDataValidationError(f"{path.name} has an invalid header")
            return {row["date"] for row in reader}
    except FileNotFoundError as error:
        raise MarketDataValidationError(f"Missing {path}") from error


def _validate_daily_gap(
    asset: AssetDefinition,
    filename: str,
    previous_date: str,
    next_date: str,
) -> None:
    gap_days = (date.fromisoformat(next_date) - date.fromisoformat(previous_date)).days
    if gap_days <= MAX_UNREVIEWED_DAILY_GAP_DAYS:
        return
    reviewed = any(
        allowance.asset_id == asset.asset_id
        and allowance.previous_date == previous_date
        and allowance.next_date == next_date
        for allowance in REVIEWED_DAILY_GAP_ALLOWANCES
    )
    if not reviewed:
        raise MarketDataValidationError(
            f"{filename} has an unreviewed daily data gap from {previous_date} to {next_date} "
            f"({gap_days} calendar days)"
        )


def _validate_weekly_endpoint(
    asset: AssetDefinition,
    records: list[MarketRecord],
    *,
    as_of: date,
) -> None:
    if asset.exchange_calendar is None:
        raise MarketDataValidationError(
            f"{asset.output_filename} weekly benchmark has no exchange calendar"
        )
    current_week_start = as_of - timedelta(days=as_of.weekday())
    calendar = exchange_calendars.get_calendar(
        asset.exchange_calendar,
        start=current_week_start - timedelta(days=14),
        end=current_week_start - timedelta(days=1),
    )
    expected_end_date = calendar.last_session.date().isoformat()
    actual_end_date = records[-1].date
    if actual_end_date != expected_end_date:
        raise MarketDataValidationError(
            f"{asset.output_filename} ends on {actual_end_date}; static calendar "
            f"{asset.exchange_calendar} expects {expected_end_date} as the final trading day "
            "of the latest completed week"
        )


def _validate_reviewed_weekly_close_overrides(
    asset: AssetDefinition,
    records: list[MarketRecord],
) -> None:
    for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES:
        if override.asset_id != asset.asset_id:
            continue
        matching_records = [record for record in records if record.date == override.date]
        if len(matching_records) != 1:
            raise MarketDataValidationError(
                f"reviewed weekly close override {asset.asset_id} is missing {override.date}"
            )
        record = matching_records[0]
        if record.close != override.close or record.dividend != 0:
            raise MarketDataValidationError(
                f"reviewed weekly close override {asset.asset_id} does not match {override.date}"
            )


def _validate_reviewed_daily_backfills(
    asset: AssetDefinition,
    records: list[MarketRecord],
) -> None:
    records_by_date = {record.date: record for record in records}
    for backfill in REVIEWED_DAILY_BACKFILLS:
        if backfill.asset_id != asset.asset_id:
            continue
        for expected in backfill.records:
            actual = records_by_date.get(expected.date)
            if actual is None:
                raise MarketDataValidationError(
                    f"reviewed daily backfill {asset.asset_id} is missing {expected.date}"
                )
            if actual != expected:
                raise MarketDataValidationError(
                    f"reviewed daily backfill {asset.asset_id} does not match {expected.date}"
                )


def _atomic_write_json(path: Path, content: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        delete=False,
    ) as temporary:
        json.dump(content, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, path)


def _to_iso_date(value: Any) -> str:
    if hasattr(value, "date"):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()
    return date.fromisoformat(str(value)).isoformat()


def _finite_number(value: Any) -> float | None:
    try:
        converted = float(value)
    except (TypeError, ValueError):
        return None
    return converted if math.isfinite(converted) else None


def _format_number(value: float) -> str:
    return format(value, ".12g")


def _parse_number(filename: str, line_number: int, field: str, value: str) -> float:
    parsed = _finite_number(value)
    if parsed is None:
        raise MarketDataValidationError(f"{filename}:{line_number} {field} must be finite")
    return parsed


def _validate_date(filename: str, line_number: int, value: str) -> None:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise MarketDataValidationError(f"{filename}:{line_number} has an invalid ISO date") from error
    if parsed.weekday() >= 5:
        raise MarketDataValidationError(f"{filename}:{line_number} must be a trading day")


def _validate_generated_at(value: object) -> datetime:
    if not isinstance(value, str):
        raise MarketDataValidationError("manifest generatedAt must be a timezone-aware UTC ISO-8601 timestamp")
    normalized = f"{value[:-1]}+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as error:
        raise MarketDataValidationError(
            "manifest generatedAt must be a timezone-aware UTC ISO-8601 timestamp"
        ) from error
    if parsed.tzinfo is None or parsed.utcoffset() != timedelta(0):
        raise MarketDataValidationError(
            "manifest generatedAt must be a timezone-aware UTC ISO-8601 timestamp"
        )
    return parsed


def _raise_manifest_difference(
    asset_id: str,
    actual: object,
    expected: dict[str, object],
) -> None:
    if not isinstance(actual, dict):
        raise MarketDataValidationError(f"manifest entry for {asset_id} is missing")
    for key, expected_value in expected.items():
        if actual.get(key) != expected_value:
            raise MarketDataValidationError(
                f"manifest {asset_id} {key} does not match generated data"
            )
    raise MarketDataValidationError(f"manifest entry for {asset_id} has unexpected data")
