import { summarize } from '../domain/scoring';
import { OPS, OP_SYMBOL } from '../domain/types';
import type { Session, Settings } from '../domain/types';
import { formatDateTime, formatStars } from './format';

interface StartScreenProps {
  settings: Settings;
  history: Session[];
  /** Текст, объясняющий, почему нельзя начать. null — можно. */
  disabledReason: string | null;
  onStart(): void;
}

export function StartScreen({ settings, history, disabledReason, onStart }: StartScreenProps) {
  const enabled = OPS.filter((op) => settings.ops[op].enabled).map((op) => OP_SYMBOL[op]);
  const recent = history.slice(0, 3);

  return (
    <div className="app">
      <h1>Считаем!</h1>

      <div className="card">
        <p className="muted">
          {settings.taskCount} примеров: {enabled.join(' ')}
        </p>
        <button className="btn-primary" onClick={onStart} disabled={disabledReason !== null}>
          Начать
        </button>
        {disabledReason && <p className="error">{disabledReason}</p>}
      </div>

      {recent.length > 0 && (
        <div className="card">
          <h2>Последние результаты</h2>
          <div className="rows">
            {recent.map((s) => (
              <div className="row" key={s.id}>
                <span className="muted">{formatDateTime(s.startedAt)}</span>
                <span className="val">{s.aborted ? 'прервано' : formatStars(summarize(s).stars)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="muted">
        <a href="#/admin">Настройки</a>
      </p>
    </div>
  );
}
