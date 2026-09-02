import { describe, it, expect } from 'vitest';
import { generateTasks, uniqueTaskSpace, InvalidSettingsError } from './generator';
import type { Op, Settings } from './types';

const OFF = { enabled: false, aMin: 2, aMax: 10, bMin: 2, bMax: 10 };

function makeSettings(patch: Partial<Settings> = {}): Settings {
  return {
    version: 1,
    taskCount: 12,
    ops: { add: { ...OFF }, sub: { ...OFF }, mul: { ...OFF }, div: { ...OFF } },
    requireCarry: false,
    allowNegative: false,
    instantFeedback: true,
    adminPin: null,
    ...patch,
  };
}

function only(op: Op, cfg: Partial<Settings['ops'][Op]> = {}, patch: Partial<Settings> = {}): Settings {
  const s = makeSettings(patch);
  s.ops[op] = { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10, ...cfg };
  return s;
}

describe('generateTasks — количество и диапазоны', () => {
  it('возвращает ровно taskCount примеров', () => {
    const tasks = generateTasks(only('add', {}, { taskCount: 17 }));
    expect(tasks).toHaveLength(17);
  });

  it('соблюдает заданные диапазоны операндов', () => {
    const tasks = generateTasks(only('add', { aMin: 5, aMax: 9, bMin: 20, bMax: 30 }));
    for (const t of tasks) {
      expect(t.a).toBeGreaterThanOrEqual(5);
      expect(t.a).toBeLessThanOrEqual(9);
      expect(t.b).toBeGreaterThanOrEqual(20);
      expect(t.b).toBeLessThanOrEqual(30);
    }
  });

  it('считает expected правильно для каждой операции', () => {
    for (const op of ['add', 'sub', 'mul', 'div'] as Op[]) {
      for (const t of generateTasks(only(op))) {
        const expected = { add: t.a + t.b, sub: t.a - t.b, mul: t.a * t.b, div: t.a / t.b }[op];
        expect(t.expected).toBe(expected);
      }
    }
  });
});

