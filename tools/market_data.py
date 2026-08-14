from __future__ import annotations

import csv
import json
import math
import os
import tempfile
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from time import sleep as default_sleep
from typing import Any


SCHEMA_VERSION = 1
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
            "startDate": self.start_date,
            "endDate": self.end_date,
            "rowCount": self.row_count,
        }


ASSETS = (
    AssetDefinition("QQQM", "QQQM", "QQQM", "USD", "qqqm.csv"),
    AssetDefinition("QLD", "QLD", "QLD", "USD", "qld.csv"),
    AssetDefinition("TQQQ", "TQQQ", "TQQQ", "USD", "tqqq.csv"),
    AssetDefinition("SPY", "SPY", "SPY", "USD", "spy.csv"),
    AssetDefinition("SCHD", "SCHD", "SCHD", "USD", "schd.csv"),
    AssetDefinition("KOSPI", "^KS200", "KOSPI 200", "KRW", "kospi.csv"),
    AssetDefinition("KOSDAQ", "^KQ11", "KOSDAQ", "KRW", "kosdaq.csv"),
    AssetDefinition("GOLD", "GC=F", "Gold Futures", "USD", "gold.csv"),
)


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

    by_date: dict[str, MarketRecord] = {}
    for index, row in history.iterrows():
        record_date = _to_iso_date(index)
        if date.fromisoformat(record_date).weekday() >= 5:
            continue

        close = _finite_number(row["Close"])
        if close is None or close <= 0:
            continue

        dividend = _finite_number(row["Dividends"])
        if dividend is None:
            dividend = 0.0
        if dividend < 0:
            raise MarketDataValidationError(f"{asset_id} has a negative dividend on {record_date}")

        by_date[record_date] = MarketRecord(
            date=record_date,
            close=close,
            dividend=dividend,
        )

    records = [by_date[record_date] for record_date in sorted(by_date)]
    if not records:
        raise MarketDataValidationError(f"{asset_id} has no valid trading-day records")
    return records


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


def validate_generated_data(data_dir: Path) -> dict[str, AssetManifestEntry]:
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
    manifest_assets = manifest.get("assets")
    if not isinstance(manifest_assets, dict):
        raise MarketDataValidationError("manifest assets must be an object")

    entries: dict[str, AssetManifestEntry] = {}
    for asset in ASSETS:
        records = _read_dataset(data_dir / asset.output_filename)
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
    """Fetch all assets before writing any refreshed static data."""
    factory = client_factory or _default_client_factory
    datasets: dict[str, list[MarketRecord]] = {}
    for asset in ASSETS:
        datasets[asset.asset_id] = normalize_history(asset.asset_id, fetch_history(asset, factory))

    entries: dict[str, AssetManifestEntry] = {}
    for asset in ASSETS:
        records = datasets[asset.asset_id]
        write_dataset(data_dir / asset.output_filename, records)
        entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)
    write_manifest(data_dir / "manifest.json", entries)
    return entries


def _default_client_factory(ticker: str) -> Any:
    import yfinance as yf

    return yf.Ticker(ticker)


def _read_dataset(path: Path) -> list[MarketRecord]:
    try:
        with path.open(encoding="utf-8", newline="") as file:
            reader = csv.reader(file)
            header = next(reader, None)
            if header != ["date", "close", "dividend"]:
                raise MarketDataValidationError(f"{path.name} has an invalid header")

            records: list[MarketRecord] = []
            previous_date = ""
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
                records.append(MarketRecord(record_date, close, dividend))
                previous_date = record_date
    except FileNotFoundError as error:
        raise MarketDataValidationError(f"Missing {path}") from error

    if not records:
        raise MarketDataValidationError(f"{path.name} has no records")
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
