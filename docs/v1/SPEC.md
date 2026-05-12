# 3D Shooting Game — Technical Specification

## 1. 기술 스택 및 아키텍처 (Tech Stack & Architecture)
- **언어**: TypeScript (엄격한 타입 체킹 및 객체지향/컴포넌트 설계)
- **빌드 도구**: Vite (빠른 HMR 및 번들링)
- **렌더링 엔진**: Three.js
- **물리 엔진**: @dimforge/rapier3d-compat (Three.js와 연동 용이)
- **오디오**: Howler.js (UI/2D 사운드) + Three.js 내장 `AudioListener`/`PositionalAudio` (3D 공간 음향)
- **UI/상태 관리**: DOM 기반 HTML/CSS, 상태 관리는 경량화된 Store 패턴(Zustand 또는 커스텀 Observer) 활용
- **품질 도구**: ESLint (typescript-eslint), Prettier, tsconfig `strict: true`
- **테스트**: Vitest (단위), Playwright (E2E 스모크)
- **디버그**: `stats.js` (FPS/MEM), `lil-gui` (런타임 파라미터 튜닝, dev 빌드에서만 노출)

### 프로젝트 구조
```
3dshooting/
├── src/
│   ├── core/           # Game, Loop, StateMachine, EventBus
│   ├── managers/       # Renderer, Physics, Input, Audio, UI, Entity, Save
│   ├── systems/        # Wave, Weapon, AI, Pickup, Score, Telemetry
│   ├── entities/       # Player, Enemy, Boss, Projectile, Pickup
│   ├── ui/             # HUD, Menu, Pause, PerkSelect, ResultScreen, MiniMap
│   ├── data/           # weapons.json, enemies.json, perks.json, waves.json
│   ├── utils/          # Pool, RNG(seedable), Math helpers
│   └── main.ts         # 엔트리
├── public/
│   ├── assets/         # .glb, .ktx2, .ogg
│   └── index.html
├── tests/
│   ├── unit/
│   └── e2e/
├── scripts/            # 에셋 압축(gltf-transform, ktx2 변환)
├── .github/workflows/  # CI (lint, test, build, deploy)
├── ASSETS.md           # 에셋 라이선스 트래킹
└── vite.config.ts
```

### 아키텍처 패턴
- `App`: 진입점, Game 인스턴스 초기화 및 로딩 관리
- `Game`: 메인 루프 (requestAnimationFrame) 소유, 매니저 클래스들 간의 라이프사이클 관리
- `Managers`:
  - `Renderer`: Three.js Scene, Camera, WebGLRenderer 설정 및 렌더링
  - `Physics`: Rapier World 관리, 물리 틱(step) 업데이트 및 콜백 처리
  - `InputManager`: 키보드/마우스 입력 상태 추적, PointerLock API 래핑
  - `AudioManager`: 사운드 에셋 로드 및 재생 채널 관리
  - `UIManager`: HTML UI 엘리먼트(HUD, 메뉴, 퍽 선택 화면) 업데이트
  - `EntityManager`: 플레이어, 적, 픽업 아이템, 투사체의 생성/업데이트/소멸(Pool) 관리

## 2. 코어 모듈 설계 (Core Modules Design)

### 2.1 Game Loop (`Game.ts`)
```typescript
update(deltaTime: number) {
    if (this.state !== 'PLAYING') return;
    
    this.physics.step(deltaTime);       // 1. 물리 연산
    this.input.update();                // 2. 입력 처리
    this.entityManager.update(deltaTime); // 3. 엔티티 상태 (AI, 이동 등) 업데이트
    this.waveSystem.update(deltaTime);  // 4. 웨이브/스폰 로직 업데이트
    this.renderer.render();             // 5. 화면 렌더링
}
```

### 2.2 Input & Camera (`InputManager.ts`, `CameraController.ts`)
- **Pointer Lock API**: 화면 클릭 시 커서 숨김 및 카메라 시점 조작 활성화 (`document.body.requestPointerLock()`). Esc 입력 시 해제 및 일시정지 메뉴 호출.
- **Camera**: Three.js `PerspectiveCamera` (FOV: 70~110 가변).
- **마우스 컨트롤**: `movementX`, `movementY`를 받아 카메라의 Yaw(Y축 회전) 및 Pitch(X축 회전, 상하 제한 적용) 업데이트.

