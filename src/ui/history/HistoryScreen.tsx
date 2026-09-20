import { useState } from 'react';
import { loadHistory } from '../../storage/history';
import { loadSettings } from '../../storage/settings';
import { HistoryTable } from './HistoryTable';
import { MultiplicationHeatmap } from './MultiplicationHeatmap';
import { WeakSpots } from './WeakSpots';

export function HistoryScreen() {
  const [history, setHistory] = useState(loadHistory);
  // Из настроек нужен только код — его спрашивают перед очисткой истории.
  const [settings] = useState(loadSettings);

  return (
    <div className="app">
      <div className="page-head">
        <h1>История</h1>
        <a href="#/">← Назад</a>
      </div>

      {history.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ marginBottom: 0 }}>
            Пока ничего не решали.
          </p>
        </div>
      ) : (
        <>
          <HistoryTable
            sessions={history}
            adminPin={settings.adminPin}
            onClear={() => setHistory([])}
          />
          <WeakSpots sessions={history} />
          <MultiplicationHeatmap sessions={history} />
        </>
      )}

      <p className="muted">
        <a href="#/">← К примерам</a>
      </p>
    </div>
  );
}
