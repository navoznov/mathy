import { OPS } from './types';
import type { Attempt, Op, Session } from './types';

export interface OpStats {
  op: Op;
  total: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  avgMs: number;
}

export interface GridCell {
  a: number;
  b: number;
  total: number;
  correct: number;
  /** null — данных по ячейке ещё нет. */
  accuracy: number | null;
}

export interface ProblemStat {
  op: Op;
  a: number;
  b: number;
  expected: number;
  total: number;
  wrong: number;
  /** 0..1 */
  errorRate: number;
  avgMs: number;
}

function allAttempts(sessions: Session[]): Attempt[] {
  // прерванные сессии учитываются наравне: эти примеры ребёнок действительно решал
  return sessions.flatMap((s) => s.attempts);
}

export function byOperation(sessions: Session[]): OpStats[] {
  const attempts = allAttempts(sessions);
  return OPS.map((op) => {
    const own = attempts.filter((a) => a.op === op);
    const total = own.length;
    const correct = own.filter((a) => a.correct).length;
    const ms = own.reduce((sum, a) => sum + a.ms, 0);
    return {
      op,
      total,
      correct,
      accuracy: total === 0 ? 0 : correct / total,
      avgMs: total === 0 ? 0 : ms / total,
    };
  });
}

/**
 * Пара множителей, к которой сводится попытка.
 * Умножение — это сами операнды; деление — делитель и частное
 * (56 ÷ 8 = 7 попадает в ту же ячейку, что 7 × 8).
 */
function factorsOf(a: Attempt): [number, number] | null {
  if (a.op === 'mul') return [a.a, a.b];
  if (a.op === 'div') return [a.b, a.expected];
  return null;
}

function pairKey(x: number, y: number): string {
  return x <= y ? `${x}x${y}` : `${y}x${x}`;
}

export function multiplicationGrid(sessions: Session[], min = 2, max = 10): GridCell[][] {
  const totals = new Map<string, { total: number; correct: number }>();

  for (const attempt of allAttempts(sessions)) {
    const factors = factorsOf(attempt);
    if (!factors) continue;
    const [x, y] = factors;
    if (x < min || x > max || y < min || y > max) continue;
    const key = pairKey(x, y);
    const acc = totals.get(key) ?? { total: 0, correct: 0 };
    acc.total += 1;
    if (attempt.correct) acc.correct += 1;
    totals.set(key, acc);
  }

  const axis = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return axis.map((a) =>
    axis.map((b) => {
      const acc = totals.get(pairKey(a, b)) ?? { total: 0, correct: 0 };
      return {
        a,
        b,
        total: acc.total,
        correct: acc.correct,
        accuracy: acc.total === 0 ? null : acc.correct / acc.total,
      };
    }),
  );
}

export function topProblems(
  sessions: Session[],
  limit = 10,
): { byErrors: ProblemStat[]; bySlowness: ProblemStat[] } {
  const groups = new Map<string, { attempt: Attempt; total: number; wrong: number; ms: number }>();

  for (const attempt of allAttempts(sessions)) {
    const key = `${attempt.op}:${attempt.a}:${attempt.b}`;
    const acc = groups.get(key) ?? { attempt, total: 0, wrong: 0, ms: 0 };
    acc.total += 1;
    if (!attempt.correct) acc.wrong += 1;
    acc.ms += attempt.ms;
    groups.set(key, acc);
  }

  const stats: ProblemStat[] = [...groups.values()].map(({ attempt, total, wrong, ms }) => ({
    op: attempt.op,
    a: attempt.a,
    b: attempt.b,
    expected: attempt.expected,
    total,
    wrong,
    errorRate: wrong / total,
    avgMs: ms / total,
  }));

  // Ранжируем по числу ошибок, а не по их доле: сложение и вычитание берут
  // примеры почти без повторов (каждый — total: 1), поэтому единственный
  // промах там даёт errorRate 1.0 и забивает топ первыми попавшимися
  // случайностями, отодвигая реально не усвоенные (но повторяющиеся)
  // примеры умножения с более низкой долей, но большим числом ошибок.
  const byErrors = stats
    .filter((s) => s.wrong > 0)
    .sort((x, y) => y.wrong - x.wrong || y.errorRate - x.errorRate)
    .slice(0, limit);

  const bySlowness = [...stats].sort((x, y) => y.avgMs - x.avgMs).slice(0, limit);

  return { byErrors, bySlowness };
}