describe('generateTasks — правила по операциям', () => {
  it('деление всегда даёт целый результат', () => {
    for (const t of generateTasks(only('div', { aMin: 2, aMax: 9, bMin: 3, bMax: 7 }, { taskCount: 50 }))) {
      expect(Number.isInteger(t.a / t.b)).toBe(true);
      expect(t.a % t.b).toBe(0);
    }
  });

  it('деление держит частное и делитель в своих диапазонах', () => {
    for (const t of generateTasks(only('div', { aMin: 4, aMax: 6, bMin: 3, bMax: 3 }, { taskCount: 20 }))) {
      expect(t.b).toBe(3);
      expect(t.expected).toBeGreaterThanOrEqual(4);
      expect(t.expected).toBeLessThanOrEqual(6);
    }
  });

  it('вычитание не даёт отрицательных при allowNegative: false', () => {
    const s = only('sub', { aMin: 2, aMax: 30, bMin: 2, bMax: 30 }, { taskCount: 50, allowNegative: false });
    for (const t of generateTasks(s)) {
      expect(t.expected).toBeGreaterThanOrEqual(0);
    }
  });

  it('при allowNegative: true отрицательные разрешены', () => {
    const s = only('sub', { aMin: 1, aMax: 3, bMin: 50, bMax: 60 }, { taskCount: 20, allowNegative: true });
    const tasks = generateTasks(s);
    expect(tasks.every((t) => t.expected < 0)).toBe(true);
  });

  it('при requireCarry каждое сложение с переходом через десяток', () => {
    const s = only('add', { aMin: 2, aMax: 99, bMin: 2, bMax: 99 }, { taskCount: 50, requireCarry: true });
    for (const t of generateTasks(s)) {
      expect((t.a % 10) + (t.b % 10)).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('generateTasks — распределение и повторы', () => {
  it('делит примеры поровну между включёнными операциями', () => {
    const s = makeSettings({ taskCount: 12 });
    s.ops.add = { enabled: true, aMin: 2, aMax: 99, bMin: 2, bMax: 99 };
    s.ops.sub = { enabled: true, aMin: 2, aMax: 99, bMin: 2, bMax: 99 };
    s.ops.mul = { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10 };
    const counts: Record<string, number> = {};
    for (const t of generateTasks(s)) counts[t.op] = (counts[t.op] ?? 0) + 1;
    expect(counts).toEqual({ add: 4, sub: 4, mul: 4 });
  });

  it('раздаёт остаток, а не теряет примеры', () => {
    const s = makeSettings({ taskCount: 10 });
    s.ops.add = { enabled: true, aMin: 2, aMax: 99, bMin: 2, bMax: 99 };
    s.ops.mul = { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10 };
    s.ops.div = { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10 };
    const tasks = generateTasks(s);
    expect(tasks).toHaveLength(10);
    const counts = tasks.reduce<Record<string, number>>((acc, t) => {
      acc[t.op] = (acc[t.op] ?? 0) + 1;
      return acc;
    }, {});
    expect(Object.values(counts).sort()).toEqual([3, 3, 4]);
  });

  it('не повторяет один и тот же пример, пока хватает вариантов', () => {
    const tasks = generateTasks(only('mul', { aMin: 2, aMax: 10, bMin: 2, bMax: 10 }, { taskCount: 20 }));
    const keys = tasks.map((t) => `${t.op}:${t.a}:${t.b}`);
    expect(new Set(keys).size).toBe(20);
  });

  it('на вырожденных настройках завершается и не ставит дубли подряд', () => {
    // 2..3 × 2..3 — всего 4 уникальных примера, запрошено 15
    const tasks = generateTasks(only('mul', { aMin: 2, aMax: 3, bMin: 2, bMax: 3 }, { taskCount: 15 }));
    expect(tasks).toHaveLength(15);
    for (let i = 1; i < tasks.length; i++) {
      const prev = tasks[i - 1];
      const cur = tasks[i];
      expect(`${prev.a}:${prev.b}`).not.toBe(`${cur.a}:${cur.b}`);
    }
  });

  it('переживает единственный возможный пример', () => {
    const tasks = generateTasks(only('mul', { aMin: 3, aMax: 3, bMin: 3, bMax: 3 }, { taskCount: 5 }));
    expect(tasks).toHaveLength(5);
    expect(tasks.every((t) => t.a === 3 && t.b === 3)).toBe(true);
  });

  it('детерминирован при заданном rng', () => {
    const seeded = () => {
      let i = 0;
      const values = [0.1, 0.9, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.05];
      return () => values[i++ % values.length];
    };
    const s = only('add', { aMin: 2, aMax: 50, bMin: 2, bMax: 50 }, { taskCount: 8 });
    expect(generateTasks(s, seeded())).toEqual(generateTasks(s, seeded()));
  });
});

describe('generateTasks — невозможные настройки', () => {
  it('бросает, если не включена ни одна операция', () => {
    expect(() => generateTasks(makeSettings())).toThrow(InvalidSettingsError);
  });

  it('бросает при taskCount меньше единицы', () => {
    expect(() => generateTasks(only('add', {}, { taskCount: 0 }))).toThrow(InvalidSettingsError);
  });

  it('бросает при вывернутом диапазоне', () => {
    expect(() => generateTasks(only('add', { aMin: 10, aMax: 2 }))).toThrow(InvalidSettingsError);
  });

  it('бросает при делителе меньше единицы', () => {
    expect(() => generateTasks(only('div', { bMin: 0, bMax: 5 }))).toThrow(InvalidSettingsError);
  });

  it('бросает, если вычитание без отрицательных невозможно', () => {
    // все a меньше любого b — неотрицательной разности не существует
    const s = only('sub', { aMin: 2, aMax: 5, bMin: 10, bMax: 20 }, { allowNegative: false });
    expect(() => generateTasks(s)).toThrow(InvalidSettingsError);
  });

  it('бросает, если переход через десяток недостижим', () => {
    const s = only('add', { aMin: 1, aMax: 3, bMin: 1, bMax: 3 }, { requireCarry: true });
    expect(() => generateTasks(s)).toThrow(InvalidSettingsError);
  });
});

describe('uniqueTaskSpace', () => {
  it('перемножает размеры диапазонов', () => {
    expect(uniqueTaskSpace(only('mul', { aMin: 2, aMax: 3, bMin: 2, bMax: 3 }))).toBe(4);
  });

  it('складывает пространства включённых операций', () => {
    const s = only('mul', { aMin: 2, aMax: 3, bMin: 2, bMax: 3 });
    s.ops.div = { enabled: true, aMin: 2, aMax: 4, bMin: 2, bMax: 4 };
    expect(uniqueTaskSpace(s)).toBe(4 + 9);
  });

  it('не считает выключенные операции', () => {
    expect(uniqueTaskSpace(makeSettings())).toBe(0);
  });
});
