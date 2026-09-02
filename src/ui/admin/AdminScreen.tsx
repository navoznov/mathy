import { useState } from 'react';
import type { Settings } from '../../domain/types';
import { loadHistory } from '../../storage/history';
import { loadSettings, saveSettings } from '../../storage/settings';
import { HistoryTable } from './HistoryTable';
import { MultiplicationHeatmap } from './MultiplicationHeatmap';
import { PinGate } from './PinGate';
import { SettingsForm } from './SettingsForm';
import { WeakSpots } from './WeakSpots';

export function AdminScreen() {
  const [settings, setSettings] = useState(loadSettings);
  const [history, setHistory] = useState(loadHistory);

  // Возвращаем признак успеха: при заблокированном хранилище форма обязана
  // сказать правду, иначе родитель поверит, что код от настроек сохранён.
  const save = (next: Settings): boolean => {
    const ok = saveSettings(next);
    setSettings(next);
    return ok;
  };

  return (
    <PinGate pin={settings.adminPin}>
      <div className="app">
        <h1>Настройки</h1>
        <SettingsForm settings={settings} onSave={save} />
        <WeakSpots sessions={history} />
        <MultiplicationHeatmap sessions={history} />
        <HistoryTable sessions={history} onClear={() => setHistory([])} />
        <p className="muted">
          <a href="#/">← К примерам</a>
        </p>
      </div>
    </PinGate>
  );
}
