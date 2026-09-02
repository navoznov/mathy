import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HISTORY_CAP, HISTORY_KEY, appendSession, clearHistory, exportHistory, loadHistory } from './history';
import type { Attempt, Session } from '../domain/types';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function attempt(patch: Partial<Attempt> = {}): Attempt {
  return { op: 'mul', a: 7, b: 8, expected: 56, given: 56, correct: true, ms: 1000, ...patch };
}

function session(n: number, patch: Partial<Session> = {}): Session {
  const attempts = [attempt()];
  return {
    id: `2026-09-01T10:00:${String(n).padStart(2, '0')}.000Z`,
    startedAt: 1_772_000_000_000 + n,
    totalMs: 1000,
    plannedCount: 1,
    aborted: false,
    attempts,
    stars: 5,
    ...patch,
  };
}

describe('loadHistory', () => {
  it('на пустом хранилище возвращает пустой список', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('не падает на битом JSON', () => {
    localStorage.setItem(HISTORY_KEY, 'не json вовсе');
    expect(loadHistory()).toEqual([]);
  });

  it('не падает, если под ключом лежит не массив', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ oops: true }));
    expect(loadHistory()).toEqual([]);
  });

  it('отбрасывает записи без обязательных полей', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([{ id: 'x' }, session(1)]));
    expect(loadHistory()).toHaveLength(1);
  });

  it('подставляет значения по умолчанию для отсутствующих полей', () => {
    const legacy = { id: 'old', startedAt: 1, totalMs: 500, attempts: [attempt()], stars: 5 };
    localStorage.setItem(HISTORY_KEY, JSON.stringify([legacy]));
    const [loaded] = loadHistory();
    expect(loaded.aborted).toBe(false);
    expect(loaded.plannedCount).toBe(1);
  });

  it('не падает, когда localStorage недоступен', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadHistory()).toEqual([]);
  });
});

describe('appendSession', () => {
  it('кладёт новую сессию в начало списка', () => {
    appendSession(session(1));
    const { list } = appendSession(session(2));
    expect(list.map((s) => s.id)).toEqual([session(2).id, session(1).id]);
  });

  it('сохраняет между вызовами', () => {
    appendSession(session(1));
    expect(loadHistory()).toHaveLength(1);
  });

  it('сохраняет прерванную сессию', () => {
    appendSession(session(1, { aborted: true, plannedCount: 15, stars: 0 }));
    expect(loadHistory()[0]).toMatchObject({ aborted: true, plannedCount: 15, stars: 0 });
  });

  it('не сохраняет сессию без единого ответа', () => {
    const { list } = appendSession(session(1, { aborted: true, attempts: [], totalMs: 0 }));
    expect(list).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });

  it(`обрезает историю до ${HISTORY_CAP} записей, выбрасывая самые старые`, () => {
    for (let i = 0; i < HISTORY_CAP + 5; i++) appendSession(session(i));
    const list = loadHistory();
    expect(list).toHaveLength(HISTORY_CAP);
    expect(list[0].id).toBe(session(HISTORY_CAP + 4).id);
    expect(list.some((s) => s.id === session(0).id)).toBe(false);
  });

  it('пишет компактный JSON без отступов', () => {
    appendSession(session(1));
    expect(localStorage.getItem(HISTORY_KEY)).not.toContain('\n');
  });

  it('возвращает saved: false и не бросает при заблокированном хранилище', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(appendSession(session(1)).saved).toBe(false);
  });
});

describe('clearHistory', () => {
  it('удаляет всё', () => {
    appendSession(session(1));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it('возвращает false и не бросает при заблокированном хранилище', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(clearHistory()).toBe(false);
  });
});

describe('exportHistory', () => {
  it('отдаёт читаемый JSON со всеми сессиями', () => {
    appendSession(session(1));
    appendSession(session(2));
    const exported = exportHistory();
    expect(exported).toContain('\n');
    expect(JSON.parse(exported)).toHaveLength(2);
  });
});
