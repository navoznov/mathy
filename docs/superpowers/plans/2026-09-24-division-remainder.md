# Деление с остатком — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Галочка «С остатком» у деления: генератор добавляет остаток к делимому, ребёнок вводит частное и остаток в два поля.

**Architecture:** Флаг `Settings.divRemainder` → генератор кладёт в `Task` необязательный `remainder` → UI по наличию `task.remainder` показывает два поля и клавишу «ост.», попытка пишется с `expectedRemainder`/`givenRemainder`. Аналитика и история не меняются.

**Tech Stack:** React 19, TypeScript (strict, `tsc -b` проверяет и тесты), Vitest (окружение `node`), oxlint.

**Spec:** `docs/superpowers/specs/2026-09-24-division-remainder-design.md`

## Global Constraints

- Слои: `ui → storage → domain`; `src/domain/**` не импортирует `ui` и `storage`.
- Функции с генерацией принимают `rng: () => number = Math.random` последним параметром.
- При `divRemainder === false` генератор вызывает `rng` ровно так же, как раньше (делитель, затем частное).
- `Settings.version` остаётся `1`; новое поле доливается из `DEFAULTS` в `loadSettings`.
- `divRemainder: false` во всех трёх пресетах.
- Символ деления — только `OP_SYMBOL.div`; в подписи формы — `−` U+2212.
- Интерфейс и комментарии — по-русски; коммиты — английские, Conventional Commits, **без** `Co-Authored-By` и пометок о генерации.
- UI-тесты не пишутся; тестируются `src/domain/**` и `src/storage/**`.
- Ответ с остатком верен, только если совпали и частное, и остаток. Ноль в остатке вводится явно.

## Review Focus

1. Остаток больше или равен делителю (`17 ÷ 5 = 2 ост. 7`) — должен считаться ошибкой, даже если `b·q + r` сходится. Тест в Task 3.
2. Делитель 1 — остаток всегда 0, генератор не падает на `randInt(0, 0)`. Тест в Task 2.
3. Частное 0 (`aMin: 0`) — `3 ÷ 5 = 0 ост. 3` корректный пример. Тест в Task 2.
4. Ребёнок ушёл в остаток, вернулся `⌫` в частное и исправил его — отправка должна взять исправленное частное и уже набранный остаток. Ручная проверка в Task 6.
5. Старые сессии в истории без полей остатка показываются как `7 × 8 = 56`, без «ост. undefined». Ручная проверка в Task 6.

---

### Task 1: Флаг `divRemainder` в настройках

**Files:**
- Modify: `src/domain/types.ts` (интерфейс `Settings`)
- Modify: `src/storage/settings.ts` (три пресета)
- Modify: `src/domain/generator.test.ts:7-18` (`makeSettings` — иначе `tsc -b` не соберёт тесты)
- Test: `src/storage/settings.test.ts`

**Interfaces:**
- Produces: `Settings.divRemainder: boolean`.

- [ ] **Step 1: Написать падающие тесты**

В `src/storage/settings.test.ts` в `describe('PRESETS', …)` после теста «разрешает тренировку во всех пресетах»:

```ts
  it('не включает деление с остатком ни в одном пресете', () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.divRemainder).toBe(false);
    }
  });
```

В `describe('loadSettings', …)` после теста «читает сохранённые настройки»:

```ts
  it('доливает divRemainder в настройки, сохранённые до его появления', () => {
    const legacy: Record<string, unknown> = { ...DEFAULTS, taskCount: 7 };
    delete legacy.divRemainder;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(legacy));

    const loaded = loadSettings();
    expect(loaded.divRemainder).toBe(false);
    expect(loaded.taskCount).toBe(7);
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/storage/settings.test.ts`
Expected: FAIL — `expected undefined to be false` в обоих новых тестах.

- [ ] **Step 3: Реализация**

`src/domain/types.ts`, в `Settings` после `allowNegative: boolean;`:

```ts
  /** Деление с остатком: делимое не обязано делиться нацело, ответ — частное и остаток. */
  divRemainder: boolean;
```

`src/storage/settings.ts`, во всех трёх пресетах после `allowNegative: false,`:

