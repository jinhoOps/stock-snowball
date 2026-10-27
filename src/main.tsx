import React from 'react';
import ReactDOM from 'react-dom/client';
import { prepareInitialMarketData } from './data/marketDataBootstrap';
import { installMarketData } from './data/marketDataRuntime';
import './index.css';
const root=ReactDOM.createRoot(document.getElementById('root')!);
// A quick start shows nothing in between; a slow one says what it is waiting for.
const slowStart=setTimeout(()=>root.render(<p role="status" className="p-6 text-center text-caption text-apple-secondary">시세 준비 중…</p>),400);
async function start(){
  // App modules read market data only while rendering, so the chunk can load while the data is prepared.
  const app=import('./App');
  app.catch(()=>undefined); // Reported once below, when awaited.
  const initial=await prepareInitialMarketData();
  installMarketData(initial.snapshot,initial.catalog);
  const {default:App}=await app;
  clearTimeout(slowStart);
  root.render(<React.StrictMode><App/></React.StrictMode>);
}
void start().catch(()=>{clearTimeout(slowStart);root.render(<div role="alert" className="p-6">데이터를 준비하지 못했어요. <button onClick={()=>window.location.reload()}>새로고침</button>해주세요.</div>);});
