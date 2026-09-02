import { useMemo, useState } from 'react';
import { generateTasks, uniqueTaskSpace } from '../../domain/generator';
import { OPS, OP_LABEL, OP_SYMBOL } from '../../domain/types';
import type { Op, OpConfig, Settings } from '../../domain/types';
import { PRESETS, PRESET_LABEL } from '../../storage/settings';
import type { PresetName } from '../../storage/settings';

interface SettingsFormProps {
  settings: Settings;
  /** Возвращает false, если браузер заблокировал запись в хранилище. */
  onSave(next: Settings): boolean;
}

const RANGE_LABEL: Record<Op, [string, string]> = {
  add: ['Первое число', 'Второе число'],
  sub: ['Уменьшаемое', 'Вычитаемое'],
  mul: ['Первый множитель', 'Второй множитель'],
  div: ['Частное (ответ)', 'Делитель'],
};

export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle');

  const error = useMemo(() => {
    try {
      generateTasks(draft);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Некорректные настройки';
    }
  }, [draft]);

  const space = uniqueTaskSpace(draft);
  const tooFewVariants = error === null && space < draft.taskCount;

  const patch = (change: Partial<Settings>) => {
    setDraft((d) => ({ ...d, ...change }));
    setSaveState('idle');
  };

  const patchOp = (op: Op, change: Partial<OpConfig>) => {
    setDraft((d) => ({ ...d, ops: { ...d.ops, [op]: { ...d.ops[op], ...change } } }));
    setSaveState('idle');
  };

  const applyPreset = (name: PresetName) => {
    setDraft({ ...structuredClone(PRESETS[name]), adminPin: draft.adminPin });
    setSaveState('idle');
  };

  return (
    <>
      <div className="card">
        <h2>Быстрый выбор</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <button key={name} style={{ flex: 1 }} onClick={() => applyPreset(name)}>
              {PRESET_LABEL[name]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Тонкая настройка</h2>

        <div className="field">
          <label htmlFor="count">Количество примеров</label>
          <input
            id="count"
            type="number"
            min={1}
            max={50}
            value={draft.taskCount}
            onChange={(e) => patch({ taskCount: Number(e.target.value) })}
          />
        </div>

        {OPS.map((op) => (
          <div key={op} style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
            <label>
              <input
                type="checkbox"
                checked={draft.ops[op].enabled}
                onChange={(e) => patchOp(op, { enabled: e.target.checked })}
              />{' '}
              {OP_LABEL[op]} ({OP_SYMBOL[op]})
            </label>

            {draft.ops[op].enabled && (
              <>
                <div className="field">
                  <label>{RANGE_LABEL[op][0]}</label>
                  <div className="range">
                    <input
                      type="number"
                      min={0}
                      value={draft.ops[op].aMin}
                      onChange={(e) => patchOp(op, { aMin: Number(e.target.value) })}
                    />
                    <span>…</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.ops[op].aMax}
                      onChange={(e) => patchOp(op, { aMax: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>{RANGE_LABEL[op][1]}</label>
                  <div className="range">
                    <input
                      type="number"
                      min={0}
                      value={draft.ops[op].bMin}
                      onChange={(e) => patchOp(op, { bMin: Number(e.target.value) })}
                    />
                    <span>…</span>
                    <input
                      type="number"
                      min={0}
                      value={draft.ops[op].bMax}
                      onChange={(e) => patchOp(op, { bMax: Number(e.target.value) })}
                    />
                  </div>
                </div>
                {op === 'div' && (
                  <p className="muted">Пример собирается из делителя и частного — деление всегда нацело.</p>
                )}
              </>
            )}
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
          <label>
            <input
              type="checkbox"
              checked={draft.requireCarry}
              onChange={(e) => patch({ requireCarry: e.target.checked })}
            />{' '}
            Сложение только с переходом через десяток
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={draft.allowNegative}
              onChange={(e) => patch({ allowNegative: e.target.checked })}
            />{' '}
            Разрешить отрицательные ответы в вычитании
          </label>
          <br />
          <label>
            <input
              type="checkbox"
              checked={draft.instantFeedback}
              onChange={(e) => patch({ instantFeedback: e.target.checked })}
            />{' '}
            Показывать правильность сразу (режим тренировки)
          </label>
        </div>

        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label htmlFor="admin-pin">Код от настроек (пусто — без кода)</label>
          <input
            id="admin-pin"
            type="text"
            inputMode="numeric"
            value={draft.adminPin ?? ''}
            onChange={(e) => patch({ adminPin: e.target.value.trim() === '' ? null : e.target.value.trim() })}
          />
        </div>

        {error && <p className="error">{error}</p>}
        {tooFewVariants && (
          <p className="warn">
            В этих диапазонах не более {space} уникальных примеров, а запрошено {draft.taskCount} —
            примеры будут повторяться.
          </p>
        )}

        <button
          className="btn-primary"
          disabled={error !== null}
          onClick={() => setSaveState(onSave(draft) ? 'saved' : 'failed')}
        >
          Сохранить
        </button>
        {saveState === 'saved' && <p className="muted">Сохранено</p>}
        {saveState === 'failed' && (
          <p className="error">
            Не удалось сохранить: браузер блокирует хранилище. Настройки действуют
            только до закрытия вкладки.
          </p>
        )}
      </div>
    </>
  );
}