```ts
    divRemainder: false,
```

`src/domain/generator.test.ts`, в `makeSettings` после `allowNegative: false,`:

```ts
    divRemainder: false,
```

- [ ] **Step 4: Прогнать тесты и типы**

Run: `npm test && npx tsc -b`
Expected: все тесты PASS, `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/storage/settings.ts src/storage/settings.test.ts src/domain/generator.test.ts
git commit -m "feat: add divRemainder setting"
```

---

### Task 2: Генератор деления с остатком

**Files:**
- Modify: `src/domain/types.ts` (интерфейс `Task`)
- Modify: `src/domain/generator.ts` (`makeTask`, ветка div; `uniqueTaskSpace`)
- Test: `src/domain/generator.test.ts`

**Interfaces:**
- Consumes: `Settings.divRemainder` (Task 1).
- Produces: `Task.remainder?: number` — есть только у деления с остатком, `0` допустим; `a = b · expected + remainder`, `0 ≤ remainder < b`.

- [ ] **Step 1: Написать падающие тесты**

В `src/domain/generator.test.ts` новый блок перед `describe('uniqueTaskSpace', …)`:

```ts
describe('generateTasks — деление с остатком', () => {
  const withRemainder = (cfg: Partial<Settings['ops'][Op]> = {}, patch: Partial<Settings> = {}) =>
    only('div', cfg, { divRemainder: true, ...patch });

  it('собирает делимое из делителя, частного и остатка', () => {
    for (const t of generateTasks(withRemainder({ aMin: 2, aMax: 9, bMin: 3, bMax: 7 }, { taskCount: 50 }))) {
      expect(t.remainder).toBeDefined();
      const r = t.remainder as number;
      expect(t.a).toBe(t.b * t.expected + r);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(t.b);
      expect(t.b).toBeGreaterThanOrEqual(3);
      expect(t.b).toBeLessThanOrEqual(7);
      expect(t.expected).toBeGreaterThanOrEqual(2);
      expect(t.expected).toBeLessThanOrEqual(9);
    }
  });

  it('даёт нулевой остаток в формате «с остатком»', () => {
    const [t] = generateTasks(withRemainder({ aMin: 3, aMax: 3, bMin: 5, bMax: 5 }, { taskCount: 1 }), () => 0);
    expect(t).toEqual({ op: 'div', a: 15, b: 5, expected: 3, remainder: 0 });
  });

  it('даёт ненулевой остаток', () => {
    const [t] = generateTasks(withRemainder({ aMin: 3, aMax: 3, bMin: 5, bMax: 5 }, { taskCount: 1 }), () => 0.99);
    expect(t).toEqual({ op: 'div', a: 19, b: 5, expected: 3, remainder: 4 });
  });

  it('при делителе 1 остаток всегда 0', () => {
    for (const t of generateTasks(withRemainder({ aMin: 2, aMax: 9, bMin: 1, bMax: 1 }, { taskCount: 8 }))) {
      expect(t.remainder).toBe(0);
      expect(t.a).toBe(t.expected);
    }
  });

  it('допускает нулевое частное', () => {
    const [t] = generateTasks(withRemainder({ aMin: 0, aMax: 0, bMin: 5, bMax: 5 }, { taskCount: 1 }), () => 0.99);
    expect(t).toEqual({ op: 'div', a: 4, b: 5, expected: 0, remainder: 4 });
  });

  it('без флага остатка нет и деление нацело', () => {
    for (const t of generateTasks(only('div', { aMin: 2, aMax: 9, bMin: 3, bMax: 7 }, { taskCount: 30 }))) {
      expect('remainder' in t).toBe(false);
      expect(t.a % t.b).toBe(0);
    }
  });
});
```

В `describe('uniqueTaskSpace', …)`:

```ts
  it('учитывает варианты остатка: у делителя b их ровно b', () => {
    const s = only('div', { aMin: 2, aMax: 4, bMin: 2, bMax: 4 }, { divRemainder: true });
    expect(uniqueTaskSpace(s)).toBe(3 * (2 + 3 + 4));
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/domain/generator.test.ts`
Expected: FAIL в новых тестах (нет `remainder`, `uniqueTaskSpace` возвращает 9 вместо 27); тест «без флага…» проходит.

