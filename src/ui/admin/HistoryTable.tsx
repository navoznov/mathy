import { useState } from 'react';
import { summarize } from '../../domain/scoring';
import { MODE_LABEL } from '../../domain/types';
import type { Session } from '../../domain/types';
import { clearHistory, exportHistory } from '../../storage/history';
import { formatAttempt, formatDateTime, formatMs, formatStars } from '../format';

interface HistoryTableProps {
  sessions: Session[];
  onClear(): void;
}

function downloadHistory(): void {
  const blob = new Blob([exportHistory()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mathy-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // revokeObjectURL синхронно сразу после click() может отменить ещё не начавшуюся
  // загрузку — откладываем до следующего тика.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function HistoryTable({ sessions, onClear }: HistoryTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [clearError, setClearError] = useState(false);

  return (
    <div className="card">
      <h2>История</h2>

      {sessions.length === 0 ? (
        <p className="muted">Пока пусто.</p>
      ) : (
        <div className="rows">
          {sessions.map((session) => {
            const s = summarize(session);
            const open = openId === session.id;
            return (
              <div key={session.id}>
                <div
                  className="row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenId(open ? null : session.id)}
                >
                  <span className="muted">{formatDateTime(session.startedAt)}</span>
                  <span className="val">
                    {MODE_LABEL[session.mode]} ·{' '}
                    {session.aborted
                      ? `прервано, ${s.total} из ${session.plannedCount}`
                      : `${s.total} примеров`}{' '}
                    · {s.wrong} ошибок · {formatMs(s.totalMs)}{' '}
                    {!session.aborted && formatStars(s.stars)}
                  </span>
                </div>
                {open && (
                  <div className="rows" style={{ paddingLeft: '1rem', marginTop: '0.35rem' }}>
                    {session.attempts.map((a, i) => (
                      <div key={i} className={a.correct ? 'muted' : 'error'}>
                        {formatAttempt(a)} — {formatMs(a.ms)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button style={{ flex: 1 }} onClick={downloadHistory} disabled={sessions.length === 0}>
          Экспорт в JSON
        </button>
        <button
          style={{ flex: 1 }}
          disabled={sessions.length === 0}
          onClick={() => {
            if (window.confirm('Удалить всю историю? Это нельзя отменить.')) {
              if (clearHistory()) {
                setClearError(false);
                onClear();
              } else {
                setClearError(true);
              }
            }
          }}
        >
          Очистить
        </button>
      </div>
      {clearError && <p className="error">Не удалось очистить: браузер блокирует хранилище.</p>}
    </div>
  );
}
