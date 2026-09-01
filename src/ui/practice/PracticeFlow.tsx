import { generateTasks } from '../../domain/generator';
import { loadHistory } from '../../storage/history';
import { loadSettings } from '../../storage/settings';
import { StartScreen } from '../StartScreen';

// Запуск сессии появится в Task 8; пока экран только отображается.
export function PracticeFlow() {
  const settings = loadSettings();
  const history = loadHistory();

  let disabledReason: string | null = null;
  try {
    generateTasks(settings);
  } catch (e) {
    disabledReason = e instanceof Error ? e.message : 'Настройки не позволяют составить примеры';
  }

  return (
    <StartScreen
      settings={settings}
      history={history}
      disabledReason={disabledReason}
      onStart={() => {}}
    />
  );
}
