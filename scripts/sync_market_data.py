"""Refresh or publish a complete catalog without modifying the Git checkout."""
from __future__ import annotations
import argparse
from datetime import date, datetime, timedelta, timezone
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import uuid

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path: sys.path.insert(0, str(PROJECT_ROOT))
from tools.market_data import ASSETS, MarketDataError, refresh_all, validate_generated_data, _read_dataset, _validate_recent_korean_index_sessions
from tools.market_data_storage import StorageClient, StorageError, load_remote_catalog, publish_catalog, rollback_catalog, cleanup_releases

def parse_as_of(value):
    try: result = date.fromisoformat(value)
    except ValueError: raise argparse.ArgumentTypeError('Use YYYY-MM-DD') from None
    if result > datetime.now(timezone.utc).date(): raise argparse.ArgumentTypeError('as-of cannot be in the future')
    return result

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['bootstrap','refresh','publish','rollback'], default='refresh')
    parser.add_argument('--data-dir', type=Path, default=PROJECT_ROOT/'src/data/indices')
    parser.add_argument('--release-id')
    parser.add_argument('--as-of', type=parse_as_of)
    args=parser.parse_args(argv)
    now=datetime.now(timezone.utc).replace(microsecond=0)
    published_at=now.isoformat().replace('+00:00','Z')
    cutoff=args.as_of or now.date()-timedelta(days=1)
    release_id=args.release_id or now.strftime('%Y%m%dT%H%M%SZ')+'-'+os.getenv('GITHUB_RUN_ID', uuid.uuid4().hex[:10])+'-'+os.getenv('GITHUB_RUN_ATTEMPT','1')
    try:
        storage=StorageClient(os.getenv('SUPABASE_URL','https://olqdftjssrzqvcindekh.supabase.co'), os.getenv('SUPABASE_SERVICE_ROLE_KEY',''))
        if args.mode=='rollback':
            if not args.release_id: raise StorageError('rollback requires --release-id')
            result=rollback_catalog(storage, args.release_id)
        else:
            with tempfile.TemporaryDirectory(prefix='snowball-market-data-') as directory:
                data=Path(directory)/'catalog'
                if args.mode=='refresh':
                    load_remote_catalog(storage, data)
                    refresh_all(data, as_of=cutoff, observed_at=now)
                    # as_of's deterministic manifest timestamp is midnight; check all
                    # completed Korean sessions through the END of the cutoff day too.
                    end_of_day=datetime.combine(cutoff, datetime.max.time(), tzinfo=timezone.utc)
                    for asset in ASSETS:
                        records=_read_dataset(data/asset.output_filename, asset, as_of=now.date())
                        if any(date.fromisoformat(row.date)>cutoff for row in records): raise StorageError('Data exceeds cutoff')
                        _validate_recent_korean_index_sessions(asset, records, end_of_day)
                else:
                    shutil.copytree(args.data_dir, data)
                validate_generated_data(data)
                result=publish_catalog(storage,data,release_id,published_at,bootstrap=args.mode=='bootstrap')
                manifest=json.loads((data/'manifest.json').read_text())
                for asset, coverage in manifest['assets'].items(): print(asset+': '+coverage['endDate'])
        print('Unchanged' if result is None else 'Published '+result['current']['releaseId'])
        try: cleanup_releases(storage)
        except MarketDataError: print('Warning: published data retained; release cleanup failed',file=sys.stderr)
        summary=os.getenv('GITHUB_STEP_SUMMARY')
        if summary:
            with open(summary,'a',encoding='utf-8') as output:
                output.write('## Market data\n\n'+('Unchanged' if result is None else 'Current: '+result['current']['releaseId'])+'\n')
        return 0
    except (MarketDataError, OSError, ValueError) as error:
        print('Market data error: '+str(error),file=sys.stderr)
        return 1

if __name__=='__main__': raise SystemExit(main())
