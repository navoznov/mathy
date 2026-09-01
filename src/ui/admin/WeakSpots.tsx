import { byOperation, topProblems } from '../../domain/analytics';
import { OP_LABEL, OP_SYMBOL } from '../../domain/types';
import type { Session } from '../../domain/types';
import { formatMs } from '../format';

interface WeakSpotsProps {
  sessions: Session[];
}

export function WeakSpots({ sessions }: WeakSpotsProps) {
  const stats = byOperation(sessions).filter((s) => s.total > 0);
  const { byErrors, bySlowness } = topProblems(sessions);

  if (stats.length === 0) {
    return (
      <div className="card">
        <h2>Слабые места</h2>
        <p className="muted">Данных пока нет — пройдите хотя бы одну сессию.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Слабые места</h2>

      <div className="rows" style={{ marginBottom: '1.25rem' }}>
        {stats.map((s) => (
          <div className="row" key={s.op}>
            <span className="muted">{OP_LABEL[s.op]}</span>
            <span className="val">
              {Math.round(s.accuracy * 100)}% · {formatMs(s.avgMs)} · {s.total} примеров
            </span>
          </div>
        ))}
      </div>

      {byErrors.length > 0 && (
        <>
          <h2>Чаще всего ошибается</h2>
          <div className="rows" style={{ marginBottom: '1.25rem' }}>
            {byErrors.map((p) => (
              <div className="row" key={`e-${p.op}-${p.a}-${p.b}`}>
                <span className="muted">
                  {p.a} {OP_SYMBOL[p.op]} {p.b}
                </span>
                <span className="val">
                  {p.wrong} из {p.total}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {bySlowness.length > 0 && (
        <>
          <h2>Дольше всего думает</h2>
          <div className="rows">
            {bySlowness.map((p) => (
              <div className="row" key={`s-${p.op}-${p.a}-${p.b}`}>
                <span className="muted">
                  {p.a} {OP_SYMBOL[p.op]} {p.b}
                </span>
                <span className="val">{formatMs(p.avgMs)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
