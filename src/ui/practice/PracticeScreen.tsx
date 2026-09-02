import { useCallback, useEffect, useRef, useState } from 'react';
import { calcStars, checkAnswer } from '../../domain/scoring';
import { OP_SYMBOL } from '../../domain/types';
import type { Attempt, Session, Task } from '../../domain/types';
import { Keypad } from './Keypad';
import { TaskCard } from './TaskCard';

const FEEDBACK_MS = 800;
const MAX_INPUT_LENGTH = 6;

interface PracticeScreenProps {
  tasks: Task[];
  instantFeedback: boolean;
  onFinish(session: Session): void;
}

interface Feedback {
  correct: boolean;
  task: Task;
  given: number;
}

export function PracticeScreen({ tasks, instantFeedback, onFinish }: PracticeScreenProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);

  const attemptsRef = useRef<Attempt[]>([]);
  const taskStartedRef = useRef(performance.now());
  const sessionStartedRef = useRef(Date.now());

  const task = tasks[index];
  const canSubmit = /^-?\d+$/.test(input);

  useEffect(() => {
    taskStartedRef.current = performance.now();
  }, [index]);

  const finish = useCallback(
    (aborted: boolean) => {
      const attempts = attemptsRef.current;
      const wrong = attempts.filter((a) => !a.correct).length;
      onFinish({
        id: new Date(sessionStartedRef.current).toISOString(),
        startedAt: sessionStartedRef.current,
        totalMs: attempts.reduce((sum, a) => sum + a.ms, 0),
        plannedCount: tasks.length,
        aborted,
        attempts,
        stars: calcStars(wrong, aborted),
      });
    },
    [onFinish, tasks.length],
  );

  // Обновляющая функция setIndex обязана быть чистой: побочный эффект внутри неё
  // в StrictMode выполнится дважды и сессия запишется в историю два раза.
  const advance = useCallback(() => {
    if (index + 1 >= tasks.length) finish(false);
    else setIndex(index + 1);
  }, [finish, index, tasks.length]);

  const submit = useCallback(() => {
    if (!canSubmit || feedback) return;

    const given = Number(input);
    const correct = checkAnswer(task, given);
    attemptsRef.current = [
      ...attemptsRef.current,
      {
        op: task.op,
        a: task.a,
        b: task.b,
        expected: task.expected,
        given,
        correct,
        ms: performance.now() - taskStartedRef.current,
      },
    ];
    setInput('');

    if (instantFeedback) {
      setFeedback({ correct, task, given });
    } else {
      advance();
    }
  }, [advance, canSubmit, feedback, input, instantFeedback, task]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
      advance();
    }, FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [advance, feedback]);

  const appendDigit = useCallback((digit: string) => {
    setInput((v) => (v.replace('-', '').length >= MAX_INPUT_LENGTH ? v : v + digit));
  }, []);

  const backspace = useCallback(() => setInput((v) => v.slice(0, -1)), []);

  const toggleSign = useCallback(() => {
    setInput((v) => (v.startsWith('-') ? v.slice(1) : '-' + v));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (feedback || confirmAbort) return;
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === '-') toggleSign();
      else if (e.key === 'Enter') submit();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendDigit, backspace, confirmAbort, feedback, submit, toggleSign]);

  return (
    <div className="app">
      <div className="card">
        <p className="muted">
          Пример {index + 1} из {tasks.length}
        </p>
        <div className="progress">
          <div style={{ width: `${(index / tasks.length) * 100}%` }} />
        </div>

        {feedback ? (
          <div className={`flash ${feedback.correct ? 'ok' : 'bad'}`}>
            {feedback.correct ? (
              <>✅ Отлично!</>
            ) : (
              <>
                ❌ {feedback.given}
                <br />
                {feedback.task.a} {OP_SYMBOL[feedback.task.op]} {feedback.task.b} ={' '}
                {feedback.task.expected}
              </>
            )}
          </div>
        ) : (
          <TaskCard task={task} input={input} />
        )}

        <Keypad onDigit={appendDigit} onBackspace={backspace} onToggleSign={toggleSign} />

        <button
          className="btn-primary"
          style={{ marginTop: '0.75rem' }}
          onClick={submit}
          disabled={!canSubmit || feedback !== null}
        >
          Дальше →
        </button>
      </div>

      <button className="btn-ghost" onClick={() => setConfirmAbort(true)}>
        Прервать
      </button>

      {confirmAbort && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Закончить раньше времени?</h2>
            <p className="muted">Решённые примеры сохранятся, но звёзд за прерванный тест не будет.</p>
            <button className="btn-primary" onClick={() => finish(true)}>
              Да, закончить
            </button>
            <button
              className="btn-ghost"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setConfirmAbort(false)}
            >
              Продолжить решать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
