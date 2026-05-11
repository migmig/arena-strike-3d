import defaultKeymap from '@data/keymap.json';

export type Action =
  | 'MOVE_FWD'
  | 'MOVE_BACK'
  | 'STRAFE_L'
  | 'STRAFE_R'
  | 'JUMP'
  | 'DASH'
  | 'FIRE'
  | 'ADS'
  | 'RELOAD'
  | 'WEAPON_1'
  | 'WEAPON_2'
  | 'WEAPON_3'
  | 'WEAPON_PREV'
  | 'INTERACT'
  | 'TOGGLE_CAMERA'
  | 'PAUSE';

export interface Binding {
  device: 'kbd' | 'mouse';
  code: string;
}

export type KeyMap = Record<Action, Binding[]>;

export class InputManager {
  private keys = new Set<string>();
  private mouseButtons = new Set<number>();
  private triggeredKeys = new Set<string>();
  private triggeredMouse = new Set<number>();
  private prevKeys = new Set<string>();
  private prevMouse = new Set<number>();

  mouseDeltaX = 0;
  mouseDeltaY = 0;
  pointerLocked = false;

  private keymap: KeyMap = defaultKeymap as KeyMap;
  private target: HTMLElement | null = null;

  attach(target: HTMLElement): void {
    this.target = target;
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  detach(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }

  requestPointerLock(): void {
    this.target?.requestPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) this.triggeredKeys.add(e.code);
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };
  private onMouseDown = (e: MouseEvent): void => {
    if (!this.mouseButtons.has(e.button)) this.triggeredMouse.add(e.button);
    this.mouseButtons.add(e.button);
  };
  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.delete(e.button);
  };
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  };
  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.target;
  };

  isActionPressed(action: Action): boolean {
    const bindings = this.keymap[action];
    for (const b of bindings) {
      if (b.device === 'kbd' && this.keys.has(b.code)) return true;
      if (b.device === 'mouse' && this.mouseButtons.has(Number(b.code))) return true;
    }
    return false;
  }

  wasActionTriggered(action: Action): boolean {
    const bindings = this.keymap[action];
    for (const b of bindings) {
      if (b.device === 'kbd' && this.triggeredKeys.has(b.code)) return true;
      if (b.device === 'mouse' && this.triggeredMouse.has(Number(b.code))) return true;
    }
    return false;
  }

  endFrame(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.prevKeys = new Set(this.keys);
    this.prevMouse = new Set(this.mouseButtons);
    this.triggeredKeys.clear();
    this.triggeredMouse.clear();
  }
}
