export type Op = 'add' | 'sub' | 'mul' | 'div';

export const OPS: readonly Op[] = ['add', 'sub', 'mul', 'div'];

export const OP_SYMBOL: Record<Op, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
};

export const OP_LABEL: Record<Op, string> = {
  add: 'Сложение',
  sub: 'Вычитание',
  mul: 'Умножение',
  div: 'Деление',
};

export interface OpConfig {
  enabled: boolean;
  /** Для div — диапазон частного (ответа). */
  aMin: number;
  aMax: number;
  /** Для div — диапазон делителя. */
  bMin: number;
  bMax: number;
}

export interface Settings {
  version: 1;
  taskCount: number;
  ops: Record<Op, OpConfig>;
  requireCarry: boolean;
  allowNegative: boolean;
  instantFeedback: boolean;
  adminPin: string | null;
}

export interface Task {
  op: Op;
  a: number;
  b: number;
  expected: number;
}

export interface Attempt {
  op: Op;
  a: number;
  b: number;
  expected: number;
  given: number;
  correct: boolean;
  /** Время именно на этот пример, мс. */
  ms: number;
}

export interface Session {
  /** ISO-timestamp, он же ключ сортировки. */
  id: string;
  startedAt: number;
  /** Сумма attempt.ms, а не wall-clock. */
  totalMs: number;
  plannedCount: number;
  aborted: boolean;
  attempts: Attempt[];
  /** Что было начислено в момент сессии. Правило начисления временное и может
   * измениться, поэтому для отображения всегда используйте summarize(), а не это поле. */
  stars: number;
}

export interface Summary {
  total: number;
  correct: number;
  wrong: number;
  /** 0..1 */
  errorRate: number;
  stars: number;
  totalMs: number;
  avgMs: number;
  slowest: Attempt | null;
  mistakes: Attempt[];
}
