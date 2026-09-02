import { OP_SYMBOL } from '../../domain/types';
import type { Task } from '../../domain/types';

interface TaskCardProps {
  task: Task;
  input: string;
}

export function TaskCard({ task, input }: TaskCardProps) {
  return (
    <div className="task">
      {task.a} {OP_SYMBOL[task.op]} {task.b} = <span className="slot">{input}</span>
    </div>
  );
}
