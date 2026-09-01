import { useHashRoute } from './ui/useHashRoute';
import { PracticeFlow } from './ui/practice/PracticeFlow';
import { AdminScreen } from './ui/admin/AdminScreen';

export default function App() {
  return useHashRoute() === 'admin' ? <AdminScreen /> : <PracticeFlow />;
}
