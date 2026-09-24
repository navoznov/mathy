import { OP_SYMBOL } from '../../domain/types';
import type { Task } from '../../domain/types';

export type AnswerField = 'quotient' | 'remainder';

interface TaskCardProps {
  task: Task;
  input: string;
  /** Поля ниже нужны только делению с остатком. */
  remInput: string;
  field: AnswerField;
  onSelectField(field: AnswerField): void;
}

export function TaskCard({ task, input, remInput, field, onSelectField }: TaskCardProps) {
  if (task.remainder === undefined) {
    return (
      <div className="task">
        {task.a} {OP_SYMBOL[task.op]} {task.b} = <span className="slot">{input}</span>
      </div>
    );
  }

  const slotClass = (f: AnswerField) => (f === field ? 'slot' : 'slot idle');
  return (
    <div className="task">
      {task.a} {OP_SYMBOL[task.op]} {task.b} ={' '}
      <span className={slotClass('quotient')} onClick={() => onSelectField('quotient')}>
        {input}
      </span>{' '}
      <span className="rem-label">ост.</span>{' '}
      <span className={slotClass('remainder')} onClick={() => onSelectField('remainder')}>
        {remInput}
      </span>
    </div>
  );
}
