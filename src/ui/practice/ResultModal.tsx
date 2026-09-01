import { summarize } from '../../domain/scoring';
import { OP_SYMBOL } from '../../domain/types';
import type { Session } from '../../domain/types';
import { formatAttempt, formatMs, formatStars } from '../format';

interface ResultModalProps {
  session: Session;
  onRestart(): void;
  onHome(): void;
}

export function ResultModal({ session, onRestart, onHome }: ResultModalProps) {
  const s = summarize(session);
  // Округляем только одну долю, вторую выводим вычитанием: два независимых
  // Math.round дают 101% на любой доле, попавшей ровно на N.5 (1 из 8 — это
  // 13% и 88%).
  const correctPct = s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
  const errorPct = s.total === 0 ? 0 : 100 - correctPct;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        {session.aborted ? (
          <h2>
            Прервано, {s.total} из {session.plannedCount}
          </h2>
        ) : (
          <div className="stars">{formatStars(s.stars)}</div>
        )}

        <div className="rows" style={{ margin: '1.25rem 0' }}>
          <div className="row">
            <span className="muted">Всего примеров</span>
            <span className="val">{s.total}</span>
          </div>
          <div className="row">
            <span className="muted">Правильно</span>
            <span className="val">
              {s.correct} ({correctPct}%)
            </span>
          </div>
          <div className="row">
            <span className="muted">Ошибок</span>
            <span className="val">
              {s.wrong} ({errorPct}%)
            </span>
          </div>
          <div className="row">
            <span className="muted">Общее время</span>
            <span className="val">{formatMs(s.totalMs)}</span>
          </div>
          <div className="row">
            <span className="muted">В среднем на пример</span>
            <span className="val">{formatMs(s.avgMs)}</span>
          </div>
          {s.slowest && (
            <div className="row">
              <span className="muted">Дольше всего думал</span>
              <span className="val">
                {s.slowest.a} {OP_SYMBOL[s.slowest.op]} {s.slowest.b} — {formatMs(s.slowest.ms)}
              </span>
            </div>
          )}
        </div>

        {s.mistakes.length > 0 && (
          <>
            <h2>Разбор ошибок</h2>
            <div className="rows" style={{ marginBottom: '1.25rem' }}>
              {s.mistakes.map((a, i) => (
                <div key={i} className="error">
                  {formatAttempt(a)}
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn-primary" onClick={onRestart}>
          Ещё раз
        </button>
        <button className="btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onHome}>
          На главную
        </button>
      </div>
    </div>
  );
}
