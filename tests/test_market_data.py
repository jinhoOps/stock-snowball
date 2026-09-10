from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from tools.market_data import (
    ASSETS,
    HISTORICAL_ASSETS,
    MARKET_BENCHMARKS,
    REVIEWED_DAILY_BACKFILLS,
    REVIEWED_WEEKLY_CLOSE_OVERRIDES,
    AssetManifestEntry,
    MarketDataError,
    MarketDataProviderError,
    MarketDataValidationError,
    MarketRecord,
    build_manifest,
    completed_weekly_records,
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

EXPECTED_BENCHMARKS = {
    "NASDAQ100": ("^NDX", "nasdaq100.csv"),
    "SP500": ("^GSPC", "sp500.csv"),
    "KOSPI_INDEX": ("^KS11", "kospi-index.csv"),
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
    def test_registry_separates_backtest_assets_from_market_benchmarks(self) -> None:
        self.assertEqual({asset.asset_id for asset in HISTORICAL_ASSETS}, EXPECTED_ASSET_IDS)
        self.assertEqual(
            {asset.asset_id: (asset.ticker, asset.output_filename) for asset in MARKET_BENCHMARKS},
            EXPECTED_BENCHMARKS,
        )
        self.assertTrue(
            all(asset.kind == "asset" and asset.frequency == "daily" for asset in HISTORICAL_ASSETS)
        )
        self.assertTrue(
            all(asset.kind == "benchmark" and asset.frequency == "weekly" for asset in MARKET_BENCHMARKS)
        )

    def test_completed_weekly_records_uses_last_trading_day_and_excludes_current_week(self) -> None:
        records = [
            MarketRecord("2026-08-24", 100, 0),
            MarketRecord("2026-08-28", 104, 0),
            MarketRecord("2026-08-31", 106, 0),
        ]
        self.assertEqual(
            completed_weekly_records(records, as_of=date(2026, 9, 1)),
            [MarketRecord("2026-08-28", 104, 0)],
        )

    def test_completed_weekly_records_accepts_holiday_shortened_completed_week(self) -> None:
        records = [MarketRecord("2026-08-24", 100, 0), MarketRecord("2026-08-27", 103, 0)]
        self.assertEqual(
            completed_weekly_records(records, as_of=date(2026, 8, 31)),
            [MarketRecord("2026-08-27", 103, 0)],
        )

    def test_refresh_all_applies_reviewed_weekly_close_overrides(self) -> None:
        history = pd.DataFrame(
            {
                "Close": [100.0, 101.0, 102.0],
                "Dividends": [0.0, 0.0, 0.0],
                "Stock Splits": [0.0, 0.0, 0.0],
            },
            index=pd.to_datetime(["2026-08-24", "2026-08-27", "2026-08-31"]),
        )
        expected = {
            "nasdaq100.csv": "2026-08-28,29433.43,0\n",
            "sp500.csv": "2026-08-28,7711.76,0\n",
            "kospi-index.csv": "2026-08-28,6788.88,0\n",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            refresh_all(
                data_dir,
                lambda _: FakeTicker(history),
                as_of=date(2026, 9, 1),
            )

            for filename, expected_row in expected.items():
                with self.subTest(filename=filename):
                    self.assertIn(expected_row, (data_dir / filename).read_text(encoding="utf-8"))

            manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["schemaVersion"], 4)
            self.assertEqual(manifest["source"]["provider"], "Yahoo Finance")
            self.assertEqual(manifest["source"]["client"], "yfinance")
            self.assertEqual(len(manifest["source"]["reviewedWeeklyCloseOverrides"]), 3)

    def test_refresh_all_explicit_as_of_is_stable_under_future_wall_clock(self) -> None:
        history = pd.DataFrame(
            {
                "Close": [100.0, 101.0, 102.0],
                "Dividends": [0.0, 0.0, 0.0],
                "Stock Splits": [0.0, 0.0, 0.0],
            },
            index=pd.to_datetime(["2026-08-24", "2026-08-27", "2026-08-31"]),
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            with patch("tools.market_data.datetime", wraps=datetime) as clock:
                clock.now.return_value = datetime(2030, 1, 1, 12, 34, tzinfo=timezone.utc)
                refresh_all(
                    data_dir,
                    lambda _: FakeTicker(history),
                    as_of=date(2026, 9, 1),
                )

            manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["generatedAt"], "2026-09-01T00:00:00Z")
            benchmark_end_dates = {
                entry["endDate"]
                for entry in manifest["assets"].values()
                if entry["kind"] == "benchmark"
            }
            self.assertEqual(benchmark_end_dates, {"2026-08-28"})
            validate_generated_data(data_dir)

    def test_refresh_all_replays_the_reviewed_kospi_daily_backfill(self) -> None:
        ordinary_history = pd.DataFrame(
            {
                "Close": [100.0, 101.0],
                "Dividends": [0.0, 0.0],
                "Stock Splits": [0.0, 0.0],
            },
            index=pd.to_datetime(["2026-08-31", "2026-09-01"]),
        )
        kospi_history_with_hole = pd.DataFrame(
            {
                "Close": [1080.35998535, 1075.3],
                "Dividends": [0.0, 0.0],
                "Stock Splits": [0.0, 0.0],
            },
            index=pd.to_datetime(["2026-07-16", "2026-09-01"]),
        )
        weekly_history = pd.DataFrame(
            {
                "Close": [100.0, 101.0],
                "Dividends": [0.0, 0.0],
                "Stock Splits": [0.0, 0.0],
            },
            index=pd.to_datetime(["2026-08-27", "2026-08-31"]),
        )
        benchmark_tickers = {asset.ticker for asset in MARKET_BENCHMARKS}

        def provider(ticker: str) -> FakeTicker:
            if ticker == "^KS200":
                return FakeTicker(kospi_history_with_hole)
            if ticker in benchmark_tickers:
                return FakeTicker(weekly_history)
            return FakeTicker(ordinary_history)

        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            try:
                refresh_all(data_dir, provider, as_of=date(2026, 9, 1))
            except MarketDataValidationError as error:
                self.fail(f"reviewed KOSPI backfill should close the provider hole: {error}")

            kospi_csv = (data_dir / "kospi.csv").read_text(encoding="utf-8")
            self.assertIn("2026-07-20,1032.52,0\n", kospi_csv)
            self.assertIn("2026-08-31,1071.85,0\n", kospi_csv)
            manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(
                manifest["source"]["reviewedDailyBackfills"][0]["sourceUrl"],
                "https://fchart.stock.naver.com/sise.nhn?symbol=KPI200&timeframe=day&count=100&requestType=0",
            )

    def test_asset_registry_is_the_complete_approved_catalog(self) -> None:
        self.assertEqual({asset.asset_id for asset in HISTORICAL_ASSETS}, EXPECTED_ASSET_IDS)
        self.assertNotIn("QQQM", {asset.asset_id for asset in HISTORICAL_ASSETS})

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

    def test_full_history_keeps_provider_split_adjusted_prices(self) -> None:
        history = pd.DataFrame(
            {
                "Close": [50.0, 50.0],
                "Dividends": [0.5, 0.0],
                "Stock Splits": [0.0, 2.0],
            },
            index=pd.to_datetime(["2026-09-01", "2026-09-02"]),
        )
        self.assertEqual(normalize_history("QQQ", history), [
            MarketRecord("2026-09-01", 50.0, 0.5),
            MarketRecord("2026-09-02", 50.0, 0.0),
        ])

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
                        "Close": [100.0, close, 98.0],
                        "Dividends": [0.0, 0.0, 0.0],
                        "Stock Splits": [0.0, 0.0, 0.0],
                    },
                    index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04"]),
                )
                with self.assertRaises(MarketDataValidationError) as caught:
                    normalize_history("SPY", history)
                message = str(caught.exception)
                self.assertIn("SPY", message)
                self.assertIn("close", message)
                self.assertIn("2024-01-03", message)

    def test_normalize_history_drops_invalid_trailing_close_with_warning(self) -> None:
        history = pd.DataFrame(
            {
                "Close": [100.0, 99.0, float("nan")],
                "Dividends": [0.0, 1.0, 0.0],
                "Stock Splits": [0.0, 0.0, 0.0],
            },
            index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04"]),
        )

        with self.assertWarnsRegex(
            RuntimeWarning,
            r"SPY Yahoo: dropped invalid tail row 2024-01-04 .* latest valid close is 2024-01-03",
        ):
            records = normalize_history("SPY", history)

        self.assertEqual(
            records,
            [
                MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
                MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
            ],
        )

    def test_normalize_history_uses_existing_endpoint_when_only_increment_is_invalid(self) -> None:
        history = pd.DataFrame(
            {
                "Close": [float("nan")],
                "Dividends": [0.0],
                "Stock Splits": [0.0],
            },
            index=pd.to_datetime(["2024-01-04"]),
        )

        with self.assertWarnsRegex(RuntimeWarning, r"latest valid close is 2024-01-03"):
            records = normalize_history(
                "SPY",
                history,
                previous_record=MarketRecord("2024-01-03", 99.0, 1.0),
            )

        self.assertEqual(records, [])

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

    def test_fetch_history_requests_only_dates_after_the_existing_endpoint(self) -> None:
        ticker = FakeTicker(self.history)

        fetch_history(
            ASSETS[0],
            lambda _: ticker,
            start=date(2024, 1, 4),
            end=date(2024, 1, 6),
        )

        self.assertEqual(
            ticker.calls[-1],
            {
                "start": "2024-01-04",
                "end": "2024-01-06",
                "interval": "1d",
                "auto_adjust": False,
                "actions": True,
                "raise_errors": True,
            },
        )


