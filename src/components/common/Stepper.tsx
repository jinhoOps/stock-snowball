import { cloneElement, type AriaAttributes, type ReactElement } from 'react';
import { Minus, Plus } from 'lucide-react';

type InputElement = ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: AriaAttributes['aria-invalid'] }>;

interface StepperProps {
  /** Forwarded to the input, so a `Field` or a `<label htmlFor>` can point at it. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  /** The editable value between the buttons; it stays typeable. */
  children: InputElement;
}

/** − value + : one tap per step, with the value still editable by keyboard. */
export default function Stepper({ id, decreaseLabel, increaseLabel, onDecrease, onIncrease,
  canDecrease = true, canIncrease = true, children, ...aria }: StepperProps) {
  return (
    <div className="ui-stepper">
      <button type="button" className="ui-stepper-button" aria-label={decreaseLabel} disabled={!canDecrease} onClick={onDecrease}>
        <Minus size={18} aria-hidden="true" />
      </button>
      {cloneElement(children, {
        id: id ?? children.props.id,
        'aria-describedby': aria['aria-describedby'] ?? children.props['aria-describedby'],
        'aria-invalid': aria['aria-invalid'] ?? children.props['aria-invalid'],
      })}
      <button type="button" className="ui-stepper-button" aria-label={increaseLabel} disabled={!canIncrease} onClick={onIncrease}>
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
