import React from 'react';
import ReactDOM from 'react-dom/client';
import { prepareInitialMarketData } from './data/marketDataBootstrap';
import { installMarketData } from './data/marketDataRuntime';
import './index.css';
const root=ReactDOM.createRoot(document.getElementById('root')!);
async function start(){
  const initial=await prepareInitialMarketData();
  installMarketData(initial.snapshot);
  const {default:App}=await import('./App');
  root.render(<React.StrictMode><App/></React.StrictMode>);
}
void start().catch(()=>root.render(<div role="alert" className="p-6">데이터를 준비하지 못했어요. <button onClick={()=>window.location.reload()}>새로고침</button>해주세요.</div>));