- [ ] **Step 3: Реализация**

`src/domain/types.ts`, в `Task` после `expected: number;`:

```ts
  /** Есть только у деления с остатком. 0 — поделилось нацело, но ответ всё равно «N ост. 0». */
  remainder?: number;
```

`src/domain/generator.ts`, конец `makeTask` — заменить ветку деления:

```ts
  // div: генерируем от ответа — делимое собирается из делителя и частного
  const divisor = randInt(rng, c.bMin, c.bMax);
  const quotient = randInt(rng, c.aMin, c.aMax);
  if (!settings.divRemainder) return { op, a: divisor * quotient, b: divisor, expected: quotient };

  const remainder = randInt(rng, 0, divisor - 1);
  return { op, a: divisor * quotient + remainder, b: divisor, expected: quotient, remainder };
```

`src/domain/generator.ts`, `uniqueTaskSpace` — внутри `reduce` после вычисления `spanB`:

```ts
    if (op === 'div' && settings.divRemainder) {
      // у делителя b ровно b вариантов остатка: spanA · (bMin + … + bMax)
      return sum + spanA * (((c.bMin + c.bMax) * spanB) / 2);
    }
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/domain/generator.test.ts && npx tsc -b`
Expected: PASS, `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/generator.ts src/domain/generator.test.ts
git commit -m "feat: generate division tasks with remainder"
```

---

### Task 3: Проверка ответа с остатком

**Files:**
- Modify: `src/domain/types.ts` (интерфейс `Attempt`)
- Modify: `src/domain/scoring.ts` (`checkAnswer`)
- Test: `src/domain/scoring.test.ts`

**Interfaces:**
- Consumes: `Task.remainder?: number` (Task 2).
- Produces:
  - `checkAnswer(task: Task, given: number, givenRemainder?: number): boolean`
  - `Attempt.expectedRemainder?: number`, `Attempt.givenRemainder?: number` — заполняются только у деления с остатком.

- [ ] **Step 1: Написать падающие тесты**

В `src/domain/scoring.test.ts`, в `describe('checkAnswer', …)`:

```ts
  const withRemainder = { op: 'div' as const, a: 17, b: 5, expected: 3, remainder: 2 };

  it('принимает деление с остатком, только если совпали оба числа', () => {
    expect(checkAnswer(withRemainder, 3, 2)).toBe(true);
  });

  it('считает ошибкой неверный остаток при верном частном', () => {
    expect(checkAnswer(withRemainder, 3, 1)).toBe(false);
  });

  it('считает ошибкой неверное частное при верном остатке', () => {
    expect(checkAnswer(withRemainder, 4, 2)).toBe(false);
  });

  it('считает ошибкой остаток не меньше делителя, даже если b·q + r сходится', () => {
    expect(checkAnswer(withRemainder, 2, 7)).toBe(false);
  });

  it('требует явный ноль в остатке', () => {
    const exact = { op: 'div' as const, a: 15, b: 5, expected: 3, remainder: 0 };
    expect(checkAnswer(exact, 3, 0)).toBe(true);
    expect(checkAnswer(exact, 3)).toBe(false);
  });
```

- [ ] **Step 2: Убедиться, что падают**

Run: `npx vitest run src/domain/scoring.test.ts`
Expected: FAIL в тестах «неверный остаток», «остаток не меньше делителя», «явный ноль» — сейчас сравнивается только частное (vitest типы не проверяет, так что лишний аргумент не мешает запуску).

- [ ] **Step 3: Реализация**

`src/domain/types.ts`, в `Attempt` после `given: number;`:

```ts
  /** Есть только у деления с остатком. */
  expectedRemainder?: number;
  givenRemainder?: number;
```

`src/domain/scoring.ts`:

```ts
/** У деления с остатком верно, только если совпали и частное, и остаток. */
export function checkAnswer(task: Task, given: number, givenRemainder?: number): boolean {
  return given === task.expected && givenRemainder === task.remainder;
}
```

