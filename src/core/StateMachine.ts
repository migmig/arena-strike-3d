export type GameState = 'LOADING' | 'MENU' | 'PLAYING' | 'PAUSED' | 'RESULT';

export class StateMachine {
  private current: GameState = 'LOADING';
  private listeners: Array<(from: GameState, to: GameState) => void> = [];

  get state(): GameState {
    return this.current;
  }

  is(state: GameState): boolean {
    return this.current === state;
  }

  transition(to: GameState): void {
    if (to === this.current) return;
    const from = this.current;
    this.current = to;
    for (const listener of this.listeners) listener(from, to);
  }

  onTransition(listener: (from: GameState, to: GameState) => void): void {
    this.listeners.push(listener);
  }
}
