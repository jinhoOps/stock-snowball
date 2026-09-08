import { useContext, useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseDate, type CalendarDate } from '@internationalized/date';
import {
  RangeCalendar, RangeCalendarStateContext, CalendarGrid, CalendarGridHeader,
  CalendarHeaderCell, CalendarGridBody, CalendarCell, CalendarHeading,
  CalendarMonthPicker, Button as CalendarButton,
} from 'react-aria-components/RangeCalendar';
import { I18nProvider } from 'react-aria-components/I18nProvider';
import Button from './Button';
import { Field, Input, Select } from './Field';
import Notice from './Notice';
import Sheet from './Sheet';

export interface DateRangeControlProps {
  startDate: string;
  endDate: string;
  minDate: string;
  maxDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  errorId?: string;
}

function readDate(value: string): CalendarDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try { return parseDate(value); } catch { return null; }
}

function SelectionProgress({ onSelectingChange }: { onSelectingChange: (selecting: boolean) => void }) {
  const state = useContext(RangeCalendarStateContext)!;
  const selecting = state.anchorDate !== null;
  useEffect(() => onSelectingChange(selecting), [selecting, onSelectingChange]);
  return <p role="status" className="mt-3 text-caption text-apple-secondary">
    {selecting ? `${state.anchorDate}부터 · 종료일을 선택하세요.` : '달력에서 시작일과 종료일을 차례로 선택하세요.'}
  </p>;
}

export default function DateRangeEditor({ startDate, endDate, minDate, maxDate, onChange, onClose }: DateRangeControlProps & { onClose: () => void }) {
  const id = useId();
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [selecting, setSelecting] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const min = parseDate(minDate);
  const max = parseDate(maxDate);
  const clamp = (date: CalendarDate) => date.compare(min) < 0 ? min : date.compare(max) > 0 ? max : date;
  const [focusedDate, setFocusedDate] = useState(() => clamp(readDate(startDate) ?? min));
  const start = readDate(draftStart);
  const end = readDate(draftEnd);
  const error = !start || !end
    ? '날짜를 YYYY-MM-DD 형식으로 입력해주세요. 예: 2010-01-01'
    : start.compare(end) > 0
      ? '시작일은 종료일보다 늦을 수 없습니다.'
      : start.compare(min) < 0 || end.compare(max) > 0
        ? `선택 가능한 기간은 ${minDate}부터 ${maxDate}까지입니다.`
        : null;

  const editDate = (value: string, side: 'start' | 'end') => {
    const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : value;
    (side === 'start' ? setDraftStart : setDraftEnd)(normalized);
    setSelecting(false);
    setCalendarVersion((version) => version + 1);
    const parsed = readDate(normalized);
    if (parsed) setFocusedDate(clamp(parsed));
  };

  return <Sheet open onClose={onClose} title="백테스트 기간 선택" footer={
    <div className="flex gap-3">
      <Button onClick={onClose} className="flex-1">취소</Button>
      <Button variant="primary" className="flex-[2]" disabled={!!error || selecting}
        onClick={() => { if (!error && !selecting) { onChange({ startDate: draftStart, endDate: draftEnd }); onClose(); } }}>
        기간 적용
      </Button>
    </div>
  }>
    <div className="flex flex-col gap-5">
      <p id={`${id}-format`} className="text-caption text-apple-secondary">YYYY-MM-DD 또는 숫자 8자리로 입력하세요. 달력에서도 기간을 선택할 수 있습니다.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field htmlFor={`${id}-start`} label="시작일">
          <Input aria-label="백테스트 시작일" value={draftStart} placeholder="YYYY-MM-DD" inputMode="numeric"
            autoComplete="off" aria-invalid={!!error} aria-describedby={`${id}-format${error ? ` ${id}-error` : ''}`}
            onChange={(event) => editDate(event.target.value, 'start')} />
        </Field>
        <Field htmlFor={`${id}-end`} label="종료일">
          <Input aria-label="백테스트 종료일" value={draftEnd} placeholder="YYYY-MM-DD" inputMode="numeric"
            autoComplete="off" aria-invalid={!!error} aria-describedby={`${id}-format${error ? ` ${id}-error` : ''}`}
            onChange={(event) => editDate(event.target.value, 'end')} />
        </Field>
      </div>
      {error && <Notice tone="error" id={`${id}-error`}>{error}</Notice>}
      <I18nProvider locale="ko-KR">
        <RangeCalendar key={calendarVersion} aria-label="백테스트 기간 달력"
          value={!error && start && end ? { start, end } : null}
          minValue={min} maxValue={max} focusedValue={focusedDate} onFocusChange={setFocusedDate}
          onChange={(range) => {
            if (range) { setDraftStart(range.start.toString()); setDraftEnd(range.end.toString()); }
          }} className="date-range-calendar max-[359px]:-mx-3">
          <div className="flex items-center gap-2">
            <CalendarButton slot="previous" aria-label="이전 달" className="ui-button ui-button-ghost ui-button-icon">
              <ChevronLeft size={18} aria-hidden="true" />
            </CalendarButton>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Select aria-label="달력 연도" value={focusedDate.year}
                onChange={(event) => setFocusedDate(clamp(focusedDate.set({ year: Number(event.target.value) })))} className="px-3">
                {Array.from({ length: max.year - min.year + 1 }, (_, index) => min.year + index).map((year) =>
                  <option key={year} value={year}>{year}년</option>)}
              </Select>
              <CalendarMonthPicker>
                {({ items, value, onChange: changeMonth }) => <Select aria-label="달력 월" value={value}
                  onChange={(event) => changeMonth(Number(event.target.value))} className="px-3">
                  {items.map((item) => <option key={item.id} value={item.id}>{item.formatted}</option>)}
                </Select>}
              </CalendarMonthPicker>
            </div>
            <CalendarButton slot="next" aria-label="다음 달" className="ui-button ui-button-ghost ui-button-icon">
              <ChevronRight size={18} aria-hidden="true" />
            </CalendarButton>
          </div>
          <CalendarHeading className="sr-only" />
          <CalendarGrid className="mt-3 w-full table-fixed border-collapse" weekdayStyle="short">
            <CalendarGridHeader>{(day) => <CalendarHeaderCell className="h-8 text-fine-print font-normal text-apple-secondary">{day}</CalendarHeaderCell>}</CalendarGridHeader>
            <CalendarGridBody>{(date) => <CalendarCell date={date} className="date-range-day" />}</CalendarGridBody>
          </CalendarGrid>
          <SelectionProgress onSelectingChange={setSelecting} />
        </RangeCalendar>
      </I18nProvider>
      <p className="text-fine-print leading-relaxed text-apple-secondary">선택 가능: {minDate} ~ {maxDate}</p>
    </div>
  </Sheet>;
}

