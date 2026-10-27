import { useEffect, useState } from 'react';
import { checkForMarketDataUpdate } from '../../data/marketDataBootstrap';
import Notice from './Notice';
import Button from './Button';
interface Props { date: string; weeklyDate?: string; bundled?: boolean; onReload?: () => void }
export default function MarketDataStatus({date,weeklyDate,bundled,onReload=()=>window.location.reload()}:Props){
  const [state,setState]=useState<'checking'|'idle'|'ready'|'failed'>('checking');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let mounted=true;setState('checking');
    checkForMarketDataUpdate().then(result=>{if(mounted)setState(result==='ready'?'ready':'idle');},()=>{if(mounted)setState('failed');});
    return ()=>{mounted=false;};
  },[attempt]);
  return <div className="mx-auto mb-6 flex max-w-analysis flex-col items-center gap-3 text-caption text-apple-secondary">
    <p>시세 기준 {date}{weeklyDate?' · 주봉 '+weeklyDate:''}{bundled?' · 기본 데이터':''}</p>
    {state==='checking'&&<p role="status">시세 업데이트 확인 중…</p>}
    {state==='ready'&&<Notice className="flex flex-col items-center gap-2">
      <span>새 시세가 준비됐어요</span>
      <span>미적용한 설정은 새로고침하면 사라져요.</span>
      <Button size="compact" onClick={onReload}>새로고침해 적용</Button>
    </Notice>}
    {state==='failed'&&<Notice className="flex flex-col items-center gap-2">
      <span>시세 업데이트를 확인하지 못했어요. 보관된 데이터로 계산합니다.</span>
      <Button size="compact" onClick={()=>setAttempt(value=>value+1)}>다시 확인</Button>
    </Notice>}
  </div>;
}
