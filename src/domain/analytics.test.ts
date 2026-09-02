import { describe, it, expect } from 'vitest';
import { byOperation, multiplicationGrid, topProblems } from './analytics';
import type { Attempt, Session } from './types';

function attempt(patch: Partial<Attempt> = {}): Attempt {
  return { op: 'mul', a: 7, b: 8, expected: 56, given: 56, correct: true, ms: 1000, ...patch };
}

function session(attempts: Attempt[], patch: Partial<Session> = {}): Session {
  return {
    id: '2026-09-01T10:00:00.000Z',
    startedAt: 1_772_000_000_000,
    mode: 'training',
    totalMs: attempts.reduce((s, a) => s + a.ms, 0),
    plannedCount: attempts.length,
    aborted: false,
    attempts,
    stars: 0,
    ...patch,
  };
}

function cellAt(grid: ReturnType<typeof multiplicationGrid>, a: number, b: number) {
  return grid.flat().find((c) => c.a === a && c.b === b)!;
}

describe('byOperation', () => {
  it('возвращает запись для каждой операции даже без данных', () => {
    const stats = byOperation([]);
    expect(stats.map((s) => s.op)).toEqual(['add', 'sub', 'mul', 'div']);
    expect(stats.every((s) => s.total === 0 && s.accuracy === 0 && s.avgMs === 0)).toBe(true);
  });

  it('считает точность и среднее время по операции', () => {
    const sessions = [
      session([
        attempt({ op: 'mul', correct: true, ms: 2000 }),
        attempt({ op: 'mul', correct: false, ms: 6000 }),
        attempt({ op: 'add', a: 2, b: 3, expected: 5, correct: true, ms: 1000 }),
      ]),
    ];
    const stats = byOperation(sessions);
    const mul = stats.find((s) => s.op === 'mul')!;
    const add = stats.find((s) => s.op === 'add')!;
    expect(mul).toMatchObject({ total: 2, correct: 1, accuracy: 0.5, avgMs: 4000 });
    expect(add).toMatchObject({ total: 1, correct: 1, accuracy: 1, avgMs: 1000 });
  });

  it('учитывает попытки из прерванных сессий', () => {
    const sessions = [session([attempt({ op: 'mul', correct: false })], { aborted: true })];
    expect(byOperation(sessions).find((s) => s.op === 'mul')!.total).toBe(1);
  });
});

describe('multiplicationGrid', () => {
  it('строит сетку 2..10 по умолчанию', () => {
    const grid = multiplicationGrid([]);
    expect(grid).toHaveLength(9);
    expect(grid[0]).toHaveLength(9);
    expect(grid[0][0]).toMatchObject({ a: 2, b: 2, total: 0, accuracy: null });
  });

  it('складывает обе перестановки множителей в одну ячейку', () => {
    const sessions = [
      session([
        attempt({ op: 'mul', a: 7, b: 8, expected: 56, correct: true }),
        attempt({ op: 'mul', a: 8, b: 7, expected: 56, correct: false, given: 54 }),
      ]),
    ];
    const grid = multiplicationGrid(sessions);
    expect(cellAt(grid, 7, 8)).toMatchObject({ total: 2, correct: 1, accuracy: 0.5 });
    expect(cellAt(grid, 8, 7)).toMatchObject({ total: 2, correct: 1, accuracy: 0.5 });
  });

  it('сводит деление к паре делитель × частное', () => {
    // 56 ÷ 8 = 7 — это та же ячейка, что 7 × 8
    const sessions = [
      session([attempt({ op: 'div', a: 56, b: 8, expected: 7, given: 7, correct: true })]),
    ];
    expect(cellAt(multiplicationGrid(sessions), 7, 8)).toMatchObject({ total: 1, correct: 1 });
  });

  it('игнорирует сложение и вычитание', () => {
    const sessions = [
      session([
        attempt({ op: 'add', a: 7, b: 8, expected: 15, correct: true }),
        attempt({ op: 'sub', a: 8, b: 7, expected: 1, correct: true }),
      ]),
    ];
    expect(multiplicationGrid(sessions).flat().every((c) => c.total === 0)).toBe(true);
  });

  it('игнорирует множители вне диапазона сетки', () => {
    const sessions = [
      session([attempt({ op: 'mul', a: 12, b: 3, expected: 36, correct: true })]),
    ];
    expect(multiplicationGrid(sessions).flat().every((c) => c.total === 0)).toBe(true);
  });
});

