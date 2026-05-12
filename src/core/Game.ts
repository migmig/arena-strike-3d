import { Box3, Vector3 } from 'three';
import { Renderer } from '@managers/Renderer';
import { Physics } from '@managers/Physics';
import { InputManager } from '@managers/InputManager';
import { Player } from '@entities/Player';
import { CameraController } from '@managers/CameraController';
import { CameraShake } from '@managers/CameraShake';
import { StateMachine } from './StateMachine';
import { EventBus } from './EventBus';
import { buildArena, ARENA_HALF } from '@entities/Arena';
import { ProjectileSystem } from '@systems/ProjectileSystem';
import { attachDebug } from '@utils/debug';
import { RNG } from '@utils/rng';
import { WeaponSystem } from '@systems/WeaponSystem';
import { EnemyManager } from '@systems/EnemyManager';
import { PickupSystem, type ActiveBuff } from '@systems/PickupSystem';
import { ScoreSystem, type EnemyKind } from '@systems/ScoreSystem';
import { DEFAULT_PLAYER_STATS, type PlayerStats, healPlayer } from '@systems/Health';
import { WaveSystem } from '@systems/WaveSystem';
import { Boss } from '@entities/Boss';
import { PerkSystem } from '@systems/PerkSystem';
import { SaveManager } from '@managers/SaveManager';
import { AudioManager } from '@managers/AudioManager';
import { Accessibility } from '@managers/Accessibility';
import { HitParticles } from '@entities/HitParticles';
import { DeathFragments } from '@entities/DeathFragments';
import { Viewmodel } from '@entities/Viewmodel';
import { TelemetrySystem } from '@systems/Telemetry';
import { recordFrame, recordWave } from '@utils/perfHooks';
import { HUD } from '@ui/HUD';
import { PerkSelect } from '@ui/PerkSelect';
import { Overlay } from '@ui/Overlay';
import { Onboarding } from '@ui/Onboarding';
import { DamageNumbers } from '@ui/DamageNumbers';
import { Vignette } from '@ui/Vignette';
import { EnemyHpBars } from '@ui/EnemyHpBars';
import { Minimap } from '@ui/Minimap';
import { SettingsMenu } from '@ui/SettingsMenu';
import { Credits } from '@ui/Credits';

export interface GameEvents {
  stateChange: { from: string; to: string };
  gunshot: { x: number; y: number; z: number };
  enemyKilled: { kind: string; score: number };
  playerHit: { damage: number };
}

export class Game {
  readonly renderer: Renderer;
  readonly physics: Physics;
  readonly input: InputManager;
  readonly state: StateMachine;
  readonly bus: EventBus<GameEvents>;
  readonly cameraController: CameraController;
  readonly cameraShake = new CameraShake();
  readonly rng: RNG;
  readonly stats: PlayerStats = { ...DEFAULT_PLAYER_STATS };
  readonly score: ScoreSystem;
  readonly activeBuffs: ActiveBuff[] = [];
  readonly save: SaveManager;
  readonly audio: AudioManager;
  readonly perks: PerkSystem;
  readonly telemetry: TelemetrySystem;
  readonly accessibility = new Accessibility();

  player!: Player;
  weapons!: WeaponSystem;
  enemies!: EnemyManager;
  pickups!: PickupSystem;
  waves!: WaveSystem;
  boss: Boss | null = null;
  particles!: HitParticles;
  projectiles!: ProjectileSystem;
  fragments!: DeathFragments;
  viewmodel!: Viewmodel;
  obstacles: Box3[] = [];

  hud!: HUD;
  perkUi!: PerkSelect;
  resultOverlay!: Overlay;
  pauseOverlay!: Overlay;
  onboarding!: Onboarding;
  damageNumbers!: DamageNumbers;
  vignette!: Vignette;
  enemyHpBars!: EnemyHpBars;
  minimap!: Minimap;
  settings!: SettingsMenu;
  credits!: Credits;

