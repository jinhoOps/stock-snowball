from __future__ import annotations

import csv
import json
import math
import os
import shutil
import tempfile
import uuid
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from time import sleep as default_sleep
from typing import Any, Literal


SCHEMA_VERSION = 2
SOURCE_NAME = "Yahoo Finance via yfinance"


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


@dataclass(frozen=True)
class MarketRecord:
    date: str
    close: float
    dividend: float


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
        )

    def to_dict(self) -> dict[str, object]:
        return {
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
    AssetDefinition("NASDAQ100", "^NDX", "나스닥100", "USD", "nasdaq100.csv", "benchmark", "weekly"),
    AssetDefinition("SP500", "^GSPC", "S&P 500", "USD", "sp500.csv", "benchmark", "weekly"),
    AssetDefinition("KOSPI_INDEX", "^KS11", "코스피", "KRW", "kospi-index.csv", "benchmark", "weekly"),
)

ASSETS = HISTORICAL_ASSETS + MARKET_BENCHMARKS


def fetch_history(
    asset: AssetDefinition,
    client_factory: Callable[[str], Any],
    *,
    attempts: int = 3,
    sleep: Callable[[float], None] = default_sleep,
) -> Any:
    """Fetch one daily history frame, retrying temporary provider failures."""
    if attempts < 1:
        raise ValueError("attempts must be at least 1")

    ticker = client_factory(asset.ticker)
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return ticker.history(
                period="max",
                interval="1d",
                auto_adjust=False,
                actions=True,
                raise_errors=True,
            )
        except Exception as error:  # Provider exceptions are library-specific.
            last_error = error
            if attempt < attempts:
                sleep(float(attempt))

    raise MarketDataProviderError(
        f"Unable to fetch {asset.asset_id} ({asset.ticker}) after {attempts} attempts: {last_error}"
    ) from last_error


def normalize_history(asset_id: str, history: Any) -> list[MarketRecord]:
    """Create compact market records from a yfinance history frame."""
    required_columns = {"Close", "Dividends", "Stock Splits"}
    missing_columns = required_columns.difference(history.columns)
    if missing_columns:
        raise MarketDataValidationError(
            f"{asset_id} history is missing required columns: {', '.join(sorted(missing_columns))}"
        )

    records: list[MarketRecord] = []
    previous_date: str | None = None
    for index, row in history.iterrows():
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

        close = _finite_number(row["Close"])
        if close is None or close <= 0:
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

    if not records:
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
        "source": SOURCE_NAME,
        "generatedAt": generated_at
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "assets": {asset_id: entry.to_dict() for asset_id, entry in entries.items()},
    }


def write_manifest(
    path: Path,
    entries: dict[str, AssetManifestEntry],
) -> None:
    _atomic_write_json(path, build_manifest(entries))


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
    if manifest.get("source") != SOURCE_NAME:
        raise MarketDataValidationError("manifest source does not match")
    _validate_generated_at(manifest.get("generatedAt"))
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

    validation_date = as_of or datetime.now(timezone.utc).date()
    entries: dict[str, AssetManifestEntry] = {}
    for asset in ASSETS:
        records = _read_dataset(
            data_dir / asset.output_filename,
            asset,
            as_of=validation_date,
        )
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
) -> dict[str, AssetManifestEntry]:
    """Fetch, validate, and atomically install every refreshed static dataset."""
    factory = client_factory or _default_client_factory
    refresh_date = datetime.now(timezone.utc).date()
    data_dir.parent.mkdir(parents=True, exist_ok=True)
    staging_dir = Path(
        tempfile.mkdtemp(prefix=f".{data_dir.name}.staging-", dir=data_dir.parent)
    )
    try:
        entries: dict[str, AssetManifestEntry] = {}
        for asset in ASSETS:
            records = normalize_history(asset.asset_id, fetch_history(asset, factory))
            if asset.frequency == "weekly":
                records = completed_weekly_records(records, as_of=refresh_date)
            write_dataset(staging_dir / asset.output_filename, records)
            entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)
        write_manifest(staging_dir / "manifest.json", entries)
        validate_generated_data(staging_dir)
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


def _validate_generated_at(value: object) -> None:
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
