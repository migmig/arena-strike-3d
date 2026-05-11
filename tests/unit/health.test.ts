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
  it('일반 데미지는 그대로 적용된다', () => {
    const t = makeTarget(50);
    const dealt = applyDamage(t, 20, false);
    expect(dealt).toBe(20);
    expect(t.hp).toBe(30);
    expect(t.isDead).toBe(false);
  });

  it('헤드샷은 2배 데미지', () => {
    const t = makeTarget(50);
    const dealt = applyDamage(t, 20, true);
    expect(dealt).toBe(40);
    expect(t.hp).toBe(10);
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