#### 입력 액션 매핑 (Input Abstraction Layer)
- 키/마우스/게임패드를 추상 액션으로 매핑하는 중간 레이어:
  ```typescript
  type Action = 'MOVE_FWD' | 'MOVE_BACK' | 'STRAFE_L' | 'STRAFE_R'
              | 'JUMP' | 'DASH' | 'FIRE' | 'ADS' | 'RELOAD'
              | 'WEAPON_1' | 'WEAPON_2' | 'WEAPON_3' | 'WEAPON_PREV'
              | 'INTERACT' | 'TOGGLE_CAMERA' | 'PAUSE';

  interface Binding { device: 'kbd' | 'mouse' | 'pad'; code: string; }
  type KeyMap = Record<Action, Binding[]>;
  ```
- `InputManager.isActionPressed(action)` / `wasActionTriggered(action)` API
- 키맵은 LocalStorage에 저장, 옵션 메뉴에서 재할당 가능
- 게임패드는 Post-MVP지만 액션 레이어를 통해 비용 없이 확장 가능

#### 카메라 모드 (1인칭 / 3인칭)
```typescript
type CameraMode = 'FPV' | 'TPV';
class CameraController {
    private offsetFPV = new Vector3(0, 1.6, 0);
    private offsetTPV = new Vector3(0.4, 0.3, -2.0);
    toggle(): void; // 0.3초 lerp transition
    update(playerPos: Vector3, yaw: number, pitch: number): void;
}
```
- 3인칭 모드: 어깨 너머 카메라, 카메라-플레이어 사이 raycast로 벽 끼임 방지
- 모드 전환 시 viewmodel 가시성 토글 (`scene.weaponViewmodel.visible`)

#### ADS (조준)
- RMB 홀드 → `targetFov = 50`, `targetSensMul = 0.7`, `targetSpread = 0.4×` 보간
- 릴리스 → 0.15초 내 기본값 복귀
- 이동속도 `0.6×` 멀티플라이어를 PlayerStats에 일시 적용

### 2.3 Physics & Collision (`PhysicsEngine.ts`)
- **Collision Groups (비트마스크)**:
  - `GROUP_PLAYER`, `GROUP_ENEMY`, `GROUP_ENVIRONMENT`, `GROUP_PROJECTILE`, `GROUP_PICKUP`
- **Player Movement**: Rapier의 Kinematic Character Controller 사용 권장 (계단 오르기, 슬라이딩 처리 용이). 대시(Shift) 시 순간적인 속도 증가(Velocity Override) 적용.

### 2.4 Weapon System (`WeaponManager.ts`)
- **사격 메커니즘 (Hitscan 위주)**:
  - `Pistol`, `SMG`, `Shotgun` 모두 Raycaster를 사용하여 화면 중앙(카메라 전방)으로 Ray 발사.
  - 투사체 이동 시간이 없는 즉발 처리 후, 탄도 궤적(Tracer Mesh)만 0.05초간 렌더링하여 타격감 부여.
  - 샷건의 경우 부채꼴 형태로 여러 개의 Raycast 동시 발사 (Spread 적용).
- **무기 데이터 구조**:
  ```typescript
  interface WeaponSpec {
      id: 'pistol' | 'smg' | 'shotgun';
      damage: number;
      fireRate: number; // 발사 간격 (ms)
      magSize: number;
      reloadTime: number; // 장전 시간 (ms)
      spread: number; // 탄퍼짐 각도
      pellets: number; // 1회 발사 당 투사체 수
      autoFire: boolean; // 자동 연사 여부
  }
  ```

### 2.5 Enemy & AI (`EnemySystem.ts`)
- **상태 머신 (FSM)**:
  - `SPAWN` (스폰 애니메이션 무적) -> `CHASE` (추적) -> `ATTACK` (공격/사격) -> `STUN` (피격 경직) -> `DIE` (래그돌 또는 데스 애니메이션 후 소멸)
- **경로 탐색 (Pathfinding)**:
  - MVP 레벨의 맵(30x30m 아레나)에서는 무거운 NavMesh 대신, **Steering Behaviors** (Seek + Obstacle Avoidance Raycast) 또는 단순 직선 추적으로 구현하여 성능 확보.
- **감지**:
  - 시야 raycast: 120° 콘 + 25m 거리, 벽 occlusion 체크
  - 청각: 플레이어 발사 시 `EventBus.emit('gunshot', pos)`, 반경 15m 적은 어그로 갱신
