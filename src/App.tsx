import { useHashRoute } from './ui/useHashRoute';
import { PracticeFlow } from './ui/practice/PracticeFlow';
import { AdminScreen } from './ui/admin/AdminScreen';
import { HistoryScreen } from './ui/history/HistoryScreen';

export default function App() {
  const route = useHashRoute();
  if (route === 'admin') return <AdminScreen />;
  if (route === 'history') return <HistoryScreen />;
  return <PracticeFlow />;
}
