import RAPIER from '@dimforge/rapier3d-compat';
import { Scene, Vector3 } from 'three';
import type { InputManager } from '@managers/InputManager';

const MOVE_SPEED = 6;
const DASH_SPEED = 18;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 3;
const JUMP_SPEED = 6.5;
const GRAVITY = -20;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;

export class Player {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly position = new Vector3(0, PLAYER_HEIGHT / 2, 0);

  private velocityY = 0;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDir = new Vector3();
  private grounded = false;
  horizontalSpeed = 0;

  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly desired = new Vector3();
  private readonly translation = new Vector3();

  private controller: RAPIER.KinematicCharacterController;

  constructor(world: RAPIER.World, _scene: Scene) {
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, PLAYER_HEIGHT, 0);
    this.body = world.createRigidBody(desc);
    const colliderDesc = RAPIER.ColliderDesc.capsule(
      PLAYER_HEIGHT / 2 - PLAYER_RADIUS,
      PLAYER_RADIUS,
    );
    this.collider = world.createCollider(colliderDesc, this.body);

    this.controller = world.createCharacterController(0.05);
    this.controller.enableAutostep(0.4, 0.2, true);
    this.controller.enableSnapToGround(0.3);
    this.controller.setApplyImpulsesToDynamicBodies(false);
  }

  update(deltaTime: number, input: InputManager, yaw: number): void {
    this.forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    this.desired.set(0, 0, 0);
    if (input.isActionPressed('MOVE_FWD')) this.desired.add(this.forward);
    if (input.isActionPressed('MOVE_BACK')) this.desired.sub(this.forward);
    if (input.isActionPressed('STRAFE_R')) this.desired.add(this.right);
    if (input.isActionPressed('STRAFE_L')) this.desired.sub(this.right);
    if (this.desired.lengthSq() > 0) this.desired.normalize();

    let speed = MOVE_SPEED;

    this.dashCooldown = Math.max(0, this.dashCooldown - deltaTime);
    if (input.wasActionTriggered('DASH') && this.dashCooldown <= 0 && this.desired.lengthSq() > 0) {
      this.dashTimer = DASH_DURATION;
      this.dashCooldown = DASH_COOLDOWN;
      this.dashDir.copy(this.desired);
    }
    if (this.dashTimer > 0) {
      this.dashTimer -= deltaTime;
      this.desired.copy(this.dashDir);
      speed = DASH_SPEED;
    }

    if (this.grounded && input.wasActionTriggered('JUMP')) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
    }
    this.velocityY += GRAVITY * deltaTime;

    this.translation.set(
      this.desired.x * speed * deltaTime,
      this.velocityY * deltaTime,
      this.desired.z * speed * deltaTime,
    );

    this.controller.computeColliderMovement(this.collider, this.translation);
    const movement = this.controller.computedMovement();
    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.velocityY < 0) this.velocityY = 0;

    const cur = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: cur.x + movement.x,
      y: cur.y + movement.y,
      z: cur.z + movement.z,
    });

    const t = this.body.translation();
    this.position.set(t.x, t.y - PLAYER_HEIGHT / 2 + 1.6, t.z);
    this.horizontalSpeed = Math.hypot(movement.x, movement.z) / Math.max(deltaTime, 1e-3);
  }
}