- **적 타입 (PRD 기반)**:
  - **Grunt**: 플레이어와의 거리 벡터 정규화 후 이동. 사거리 진입 시 근접 공격.
  - **Shooter**: 거리가 가까워지면 뒤로 후퇴, 적정 거리에서 정지 후 투사체 발사 (Projectile 기반).
  - **Charger**: 플레이어를 향해 돌진(가속도 높음), 충돌 시 자폭 데미지.

#### 보스 FSM (`BossController.ts`)
```typescript
type BossPhase = 'P1' | 'P2' | 'P3' | 'TRANSITION' | 'DIE';

class BossController {
    phase: BossPhase = 'P1';
    private hpThresholds = { toP2: 0.67, toP3: 0.33 };
    onDamage(amount: number) {
        const hpRatio = this.hp / this.maxHp;
        if (this.phase === 'P1' && hpRatio <= this.hpThresholds.toP2)
            this.transitionTo('P2');
        else if (this.phase === 'P2' && hpRatio <= this.hpThresholds.toP3)
            this.transitionTo('P3');
    }
    // 페이즈별 패턴은 별도 strategy 객체 주입
}
```
- 페이즈 전이: 2초 무적 + 사이클로프 폭발 이펙트 + SFX
- P2 소환 미니언: Grunt 2기 (10초 쿨다운)
- P3 돌진: Charger 패턴 + 반경 5m AOE 폭발

### 2.6 Wave & Spawner (`WaveSystem.ts`)
- **스폰 로직**: 
  - 맵 내 지정된 8개의 스폰 포인트(탄약/체력 픽업 외주) 중, 현재 카메라 Frustum 외곽(플레이어 시야 밖)에 있는 포인트를 우선 선택하여 적 스폰.
- **난이도 스케일링 공식 (예시)**:
  - `EnemyCount = floor(BaseCount * pow(1.3, wave - 1) * difficulty.countMul)`
  - `EnemyHP = BaseHP * pow(1.1, wave - 1) * difficulty.hpMul`
- 웨이브 종료 시 모든 적 소멸 후 **Perk 선택 UI** 팝업 호출. 선택 후 다음 웨이브 타이머(5초) 시작.

#### 난이도 프리셋
```typescript
interface DifficultyPreset {
    id: 'easy' | 'normal' | 'hard' | 'nightmare';
    hpMul: number; dmgMul: number; countMul: number; pickupMul: number;
}
```
PRD §3 표의 수치를 그대로 코드화하여 `data/difficulty.json` 외부화.

### 2.7 Pickup System (`PickupSystem.ts`)
- 픽업 종류: 탄약(소/대), 체력, 파워업(DamageBoost, QuadSpeed)
- 플레이어 충돌 시 자동 획득, 파워업만 `INTERACT` 액션 필요
- 활성 파워업은 `Player.activeBuffs: Buff[]`에 push, 타이머로 소멸
- 픽업 노드는 비활성화 후 재스폰 타이머(20~60초) 가동
- 시각화: 픽업 위 0.5m 네온 빔 (`THREE.SpotLight` + 부유 아이콘)

### 2.8 Score & Combo (`ScoreSystem.ts`)
```typescript
class ScoreSystem {
    private combo = 0;
    private lastKillTime = 0;
    private readonly COMBO_TIMEOUT_MS = 3000;
    private readonly RESET_TIMEOUT_MS = 4000;

    onKill(enemy: EnemyKind, isHeadshot: boolean) {
        const now = performance.now();
        if (now - this.lastKillTime > this.COMBO_TIMEOUT_MS) this.combo = 1;
        else this.combo += isHeadshot ? 2 : 1;
        this.lastKillTime = now;
        const mult = this.getMultiplier();
        this.score += BASE_SCORE[enemy] * mult;
    }
    onPlayerHit() { this.combo = Math.floor(this.combo * 0.5); }
    private getMultiplier(): number {
        if (this.combo >= 30) return 2.5;
        if (this.combo >= 15) return 2.0;
        if (this.combo >= 7) return 1.5;
        if (this.combo >= 3) return 1.2;
        return 1.0;
    }
}
```

### 2.9 MiniMap (`MiniMap.ts`)
- 보조 `OrthographicCamera` + 별도 `WebGLRenderTarget` (200×200)
- 매 프레임 렌더 X — 0.1초 인터벌로 렌더하여 비용 절감
- 원형 마스크는 CSS `clip-path: circle(50%)` 적용
- 적/픽업/보스 마커는 2D DOM 오버레이로 별도 처리 (3D 렌더 부담 회피)
- 시야 외 적은 외곽 가장자리에 클램프된 화살표

