import { PerspectiveCamera, Vector3, Euler, MathUtils, Raycaster } from 'three';
import type { Scene } from 'three';
import type { InputManager } from './InputManager';
import type { CameraShake } from './CameraShake';

export type CameraMode = 'FPV' | 'TPV';

const FPV_FOV = 75;
const ADS_FOV = 50;
const ADS_SENS_MUL = 0.7;
const TRANSITION_SPEED = 7.5;

export class CameraController {
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0025;
  invertY = false;
  mode: CameraMode = 'FPV';

  ads = 0;
  baseFov = FPV_FOV;

  private fpvOffset = new Vector3(0, 1.6, 0);
  private tpvOffset = new Vector3(0.4, 0.3, -2.0);
  private euler = new Euler(0, 0, 0, 'YXZ');
  private tmp = new Vector3();
  private rayDir = new Vector3();
  private raycaster = new Raycaster();

  constructor(private camera: PerspectiveCamera) {
    this.camera.fov = FPV_FOV;
    this.camera.updateProjectionMatrix();
  }

  toggleMode(): void {
    this.mode = this.mode === 'FPV' ? 'TPV' : 'FPV';
  }

  update(
    input: InputManager,
    playerPos: Vector3,
    deltaTime: number,
    scene: Scene,
    shake?: CameraShake,
  ): void {
    const adsActive = input.isActionPressed('ADS');
    const adsTarget = adsActive ? 1 : 0;
    this.ads = MathUtils.lerp(this.ads, adsTarget, Math.min(1, deltaTime * TRANSITION_SPEED));

    const targetFov = MathUtils.lerp(FPV_FOV, ADS_FOV, this.ads);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    if (input.pointerLocked) {
      const sensMul = MathUtils.lerp(1, ADS_SENS_MUL, this.ads);
      this.yaw -= input.mouseDeltaX * this.sensitivity * sensMul;
      const pitchSign = this.invertY ? 1 : -1;
      this.pitch += input.mouseDeltaY * this.sensitivity * sensMul * pitchSign;
      const limit = Math.PI / 2 - 0.01;
      this.pitch = MathUtils.clamp(this.pitch, -limit, limit);
    }

    let shakeYaw = 0;
    let shakePitch = 0;
    if (shake) {
      const s = shake.sample(deltaTime);
      shakeYaw = s.yaw;
      shakePitch = s.pitch;
    }

    if (this.mode === 'FPV') {
      this.tmp.copy(playerPos).add(this.fpvOffset);
      this.camera.position.copy(this.tmp);
    } else {
      const off = this.tpvOffset;
      const forward = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const desired = playerPos
        .clone()
        .add(new Vector3(0, off.y + 1.5, 0))
        .add(right.multiplyScalar(off.x))
        .add(forward.multiplyScalar(off.z));
      this.rayDir.subVectors(desired, playerPos).normalize();
      this.raycaster.set(playerPos.clone().add(new Vector3(0, 1.5, 0)), this.rayDir);
      const distLimit = playerPos.distanceTo(desired);
      this.raycaster.far = distLimit;
      const hits = this.raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const first = hits[0];
        if (first) desired.copy(first.point).addScaledVector(this.rayDir, -0.2);
      }
      this.camera.position.copy(desired);
    }

    this.euler.set(this.pitch + shakePitch, this.yaw + shakeYaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }
}
