from __future__ import annotations
from datetime import date
import unittest
import pandas as pd
from tools.market_data import ASSETS, MarketRecord, MarketDataValidationError
from tools.korean_market_data import parse_naver_history, verified_korean_backfill
from tests.test_market_data import FakeTicker

def xml(rows):
    return ('<protocol><chartdata>'+''.join('<item data="'+day.replace('-','')+'|0|0|0|'+str(close)+'|1"/>' for day,close in rows)+'</chartdata></protocol>').encode()

class VerifiedKoreanDataTests(unittest.TestCase):
    def setUp(self):
        self.existing=[MarketRecord('2026-10-21',100,0),MarketRecord('2026-10-22',101,0),MarketRecord('2026-10-23',102,0)]
        self.target=[(r.date,r.close) for r in self.existing]+[('2026-10-26',103),('2026-10-27',999)]
        self.control=[('2026-10-21',3000),('2026-10-22',3010),('2026-10-23',3020),('2026-10-26',3030)]
        self.asset=next(a for a in ASSETS if a.asset_id=='KOSPI')
    def run_backfill(self):
        frame=pd.DataFrame({'Close':[price for _,price in getattr(self,'yahoo_control',self.control)],'Dividends':0,'Stock Splits':0},index=pd.to_datetime([day for day,_ in getattr(self,'yahoo_control',self.control)]))
        return verified_korean_backfill(self.asset,self.existing,date(2026,10,26),['2026-10-26'],lambda _:FakeTicker(frame),'2026-10-27T01:17:00Z',download=lambda code:xml(self.target if code in ('KPI200','KOSDAQ') else self.control))
    def test_corroborates_existing_prices_and_independent_market_control_and_excludes_today(self):
        rows,audit=self.run_backfill()
        self.assertEqual(rows,[MarketRecord('2026-10-26',103,0)])
        self.assertEqual(audit['records'],[{'date':'2026-10-26','close':103,'dividend':0}])
        self.assertGreaterEqual(audit['verification']['overlapCount'],3)
        self.assertEqual(audit['verification']['controlTicker'],'^KS11')
    def test_accepts_verified_recent_control_history_when_yahoo_latest_session_is_missing(self):
        self.yahoo_control=self.control[:-1]
        rows,audit=self.run_backfill()
        self.assertEqual(rows,[MarketRecord('2026-10-26',103,0)])
        self.assertEqual(audit['verification']['controlDates'],[day for day,_ in self.control[:-1]])
    def test_supports_the_existing_kosdaq_reference_source_with_the_same_guards(self):
        self.asset=next(a for a in ASSETS if a.asset_id=='KOSDAQ')
        rows,audit=self.run_backfill()
        self.assertEqual(rows,[MarketRecord('2026-10-26',103,0)])
        self.assertEqual(audit['assetId'],'KOSDAQ')
    def test_rejects_stale_control_history_for_the_newest_supplemented_date(self):
        self.target.append(('2026-11-20',104));self.control.append(('2026-11-20',3040))
        frame=pd.DataFrame({'Close':[3000,3010,3020],'Dividends':0,'Stock Splits':0},index=pd.to_datetime(['2026-10-21','2026-10-22','2026-10-23']))
        with self.assertRaises(MarketDataValidationError):
            verified_korean_backfill(self.asset,self.existing,date(2026,11,20),['2026-10-26','2026-11-20'],lambda _:FakeTicker(frame),'2026-11-21T01:17:00Z',download=lambda code:xml(self.target if code=='KPI200' else self.control))
    def test_rejects_a_source_that_disagrees_with_the_last_verified_catalog(self):
        self.target[2]=('2026-10-23',900)
        with self.assertRaises(MarketDataValidationError):self.run_backfill()
    def test_rejects_missing_required_session(self):
        self.target=[row for row in self.target if row[0]!='2026-10-26']
        with self.assertRaises(MarketDataValidationError):self.run_backfill()
    def test_rejects_control_disagreement(self):
        frame=pd.DataFrame({'Close':[9999],'Dividends':[0],'Stock Splits':[0]},index=pd.to_datetime(['2026-10-26']))
        with self.assertRaises(MarketDataValidationError):
            verified_korean_backfill(self.asset,self.existing,date(2026,10,26),['2026-10-26'],lambda _:FakeTicker(frame),'2026-10-27T01:17:00Z',download=lambda code:xml(self.target if code in ('KPI200','KOSDAQ') else self.control))
    def test_rejects_invalid_or_duplicate_rows(self):
        for rows in [[('2026-02-30',100)],[('2026-10-26',float('nan'))],[('2026-10-26',100),('2026-10-26',101)]]:
            with self.subTest(rows=rows),self.assertRaises(MarketDataValidationError):parse_naver_history(xml(rows))

if __name__=='__main__':unittest.main()
