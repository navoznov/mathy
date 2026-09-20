import { MODE_LABEL } from '../domain/types';
import type { PracticeMode } from '../domain/types';

interface ModeBadgeProps {
  mode: PracticeMode;
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  return <span className={`badge badge-${mode}`}>{MODE_LABEL[mode]}</span>;
}
