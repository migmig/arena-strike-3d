import { describe, it, expect } from 'vitest';
import { applyDamage, healPlayer, DEFAULT_PLAYER_STATS, type Damageable } from '@/systems/Health';

function makeTarget(hp = 100): Damageable {
  return {
    hp,
    maxHp: hp,
    isDead: false,
    takeDamage: () => {},
  };
}

describe('Health', () => {
  it('전달된 데미지를 그대로 차감한다 (헤드샷/모디파이어는 호출자가 계산)', () => {
    const t = makeTarget(50);
    const dealt = applyDamage(t, 20, false);
    expect(dealt).toBe(20);
    expect(t.hp).toBe(30);
    expect(t.isDead).toBe(false);
  });

  it('isHeadshot 플래그는 takeDamage 콜백에만 전달되고 데미지 자체에는 영향 없음', () => {
    let observed: { amount: number; hs: boolean } | null = null;
    const t: Damageable = {
      hp: 50,
      maxHp: 50,
      isDead: false,
      takeDamage: (amount, isHeadshot) => {
        observed = { amount, hs: isHeadshot };
      },
    };
    const dealt = applyDamage(t, 20, true);
    expect(dealt).toBe(20);
    expect(t.hp).toBe(30);
    expect(observed).toEqual({ amount: 20, hs: true });
  });

  it('HP 0 이하는 isDead로 설정', () => {
    const t = makeTarget(15);
    applyDamage(t, 20, false);
    expect(t.hp).toBe(0);
    expect(t.isDead).toBe(true);
  });

  it('이미 죽은 대상은 추가 데미지 없음', () => {
    const t = makeTarget(10);
    t.isDead = true;
    const dealt = applyDamage(t, 50, false);
    expect(dealt).toBe(0);
    expect(t.hp).toBe(10);
  });

  it('healPlayer는 maxHealth를 초과하지 않는다', () => {
    const stats = { ...DEFAULT_PLAYER_STATS, currentHealth: 80 };
    const healed = healPlayer(stats, 50);
    expect(healed).toBe(20);
    expect(stats.currentHealth).toBe(100);
  });
});
