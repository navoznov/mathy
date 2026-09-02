import { describe, it, expect } from 'vitest';
import { OP_SYMBOL } from './types';

describe('OP_SYMBOL', () => {
  it('содержит символ для каждой операции', () => {
    expect(OP_SYMBOL).toEqual({ add: '+', sub: '−', mul: '×', div: '÷' });
  });

  it('использует типографский минус, а не дефис', () => {
    expect(OP_SYMBOL.sub).not.toBe('-');
    expect(OP_SYMBOL.sub.charCodeAt(0)).toBe(0x2212);
  });
});