class MarketDataArtifactValidationTests(unittest.TestCase):
    def _write_valid_data_dir(self, data_dir: Path) -> dict[str, AssetManifestEntry]:
        daily_records = [
            MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
            MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
        ]
        weekly_records = [
            MarketRecord(date="2026-08-21", close=100.0, dividend=0.0),
        ]
        overrides = {override.asset_id: override for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES}
        daily_backfills = {
            backfill.asset_id: list(backfill.records)
            for backfill in REVIEWED_DAILY_BACKFILLS
        }
        entries: dict[str, AssetManifestEntry] = {}
        for asset in ASSETS:
            records = daily_backfills.get(asset.asset_id, daily_records)
            if asset.frequency == "weekly":
                override = overrides[asset.asset_id]
                records = weekly_records + [
                    MarketRecord(override.date, override.close, 0.0),
                ]
            write_dataset(data_dir / asset.output_filename, records)
            entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)

        (data_dir / "manifest.json").write_text(
            json.dumps(build_manifest(entries, generated_at="2026-09-01T00:00:00Z")),
            encoding="utf-8",
        )
        return entries

    def _write_incremental_data_dir(self, data_dir: Path) -> dict[str, AssetManifestEntry]:
        overrides = {override.asset_id: override for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES}
        entries: dict[str, AssetManifestEntry] = {}
        for asset in ASSETS:
            if asset.frequency == "weekly":
                override = overrides[asset.asset_id]
                records = [MarketRecord(override.date, override.close, 0.0)]
            elif asset.asset_id == "KOSPI":
                records = list(REVIEWED_DAILY_BACKFILLS[0].records) + [
                    MarketRecord("2026-09-01", 1075.3, 0.0),
                ]
            else:
                records = [MarketRecord("2026-09-01", 100.0, 0.0)]
            write_dataset(data_dir / asset.output_filename, records)
            entries[asset.asset_id] = AssetManifestEntry.from_records(asset, records)

        (data_dir / "manifest.json").write_text(
            json.dumps(build_manifest(entries, generated_at="2026-09-01T00:00:00Z")),
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

            validated = validate_generated_data(data_dir, as_of=date(2026, 9, 1))

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
                validate_generated_data(data_dir, as_of=date(2024, 1, 15))
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
                    validate_generated_data(data_dir, as_of=date(2024, 1, 15))

    def test_validate_generated_data_rejects_unsorted_or_duplicate_dates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            (data_dir / "spy.csv").write_text(
                "date,close,dividend\n2024-01-03,99,1\n2024-01-02,100,0\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(MarketDataValidationError, "spy.csv"):
                validate_generated_data(data_dir, as_of=date(2024, 1, 15))

    def test_validate_generated_data_rejects_manifest_coverage_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["assets"]["SPY"]["rowCount"] = 3
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(MarketDataValidationError, "rowCount"):
                validate_generated_data(data_dir, as_of=date(2024, 1, 15))

    def test_validate_generated_data_rejects_an_unreviewed_long_daily_data_hole(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            records = [
                MarketRecord("2024-01-02", 100, 0),
                MarketRecord("2024-02-01", 101, 0),
            ]
            asset = next(asset for asset in HISTORICAL_ASSETS if asset.asset_id == "KOSPI")
            write_dataset(data_dir / asset.output_filename, records)
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["assets"][asset.asset_id] = AssetManifestEntry.from_records(
                asset,
                records,
            ).to_dict()
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(
                MarketDataValidationError,
                r"kospi\.csv.*unreviewed daily data gap",
            ):
                validate_generated_data(data_dir, as_of=date(2026, 9, 1))

    def test_validate_generated_data_rejects_missing_reviewed_override_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["source"] = "Yahoo Finance via yfinance"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(MarketDataValidationError, "reviewed weekly close override provenance"):
                validate_generated_data(data_dir, as_of=date(2024, 1, 15))

    def test_validate_generated_data_rejects_a_mismatched_reviewed_override_value(self) -> None:
        source_data_dir = Path(__file__).resolve().parents[1] / "src" / "data" / "indices"
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            shutil.copytree(source_data_dir, data_dir)
            benchmark_path = data_dir / "nasdaq100.csv"
            benchmark_path.write_text(
                benchmark_path.read_text(encoding="utf-8").replace(
                    "2026-08-28,29433.43,0\n",
                    "2026-08-28,29433.44,0\n",
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(MarketDataValidationError, "reviewed weekly close override NASDAQ100"):
                generated_at = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))["generatedAt"]
                validate_generated_data(data_dir, as_of=date.fromisoformat(generated_at[:10]))

    def test_validate_generated_data_rejects_a_missing_reviewed_override_value(self) -> None:
        source_data_dir = Path(__file__).resolve().parents[1] / "src" / "data" / "indices"
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            shutil.copytree(source_data_dir, data_dir)
            benchmark_path = data_dir / "nasdaq100.csv"
            benchmark_path.write_text(
                benchmark_path.read_text(encoding="utf-8").replace(
                    "2026-08-28,29433.43,0\n",
                    "",
                ),
                encoding="utf-8",
            )
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["assets"]["NASDAQ100"]["endDate"] = "2026-08-21"
            manifest["assets"]["NASDAQ100"]["rowCount"] -= 1
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(MarketDataValidationError, "reviewed weekly close override NASDAQ100"):
                validate_generated_data(data_dir, as_of=date.fromisoformat(manifest["generatedAt"][:10]))

    def test_validate_generated_data_rejects_a_missing_reviewed_daily_backfill_value(self) -> None:
        source_data_dir = Path(__file__).resolve().parents[1] / "src" / "data" / "indices"
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            shutil.copytree(source_data_dir, data_dir)
            kospi_path = data_dir / "kospi.csv"
            kospi_path.write_text(
                kospi_path.read_text(encoding="utf-8").replace(
                    "2026-08-14,1098.18,0\n",
                    "",
                ),
                encoding="utf-8",
            )
            manifest_path = data_dir / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["assets"]["KOSPI"]["rowCount"] -= 1
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            with self.assertRaisesRegex(
                MarketDataValidationError,
                "reviewed daily backfill KOSPI is missing 2026-08-14",
            ):
                validate_generated_data(data_dir, as_of=date(2026, 9, 1))

    def test_validate_generated_data_rejects_benchmark_specific_csv_corruption(self) -> None:
        bad_cases = {
            "nonzero dividend": "date,close,dividend\n2026-08-21,100,1\n",
            "weekend date": "date,close,dividend\n2026-08-22,100,0\n",
        }
        for description, content in bad_cases.items():
            with self.subTest(description=description), tempfile.TemporaryDirectory() as temp_dir:
                data_dir = Path(temp_dir)
                self._write_valid_data_dir(data_dir)
                benchmark_path = data_dir / "nasdaq100.csv"
                benchmark_path.write_text(content, encoding="utf-8")

                with self.assertRaisesRegex(MarketDataValidationError, "nasdaq100.csv"):
                    validate_generated_data(data_dir, as_of=date(2026, 8, 24))

    def test_validate_generated_data_rejects_multiple_completed_week_rows_for_a_benchmark(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            records = [
                MarketRecord("2026-08-24", 100, 0),
                MarketRecord("2026-08-25", 101, 0),
            ]
            (data_dir / "nasdaq100.csv").write_text(
                "date,close,dividend\n2026-08-24,100,0\n2026-08-25,101,0\n",
                encoding="utf-8",
            )
            self._replace_benchmark_manifest_entry(data_dir, records)

            with self.assertRaisesRegex(MarketDataValidationError, "one completed-week close"):
                validate_generated_data(data_dir, as_of=date(2026, 8, 31))

    def test_validate_generated_data_rejects_non_final_benchmark_weekday_when_a_later_day_exists(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            records = [
                MarketRecord("2026-08-27", 100, 0),
                MarketRecord("2026-08-28", 101, 0),
            ]
            (data_dir / "nasdaq100.csv").write_text(
                "date,close,dividend\n2026-08-27,100,0\n2026-08-28,101,0\n",
                encoding="utf-8",
            )
            self._replace_benchmark_manifest_entry(data_dir, records)

            with self.assertRaisesRegex(MarketDataValidationError, "non-final"):
                validate_generated_data(data_dir, as_of=date(2026, 8, 31))

    def test_validate_generated_data_rejects_isolated_thursday_when_friday_was_a_session(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            self._replace_all_benchmark_endpoints(data_dir, "2026-09-03")

            with self.assertRaisesRegex(
                MarketDataValidationError,
                r"nasdaq100\.csv.*2026-09-04.*final trading day",
            ):
                validate_generated_data(data_dir, as_of=date(2026, 9, 7))

    def test_validate_generated_data_accepts_thursday_when_friday_was_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            expected = self._write_valid_data_dir(data_dir)
            expected.update(self._replace_all_benchmark_endpoints(data_dir, "2026-12-24"))

            self.assertEqual(
                validate_generated_data(data_dir, as_of=date(2026, 12, 28)),
                expected,
            )

    def test_committed_benchmark_catalog_contains_the_august_28_final_trading_day(self) -> None:
        data_dir = Path(__file__).resolve().parents[1] / "src" / "data" / "indices"
        for filename in ("nasdaq100.csv", "sp500.csv", "kospi-index.csv"):
            with self.subTest(filename=filename):
                dates = {line.split(",", 1)[0] for line in (data_dir / filename).read_text().splitlines()[1:]}
                self.assertTrue(
                    "2026-08-28" in dates,
                    f"{filename} is missing the 2026-08-28 final trading-day close",
                )

    @staticmethod
    def _replace_benchmark_manifest_entry(data_dir: Path, records: list[MarketRecord]) -> None:
        manifest_path = data_dir / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        benchmark = next(asset for asset in MARKET_BENCHMARKS if asset.asset_id == "NASDAQ100")
        manifest["assets"][benchmark.asset_id] = AssetManifestEntry.from_records(
            benchmark,
            records,
        ).to_dict()
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    @staticmethod
    def _replace_all_benchmark_endpoints(
        data_dir: Path,
        endpoint: str,
    ) -> dict[str, AssetManifestEntry]:
        manifest_path = data_dir / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        overrides = {override.asset_id: override for override in REVIEWED_WEEKLY_CLOSE_OVERRIDES}
        entries: dict[str, AssetManifestEntry] = {}
        for asset in MARKET_BENCHMARKS:
            override = overrides[asset.asset_id]
            records = [
                MarketRecord(override.date, override.close, 0),
                MarketRecord(endpoint, 100, 0),
            ]
            write_dataset(data_dir / asset.output_filename, records)
            entry = AssetManifestEntry.from_records(asset, records)
            manifest["assets"][asset.asset_id] = entry.to_dict()
            entries[asset.asset_id] = entry
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return entries

    def test_validate_generated_data_rejects_current_week_benchmark_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            self._write_valid_data_dir(data_dir)
            benchmark_path = data_dir / "nasdaq100.csv"
            benchmark_path.write_text(
                "date,close,dividend\n2026-08-28,29433.43,0\n2026-08-31,101,0\n",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(MarketDataValidationError, "nasdaq100.csv"):
                validate_generated_data(data_dir, as_of=date(2026, 9, 1))

    def test_validate_generated_data_rejects_schema_v1_and_wrong_manifest_series_metadata(self) -> None:
        mutations = {
            "schema version 1": ("schemaVersion", 1),
            "asset kind": ("kind", "asset"),
            "daily frequency": ("frequency", "daily"),
        }
        for description, (field, value) in mutations.items():
            with self.subTest(description=description), tempfile.TemporaryDirectory() as temp_dir:
                data_dir = Path(temp_dir)
                self._write_valid_data_dir(data_dir)
                manifest_path = data_dir / "manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                if field == "schemaVersion":
                    manifest[field] = value
                else:
                    manifest["assets"]["NASDAQ100"][field] = value
                manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

                with self.assertRaises(MarketDataValidationError) as caught:
                    validate_generated_data(data_dir, as_of=date(2026, 9, 1))
                self.assertIn("NASDAQ100" if field != "schemaVersion" else "schemaVersion", str(caught.exception))

    def test_validate_generated_data_rejects_extra_or_missing_benchmark_files(self) -> None:
        mutations = {
            "extra": lambda path: (path / "unexpected-benchmark.csv").write_text(
                "stale", encoding="utf-8"
            ),
            "missing": lambda path: (path / "sp500.csv").unlink(),
        }
        for description, mutate in mutations.items():
            with self.subTest(description=description), tempfile.TemporaryDirectory() as temp_dir:
                data_dir = Path(temp_dir)
                self._write_valid_data_dir(data_dir)
                mutate(data_dir)

                with self.assertRaises(MarketDataValidationError) as caught:
                    validate_generated_data(data_dir, as_of=date(2024, 1, 15))
                self.assertIn(
                    "unexpected-benchmark.csv" if description == "extra" else "sp500.csv",
                    str(caught.exception),
                )

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
                    "Close": [101.0],
                    "Dividends": [0.0],
                    "Stock Splits": [0.0],
                },
                index=pd.to_datetime(["2024-01-04"]),
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

    def test_refresh_continues_after_invalid_qqq_tail_close(self) -> None:
        valid_history = pd.DataFrame(
            {
                "Close": [100.0, 101.0, 102.0],
                "Dividends": [0.0, 0.0, 0.0],
                "Stock Splits": [0.0, 0.0, 0.0],
            },
            index=pd.to_datetime(["2026-08-28", "2026-09-02", "2026-09-03"]),
        )
        invalid_qqq_history = valid_history.copy()
        invalid_qqq_history.loc[pd.Timestamp("2026-09-03"), "Close"] = float("nan")
        requested_tickers: list[str] = []

        def provider(ticker: str) -> FakeTicker:
            requested_tickers.append(ticker)
            return FakeTicker(invalid_qqq_history if ticker == "QQQ" else valid_history)

        with tempfile.TemporaryDirectory() as temp_dir:
            with self.assertWarnsRegex(RuntimeWarning, r"QQQ Yahoo: dropped invalid tail row"):
                entries = refresh_all(
                    Path(temp_dir) / "indices",
                    provider,
                    as_of=date(2026, 9, 4),
                )

        self.assertEqual(requested_tickers, [asset.ticker for asset in ASSETS])
        self.assertEqual(entries["QQQ"].end_date, "2026-09-02")
        self.assertEqual(entries["QLD"].end_date, "2026-09-03")

    def test_incremental_refresh_rejects_splits_without_changing_the_catalog(self) -> None:
        for split, close in ((2.0, 50.0), (0.2, 500.0)):
            with self.subTest(split=split), tempfile.TemporaryDirectory() as temp_dir:
                root = Path(temp_dir)
                data_dir = root / "indices"
                self._write_incremental_data_dir(data_dir)
                before = {path.name: path.read_bytes() for path in data_dir.iterdir()}
                history = pd.DataFrame(
                    {
                        "Close": [close],
                        "Dividends": [0.0],
                        "Stock Splits": [split],
                    },
                    index=pd.to_datetime(["2026-09-02"]),
                )

                # Appending post-split 50 to the stored 100 would invent a 50% loss.
                with self.assertRaisesRegex(MarketDataValidationError, r"QQQ.*split.*full-history"):
                    refresh_all(data_dir, lambda _: FakeTicker(history), as_of=date(2026, 9, 4))

                self.assertEqual(
                    {path.name: path.read_bytes() for path in data_dir.iterdir()},
                    before,
                )
                self.assertEqual(list(root.glob(".indices.staging-*")), [])
                self.assertEqual(list(root.glob(".indices.backup-*")), [])

    def test_refresh_reads_each_endpoint_and_appends_only_new_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            previous_entries = self._write_incremental_data_dir(data_dir)
            daily_history = pd.DataFrame(
                {
                    "Close": [101.0],
                    "Dividends": [0.0],
                    "Stock Splits": [0.0],
                },
                index=pd.to_datetime(["2026-09-02"]),
            )
            weekly_history = pd.DataFrame(
                {
                    "Close": [101.0, 102.0, 103.0],
                    "Dividends": [0.0, 0.0, 0.0],
                    "Stock Splits": [0.0, 0.0, 0.0],
                },
                index=pd.to_datetime(["2026-08-31", "2026-09-02", "2026-09-03"]),
            )
            benchmark_tickers = {asset.ticker for asset in MARKET_BENCHMARKS}
            tickers: dict[str, FakeTicker] = {}

            def provider(ticker: str) -> FakeTicker:
                result = FakeTicker(weekly_history if ticker in benchmark_tickers else daily_history)
                tickers[ticker] = result
                return result

            entries = refresh_all(data_dir, provider, as_of=date(2026, 9, 4))

            for asset in ASSETS:
                with self.subTest(asset=asset.asset_id):
                    expected_start = (
                        date.fromisoformat(previous_entries[asset.asset_id].end_date)
                        + timedelta(days=1)
                    ).isoformat()
                    self.assertEqual(tickers[asset.ticker].calls[-1]["start"], expected_start)
                    self.assertEqual(tickers[asset.ticker].calls[-1]["end"], "2026-09-05")
                    self.assertNotIn("period", tickers[asset.ticker].calls[-1])

            self.assertEqual(entries["QQQ"].end_date, "2026-09-02")
            self.assertEqual(entries["QQQ"].row_count, previous_entries["QQQ"].row_count + 1)
            self.assertEqual(entries["KOSPI"].end_date, "2026-09-02")
            self.assertEqual(entries["NASDAQ100"], previous_entries["NASDAQ100"])
            self.assertIn(
                "2026-09-01,100,0\n2026-09-02,101,0\n",
                (data_dir / "qqq.csv").read_text(encoding="utf-8"),
            )

    def test_incremental_refresh_keeps_existing_rows_when_no_new_dates_are_returned(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir) / "indices"
            previous_entries = self._write_incremental_data_dir(data_dir)

            entries = refresh_all(
                data_dir,
                lambda _: FakeTicker(pd.DataFrame()),
                as_of=date(2026, 9, 4),
            )

            self.assertEqual(entries, previous_entries)

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
