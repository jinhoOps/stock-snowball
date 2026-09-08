import { lazy, Suspense, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Button from './Button';
import Sheet from './Sheet';
import type { DateRangeControlProps } from './DateRangeEditor';

const DateRangeEditor = lazy(() => import('./DateRangeEditor'));

export default function DateRangeControl(props: DateRangeControlProps) {
  const [open, setOpen] = useState(false);
  const available = props.minDate <= props.maxDate;
  return <>
    <Button onClick={() => setOpen(true)} aria-label="백테스트 기간 변경" aria-haspopup="dialog"
      aria-expanded={open} aria-describedby={props.errorId} disabled={!available}
      className="h-field w-full justify-between rounded-pill px-4 text-left font-normal">
      <span className="min-w-0 tabular-nums">{props.startDate} ~ {props.endDate}</span>
      <CalendarDays size={18} className="shrink-0 text-apple-primary" aria-hidden="true" />
    </Button>
    {open && available && <Suspense fallback={
      <Sheet open title="백테스트 기간 선택" onClose={() => setOpen(false)}><p role="status">달력을 불러오는 중입니다.</p></Sheet>
    }><DateRangeEditor {...props} onClose={() => setOpen(false)} /></Suspense>}
  </>;
}
