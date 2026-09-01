import { OPS } from './types';
import type { Op, OpConfig, Settings, Task } from './types';

export class InvalidSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSettingsError';
  }
}

const MAX_ATTEMPTS = 50;
const CARRY_ATTEMPTS = 200;

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function keyOf(t: Task): string {
  return `${t.op}:${t.a}:${t.b}`;
}

function enabledOps(settings: Settings): Op[] {
  return OPS.filter((op) => settings.ops[op].enabled);
}

function validate(settings: Settings): void {
  if (!Number.isInteger(settings.taskCount) || settings.taskCount < 1) {
    throw new InvalidSettingsError('Количество примеров должно быть целым числом не меньше 1');
  }

  const ops = enabledOps(settings);
  if (ops.length === 0) {
    throw new InvalidSettingsError('Не включена ни одна операция');
  }

  for (const op of ops) {
    const c = settings.ops[op];
    if (c.aMin > c.aMax || c.bMin > c.bMax) {
      throw new InvalidSettingsError(`Вывернутый диапазон в операции «${op}»`);
    }
    if (op === 'div' && c.bMin < 1) {
      throw new InvalidSettingsError('Делитель не может быть меньше 1');
    }
    if (op === 'sub' && !settings.allowNegative && c.aMax < c.bMin) {
      throw new InvalidSettingsError(
        'Вычитание без отрицательных ответов невозможно: уменьшаемое всегда меньше вычитаемого',
      );
    }
    if (op === 'add' && settings.requireCarry && !carryPossible(c)) {
      throw new InvalidSettingsError(
        'Сложение с переходом через десяток невозможно в заданных диапазонах',
      );
    }
  }
}

/** Существует ли пара из диапазонов, дающая переход через десяток. */
function carryPossible(c: OpConfig): boolean {
  const units = (min: number, max: number): Set<number> => {
    const set = new Set<number>();
    for (let v = min; v <= max && set.size < 10; v++) set.add(v % 10);
    return set;
  };
  const ua = units(c.aMin, c.aMax);
  const ub = units(c.bMin, c.bMax);
  for (const x of ua) for (const y of ub) if (x + y >= 10) return true;
  return false;
}

function makeTask(op: Op, settings: Settings, rng: () => number): Task {
  const c = settings.ops[op];

  if (op === 'add') {
    if (settings.requireCarry) {
      for (let i = 0; i < CARRY_ATTEMPTS; i++) {
        const a = randInt(rng, c.aMin, c.aMax);
        const b = randInt(rng, c.bMin, c.bMax);
        if ((a % 10) + (b % 10) >= 10) return { op, a, b, expected: a + b };
      }
      throw new InvalidSettingsError(
        'Сложение с переходом через десяток невозможно в заданных диапазонах',
      );
    }
    const a = randInt(rng, c.aMin, c.aMax);
    const b = randInt(rng, c.bMin, c.bMax);
    return { op, a, b, expected: a + b };
  }

  if (op === 'sub') {
    if (settings.allowNegative) {
      const a = randInt(rng, c.aMin, c.aMax);
      const b = randInt(rng, c.bMin, c.bMax);
      return { op, a, b, expected: a - b };
    }
    // a не меньше bMin — тогда подходящее b гарантированно существует
    const a = randInt(rng, Math.max(c.aMin, c.bMin), c.aMax);
    const b = randInt(rng, c.bMin, Math.min(c.bMax, a));
    return { op, a, b, expected: a - b };
  }

  if (op === 'mul') {
    const a = randInt(rng, c.aMin, c.aMax);
    const b = randInt(rng, c.bMin, c.bMax);
    return { op, a, b, expected: a * b };
  }

  // div: генерируем от ответа — делимое собирается из делителя и частного
  const divisor = randInt(rng, c.bMin, c.bMax);
  const quotient = randInt(rng, c.aMin, c.aMax);
  return { op, a: divisor * quotient, b: divisor, expected: quotient };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Раскладывает taskCount по включённым операциям поровну.
 * Остаток достаётся первым по порядку. Независимый random() на каждом шаге
 * регулярно даёт перекос (11 сложений и 2 умножения на 15 примеров).
 */
function planOps(settings: Settings, rng: () => number): Op[] {
  const ops = enabledOps(settings);
  const base = Math.floor(settings.taskCount / ops.length);
  const remainder = settings.taskCount % ops.length;
  const plan: Op[] = [];
  ops.forEach((op, i) => {
    const n = base + (i < remainder ? 1 : 0);
    for (let k = 0; k < n; k++) plan.push(op);
  });
  return shuffle(plan, rng);
}

export function generateTasks(settings: Settings, rng: () => number = Math.random): Task[] {
  validate(settings);

  const plan = planOps(settings, rng);
  const tasks: Task[] = [];
  const seen = new Set<string>();

  for (const op of plan) {
    let task: Task | null = null;

    // сначала пытаемся найти пример, которого ещё не было в этой сессии
    for (let i = 0; i < MAX_ATTEMPTS && !task; i++) {
      const candidate = makeTask(op, settings, rng);
      if (!seen.has(keyOf(candidate))) task = candidate;
    }

    // пространство исчерпано — разрешаем повтор, но не подряд
    for (let i = 0; i < MAX_ATTEMPTS && !task; i++) {
      const candidate = makeTask(op, settings, rng);
      const prev = tasks[tasks.length - 1];
      if (!prev || keyOf(candidate) !== keyOf(prev)) task = candidate;
    }

    // возможен единственный пример на всё пространство — берём как есть
    task ??= makeTask(op, settings, rng);

    seen.add(keyOf(task));
    tasks.push(task);
  }

  return tasks;
}

/**
 * Верхняя оценка числа уникальных примеров.
 * Ограничение requireCarry не учитывается, поэтому это именно верхняя граница —
 * предупреждение в форме настроек формулируется как «не более N».
 */
export function uniqueTaskSpace(settings: Settings): number {
  return enabledOps(settings).reduce((sum, op) => {
    const c = settings.ops[op];
    const spanA = Math.max(0, c.aMax - c.aMin + 1);
    const spanB = Math.max(0, c.bMax - c.bMin + 1);
    return sum + spanA * spanB;
  }, 0);
}
