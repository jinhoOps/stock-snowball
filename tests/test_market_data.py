from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from tools.market_data import (
    ASSETS,
    AssetManifestEntry,
    MarketDataValidationError,
    MarketRecord,
    build_manifest,
    fetch_history,
    normalize_history,
    validate_generated_data,
    write_dataset,
)


class FakeTicker:
    def __init__(self, history: pd.DataFrame, failures: int = 0) -> None:
        self.history_frame = history
        self.failures = failures
        self.calls: list[dict[str, object]] = []

    def history(self, **kwargs: object) -> pd.DataFrame:
        self.calls.append(kwargs)
        if self.failures:
            self.failures -= 1
            raise RuntimeError("temporary provider failure")
        return self.history_frame


class MarketDataNormalizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.history = pd.DataFrame(
            {
                "Close": [99.0, 100.0, 100.0, None, 101.0],
                "Dividends": [1.0, 0.0, 0.0, 0.0, 0.0],
                "Stock Splits": [0.0, 0.0, 0.0, 0.0, 0.0],
            },
            index=pd.to_datetime(
                [
                    "2024-01-03",
                    "2024-01-02",
                    "2024-01-02",
                    "2024-01-04",
                    "2024-01-07",
                ]
            ),
        )

    def test_normalize_history_sorts_deduplicates_and_discards_invalid_rows(self) -> None:
        self.assertEqual(
            normalize_history("SPY", self.history),
            [
                MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
                MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
            ],
        )

    def test_normalize_history_requires_corporate_action_columns(self) -> None:
        with self.assertRaisesRegex(MarketDataValidationError, "Stock Splits"):
            normalize_history("SPY", self.history.drop(columns="Stock Splits"))

    def test_fetch_history_retries_and_uses_unadjusted_close_arguments(self) -> None:
        ticker = FakeTicker(self.history, failures=2)

        result = fetch_history(
            ASSETS[0],
            lambda _: ticker,
            attempts=3,
            sleep=lambda _: None,
        )

        self.assertIs(result, self.history)
        self.assertEqual(len(ticker.calls), 3)
        self.assertEqual(
            ticker.calls[-1],
            {
                "period": "max",
                "interval": "1d",
                "auto_adjust": False,
                "actions": True,
                "raise_errors": True,
            },
        )


class MarketDataArtifactValidationTests(unittest.TestCase):
    def _write_valid_data_dir(self, data_dir: Path) -> dict[str, AssetManifestEntry]:
        records = [
            MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
            MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
        ]
        entries: dict[str, AssetManifestEntry] = {}
        for asset in ASSETS:
            write_dataset(data_dir / asset.output_filename, records)
            entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)

        (data_dir / "manifest.json").write_text(
            json.dumps(build_manifest(entries, generated_at="2026-08-14T00:00:00Z")),
            encoding="utf-8",
        )
        return entries

    def test_write_dataset_uses_compact_expected_csv_format(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            csv_path = Path(temp_dir) / "spy.csv"
            write_dataset(
                csv_path,
                [
                    MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
                    MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
                ],
            )

            self.assertEqual(
                csv_path.read_text(encoding="utf-8"),
                "date,close,dividend\n2024-01-02,100,0\n2024-01-03,99,1\n",
            )

    def test_validate_generated_data_accepts_matching_csv_and_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            entries = self._write_valid_data_dir(data_dir)

            validated = validate_generated_data(data_dir)

            self.assertEqual(validated, entries)

    def test_validate_generated_data_rejects_unsorted_or_duplicate_dates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            (data_dir / "spy.csv").write_text(
                "date,close,dividend\n2024-01-03,99,1\n2024-01-02,100,0\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(MarketDataValidationError, "spy.csv"):
                validate_generated_data(data_dir)

    def test_validate_generated_data_rejects_manifest_coverage_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["assets"]["SPY"]["rowCount"] = 3
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(MarketDataValidationError, "rowCount"):
                validate_generated_data(data_dir)

    def test_check_cli_runs_as_the_documented_script_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)

            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/refresh_market_data.py",
                    "--check",
                    "--data-dir",
                    str(data_dir),
                ],
                cwd=Path(__file__).resolve().parents[1],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("SPY: 2024-01-02 to 2024-01-03 (2 rows)", result.stdout)
