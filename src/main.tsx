import { createBundledSnapshot } from './data/bundledMarketData';
import { installMarketData } from './data/marketDataRuntime';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

installMarketData(createBundledSnapshot());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