  private lastTime = 0;
  private running = false;
  private hudParent: HTMLElement;
  private sessionStart = 0;
  private lastWaveStart = 0;
  private waveDeaths = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();
    this.input = new InputManager();
    this.state = new StateMachine();
    this.bus = new EventBus<GameEvents>();
    this.cameraController = new CameraController(this.renderer.camera);
    this.rng = new RNG();
    this.score = new ScoreSystem();
    this.save = new SaveManager();
    this.audio = new AudioManager();
    this.perks = new PerkSystem(this.rng);
    this.telemetry = new TelemetrySystem(this.save);
    this.hudParent = document.getElementById('hud') ?? document.body;
  }

  async init(): Promise<void> {
    await this.physics.init();
    this.input.attach(document.body);

    const arena = buildArena(this.renderer.scene, this.physics.world);
    this.obstacles = arena.obstacles;
    this.player = new Player(this.physics.world, this.renderer.scene);
    this.weapons = new WeaponSystem(this.renderer.scene, this.renderer.camera, this.rng);
    this.enemies = new EnemyManager(this.renderer.scene, this.rng);
    this.pickups = new PickupSystem(this.renderer.scene, this.rng);
    this.waves = new WaveSystem(this.enemies, this.rng, this.renderer.camera, undefined, undefined, ARENA_HALF - 3);
    this.waves.setDifficulty(this.save.options.difficulty);
    this.particles = new HitParticles(this.renderer.scene);
    this.projectiles = new ProjectileSystem(this.renderer.scene);
    this.fragments = new DeathFragments(this.renderer.scene);
    this.viewmodel = new Viewmodel(this.renderer.camera);
    this.renderer.scene.add(this.renderer.camera);

    this.hud = new HUD(this.hudParent);
    this.perkUi = new PerkSelect(this.hudParent);
    this.resultOverlay = new Overlay(this.hudParent, 'result-overlay');
    this.pauseOverlay = new Overlay(this.hudParent, 'pause-overlay');
    this.onboarding = new Onboarding(this.hudParent, this.save);
    this.damageNumbers = new DamageNumbers(this.hudParent, this.renderer.camera);
    this.vignette = new Vignette(this.hudParent);
    this.enemyHpBars = new EnemyHpBars(this.hudParent, this.renderer.camera);
    this.minimap = new Minimap(this.hudParent, ARENA_HALF);
    this.credits = new Credits(this.hudParent, () => {});
    this.settings = new SettingsMenu(this.hudParent, this.save, this.input, {
      onClose: () => {
        if (this.state.is('PAUSED')) {
          this.pauseOverlay.show('Paused', 'Press Esc again to resume.', [
            { label: 'Resume', onClick: () => this.togglePause() },
            { label: 'Settings', onClick: () => this.openSettings() },
          ]);
        }
      },
      onOptionsChange: () => this.applyOptionsFromSave(),
      onOpenCredits: () => this.credits.open(),
    });

    const savedKeymap = this.save.keymap;
    if (savedKeymap) this.input.loadKeymap(savedKeymap);

    this.applyOptionsFromSave();
    this.renderer.onContextLostCallback = () => this.state.transition('PAUSED');

    attachDebug(this);

    this.sessionStart = performance.now();
    this.lastWaveStart = this.sessionStart;
    this.waves.startNextWave(this.sessionStart);
    this.telemetry.track({
      type: 'game_start',
      difficulty: this.save.options.difficulty,
      sessionId: this.telemetry.sessionId,
      ts: Date.now(),
    });
    this.state.transition('PLAYING');
  }

  private applyOptionsFromSave(): void {
    const o = this.save.options;
    this.cameraController.sensitivity = o.sensitivity;
    this.cameraController.invertY = o.invertY;
    this.audio.setVolumes(o.bgmVolume, o.sfxVolume);
    this.renderer.applyPreset(o.graphicsPreset);
    this.cameraShake.enabled = !o.reduceMotion;
    this.vignette?.setReduceMotion(o.reduceMotion);
    this.hud?.setCrosshairStyle(o.crosshair);
    this.viewmodel?.setVisible(o.showViewmodel);
    this.accessibility.apply(o);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
  }

  togglePause(): void {
    if (this.state.is('PLAYING')) {
      this.state.transition('PAUSED');
      this.pauseOverlay.show('Paused', 'Press Esc again to resume.', [
        { label: 'Resume', onClick: () => this.togglePause() },
        { label: 'Settings', onClick: () => this.openSettings() },
      ]);
      document.exitPointerLock();
    } else if (this.state.is('PAUSED')) {
      if (this.settings.isOpen() || this.credits.isOpen()) return;
      this.pauseOverlay.hide();
      this.input.requestPointerLock();
      this.state.transition('PLAYING');
    }
  }

  openSettings(): void {
    this.pauseOverlay.hide();
    this.settings.open();
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    recordFrame(deltaTime * 1000);
    this.update(deltaTime, now);
    requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number, now: number): void {
    const deltaMs = deltaTime * 1000;
    if (this.input.wasActionTriggered('PAUSE')) this.togglePause();
    if (this.input.wasActionTriggered('TOGGLE_CAMERA')) this.cameraController.toggleMode();

    if (this.state.is('PLAYING')) {
      this.physics.step(deltaTime);
      this.player.update(deltaTime, this.input, this.cameraController.yaw);
      this.cameraController.update(
        this.input,
        this.player.position,
        deltaTime,
        this.renderer.scene,
        this.cameraShake,
      );

      const targets = this.boss ? [...this.enemies.alive, this.boss] : this.enemies.alive;
      const hits = this.weapons.update(this.input, targets, this.cameraController.ads, {
        perkMods: this.perks.mods,
        buffs: this.activeBuffs,
        stats: this.stats,
      });
      this.viewmodel.setWeapon(this.weapons.active.spec.id);
      this.viewmodel.setMode(this.cameraController.mode === 'TPV');
      if (this.weapons.firedThisFrame) this.viewmodel.triggerRecoil();
      this.viewmodel.update(deltaTime, this.cameraController.ads, this.player.horizontalSpeed);
      for (const hit of hits) {
        const emphasize = hit.isHeadshot || hit.isCrit;
        this.hud.showHitMarker(emphasize);
        this.audio.playSfx('hit');
        this.particles.burst(hit.point, 8);
        this.damageNumbers.spawn(hit.point, hit.damage, emphasize);
        this.onboarding.trigger('fire');
        if (hit.target.isDead && 'kind' in hit.target) {
          const k = (hit.target as { kind: EnemyKind }).kind;
          const earned = this.score.onKill(k, hit.isHeadshot);
          this.bus.emit('enemyKilled', { kind: k, score: earned });
          if (this.perks.mods.lifestealPerKill > 0)
            healPlayer(this.stats, this.perks.mods.lifestealPerKill);
          if (k === 'boss') this.boss = null;
        }
      }
      if (this.weapons.active.reloadingUntil > 0) this.onboarding.trigger('reload');

      const enemyDamage = this.enemies.update(
        deltaTime,
        this.player.position,
        now,
        this.obstacles,
        this.projectiles,
        this.fragments,
      );
      this.fragments.update(deltaTime);
      const projectileDamage = this.projectiles.update(
        deltaTime,
        now,
        this.player.position,
        this.obstacles,
      );
      let bossDamage = 0;
      if (this.boss) {
        bossDamage = this.boss.update(deltaTime, this.player.position, now, this.enemies);
        if (this.boss.isDead) this.boss = null;
      }
      const totalDmg =
        (enemyDamage + bossDamage + projectileDamage) * (1 - this.perks.mods.damageReduction);
      if (totalDmg > 0) {
        this.stats.currentHealth = Math.max(0, this.stats.currentHealth - totalDmg);
        this.score.onPlayerHit();
        this.bus.emit('playerHit', { damage: totalDmg });
        this.cameraShake.push(0.04, 200);
        this.vignette.pulse();
        if (this.stats.currentHealth <= 0) this.endRun(false, now);
      }

      this.pickups.update(
        deltaTime,
        now,
        this.player.position,
        this.stats,
        this.weapons,
        this.activeBuffs,
      );
      this.particles.update(deltaTime);
      this.score.tick();

      const waveEvent = this.waves.update(now);
      if (waveEvent === 'wave_cleared') void this.handleWaveCleared(now);
      else if (waveEvent === 'game_complete') this.endRun(true, now);

      if (this.waves.isBossWave() && !this.boss && this.enemies.alive.length === 0) {
        this.boss = new Boss(
          this.renderer.scene,
          new Vector3(0, 0, -8),
          1500 * this.waves.hpMultiplier,
        );
      }

      this.hud.update(deltaMs, this.stats, this.weapons, this.score, this.waves);
      this.vignette.setHpRatio(this.stats.currentHealth / this.stats.maxHealth);
      this.vignette.update(deltaMs);
      this.damageNumbers.update(now, window.innerWidth, window.innerHeight);
      this.enemyHpBars.update(this.enemies.alive, window.innerWidth, window.innerHeight);
      this.minimap.update(now, this.player.position, this.cameraController.yaw, this.enemies.alive, this.boss, this.pickups);
      this.onboarding.update(now);
    }
    this.renderer.render();
    this.input.endFrame();
  }

  private async handleWaveCleared(now: number): Promise<void> {
    const waveTimeMs = now - this.lastWaveStart;
    recordWave(waveTimeMs);
    this.telemetry.track({
      type: 'wave_complete',
      wave: this.waves.currentWave - 1,
      timeTakenMs: waveTimeMs,
      deaths: this.waveDeaths,
      ts: Date.now(),
    });
    this.lastWaveStart = now;
    this.waveDeaths = 0;
    healPlayer(this.stats, 30);
    this.audio.playSfx('pickup');
    const offers = this.perks.offerThree();
    if (offers.length === 0) return;
    const prev = this.state.state;
    this.state.transition('PAUSED');
    const picked = await this.perkUi.show(offers);
    this.perks.apply(picked, this.stats);
    this.telemetry.track({
      type: 'perk_choice',
      offered: offers.map((o) => o.id),
      picked,
      ts: Date.now(),
    });
    this.state.transition(prev);
  }

  private endRun(victory: boolean, now: number): void {
    this.state.transition('RESULT');
    const durationMs = now - this.sessionStart;
    this.save.bumpStats(this.score.kills, durationMs);
    this.save.recordScore(this.save.options.difficulty, {
      score: this.score.score,
      wave: this.waves.currentWave,
      kills: this.score.kills,
      date: Date.now(),
    });
    this.audio.playSfx('death');
    this.audio.stopBgm();
    this.telemetry.track({
      type: victory ? 'session_end' : 'player_death',
      ...(victory
        ? {
            durationMs,
            maxWave: this.waves.currentWave,
            finalScore: this.score.score,
          }
        : {
            wave: this.waves.currentWave,
            weapon: this.weapons.active.spec.id,
            kills: this.score.kills,
          }),
      ts: Date.now(),
    } as never);
    document.exitPointerLock();
    this.resultOverlay.show(
      victory ? 'Victory' : 'Defeated',
      `Score: <b>${this.score.score.toLocaleString()}</b><br>
       Wave: <b>${this.waves.currentWave}</b><br>
       Kills: <b>${this.score.kills}</b><br>
       Max combo: <b>${this.score.maxCombo}</b>`,
      [{ label: 'Restart', onClick: () => window.location.reload() }],
    );
  }
}