## 3. 리소스 및 에셋 파이프라인 (Asset Management)

- **포맷 규격**:
  - 모델: `.glb` (단일 파일로 머티리얼/애니메이션 포함).
  - 텍스처: Three.js `KTX2Loader`를 활용한 KTX2 압축 텍스처 사용 (VRAM 최적화 및 로드 시간 단축).
- **에셋 매니저 (`AssetManager.ts`)**:
  - Promise 기반 프리로더. 게임 진입 전 필수 에셋(무기, 적, 기본 맵)을 모두 메모리에 로드 후 시작.

## 4. UI/UX (DOM Overlays)

- **HTML 기반 HUD**: Three.js Canvas 위에 `z-index`를 높여 배치. 성능을 위해 `requestAnimationFrame` 내에서 빈번한 DOM 업데이트는 피하고, 값이 변경될 때만 DOM 조작(또는 리액티브 프레임워크 사용 시 Memoization 적용).
- **데미지 플로터 (Damage Numbers)**:
  - 적 피격 시 발생 위치(Vector3)를 `camera.project(position)`를 통해 스크린 좌상단 기준 2D 좌표로 변환.
  - CSS 애니메이션(위로 떠오르며 fade-out)을 사용하여 구현 후 DOM 제거(Pool 재사용 권장).

## 5. 성능 최적화 전략 (Performance & Optimization)

1. **오브젝트 풀링 (Object Pooling)**:
   - 총알 트레이서, 적 몬스터, 피격 파티클, 데미지 텍스트 팝업은 런타임에 `new` 키워드로 생성하지 않음.
   - 맵 로드 시 미리 50~100개씩 풀(Pool)을 만들어두고 활성화/비활성화만 토글.
2. **인스턴싱 (InstancedMesh)**:
   - 아레나 맵의 반복되는 엄폐물, 바닥 타일, 네온 장식 등은 `THREE.InstancedMesh`로 결합하여 Draw Call을 1로 최소화.
3. **가비지 컬렉션(GC) 회피**:
   - `update` 루프 내부에서 `new THREE.Vector3()` 생성 엄금. 
   - 매니저 클래스 내부에 `_tempVec1`, `_tempVec2` 등의 변수를 캐싱해두고 재사용.

## 6. 데이터 구조 (Data Models)

### Meta & Perks
```typescript
interface PlayerStats {
    maxHealth: number;
    currentHealth: number;
    moveSpeedMultiplier: number;
    reloadSpeedMultiplier: number;
    critChance: number;
    dashCooldown: number;
}

interface Perk {
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    apply: (stats: PlayerStats) => void;
}
```

### 데이터 외부화 (JSON Schema)
모든 밸런싱 값은 `src/data/*.json`로 분리하여 핫스왑 가능:
- `weapons.json` — WeaponSpec[]
- `enemies.json` — EnemySpec[] (HP, damage, speed, AI 파라미터)
- `perks.json` — PerkDef[] (id, name, statDelta)
- `waves.json` — WavePlan[] (적 조합, 스폰 타이밍)
- `difficulty.json` — DifficultyPreset[]
- 빌드 시 Zod 또는 ts-json-schema-validator로 스키마 검증

### 결정론 RNG (`utils/rng.ts`)
```typescript
import seedrandom from 'seedrandom';
class RNG {
    private rng: () => number;
    constructor(seed: string) { this.rng = seedrandom(seed); }
    next(): number;            // [0, 1)
    range(a: number, b: number): number;
    pick<T>(arr: T[]): T;
}
```
- 세션 시작 시 `seed = Date.now().toString()` 또는 디버그 모드에서 고정 시드
- 적 스폰, 퍽 3택, 픽업 드롭에 사용 — 동일 시드 재현 가능

## 7. 저장 시스템 (`SaveManager.ts`)

```typescript
interface SaveData {
    version: 1;
    options: OptionsState;        // 감도, FOV, 그래픽, 오디오, 키맵
    highScores: Record<Difficulty, ScoreEntry[]>; // Top 10
    stats: { totalKills: number; totalPlayTime: number; sessions: number };
    flags: { tutorialSeen: boolean; telemetryConsent: boolean | null };
}
```
- 저장: `localStorage.setItem('arena-strike-save', JSON.stringify(data))`
- 마이그레이션: `version` 필드 비교 후 `migrators[from→to]` 체인 적용
- 진행 중 세션은 저장하지 않음 (1-life 정책)

