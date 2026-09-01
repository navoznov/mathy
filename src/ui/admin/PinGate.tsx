import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { readTemp, writeTemp } from '../../storage/safeStorage';

const UNLOCK_KEY = 'mathy.admin-unlocked';

interface PinGateProps {
  pin: string | null;
  children: ReactNode;
}

export function PinGate({ pin, children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState(() => pin === null || readTemp(UNLOCK_KEY) === '1');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (entered === pin) {
      writeTemp(UNLOCK_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setEntered('');
    }
  };

  return (
    <div className="app">
      <h1>Настройки</h1>
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="pin">Введи код</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={entered}
            onChange={(e) => {
              setEntered(e.target.value);
              setError(false);
            }}
          />
        </div>
        {error && <p className="error">Неверный код</p>}
        <button className="btn-primary" type="submit">
          Войти
        </button>
      </form>
      <p className="muted">
        <a href="#/">Назад</a>
      </p>
    </div>
  );
}
