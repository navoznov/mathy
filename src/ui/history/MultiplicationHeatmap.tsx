import { multiplicationGrid } from '../../domain/analytics';
import type { Session } from '../../domain/types';

interface MultiplicationHeatmapProps {
  sessions: Session[];
}

function accClass(accuracy: number | null): string {
  if (accuracy === null) return 'acc-none';
  if (accuracy >= 0.9) return 'acc-high';
  if (accuracy >= 0.7) return 'acc-mid';
  return 'acc-low';
}

export function MultiplicationHeatmap({ sessions }: MultiplicationHeatmapProps) {
  const grid = multiplicationGrid(sessions);
  const axis = grid.map((row) => row[0].a);

  return (
    <div className="card">
      <h2>Таблица умножения</h2>
      <div className="scroll-x">
        <table className="grid-table">
          <thead>
            <tr>
              <th />
              {axis.map((b) => (
                <th key={b}>{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row[0].a}>
                <th>{row[0].a}</th>
                {row.map((cell) => (
                  <td
                    key={`${cell.a}-${cell.b}`}
                    className={accClass(cell.accuracy)}
                    title={
                      cell.accuracy === null
                        ? `${cell.a} × ${cell.b} — не встречалось`
                        : `${cell.a} × ${cell.b} — ${cell.correct} из ${cell.total}`
                    }
                  >
                    {cell.accuracy === null ? '·' : Math.round(cell.accuracy * 100)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Ячейка учитывает обе перестановки множителей и деление, сводимое к той же паре.
      </p>
    </div>
  );
}
