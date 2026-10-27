"""The browser's copy of the storage contract must match what the Python tools publish."""
from __future__ import annotations
import json
import math
import re
import unittest
from pathlib import Path

from tools.market_data import ASSETS
from tools.market_data_storage import BUCKET, LIMITS

CONTRACT = Path(__file__).resolve().parents[1] / 'src/data/marketDataContract.ts'


def _contract_constant(source: str, name: str) -> str:
    match = re.search(r'export const ' + name + r' = (.*?)(?: as const)?;\n', source, re.S)
    if not match: raise AssertionError(name + ' not found in ' + CONTRACT.name)
    return match.group(1)


class BrowserContractTests(unittest.TestCase):
    def setUp(self):
        self.source = CONTRACT.read_text(encoding='utf-8')

    def test_registry_lists_the_published_datasets(self):
        registry = json.loads(_contract_constant(self.source, 'REGISTRY'))
        expected = {}
        for asset in ASSETS:
            entry = {'assetId': asset.asset_id, 'ticker': asset.ticker, 'displayName': asset.display_name, 'currency': asset.currency,
                     'kind': asset.kind, 'frequency': asset.frequency, 'filename': asset.output_filename}
            if asset.exchange_calendar: entry['calendar'] = asset.exchange_calendar
            expected[asset.asset_id] = entry
        self.assertEqual(registry, expected)
        self.assertEqual(list(registry), [asset.asset_id for asset in ASSETS])

    def test_limits_and_bucket_match(self):
        limits = _contract_constant(self.source, 'LIMITS')
        browser = {key: math.prod(int(factor) for factor in value.split('*')) for key, value in re.findall(r'(\w+): ([\d *]+?)(?=,| })', limits)}
        self.assertEqual(browser, LIMITS)
        url = json.loads(_contract_constant(self.source, 'STORAGE_BASE_URL').replace("'", '"'))
        self.assertTrue(url.endswith('/storage/v1/object/public/' + BUCKET + '/'), url)


if __name__ == '__main__': unittest.main()
