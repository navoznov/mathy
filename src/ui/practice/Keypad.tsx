interface KeypadProps {
  onDigit(digit: string): void;
  onBackspace(): void;
  onToggleSign(): void;
  disabled: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Keypad({ onDigit, onBackspace, onToggleSign, disabled }: KeypadProps) {
  return (
    <div className="keypad">
      {DIGITS.map((d) => (
        <button key={d} type="button" onClick={() => onDigit(d)} disabled={disabled}>
          {d}
        </button>
      ))}
      <button type="button" onClick={onToggleSign} aria-label="Сменить знак" disabled={disabled}>
        ±
      </button>
      <button type="button" onClick={() => onDigit('0')} disabled={disabled}>
        0
      </button>
      <button type="button" onClick={onBackspace} aria-label="Стереть" disabled={disabled}>
        ⌫
      </button>
    </div>
  );
}