(Для обычных задач оба `remainder` — `undefined`, сравнение проходит, поведение прежнее.)

- [ ] **Step 4: Прогнать тесты**

Run: `npm test && npx tsc -b`
Expected: PASS, `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/scoring.ts src/domain/scoring.test.ts
git commit -m "feat: check quotient and remainder together"
```

---

### Task 4: Галочка в форме и формат ответа

**Files:**
- Modify: `src/ui/admin/SettingsForm.tsx:134-136` (блок `op === 'div'`)
- Modify: `src/ui/format.ts` (`formatAnswer`, `formatAttempt`)

**Interfaces:**
- Consumes: `Settings.divRemainder` (Task 1), `Attempt.expectedRemainder/givenRemainder` (Task 3).
- Produces: `formatAnswer(value: number, remainder?: number): string` — `"3"` или `"3 ост. 2"`.

UI-тестов нет по правилам проекта; проверка — `tsc`, lint и ручная проверка в Task 6.

- [ ] **Step 1: Формат ответа**

`src/ui/format.ts` — перед `formatAttempt`:

```ts
export function formatAnswer(value: number, remainder?: number): string {
  return remainder === undefined ? String(value) : `${value} ост. ${remainder}`;
}
```

и `formatAttempt`:

```ts
export function formatAttempt(a: Attempt): string {
  const task = `${a.a} ${OP_SYMBOL[a.op]} ${a.b}`;
  const expected = formatAnswer(a.expected, a.expectedRemainder);
  return a.correct ? `${task} = ${expected}` : `${task} = ${formatAnswer(a.given, a.givenRemainder)}, правильно ${expected}`;
}
```

- [ ] **Step 2: Галочка в форме**

`src/ui/admin/SettingsForm.tsx` — заменить

```tsx
                {op === 'div' && (
                  <p className="muted">Пример собирается из делителя и частного — деление всегда нацело.</p>
                )}
```

на

```tsx
                {op === 'div' && (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={draft.divRemainder}
                        onChange={(e) => patch({ divRemainder: e.target.checked })}
                      />{' '}
                      С остатком
                    </label>
                    <p className="muted">
                      {draft.divRemainder
                        ? 'Остаток от 0 до делитель − 1, иногда выпадает 0.'
                        : 'Пример собирается из делителя и частного — деление всегда нацело.'}
                    </p>
                  </>
                )}
```

- [ ] **Step 3: Типы и lint**

Run: `npx tsc -b && npm run lint`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/ui/format.ts src/ui/admin/SettingsForm.tsx
git commit -m "feat: add remainder toggle and answer formatting"
```

---

### Task 5: Экран решения — два поля и клавиша «ост.»

**Files:**
- Modify: `src/ui/practice/TaskCard.tsx`
- Modify: `src/ui/practice/Keypad.tsx`
- Modify: `src/ui/practice/PracticeScreen.tsx`
- Modify: `src/styles.css:78-82` (после `.task .slot`)

**Interfaces:**
- Consumes: `Task.remainder` (Task 2), `checkAnswer(task, given, givenRemainder?)` (Task 3), `formatAnswer` (Task 4).
- Produces: `export type AnswerField = 'quotient' | 'remainder'` в `TaskCard.tsx`; `Keypad` получает необязательный `onRemainder?(): void`.

- [ ] **Step 1: `TaskCard` — два поля**

`src/ui/practice/TaskCard.tsx` целиком:

```tsx
import { OP_SYMBOL } from '../../domain/types';
import type { Task } from '../../domain/types';

export type AnswerField = 'quotient' | 'remainder';

interface TaskCardProps {
  task: Task;
  input: string;
  /** Поля ниже нужны только делению с остатком. */
  remInput: string;
  field: AnswerField;
  onSelectField(field: AnswerField): void;
}

