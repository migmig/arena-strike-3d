import { describe, it, expect } from 'vitest';
import { RNG } from '@/utils/rng';

describe('RNG', () => {
  it('동일 시드는 동일 시퀀스를 생성한다', () => {
    const a = new RNG('arena-test');
    const b = new RNG('arena-test');
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('range는 [min, max) 범위 내에 있다', () => {
    const r = new RNG('range');
    for (let i = 0; i < 1000; i++) {
      const v = r.range(-5, 5);
      expect(v).toBeGreaterThanOrEqual(-5);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick는 배열의 원소를 반환한다', () => {
    const r = new RNG('pick');
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('빈 배열에 pick 호출 시 throw', () => {
    const r = new RNG();
    expect(() => r.pick([])).toThrow();
  });
});
