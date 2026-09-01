import { describe, it, expect } from 'vitest';
import { checkAnswer, calcStars, summarize } from './scoring';
import type { Attempt, Session } from './types';

function attempt(patch: Partial<Attempt> = {}): Attempt {
  return { op: 'mul', a: 7, b: 8, expected: 56, given: 56, correct: true, ms: 1000, ...patch };
}

function session(attempts: Attempt[], patch: Partial<Session> = {}): Session {
  return {
    id: '2026-09-01T10:00:00.000Z',
    startedAt: 1_772_000_000_000,
    totalMs: attempts.reduce((s, a) => s + a.ms, 0),
    plannedCount: attempts.length,
    aborted: false,
    attempts,
    stars: 0,
    ...patch,
  };
}

describe('checkAnswer', () => {
  it('принимает точное совпадение', () => {
    expect(checkAnswer({ op: 'mul', a: 7, b: 8, expected: 56 }, 56)).toBe(true);
  });

  it('отвергает всё остальное', () => {
    expect(checkAnswer({ op: 'mul', a: 7, b: 8, expected: 56 }, 54)).toBe(false);
  });

  it('работает с отрицательными ответами', () => {
    expect(checkAnswer({ op: 'sub', a: 3, b: 10, expected: -7 }, -7)).toBe(true);
  });
});

describe('calcStars', () => {
  it('даёт 5 звёзд без ошибок', () => {
    expect(calcStars(0, false)).toBe(5);
  });

  it('снимает по звезде за ошибку', () => {
    expect(calcStars(1, false)).toBe(4);
    expect(calcStars(4, false)).toBe(1);
  });

  it('не уходит в минус', () => {
    expect(calcStars(5, false)).toBe(0);
    expect(calcStars(7, false)).toBe(0);
  });

  it('даёт 0 звёзд прерванной сессии даже без ошибок', () => {
    expect(calcStars(0, true)).toBe(0);
  });
});

describe('summarize', () => {
  it('считает правильные, ошибки и долю ошибок', () => {
    const s = summarize(
      session([
        attempt({ correct: true }),
        attempt({ correct: false, given: 54 }),
        attempt({ correct: true }),
        attempt({ correct: false, given: 55 }),
      ]),
    );
    expect(s.total).toBe(4);
    expect(s.correct).toBe(2);
    expect(s.wrong).toBe(2);
    expect(s.errorRate).toBe(0.5);
    expect(s.stars).toBe(3);
  });

  it('считает среднее время на пример', () => {
    const s = summarize(session([attempt({ ms: 1000 }), attempt({ ms: 3000 })]));
    expect(s.totalMs).toBe(4000);
    expect(s.avgMs).toBe(2000);
  });

  it('находит самый долгий пример', () => {
    const slow = attempt({ a: 9, b: 6, expected: 54, ms: 9000 });
    const s = summarize(session([attempt({ ms: 500 }), slow, attempt({ ms: 800 })]));
    expect(s.slowest).toEqual(slow);
  });

  it('собирает список ошибок в порядке решения', () => {
    const first = attempt({ a: 6, b: 7, expected: 42, given: 40, correct: false });
    const second = attempt({ a: 8, b: 9, expected: 72, given: 71, correct: false });
    const s = summarize(session([first, attempt(), second]));
    expect(s.mistakes).toEqual([first, second]);
  });

  it('на пустой сессии не даёт NaN', () => {
    const s = summarize(session([], { totalMs: 0 }));
    expect(s.total).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(s.avgMs).toBe(0);
    expect(s.slowest).toBeNull();
    expect(s.mistakes).toEqual([]);
  });

  it('обнуляет звёзды прерванной сессии', () => {
    const s = summarize(session([attempt(), attempt()], { aborted: true }));
    expect(s.wrong).toBe(0);
    expect(s.stars).toBe(0);
  });
});
