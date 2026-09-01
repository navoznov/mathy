import { MAX_STARS } from '../domain/scoring';
import { OP_SYMBOL } from '../domain/types';
import type { Attempt } from '../domain/types';

export function formatMs(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} с`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} мин ${whole % 60} с`;
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAttempt(a: Attempt): string {
  const task = `${a.a} ${OP_SYMBOL[a.op]} ${a.b}`;
  return a.correct ? `${task} = ${a.expected}` : `${task} = ${a.given}, правильно ${a.expected}`;
}

export function formatStars(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, MAX_STARS - stars));
}
