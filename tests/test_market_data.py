from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from tools.market_data import (
    ASSETS,
    AssetManifestEntry,
    MarketDataError,
    MarketDataProviderError,
    MarketDataValidationError,
    MarketRecord,
    build_manifest,
    fetch_history,
    normalize_history,
    refresh_all,
    swap_catalog,
    validate_generated_data,
    write_dataset,
)


EXPECTED_ASSET_IDS = {
    "QQQ", "QLD", "TQQQ", "AMD", "AMDL", "TSLA", "TSLL",
    "SOXX", "SOXL", "SPY", "SCHD", "KOSPI", "KOSDAQ", "GOLD",
}


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
    def test_asset_registry_is_the_complete_approved_catalog(self) -> None:
        self.assertEqual({asset.asset_id for asset in ASSETS}, EXPECTED_ASSET_IDS)
        self.assertNotIn("QQQM", {asset.asset_id for asset in ASSETS})

    def test_swap_catalog_restores_backup_when_install_rename_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = root / "indices"
            staging = root / ".indices.staging"
            target.mkdir()
            staging.mkdir()
            (target / "old.txt").write_text("old", encoding="utf-8")
            (staging / "new.txt").write_text("new", encoding="utf-8")
            calls = 0

            def fail_second_replace(source: Path, destination: Path) -> None:
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("injected install failure")
                os.replace(source, destination)

            with self.assertRaisesRegex(MarketDataError, "install failure"):
                swap_catalog(staging, target, replace=fail_second_replace)

            self.assertEqual((target / "old.txt").read_text(encoding="utf-8"), "old")
            self.assertFalse((target / "new.txt").exists())

    def test_swap_catalog_restores_backup_when_post_install_validation_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            target = root / "indices"
            staging = root / ".indices.staging"
            target.mkdir()
            staging.mkdir()
            (target / "old.txt").write_text("old", encoding="utf-8")
            (staging / "new.txt").write_text("new", encoding="utf-8")

            def reject_installed_catalog(_: Path) -> object:
                raise MarketDataValidationError("post-swap validation failed")

            with self.assertRaisesRegex(MarketDataError, "post-swap validation failed"):
                swap_catalog(staging, target, validator=reject_installed_catalog)

            self.assertEqual((target / "old.txt").read_text(encoding="utf-8"), "old")

    def setUp(self) -> None:
        self.history = pd.DataFrame(
            {
                "Close": [100.0, 99.0],
                "Dividends": [0.0, 1.0],
                "Stock Splits": [0.0, 0.0],
            },
            index=pd.to_datetime(["2024-01-02", "2024-01-03"]),
        )

    def test_normalize_history_preserves_valid_strictly_increasing_rows(self) -> None:
        self.assertEqual(
            normalize_history("SPY", self.history),
            [
                MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
                MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
            ],
        )

    def test_normalize_history_rejects_duplicate_and_non_increasing_provider_dates(self) -> None:
        histories = {
            "duplicate": pd.concat([self.history.iloc[[0]], self.history.iloc[[0]], self.history.iloc[[1]]]),
            "non-increasing": self.history.iloc[::-1],
        }

        for description, history in histories.items():
            with self.subTest(description=description):
                with self.assertRaises(MarketDataValidationError) as caught:
                    normalize_history("SPY", history)
                message = str(caught.exception)
                self.assertIn("SPY", message)
                self.assertIn("strictly increasing", message)
                self.assertIn("2024-01", message)

    def test_normalize_history_rejects_invalid_or_non_positive_closes_with_diagnostics(self) -> None:
        for close in (None, 0, -1, float("nan"), float("inf"), "malformed"):
            with self.subTest(close=close):
                history = pd.DataFrame(
                    {
                        "Close": [100.0, close],
                        "Dividends": [0.0, 0.0],
                        "Stock Splits": [0.0, 0.0],
                    },
                    index=self.history.index,
                )
                with self.assertRaises(MarketDataValidationError) as caught:
                    normalize_history("SPY", history)
                message = str(caught.exception)
                self.assertIn("SPY", message)
                self.assertIn("close", message)
                self.assertIn("2024-01-03", message)

    def test_normalize_history_rejects_malformed_or_non_finite_dividends_with_diagnostics(self) -> None:
        for dividend in (None, -1, float("nan"), float("inf"), "malformed"):
            with self.subTest(dividend=dividend):
                history = pd.DataFrame(
                    {
                        "Close": [100.0, 99.0],
                        "Dividends": [0.0, dividend],
                        "Stock Splits": [0.0, 0.0],
                    },
                    index=self.history.index,
                )
                with self.assertRaises(MarketDataValidationError) as caught:
                    normalize_history("SPY", history)
                message = str(caught.exception)
                self.assertIn("SPY", message)
                self.assertIn("dividend", message)
                self.assertIn("2024-01-03", message)

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

    def test_validate_generated_data_rejects_an_extra_legacy_qqqm_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            (data_dir / "qqqm.csv").write_text(
                "date,close,dividend\n2024-01-02,100,0\n",
                encoding="utf-8",
            )
            (data_dir / "unknown.tmp").write_text("stale", encoding="utf-8")
            (data_dir / ".indices.staging-stale").mkdir()
            (data_dir / ".indices.backup-stale").mkdir()

            with self.assertRaises(MarketDataValidationError) as caught:
                validate_generated_data(data_dir)
            message = str(caught.exception)
            for unexpected in (
                "qqqm.csv",
                "unknown.tmp",
                ".indices.staging-stale",
                ".indices.backup-stale",
            ):
                self.assertIn(unexpected, message)

    def test_validate_generated_data_rejects_malformed_naive_or_non_utc_provenance(self) -> None:
        invalid_values = (
            "not-a-date",
            "2026-08-14T00:00:00",
            "2026-08-14T09:00:00+09:00",
        )
        for generated_at in invalid_values:
            with self.subTest(generated_at=generated_at), tempfile.TemporaryDirectory() as temp_dir:
                data_dir = Path(temp_dir)
                self._write_valid_data_dir(data_dir)
                manifest_path = data_dir / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["generatedAt"] = generated_at
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

                with self.assertRaisesRegex(MarketDataValidationError, "generatedAt"):
                    validate_generated_data(data_dir)

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

    def test_refresh_fetch_failure_keeps_published_catalog_byte_identical_and_cleans_staging(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "indices"
            self._write_valid_data_dir(data_dir)
            before = {
                path.relative_to(data_dir): path.read_bytes()
                for path in data_dir.rglob("*")
                if path.is_file()
            }
            calls = 0
            valid_history = pd.DataFrame(
                {
                    "Close": [100.0, 101.0],
                    "Dividends": [0.0, 0.0],
                    "Stock Splits": [0.0, 0.0],
                },
                index=pd.to_datetime(["2024-01-02", "2024-01-03"]),
            )

            def fail_during_second_fetch(_: str) -> FakeTicker:
                nonlocal calls
                calls += 1
                if calls == 2:
                    staging = list(root.glob(".indices.staging-*"))
                    self.assertEqual(len(staging), 1)
                    self.assertTrue((staging[0] / "qqq.csv").is_file())
                    raise MarketDataProviderError("injected second-asset fetch failure")
                return FakeTicker(valid_history)

            with self.assertRaisesRegex(MarketDataProviderError, "second-asset"):
                refresh_all(data_dir, fail_during_second_fetch)

            after = {
                path.relative_to(data_dir): path.read_bytes()
                for path in data_dir.rglob("*")
                if path.is_file()
            }
            self.assertEqual(after, before)
            self.assertEqual(list(root.glob(".indices.staging-*")), [])
            self.assertEqual(list(root.glob(".indices.backup-*")), [])

    def test_check_cli_runs_as_the_documented_script_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            data_dir = root / "indices"
            self._write_valid_data_dir(data_dir)
            provider_probe = root / "provider-probe"
            provider_probe.mkdir()
            provider_marker = root / "provider-imported"
            (provider_probe / "yfinance.py").write_text(
                "from pathlib import Path\n"
                f"Path({str(provider_marker)!r}).write_text('imported', encoding='utf-8')\n"
                "raise RuntimeError('check-only imported the provider')\n",
                encoding="utf-8",
            )
            environment = os.environ.copy()
            environment["PYTHONPATH"] = os.pathsep.join(
                [str(provider_probe), str(Path(__file__).resolve().parents[1])]
            )

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
                env=environment,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("SPY: 2024-01-02 to 2024-01-03 (2 rows)", result.stdout)
            self.assertFalse(provider_marker.exists(), "--check must not import or call yfinance")
