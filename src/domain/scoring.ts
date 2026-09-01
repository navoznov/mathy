import type { Session, Summary, Task } from './types';

export const MAX_STARS = 5;

export function checkAnswer(task: Task, given: number): boolean {
  return given === task.expected;
}

/**
 * Единственное место, где живёт формула звёзд. Замена правила —
 * правка только этой функции и её тестов.
 *
 * Известное ограничение: правило не учитывает объём — 3 ошибки из 5
 * и 3 из 30 дают одинаковый результат. Принято как временное.
 *
 * Прерванная сессия всегда получает 0: иначе «начать и сразу прервать»
 * приносит максимум звёзд за ноль работы.
 */
export function calcStars(wrong: number, aborted: boolean): number {
  if (aborted) return 0;
  return Math.max(0, MAX_STARS - wrong);
}

export function summarize(session: Session): Summary {
  const { attempts } = session;
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const wrong = total - correct;

  return {
    total,
    correct,
    wrong,
    errorRate: total === 0 ? 0 : wrong / total,
    stars: calcStars(wrong, session.aborted),
    totalMs: session.totalMs,
    avgMs: total === 0 ? 0 : session.totalMs / total,
    slowest: total === 0 ? null : attempts.reduce((m, a) => (a.ms > m.ms ? a : m)),
    mistakes: attempts.filter((a) => !a.correct),
  };
}
