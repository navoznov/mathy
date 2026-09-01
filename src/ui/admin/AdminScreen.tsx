import { useState } from 'react';
import { loadSettings, saveSettings } from '../../storage/settings';
import type { Settings } from '../../domain/types';
import { PinGate } from './PinGate';
import { SettingsForm } from './SettingsForm';

export function AdminScreen() {
  const [settings, setSettings] = useState(loadSettings);

  const save = (next: Settings) => {
    saveSettings(next);
    setSettings(next);
  };

  return (
    <PinGate pin={settings.adminPin}>
      <div className="app">
        <h1>Настройки</h1>
        <SettingsForm settings={settings} onSave={save} />
        <p className="muted">
          <a href="#/">← К примерам</a>
        </p>
      </div>
    </PinGate>
  );
}