export function TaskCard({ task, input, remInput, field, onSelectField }: TaskCardProps) {
  if (task.remainder === undefined) {
    return (
      <div className="task">
        {task.a} {OP_SYMBOL[task.op]} {task.b} = <span className="slot">{input}</span>
      </div>
    );
  }

  const slotClass = (f: AnswerField) => (f === field ? 'slot' : 'slot idle');
  return (
    <div className="task">
      {task.a} {OP_SYMBOL[task.op]} {task.b} ={' '}
      <span className={slotClass('quotient')} onClick={() => onSelectField('quotient')}>
        {input}
      </span>{' '}
      <span className="rem-label">ост.</span>{' '}
      <span className={slotClass('remainder')} onClick={() => onSelectField('remainder')}>
        {remInput}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Стили**

`src/styles.css` — сразу после блока `.task .slot { … }`:

```css
.task .slot.idle { border-bottom-color: var(--line); }
.task .rem-label { font-size: 0.6em; color: var(--muted); }
```

- [ ] **Step 3: `Keypad` — клавиша «ост.»**

`src/ui/practice/Keypad.tsx`: в `KeypadProps` добавить

```ts
  /** Если задан, вместо ± — клавиша «ост.» (деление с остатком, отрицательных ответов нет). */
  onRemainder?(): void;
```

в сигнатуру — `{ onDigit, onBackspace, onToggleSign, onRemainder, disabled }`, а кнопку `±` заменить на:

```tsx
      {onRemainder ? (
        <button type="button" onClick={onRemainder} aria-label="Перейти к остатку" disabled={disabled}>
          ост.
        </button>
      ) : (
        <button type="button" onClick={onToggleSign} aria-label="Сменить знак" disabled={disabled}>
          ±
        </button>
      )}
```

- [ ] **Step 4: `PracticeScreen` — состояние и отправка**

`src/ui/practice/PracticeScreen.tsx`:

Импорты:

```ts
import { formatAnswer } from '../format';
import { Keypad } from './Keypad';
import { TaskCard } from './TaskCard';
import type { AnswerField } from './TaskCard';
```

`Feedback` — добавить поле:

```ts
  givenRemainder?: number;
```

Состояние — после `const [input, setInput] = useState('');`:

```ts
  const [remInput, setRemInput] = useState('');
  const [field, setField] = useState<AnswerField>('quotient');
```

Заменить `const canSubmit = /^-?\d+$/.test(input);` на:

```ts
  const hasRemainder = task.remainder !== undefined;
  const canSubmit = hasRemainder
    ? /^\d+$/.test(input) && /^\d+$/.test(remInput)
    : /^-?\d+$/.test(input);
  // у деления с остатком Enter в поле частного не отправляет, а переводит в остаток
  const movesToRemainder = hasRemainder && field === 'quotient';
  const canNext = movesToRemainder ? input !== '' : canSubmit;
```

`submit` целиком:

```ts
  const submit = useCallback(() => {
    if (!canSubmit || feedback) return;

    const given = Number(input);
    const givenRemainder = hasRemainder ? Number(remInput) : undefined;
    const correct = checkAnswer(task, given, givenRemainder);
    attemptsRef.current = [
      ...attemptsRef.current,
      {
        op: task.op,
        a: task.a,
        b: task.b,
        expected: task.expected,
        given,
        ...(hasRemainder ? { expectedRemainder: task.remainder, givenRemainder } : {}),
        correct,
        ms: performance.now() - taskStartedRef.current,
      },
    ];
    setInput('');
    setRemInput('');
    setField('quotient');

    if (mode === 'training') {
      setFeedback({ correct, task, given, givenRemainder });
      setDismissable(false);
    } else {
      advance();
    }
  }, [advance, canSubmit, feedback, hasRemainder, input, mode, remInput, task]);

  const next = useCallback(() => {
    if (!movesToRemainder) submit();
    else if (input !== '') setField('remainder');
  }, [input, movesToRemainder, submit]);
```

- [ ] **Step 5: `PracticeScreen` — ввод**

Заменить `appendDigit` и `backspace`:

```ts
  const appendDigit = useCallback(
    (digit: string) => {
      const append = (v: string) => (v.replace('-', '').length >= MAX_INPUT_LENGTH ? v : v + digit);
      if (field === 'remainder') setRemInput(append);
      else setInput(append);
    },
    [field],
  );

  // ⌫ в пустом остатке возвращает в частное — так исправляют опечатку в частном
  const backspace = useCallback(() => {
    if (field === 'quotient') setInput((v) => v.slice(0, -1));
    else if (remInput === '') setField('quotient');
    else setRemInput((v) => v.slice(0, -1));
  }, [field, remInput]);
```

В `onKeyDown` заменить две строки:

```ts
      else if (e.key === '-') toggleSign();
      else if (e.key === 'Enter') submit();
```

на

```ts
      else if (e.key === '-') {
        if (!hasRemainder) toggleSign();
      } else if (e.key === 'Enter') next();
```

и в массиве зависимостей эффекта заменить `submit` на `next`, добавить `hasRemainder`.

- [ ] **Step 6: `PracticeScreen` — разметка**

Разбор ошибки:

```tsx
                ❌ {formatAnswer(feedback.given, feedback.givenRemainder)}
                <br />
                {feedback.task.a} {OP_SYMBOL[feedback.task.op]} {feedback.task.b} ={' '}
                {formatAnswer(feedback.task.expected, feedback.task.remainder)}
```

Карточка:

```tsx
          <TaskCard task={task} input={input} remInput={remInput} field={field} onSelectField={setField} />
```

Клавиатура — добавить проп:

```tsx
          onRemainder={hasRemainder ? () => setField('remainder') : undefined}
```

Кнопка «Дальше»:

```tsx
          onClick={showingMistake ? dismiss : next}
          disabled={showingMistake ? !dismissable : !canNext || feedback !== null}
```

- [ ] **Step 7: Типы, lint, тесты**

Run: `npx tsc -b && npm run lint && npm test`
Expected: без ошибок, все тесты PASS. `AnswerField` остаётся в `TaskCard.tsx` (это UI-понятие, в `domain` ему не место); если `react/only-export-components` выдаст на него предупреждение — это warn, не ошибка, упомянуть в отчёте.

- [ ] **Step 8: Commit**

```bash
git add src/ui/practice/TaskCard.tsx src/ui/practice/Keypad.tsx src/ui/practice/PracticeScreen.tsx src/styles.css
git commit -m "feat: enter quotient and remainder in two fields"
```

---

### Task 6: Сборка и ручная проверка

**Files:** нет изменений (только проверка; найденные дефекты чинятся в файлах Task 4–5 отдельным коммитом `fix: …`).

- [ ] **Step 1: Сборка**

Run: `npm run build`
Expected: `tsc -b` и `vite build` без ошибок.

- [ ] **Step 2: Ручная проверка в браузере**

Run: `npm run dev`, открыть `http://localhost:5173/mathy/`.

1. `#/admin` → включить деление, отметить «С остатком», выключить остальные операции, сохранить. Подпись под диапазонами — «Остаток от 0 до делитель − 1…». Снять галочку — подпись прежняя.
2. Режим «Тренировка»: пример вида `17 ÷ 5 = [ ] ост. [ ]`, подсвечено поле частного, на клавиатуре вместо `±` — «ост.».
3. Набрать `3`, Enter → курсор в остатке. Enter при пустом остатке ничего не делает, кнопка «Дальше» неактивна.
4. **Review Focus 4:** в остатке набрать `2`, `⌫` дважды → курсор вернулся в частное; исправить частное, Enter, набрать остаток, Enter → ответ принят с исправленным частным.
5. Нарочно ошибиться в остатке → разбор `❌ 3 ост. 1`, ниже `17 ÷ 5 = 3 ост. 2`.
6. Тап по полю частного/остатка переключает подсветку; клавиша `-` с клавиатуры ничего не делает.
7. Режим «Экзамен» — те же два поля; в итогах ошибки в формате `… = 3 ост. 1, правильно 3 ост. 2`.
8. **Review Focus 5:** `#/history` — старые сессии показываются как раньше (`7 × 8 = 56`), новые — с «ост.»; тепловая карта без ошибок.
9. Снять «С остатком» → обычное деление: одно поле, клавиша `±`.
10. Ширина 375px: строка `17 ÷ 5 = [ ] ост. [ ]` не вызывает горизонтальной прокрутки. Если вызывает — уменьшить `.task` шрифт для деления с остатком отдельным `fix`-коммитом.