describe('topProblems', () => {
  it('на пустой истории даёт пустые списки', () => {
    expect(topProblems([])).toEqual({ byErrors: [], bySlowness: [] });
  });

  it('сортирует по доле ошибок и не включает безошибочные', () => {
    const sessions = [
      session([
        attempt({ op: 'mul', a: 7, b: 8, expected: 56, correct: false, given: 54 }),
        attempt({ op: 'mul', a: 7, b: 8, expected: 56, correct: false, given: 55 }),
        attempt({ op: 'mul', a: 6, b: 3, expected: 18, correct: false, given: 15 }),
        attempt({ op: 'mul', a: 6, b: 3, expected: 18, correct: true, given: 18 }),
        attempt({ op: 'mul', a: 2, b: 2, expected: 4, correct: true, given: 4 }),
      ]),
    ];
    const { byErrors } = topProblems(sessions);
    expect(byErrors.map((p) => `${p.a}×${p.b}`)).toEqual(['7×8', '6×3']);
    expect(byErrors[0]).toMatchObject({ total: 2, wrong: 2, errorRate: 1 });
    expect(byErrors[1]).toMatchObject({ total: 2, wrong: 1, errorRate: 0.5 });
  });

  it('ставит выше пример с большим числом ошибок, даже если доля ошибок ниже', () => {
    // 7×8: 8 ошибок из 20 (errorRate 0.4) — устойчиво не усвоенный пример.
    // 2×2: 1 ошибка из 1 (errorRate 1.0) — единственный показ, могла быть случайность.
    // Старый компаратор (по errorRate) ставил 2×2 выше 7×8 — это и есть баг.
    const oftenWrong = Array.from({ length: 20 }, (_, i) =>
      attempt({ op: 'mul', a: 7, b: 8, expected: 56, correct: i >= 8, given: i >= 8 ? 56 : 0 }),
    );
    const sessions = [
      session([...oftenWrong, attempt({ op: 'mul', a: 2, b: 2, expected: 4, correct: false, given: 0 })]),
    ];
    const { byErrors } = topProblems(sessions);
    expect(byErrors.map((p) => `${p.a}×${p.b}`)).toEqual(['7×8', '2×2']);
    expect(byErrors[0]).toMatchObject({ wrong: 8, total: 20, errorRate: 0.4 });
    expect(byErrors[1]).toMatchObject({ wrong: 1, total: 1, errorRate: 1 });
  });

  it('сортирует по среднему времени', () => {
    const sessions = [
      session([
        attempt({ op: 'mul', a: 2, b: 2, expected: 4, ms: 500 }),
        attempt({ op: 'mul', a: 9, b: 7, expected: 63, ms: 9000 }),
        attempt({ op: 'mul', a: 4, b: 4, expected: 16, ms: 3000 }),
      ]),
    ];
    const { bySlowness } = topProblems(sessions);
    expect(bySlowness.map((p) => p.avgMs)).toEqual([9000, 3000, 500]);
  });

  it('усредняет время по всем встречам примера', () => {
    const sessions = [
      session([
        attempt({ op: 'mul', a: 9, b: 7, expected: 63, ms: 1000 }),
        attempt({ op: 'mul', a: 9, b: 7, expected: 63, ms: 3000 }),
      ]),
    ];
    expect(topProblems(sessions).bySlowness[0].avgMs).toBe(2000);
  });

  it('уважает limit', () => {
    const attempts = Array.from({ length: 15 }, (_, i) =>
      attempt({ op: 'mul', a: i + 2, b: 2, expected: (i + 2) * 2, correct: false, given: 0, ms: i * 100 }),
    );
    const { byErrors, bySlowness } = topProblems([session(attempts)], 10);
    expect(byErrors).toHaveLength(10);
    expect(bySlowness).toHaveLength(10);
  });
});
