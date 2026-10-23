import { describe, expect, it } from 'vitest';
import { keepUnitTogether } from '../keepUnitTogether';

describe('keepUnitTogether', () => {
  it('binds only the trailing unit to the preceding number', () => {
    expect(keepUnitTogether('1억 3,138만 원')).toBe('1억 3,138만 원');
  });

  it('leaves single-word values untouched', () => {
    expect(keepUnitTogether('$96,539')).toBe('$96,539');
  });
});
