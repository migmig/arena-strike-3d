import seedrandom from 'seedrandom';

export class RNG {
  private rng: () => number;

  constructor(seed: string = Date.now().toString()) {
    this.rng = seedrandom(seed);
  }

  next(): number {
    return this.rng();
  }

  range(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  intRange(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.range(minInclusive, maxExclusive));
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('RNG.pick on empty array');
    const item = arr[this.intRange(0, arr.length)];
    return item as T;
  }

  chance(probability: number): boolean {
    return this.rng() < probability;
  }
}
