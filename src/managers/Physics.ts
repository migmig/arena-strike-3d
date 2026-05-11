import RAPIER from '@dimforge/rapier3d-compat';

export class Physics {
  world!: RAPIER.World;
  private accumulator = 0;
  private readonly fixedStep = 1 / 60;

  async init(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = this.fixedStep;
  }

  step(deltaTime: number): void {
    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedStep) {
      this.world.step();
      this.accumulator -= this.fixedStep;
    }
  }

  dispose(): void {
    this.world?.free();
  }
}
