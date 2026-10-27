from __future__ import annotations
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
import pandas as pd
from scripts.sync_market_data import main
from scripts.refresh_market_data import main as refresh_cli
from tools.market_data import fetch_history, ASSETS, refresh_all, MarketDataValidationError
from tests.test_market_data import FakeTicker
from tests.test_market_data_storage import FakeStorage, DATA

class SyncTests(unittest.TestCase):
    def setUp(self):
        summary_env=patch.dict("os.environ", {"GITHUB_STEP_SUMMARY": ""})
        summary_env.start();self.addCleanup(summary_env.stop)
    def test_full_history_has_explicit_cutoff(self):
        history = pd.DataFrame({'Close': [100], 'Dividends': [0], 'Stock Splits': [0]}, index=pd.to_datetime(['2024-01-02']))
        client = FakeTicker(history)
        fetch_history(ASSETS[0], lambda _: client, end=date(2024, 1, 3))
        self.assertEqual(client.calls[0]['end'], '2024-01-03')
    def test_refresh_removes_provider_rows_after_cutoff_before_normalizing(self):
        history = pd.DataFrame({'Close': [100, 101], 'Dividends': [0, 0], 'Stock Splits': [0, 0]}, index=pd.to_datetime(['2024-01-02', '2024-01-03']))
        with tempfile.TemporaryDirectory() as directory, patch('tools.market_data.validate_generated_data', return_value={}), patch('tools.market_data.apply_reviewed_daily_backfills', side_effect=lambda a,r,**k:r), patch('tools.market_data.apply_reviewed_weekly_close_overrides', side_effect=lambda a,r:r), patch('tools.market_data.completed_weekly_records', side_effect=lambda r,**k:r), patch('tools.market_data.swap_catalog', side_effect=lambda staging, target: staging.rename(target)):
            target=Path(directory)/'data'
            refresh_all(target, lambda _: FakeTicker(history), as_of=date(2024, 1, 2))
            self.assertNotIn('2024-01-03', (target/'qqq.csv').read_text())
    def test_explicit_bootstrap_refuses_existing_pointer(self):
        storage=FakeStorage()
        args=['--mode','bootstrap','--data-dir',str(DATA),'--release-id','fixture-one']
        with patch('scripts.sync_market_data.StorageClient', return_value=storage):
            self.assertEqual(main(args), 0)
            self.assertEqual(main(args), 1)
    def test_missing_refresh_baseline_is_not_implicitly_bootstrapped(self):
        storage=FakeStorage()
        with patch('scripts.sync_market_data.StorageClient', return_value=storage):
            self.assertEqual(main(['--mode','refresh']), 1)
        self.assertEqual(storage.objects, {})
    def test_cli_rejects_future_date_without_network(self):
        with self.assertRaises(SystemExit): refresh_cli(['--as-of','2999-01-01'])

if __name__ == '__main__': unittest.main()

class ObservationClockTests(unittest.TestCase):
    def test_monday_includes_previous_friday_while_capping_daily_data_at_sunday(self):
        from datetime import datetime, timezone
        from tools.market_data import MARKET_BENCHMARKS
        history=pd.DataFrame({'Close':[100,101], 'Dividends':[0,0], 'Stock Splits':[0,0]},index=pd.to_datetime(['2026-10-16','2026-10-23']))
        with tempfile.TemporaryDirectory() as directory, patch('tools.market_data.ASSETS',(MARKET_BENCHMARKS[0],)), patch('tools.market_data.validate_generated_data',return_value={}), patch('tools.market_data.apply_reviewed_weekly_close_overrides',side_effect=lambda a,r:r), patch('tools.market_data.swap_catalog',side_effect=lambda a,b:a.rename(b)):
            target=Path(directory)/'data'
            refresh_all(target,lambda _:FakeTicker(history),as_of=date(2026,10,25),observed_at=datetime(2026,10,26,1,17,tzinfo=timezone.utc))
            self.assertIn('2026-10-23,101,0', (target/'nasdaq100.csv').read_text())

class CutoffValidationTests(unittest.TestCase):
    def test_observation_after_korean_close_does_not_require_excluded_current_day(self):
        from shutil import copytree
        from tools.market_data import MARKET_BENCHMARKS, validate_generated_data
        import json
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'data';copytree(DATA,target)
            manifest=json.loads((target/'manifest.json').read_text())
            manifest['generatedAt']='2026-10-26T07:00:00Z';manifest['dataThrough']='2026-10-25'
            for asset in MARKET_BENCHMARKS:
                path=target/asset.output_filename;close=path.read_text().strip().splitlines()[-1].split(',')[1]
                path.write_text(path.read_text().rstrip()+'\n2026-10-23,'+close+',0\n')
                coverage=manifest['assets'][asset.asset_id];coverage['endDate']='2026-10-23';coverage['expectedEndDate']='2026-10-23';coverage['rowCount']+=1
            (target/'manifest.json').write_text(json.dumps(manifest))
            validate_generated_data(target)

class ClosedSessionTests(unittest.TestCase):
    def test_weekend_increment_does_not_query_a_provider_for_nonexistent_sessions(self):
        from shutil import copytree
        from datetime import datetime,timezone
        with tempfile.TemporaryDirectory() as directory, patch('tools.market_data.ASSETS',(ASSETS[0],)), patch('tools.market_data.validate_generated_data',return_value={}), patch('tools.market_data.swap_catalog',return_value=None), patch('tools.market_data.validate_historical_date_preservation',return_value=None):
            target=Path(directory)/'data';copytree(DATA,target)
            def forbidden(_): raise AssertionError('Provider should not be queried on a closed weekend')
            refresh_all(target,forbidden,as_of=date(2026,10,25),observed_at=datetime(2026,10,26,7,tzinfo=timezone.utc))

class CompletedWeekSkipTests(unittest.TestCase):
    def test_does_not_query_incomplete_week_when_prior_week_is_already_present(self):
        from shutil import copytree
        from datetime import datetime,timezone
        from tools.market_data import MARKET_BENCHMARKS
        asset=next(a for a in MARKET_BENCHMARKS if a.asset_id=='KOSPI_INDEX')
        with tempfile.TemporaryDirectory() as directory, patch('tools.market_data.ASSETS',(asset,)), patch('tools.market_data.validate_generated_data',return_value={}), patch('tools.market_data.validate_historical_date_preservation',return_value=None), patch('tools.market_data.swap_catalog',return_value=None):
            target=Path(directory)/'data';copytree(DATA,target)
            path=target/'kospi-index.csv';path.write_text(path.read_text().rstrip()+'\n2026-10-23,5550.3,0\n')
            def forbidden(_):raise AssertionError('Already-complete weekly data should not query the current week')
            result=refresh_all(target,forbidden,as_of=date(2026,10,26),observed_at=datetime(2026,10,27,1,tzinfo=timezone.utc))
            self.assertEqual(result['KOSPI_INDEX'].end_date,'2026-10-23')
