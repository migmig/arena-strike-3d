import { describe, it, expect } from 'vitest';
import { ScoreSystem, BASE_SCORE } from '@/systems/ScoreSystem';

function controlledNow(): { now: () => number; advance: (ms: number) => void } {
  let t = 0;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('ScoreSystem', () => {
  it('첫 처치는 1배 배율로 기본 점수만큼 가산된다', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    const earned = s.onKill('grunt', false);
    expect(earned).toBe(BASE_SCORE.grunt);
    expect(s.score).toBe(BASE_SCORE.grunt);
    expect(s.combo).toBe(1);
  });

  it('헤드샷은 콤보를 2씩 올린다', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    s.onKill('grunt', true);
    expect(s.combo).toBe(2);
    s.onKill('grunt', true);
    expect(s.combo).toBe(4);
  });

  it('콤보 배율은 임계값에서 단계적으로 증가한다', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    for (let i = 0; i < 3; i++) s.onKill('grunt', false);
    expect(s.getMultiplier()).toBe(1.2);
    for (let i = 0; i < 4; i++) s.onKill('grunt', false);
    expect(s.getMultiplier()).toBe(1.5);
    for (let i = 0; i < 8; i++) s.onKill('grunt', false);
    expect(s.getMultiplier()).toBe(2.0);
    for (let i = 0; i < 15; i++) s.onKill('grunt', false);
    expect(s.getMultiplier()).toBe(2.5);
  });

  it('3초 이상 간격이면 콤보가 끊긴다', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    s.onKill('grunt', false);
    s.onKill('grunt', false);
    expect(s.combo).toBe(2);
    clock.advance(3001);
    s.onKill('grunt', false);
    expect(s.combo).toBe(1);
  });

  it('피격 시 콤보가 50% 감소한다', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    for (let i = 0; i < 7; i++) s.onKill('grunt', false);
    expect(s.combo).toBe(7);
    s.onPlayerHit();
    expect(s.combo).toBe(3);
  });

  it('tick: 4초 무처치면 콤보 0으로 리셋', () => {
    const clock = controlledNow();
    const s = new ScoreSystem(clock.now);
    s.onKill('grunt', false);
    clock.advance(4001);
    s.tick();
    expect(s.combo).toBe(0);
  });
});
