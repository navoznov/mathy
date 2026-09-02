import { useCallback, useMemo, useState } from 'react';
import { generateTasks } from '../../domain/generator';
import type { PracticeMode, Session, Task } from '../../domain/types';
import { appendSession, loadHistory } from '../../storage/history';
import { loadSettings } from '../../storage/settings';
import { StartScreen } from '../StartScreen';
import { PracticeScreen } from './PracticeScreen';
import { ResultModal } from './ResultModal';

type Phase =
  | { name: 'idle' }
  | { name: 'running'; tasks: Task[]; mode: PracticeMode }
  | { name: 'done'; session: Session };

export function PracticeFlow() {
  const [settings] = useState(loadSettings);
  const [history, setHistory] = useState(loadHistory);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [saveError, setSaveError] = useState(false);

  const disabledReason = useMemo(() => {
    try {
      generateTasks(settings);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Настройки не позволяют составить примеры';
    }
  }, [settings]);

  const start = useCallback(
    (mode: PracticeMode) => {
      setPhase({ name: 'running', tasks: generateTasks(settings), mode });
    },
    [settings],
  );

  const finish = useCallback((session: Session) => {
    const { list, saved } = appendSession(session);
    setHistory(list);
    setSaveError(!saved);
    setPhase({ name: 'done', session });
  }, []);

  if (phase.name === 'running') {
    return <PracticeScreen tasks={phase.tasks} mode={phase.mode} onFinish={finish} />;
  }

  // Предупреждение рисуется поверх стартового экрана, а не поверх модалки
  // с результатом: звёзды за пройденную сессию ребёнок должен увидеть в любом случае.
  const saveWarning = saveError && (
    <div className="app">
      <p className="error">Результат не сохранён: браузер блокирует хранилище.</p>
    </div>
  );

  if (phase.name === 'done') {
    return (
      <>
        {saveWarning}
        <StartScreen
          settings={settings}
          history={history}
          disabledReason={disabledReason}
          onStart={start}
        />
        <ResultModal
          session={phase.session}
          onRestart={() => start(phase.session.mode)}
          onHome={() => setPhase({ name: 'idle' })}
        />
      </>
    );
  }

  return (
    <>
      {saveWarning}
      <StartScreen
        settings={settings}
        history={history}
        disabledReason={disabledReason}
        onStart={start}
      />
    </>
  );
}
