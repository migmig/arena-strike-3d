import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Color,
  HemisphereLight,
  DirectionalLight,
} from 'three';

export type GraphicsPreset = 'low' | 'medium' | 'high';

export interface GraphicsConfig {
  preset: GraphicsPreset;
  antialias: boolean;
  pixelRatio: number;
  shadows: boolean;
}

const PRESETS: Record<GraphicsPreset, GraphicsConfig> = {
  low: { preset: 'low', antialias: false, pixelRatio: 0.75, shadows: false },
  medium: { preset: 'medium', antialias: true, pixelRatio: 1.0, shadows: false },
  high: { preset: 'high', antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2), shadows: true },
};

export class Renderer {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly webgl: WebGLRenderer;
  private config: GraphicsConfig = PRESETS.medium;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.scene.background = new Color(0x1a1a22);

    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.webgl = new WebGLRenderer({ canvas, antialias: this.config.antialias });
    this.webgl.setPixelRatio(this.config.pixelRatio);
    this.webgl.setSize(window.innerWidth, window.innerHeight);

    const hemi = new HemisphereLight(0xffffff, 0x222233, 0.6);
    this.scene.add(hemi);
    const dir = new DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 20, 10);
    this.scene.add(dir);

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('webglcontextlost', this.onContextLost as EventListener, false);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  contextLost = false;
  onContextLostCallback: (() => void) | null = null;
  onContextRestoredCallback: (() => void) | null = null;

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    console.warn('WebGL context lost');
    this.onContextLostCallback?.();
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    console.info('WebGL context restored');
    this.onContextRestoredCallback?.();
  };

  applyPreset(preset: GraphicsPreset): void {
    this.config = PRESETS[preset];
    this.webgl.setPixelRatio(this.config.pixelRatio);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.webgl.setSize(window.innerWidth, window.innerHeight);
  };

  render(): void {
    if (this.contextLost) return;
    this.webgl.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.webgl.dispose();
  }
}
