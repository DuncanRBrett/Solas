import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to Math functions', () => {
    expect(Math.max(1, 2, 3)).toBe(3);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
