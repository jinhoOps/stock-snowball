import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ShareCard from '../ShareCard';

it('describes the value-averaging amount as a monthly target on the exported card', () => {
  const markup = renderToStaticMarkup(<ShareCard scenarioName="목표 적립"
    totalAsset={100000} pessimisticAsset={80000} optimisticAsset={120000}
    contribution={50000} contributionLabel="월간 목표 증가액" cycle="MONTHLY"
    totalReturn={0} returnPercentage={0} cagr={null} years={1} currency="KRW" cardRef={createRef()} />);
  expect(markup).toContain('월간 목표 증가액');
  expect(markup).toContain('5만 원');
  expect(markup).not.toContain('매월 얼마씩?');
});
