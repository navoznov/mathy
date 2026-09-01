import type { Session } from '../domain/types';
import { readRaw, removeRaw, writeRaw } from './safeStorage';

export const HISTORY_KEY = 'mathy.history';
export const HISTORY_CAP = 200;

/**
 * Неизвестные поля игнорируются, отсутствующие получают значения по умолчанию.
 * Записи без id или без массива попыток отбрасываются целиком.
 */
function normalize(value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) return null;
  const s = value as Partial<Session>;
  if (typeof s.id !== 'string' || !Array.isArray(s.attempts)) return null;

  return {
    id: s.id,
    startedAt: typeof s.startedAt === 'number' ? s.startedAt : 0,
    totalMs: typeof s.totalMs === 'number' ? s.totalMs : 0,
    plannedCount: typeof s.plannedCount === 'number' ? s.plannedCount : s.attempts.length,
    aborted: s.aborted === true,
    attempts: s.attempts,
    stars: typeof s.stars === 'number' ? s.stars : 0,
  };
}

export function loadHistory(): Session[] {
  const raw = readRaw(HISTORY_KEY);
  if (raw === null) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((s): s is Session => s !== null);
  } catch {
    return [];
  }
}

export function appendSession(session: Session): { list: Session[]; saved: boolean } {
  // сессия без единого ответа — это случайное нажатие «Начать», в историю не идёт
  if (session.attempts.length === 0) return { list: loadHistory(), saved: true };

  const list = [session, ...loadHistory()].slice(0, HISTORY_CAP);
  const saved = writeRaw(HISTORY_KEY, JSON.stringify(list));
  return { list, saved };
}

export function clearHistory(): boolean {
  return removeRaw(HISTORY_KEY);
}

/** Экспорт делается с отступами: этот JSON читает человек, а не хранилище. */
export function exportHistory(): string {
  return JSON.stringify(loadHistory(), null, 2);
}
