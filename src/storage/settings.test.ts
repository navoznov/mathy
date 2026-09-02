import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULTS, PRESETS, SETTINGS_KEY, loadSettings, saveSettings } from './settings';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PRESETS', () => {
  it('содержит три пресета с валидной схемой', () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.version).toBe(1);
      expect(preset.taskCount).toBeGreaterThan(0);
      expect(Object.keys(preset.ops).sort()).toEqual(['add', 'div', 'mul', 'sub']);
      expect(Object.values(preset.ops).some((o) => o.enabled)).toBe(true);
    }
  });

  it('идёт по возрастанию сложности', () => {
    expect(PRESETS.easy.taskCount).toBeLessThan(PRESETS.hard.taskCount);
    expect(PRESETS.easy.ops.mul.aMax).toBeLessThan(PRESETS.hard.ops.mul.aMax);
  });

  it('не хранит PIN внутри пресета', () => {
    for (const preset of Object.values(PRESETS)) {
      expect(preset.adminPin).toBeNull();
    }
  });
});

describe('loadSettings', () => {
  it('возвращает DEFAULTS на пустом хранилище', () => {
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('возвращает независимую копию, а не сам DEFAULTS', () => {
    const loaded = loadSettings();
    loaded.taskCount = 999;
    loaded.ops.add.aMax = 999;
    expect(DEFAULTS.taskCount).not.toBe(999);
    expect(DEFAULTS.ops.add.aMax).not.toBe(999);
  });

  it('читает сохранённые настройки', () => {
    const custom = { ...DEFAULTS, taskCount: 7, requireCarry: true };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });

  it('откатывается к DEFAULTS при чужой версии схемы', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULTS, version: 0, taskCount: 99 }));
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('не падает на битом JSON', () => {
    localStorage.setItem(SETTINGS_KEY, '{ это не json');
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('откатывается к DEFAULTS при отсутствии операции в схеме', () => {
    const broken = { ...DEFAULTS, ops: { add: DEFAULTS.ops.add } };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(broken));
    expect(loadSettings()).toEqual(DEFAULTS);
  });

  it('не падает, когда localStorage недоступен', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadSettings()).toEqual(DEFAULTS);
  });
});

describe('saveSettings', () => {
  it('возвращает true при успешной записи', () => {
    expect(saveSettings({ ...DEFAULTS, taskCount: 20 })).toBe(true);
  });

  it('возвращает false и не бросает при переполнении квоты', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saveSettings(DEFAULTS)).toBe(false);
  });

  it('пишет компактный JSON без отступов', () => {
    saveSettings(DEFAULTS);
    expect(localStorage.getItem(SETTINGS_KEY)).not.toContain('\n');
  });
});
