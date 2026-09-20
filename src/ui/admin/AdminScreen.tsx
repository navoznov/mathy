import { useState } from 'react';
import type { Settings } from '../../domain/types';
import { loadSettings, saveSettings } from '../../storage/settings';
import { PinGate } from './PinGate';
import { SettingsForm } from './SettingsForm';

export function AdminScreen() {
  const [settings, setSettings] = useState(loadSettings);

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
        <div className="page-head">
          <h1>Настройки</h1>
          <a href="#/">← Назад</a>
        </div>
        <SettingsForm settings={settings} onSave={save} />
        <p className="muted">
          <a href="#/">← К примерам</a>
        </p>
      </div>
    </PinGate>
  );
}
