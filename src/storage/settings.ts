import { OPS } from '../domain/types';
import type { Settings } from '../domain/types';
import { readRaw, writeRaw } from './safeStorage';

export const SETTINGS_KEY = 'mathy.settings';

export type PresetName = 'easy' | 'medium' | 'hard';

export const PRESET_LABEL: Record<PresetName, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

export const PRESETS: Record<PresetName, Settings> = {
  easy: {
    version: 1,
    taskCount: 10,
    ops: {
      add: { enabled: true, aMin: 2, aMax: 20, bMin: 2, bMax: 20 },
      sub: { enabled: true, aMin: 2, aMax: 20, bMin: 2, bMax: 20 },
      mul: { enabled: true, aMin: 2, aMax: 5, bMin: 2, bMax: 5 },
      div: { enabled: false, aMin: 2, aMax: 5, bMin: 2, bMax: 5 },
    },
    requireCarry: false,
    allowNegative: false,
    instantFeedback: true,
    adminPin: null,
  },
  medium: {
    version: 1,
    taskCount: 15,
    ops: {
      add: { enabled: true, aMin: 2, aMax: 100, bMin: 2, bMax: 100 },
      sub: { enabled: true, aMin: 2, aMax: 100, bMin: 2, bMax: 100 },
      mul: { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10 },
      div: { enabled: false, aMin: 2, aMax: 10, bMin: 2, bMax: 10 },
    },
    requireCarry: false,
    allowNegative: false,
    instantFeedback: true,
    adminPin: null,
  },
  hard: {
    version: 1,
    taskCount: 20,
    ops: {
      add: { enabled: true, aMin: 10, aMax: 100, bMin: 10, bMax: 100 },
      sub: { enabled: true, aMin: 10, aMax: 100, bMin: 10, bMax: 100 },
      mul: { enabled: true, aMin: 2, aMax: 12, bMin: 2, bMax: 12 },
      div: { enabled: true, aMin: 2, aMax: 10, bMin: 2, bMax: 10 },
    },
    requireCarry: true,
    allowNegative: false,
    instantFeedback: true,
    adminPin: null,
  },
};

export const DEFAULTS: Settings = PRESETS.medium;

function clone(settings: Settings): Settings {
  return structuredClone(settings);
}

function isSettingsShape(value: unknown): value is Settings {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<Settings>;
  if (s.version !== 1) return false;
  if (typeof s.taskCount !== 'number') return false;
  if (typeof s.ops !== 'object' || s.ops === null) return false;
  return OPS.every((op) => {
    const c = s.ops?.[op];
    return (
      typeof c === 'object' &&
      c !== null &&
      typeof c.enabled === 'boolean' &&
      typeof c.aMin === 'number' &&
      typeof c.aMax === 'number' &&
      typeof c.bMin === 'number' &&
      typeof c.bMax === 'number'
    );
  });
}

export function loadSettings(): Settings {
  const raw = readRaw(SETTINGS_KEY);
  if (raw === null) return clone(DEFAULTS);

  try {
    const parsed: unknown = JSON.parse(raw);
    return isSettingsShape(parsed) ? parsed : clone(DEFAULTS);
  } catch {
    return clone(DEFAULTS);
  }
}

export function saveSettings(settings: Settings): boolean {
  return writeRaw(SETTINGS_KEY, JSON.stringify(settings));
}
