import { useCallback, useMemo, useState } from 'react';
import { generateTasks } from '../../domain/generator';
import type { Session, Task } from '../../domain/types';
import { appendSession, loadHistory } from '../../storage/history';
import { loadSettings } from '../../storage/settings';
import { StartScreen } from '../StartScreen';
import { PracticeScreen } from './PracticeScreen';
import { ResultModal } from './ResultModal';

type Phase = { name: 'idle' } | { name: 'running'; tasks: Task[] } | { name: 'done'; session: Session };

export function PracticeFlow() {
  const [settings] = useState(loadSettings);
  const [history, setHistory] = useState(loadHistory);
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });

  const disabledReason = useMemo(() => {
    try {
      generateTasks(settings);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Настройки не позволяют составить примеры';
    }
  }, [settings]);

  const start = useCallback(() => {
    setPhase({ name: 'running', tasks: generateTasks(settings) });
  }, [settings]);

  const finish = useCallback((session: Session) => {
    setHistory(appendSession(session));
    setPhase({ name: 'done', session });
  }, []);

  if (phase.name === 'running') {
    return (
      <PracticeScreen
        tasks={phase.tasks}
        instantFeedback={settings.instantFeedback}
        onFinish={finish}
      />
    );
  }

  if (phase.name === 'done') {
    return (
      <>
        <StartScreen
          settings={settings}
          history={history}
          disabledReason={disabledReason}
          onStart={start}
        />
        <ResultModal
          session={phase.session}
          onRestart={start}
          onHome={() => setPhase({ name: 'idle' })}
        />
      </>
    );
  }

  return (
    <StartScreen
      settings={settings}
      history={history}
      disabledReason={disabledReason}
      onStart={start}
    />
  );
}