## 8. 텔레메트리 (`TelemetrySystem.ts`)

### 이벤트 스키마
```typescript
type TelemetryEvent =
    | { type: 'game_start'; difficulty: Difficulty; sessionId: string; ts: number }
    | { type: 'wave_complete'; wave: number; timeTakenMs: number; deaths: number }
    | { type: 'player_death'; wave: number; weapon: string; kills: number }
    | { type: 'weapon_pickup'; weaponId: string }
    | { type: 'perk_choice'; offered: string[]; picked: string }
    | { type: 'session_end'; durationMs: number; maxWave: number; finalScore: number };
```
- 동의 받지 못한 경우 모든 전송 비활성
- 배치 전송 (5초 간격 또는 세션 종료 시 `navigator.sendBeacon`)
- 백엔드: Cloudflare Workers + D1 (또는 PostHog 자체 호스팅)
- PII 비포함, 익명 sessionId만

## 9. 옵션 / 그래픽 프리셋 (`OptionsManager.ts`)

```typescript
type GraphicsPreset = 'low' | 'medium' | 'high';
interface GraphicsConfig {
    shadows: boolean;
    shadowMapSize: 512 | 1024 | 2048;
    antialiasing: boolean;
    pixelRatio: number;          // 0.75 | 1.0 | window.devicePixelRatio
    particleQuality: 0.5 | 1.0 | 1.5;
    postProcessing: boolean;
}
```
- 디바이스 감지(`navigator.userAgent`, `gpu.requestAdapter()`)로 초기 프리셋 자동 추천
- 옵션 변경 시 `Renderer.applyConfig()` 호출하여 즉시 반영
- 색맹 모드, 모션블러/카메라셰이크 OFF, UI 스케일 옵션 포함

## 10. 에러 처리 & 안정성

- **WebGL Context Loss**: `webglcontextlost` 이벤트 핸들링 → 에셋 재로드 + 게임 일시정지
- **에셋 로드 실패**: 3회 재시도, 최종 실패 시 placeholder 메시 + 에러 토스트
- **물리 안정성**: Rapier 시뮬레이션 위치 NaN 감지 시 엔티티 재설정
- **메모리 누수 검증**: dev 빌드에서 5분마다 `performance.memory.usedJSHeapSize` 로깅, 증가 추세 경고
- **글로벌 에러**: `window.onerror`, `unhandledrejection` 캡처 → 텔레메트리 전송 (동의 시)

## 11. 빌드 & 배포

### CI (GitHub Actions)
```yaml
jobs:
  ci:
    steps:
      - lint (eslint)
      - typecheck (tsc --noEmit)
      - test:unit (vitest)
      - test:e2e (playwright)
      - build (vite build)
      - bundle-size-check (< 30MB)
```

### 배포 타겟 (1순위)
- **Cloudflare Pages**: 무료 CDN, 정적 호스팅, 자동 HTTPS
- 대안: Vercel, Netlify, itch.io (인디 게임 노출 채널)
- CSP 헤더: `default-src 'self'; img-src 'self' data: blob:;` 설정

### 에셋 파이프라인 (`scripts/build-assets.ts`)
- glTF: `gltf-transform optimize` (Draco 압축, 중복 제거)
- 텍스처: `toktx --bcmp` (BasisU/KTX2 변환)
- 오디오: ffmpeg로 .ogg 96kbps 변환
- 모든 산출물은 `public/assets/`에 출력

## 12. 테스트 전략

| 레이어 | 도구 | 대상 |
|---|---|---|
| 단위 | Vitest | 점수/콤보 산식, 데미지 계산, RNG, 세이브 직렬화, 웨이브 시간 분석 |
| 통합 | Vitest + JSDOM | InputManager 액션 매핑, OptionsManager 적용 |
| E2E (스모크) | Playwright (기본) | 메뉴 → 게임 진입 → 사격 → 일시정지 → 결과화면 |
| E2E (성능) | Playwright (분리) | 60초 FPS 안정성, 5분 메모리 누수 |
| 수동 | 출시 전 | 디바이스별 호환성 (Mac/Win × Chrome/Edge/Safari) |

