export class CameraShake {
  private intensity = 0;
  private decay = 0;
  enabled = true;

  push(intensity: number, durationMs = 150): void {
    if (!this.enabled) return;
    this.intensity = Math.max(this.intensity, intensity);
    this.decay = intensity / (durationMs / 1000);
  }

  sample(deltaTime: number): { yaw: number; pitch: number } {
    if (this.intensity <= 0) return { yaw: 0, pitch: 0 };
    const yaw = (Math.random() - 0.5) * this.intensity;
    const pitch = (Math.random() - 0.5) * this.intensity;
    this.intensity = Math.max(0, this.intensity - this.decay * deltaTime);
    return { yaw, pitch };
  }
}
