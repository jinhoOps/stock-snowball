"""Bounded Korean index repair using the project's existing Naver reference source.

New rows are accepted only after overlap checks and recent independent Yahoo ^KS11
control-history checks; a missing or inconsistent source fails the complete refresh.
"""
from __future__ import annotations
from datetime import date, datetime, timedelta
import math
from urllib.request import Request, urlopen
from xml.etree import ElementTree
from tools.market_data import MarketRecord, MarketDataValidationError, MARKET_BENCHMARKS, fetch_history, normalize_history

TOLERANCE = 0.02
NAVER_URL = 'https://fchart.stock.naver.com/sise.nhn?symbol={}&timeframe=day&count=100&requestType=0'

def parse_naver_history(payload):
    try:
        try: text=payload.decode('utf-8')
        except UnicodeDecodeError: text=payload.decode('euc-kr')
        root=ElementTree.fromstring(text)
        result=[]; previous=''
        for item in root.iter('item'):
            fields=item.attrib['data'].split('|')
            if len(fields)!=6: raise ValueError('Expected six Naver fields')
            day=datetime.strptime(fields[0],'%Y%m%d').date()
            close=float(fields[4]); stamp=day.isoformat()
            if day.weekday()>=5 or not math.isfinite(close) or close<=0 or stamp<=previous: raise ValueError('Invalid market row')
            result.append(MarketRecord(stamp,close,0));previous=stamp
        if not result:raise ValueError('Empty Naver history')
        return result
    except (ValueError, KeyError, UnicodeError, ElementTree.ParseError) as error:
        raise MarketDataValidationError('Invalid Naver daily history: '+str(error)) from None

def download_naver(code):
    if code not in ('KPI200','KOSPI','KOSDAQ'):raise MarketDataValidationError('Unapproved Naver symbol')
    try:
        with urlopen(Request(NAVER_URL.format(code),headers={'User-Agent':'StockSnowball/1.3 (market data verification)'}),timeout=20) as response:
            payload=response.read(2*1024*1024+1)
            if len(payload)>2*1024*1024:raise ValueError('Naver size limit exceeded')
            return payload
    except (OSError, ValueError):raise MarketDataValidationError('Naver daily-history request failed') from None

def verified_korean_backfill(asset,existing,cutoff,required_dates,client_factory,retrieved_at,*,download=download_naver):
    codes={'KOSPI':'KPI200','KOSDAQ':'KOSDAQ'}
    if asset.asset_id not in codes or not existing or not required_dates:
        raise MarketDataValidationError('KOSPI fallback requires a prior verified catalog and missing sessions')
    target={row.date:row for row in parse_naver_history(download(codes[asset.asset_id]))}
    control={row.date:row for row in parse_naver_history(download('KOSPI'))}
    prior={row.date:row for row in existing}
    overlap=sorted(set(target)&set(prior))
    if len(overlap)<3 or any(abs(target[day].close-prior[day].close)>TOLERANCE for day in overlap):
        raise MarketDataValidationError('Naver KOSPI 200 disagrees with the prior verified catalog')
    required=sorted(set(required_dates))
    if any(day>cutoff.isoformat() or day<=existing[-1].date or day not in target or day not in control for day in required):
        raise MarketDataValidationError('Naver KOSPI 200 does not cover the required completed sessions')
    definition=next(item for item in MARKET_BENCHMARKS if item.asset_id=='KOSPI_INDEX')
    frame=fetch_history(definition,client_factory,start=date.fromisoformat(required[0])-timedelta(days=7),end=cutoff+timedelta(days=1))
    if not getattr(frame,'empty',True):frame=frame.loc[[index.date()<=cutoff for index in frame.index]]
    yahoo={row.date:row for row in normalize_history('KOSPI_INDEX',frame)}
    checked=sorted(day for day in set(yahoo)&set(control) if day<=cutoff.isoformat())
    if len(checked)<3 or (date.fromisoformat(required[-1])-date.fromisoformat(checked[-1])).days>14 or any(abs(yahoo[day].close-control[day].close)>TOLERANCE for day in checked):
        raise MarketDataValidationError('Naver and recent Yahoo KOSPI control history disagree')
    rows=[target[day] for day in required]
    audit={'assetId':asset.asset_id,'ticker':asset.ticker,'records':[{'date':row.date,'close':row.close,'dividend':0} for row in rows],
           'sourceUrl':NAVER_URL.format(codes[asset.asset_id]),'retrievedAt':retrieved_at,
           'reason':'Automatically corroborated against the prior catalog and recent independent Yahoo ^KS11 control history',
           'verification':{'overlapCount':len(overlap),'controlTicker':'^KS11','controlDates':checked,
                           'maximumControlDifference':max(abs(yahoo[day].close-control[day].close) for day in checked)}}
    return rows,audit