- 적/물리 결정론 테스트: 고정 시드 RNG로 동일 시나리오 재현
- 회귀 방지: 핵심 버그 픽스마다 단위 테스트 추가

### 12.1 성능/메모리 측정 (`tests/perf/`)
**별도 실행** — `pnpm test:perf`로만 실행되며 기본 CI 파이프라인에는 포함하지 않는다 (실측 시간 + 헤드리스 환경 변동성).

**계측 훅** — `?perf=1` 쿼리 파라미터가 붙은 경우에만 활성화.
```ts
// src/utils/perfHooks.ts
window.__perf = {
  frametimes: number[];      // 매 프레임 deltaMs (최근 N개 순환 버퍼)
  waveTimings: number[];     // wave_complete 이벤트의 timeTakenMs
  startedAt: number;         // performance.now() 측정 시작 시각
};
```
- `Game.loop`가 `?perf=1`일 때 매 프레임 deltaMs를 push (일반 빌드 영향 0)
- `wave_complete` 이벤트 발생 시 timing push
- heap은 Playwright가 `performance.memory.usedJSHeapSize`를 직접 읽음

**자동 진행** — `src/utils/autoplay.ts`
- `?perf=1`이면 InputManager에 가상 액션 주입: 자동 사격(`FIRE` 액션 유지) + 좌우 스트래이프(8초 주기 토글)
- Pointer Lock 미요청 환경에서도 입력 시뮬레이션이 동작하도록 InputManager가 `setVirtualAction(name, pressed)` API를 제공

**검증 임계값**

| 측정 | 임계값 (headless) | PRD 목표 (real-device) | 근거 |
|---|---|---|---|
| 평균 FPS (60초) | ≥ 40 | ≥ 55 | PRD §14 KPI / headless software rasterizer ceiling ~50fps |
| p95 frametime | ≤ 40ms | ≤ 20ms | PRD §11 / headless variance buffer |
| 후반/전반 heap 평균 비율 | ≤ 1.30 | — | 안정화 후 30% 이내 변동 |
| 절대 heap 상한 | ≤ 500MB | ≤ 500MB | PRD §11 |

PRD KPI(55fps)는 실제 디바이스 텔레메트리/수동 QA로 검증하며, headless 임계값은 회귀 감지(regression guard) 용도다.

**웨이브 시간 분석 (단위 테스트)** — `tests/unit/balance.test.ts`에 추가
- 이론적 하한 = `count × spawnIntervalMs` (스폰 완료 시각)
- 이론적 상한 = 하한 + `count × pistolBaselineTTKms` (모든 적 처치 가정)
- 1~4 웨이브 (Normal): 하한 ≥ 30s 보다 작을 수 있지만 상한 ≤ 95s 이내

## 13. 보안 / 프라이버시

- HUD에 사용자 입력 텍스트 표시 시 반드시 `textContent` (innerHTML 금지)
- 텔레메트리 전송 전 옵트인 다이얼로그 (LocalStorage `telemetryConsent`)
- 분석 데이터는 익명 sessionId만 — IP/UserAgent는 백엔드에서 즉시 폐기
- CSP로 외부 스크립트 인젝션 차단

## 14. 개발 마일스톤 구현 가이드

| Phase | 목표 | 기술적 체크리스트 |
|---|---|---|
| **M1: 프로토타입** | 이동 + 카메라 | Vite+Three.js 세팅 / Rapier 물리 월드 구성 / PointerLock 연동 / 기본 큐브 이동 / ESLint+Prettier+CI 셋업 / 입력 액션 레이어 |
| **M2: 알파** | 슈팅 + 적 스폰 | Raycast 무기 구현 / 체력 시스템 / FSM 기반 더미 적 생성 / Object Pooling 세팅 / 데이터 JSON 외부화 / 점수·콤보 시스템 / 픽업 시스템 |
| **M3: 베타** | 게임 루프 + UI | Wave 매니저 / HTML HUD 연동 / 미니맵 / Perk 3택 1 시스템 / Howler 오디오 연동 / 보스 FSM / 옵션 메뉴 / 세이브 시스템 |
| **M4: 폴리시** | 최적화 + 이펙트 | 파티클 시스템 / KTX2 텍스처 적용 / 메모리 릭 체크 / 밸런싱 / 텔레메트리 / 접근성 옵션 / 3인칭 카메라 / E2E 테스트 |
