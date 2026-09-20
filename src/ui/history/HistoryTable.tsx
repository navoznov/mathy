import { useState } from 'react';
import type { FormEvent } from 'react';
import { summarize } from '../../domain/scoring';
import type { Session } from '../../domain/types';
import { clearHistory, exportHistory } from '../../storage/history';
import { formatAttempt, formatDateTime, formatMs, formatStars } from '../format';
import { ModeBadge } from '../ModeBadge';

const PAGE_SIZE = 20;

interface HistoryTableProps {
  sessions: Session[];
  /** Код от настроек: очистка доступна только тому, кто его знает. */
  adminPin: string | null;
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

export function HistoryTable({ sessions, adminPin, onClear }: HistoryTableProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [clearError, setClearError] = useState(false);
  const [page, setPage] = useState(0);
  const [asking, setAsking] = useState(false);
  const [entered, setEntered] = useState('');
  const [pinError, setPinError] = useState(false);

  const pageCount = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  // История может укоротиться под ногами (очистка), а номер страницы в стейте —
  // нет: без зажима получим пустой список на несуществующей странице.
  const current = Math.min(page, pageCount - 1);
  const visible = sessions.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const goTo = (next: number): void => {
    setPage(next);
    setOpenId(null);
  };

  const clear = (): void => {
    if (clearHistory()) {
      setClearError(false);
      setAsking(false);
      setEntered('');
      onClear();
    } else {
      setClearError(true);
    }
  };

  const requestClear = (): void => {
    // Код не задан — барьера нет, ровно как у входа в настройки.
    if (adminPin === null) {
      if (window.confirm('Удалить всю историю? Это нельзя отменить.')) clear();
      return;
    }
    setAsking(true);
  };

  const submitPin = (e: FormEvent): void => {
    e.preventDefault();
    // Введённый код — он же подтверждение: второго диалога нет намеренно.
    if (entered === adminPin) {
      clear();
    } else {
      setPinError(true);
      setEntered('');
    }
  };

  return (
    <div className="card">
      <h2>История</h2>

      {sessions.length === 0 ? (
        <p className="muted">Пока пусто.</p>
      ) : (
        <div className="rows">
          {visible.map((session) => {
            const s = summarize(session);
            const open = openId === session.id;
            return (
              <div key={session.id}>
                <div
                  className="row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenId(open ? null : session.id)}
                >
                  <span className="muted when">
                    {formatDateTime(session.startedAt)} <ModeBadge mode={session.mode} />
                  </span>
                  <span className="val">
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

      {pageCount > 1 && (
        <div className="pager">
          <button onClick={() => goTo(current - 1)} disabled={current === 0}>
            ← Новее
          </button>
          <span className="muted">
            {current + 1} / {pageCount}
          </span>
          <button onClick={() => goTo(current + 1)} disabled={current === pageCount - 1}>
            Старее →
          </button>
        </div>
      )}

      {asking ? (
        <form style={{ marginTop: '1rem' }} onSubmit={submitPin}>
          <div className="field">
            <label htmlFor="clear-pin">Код администратора</label>
            <input
              id="clear-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={entered}
              onChange={(e) => {
                setEntered(e.target.value);
                setPinError(false);
              }}
            />
          </div>
          {pinError && <p className="error">Неверный код</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ flex: 1 }} type="submit">
              Удалить
            </button>
            <button
              style={{ flex: 1 }}
              type="button"
              onClick={() => {
                setAsking(false);
                setEntered('');
                setPinError(false);
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button style={{ flex: 1 }} onClick={downloadHistory} disabled={sessions.length === 0}>
            Экспорт в JSON
          </button>
          <button style={{ flex: 1 }} disabled={sessions.length === 0} onClick={requestClear}>
            Очистить
          </button>
        </div>
      )}
      {clearError && <p className="error">Не удалось очистить: браузер блокирует хранилище.</p>}
    </div>
  );
}
