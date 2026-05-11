# Tasks — Arena Strike 3D

PRD.md / SPEC.md 기반 작업 분해. 체크박스로 진행 관리.

---

## M1: 프로토타입 (2주) — 이동 + 카메라 + 인프라

### 1.1 프로젝트 인프라
- [ ] `package.json` 초기화 (TypeScript, Vite, Three.js, Rapier, Howler)
- [ ] `vite.config.ts` 작성 (alias, asset 처리)
- [ ] `tsconfig.json` 작성 (`strict: true`, paths)
- [ ] ESLint + Prettier 설정 (`.eslintrc.json`, `.prettierrc`)
- [ ] 디렉토리 구조 생성 (`src/core`, `src/managers`, ...)
- [ ] `public/index.html` 골격 + canvas + HUD container
- [ ] `.gitignore` 작성 (node_modules, dist, .DS_Store)

### 1.2 CI / 품질 게이트
- [ ] GitHub Actions: lint → typecheck → test → build
- [ ] PR 템플릿 작성
- [ ] 번들 사이즈 체크 스크립트 (< 30MB)

### 1.3 코어 루프
- [ ] `Game.ts` 메인 루프 (requestAnimationFrame, deltaTime)
- [ ] `StateMachine` (LOADING / MENU / PLAYING / PAUSED / RESULT)
- [ ] `EventBus` (pub/sub) 구현
- [ ] `Renderer` 매니저 (Scene, Camera, WebGLRenderer)
- [ ] `Physics` 매니저 (Rapier World, step, collision events)

### 1.4 입력 시스템
- [ ] `InputManager` — 키보드/마우스 raw 입력 수집
- [ ] Pointer Lock API 래핑 + 권한 흐름
- [ ] 액션 매핑 레이어 (Action ↔ Binding)
- [ ] `isActionPressed` / `wasActionTriggered` API
- [ ] 기본 키맵 JSON 작성

### 1.5 플레이어 & 카메라
- [ ] `Player` 엔티티 (Rapier KinematicCharacterController)
- [ ] WASD 이동, 점프, 대시 (쿨다운 3초)
- [ ] `CameraController` — Yaw/Pitch + 상하 제한
- [ ] FPV 카메라 모드 (눈 높이 1.6m)
- [ ] 디버그 그라운드 (10×10 plane) + 큐브 엄폐물

### 1.6 디버그 도구
- [ ] `stats.js` FPS/MEM 오버레이 (dev only)
- [ ] `lil-gui` 노출 (FOV, 감도, 중력 토글)

**M1 완료 조건**: PointerLock 잠긴 상태로 1인칭 이동/점프/대시 가능, 60fps 유지

---

## M2: 알파 (4주) — 슈팅 + 적 + 데이터

### 2.1 무기 시스템
- [ ] `WeaponManager` 골격
- [ ] `weapons.json` 외부화 (Pistol/SMG/Shotgun)
- [ ] Hitscan Raycast 사격 로직
- [ ] 탄퍼짐 (spread) + 샷건 펠릿
- [ ] 재장전 + 무기 전환 (1/2/3, Q)
- [ ] 트레이서 이펙트 (0.05초 라인)
- [ ] 발사 SFX (Howler)

### 2.2 적 시스템
- [ ] `EntityManager` + Object Pool 패턴
- [ ] `Enemy` 베이스 클래스 + FSM (SPAWN/CHASE/ATTACK/STUN/DIE)
- [ ] `enemies.json` 외부화
- [ ] Grunt — 직선 추적 + 근접 공격
- [ ] Shooter — 거리 유지 + 투사체 사격
- [ ] Charger — 돌진 + 자폭
- [ ] AI 시야 raycast (120° 콘, 25m, occlusion)
- [ ] AI 청각 반응 (gunshot 이벤트, 15m)
- [ ] 어그로 우선순위 (최근 데미지 → 거리)

### 2.3 체력 & 데미지
- [ ] `PlayerStats` 인터페이스 구현
- [ ] HP 관리 + 사망 처리
- [ ] 적 HP + 피격 + 사망 애니메이션
- [ ] 헤드샷 판정 (히트 위치 Y > 임계값)
- [ ] 크리티컬 (퍽 효과)

### 2.4 점수 & 콤보
- [ ] `ScoreSystem` — 처치 점수 + 콤보 배율
- [ ] 콤보 타이머 (3초 유지, 4초 리셋)
- [ ] 피격 시 콤보 50% 감소

### 2.5 픽업 시스템
- [ ] `PickupSystem` + 8개 스폰 노드
- [ ] 탄약팩 (소/대), 체력팩, 파워업 (Damage/Speed)
- [ ] 자동 획득 vs F 상호작용 분기
- [ ] 재스폰 타이머 (20~60초)
- [ ] 시각화 (네온 빔)

### 2.6 결정론 RNG
- [ ] `RNG` 클래스 (seedrandom 기반)
- [ ] 적 스폰, 픽업 드롭에 적용

### 2.7 단위 테스트
- [ ] Vitest 셋업
- [ ] 점수/콤보 산식 테스트
- [ ] 데미지 계산 테스트
- [ ] RNG 결정론 테스트

**M2 완료 조건**: 무기 3종으로 적 3종을 처치, 점수 누적, 픽업 작동

---

## M3: 베타 (3주) — 게임 루프 + UI + 보스

### 3.1 웨이브 시스템
- [ ] `WaveSystem` 스폰 매니저
- [ ] `waves.json` 외부화
- [ ] 난이도 스케일링 공식 적용
- [ ] `difficulty.json` (Easy/Normal/Hard/Nightmare)
- [ ] Frustum 외곽 스폰 포인트 선택
- [ ] 웨이브 클리어 트리거 + 5초 인터미션

### 3.2 보스 (Wave 5)
- [ ] `BossController` FSM (P1/P2/P3/TRANSITION/DIE)
- [ ] P1 단발 사격 + 회피 패턴
- [ ] P2 산탄 3-way + 미니언 소환 (10초 쿨)
- [ ] P3 돌진 + AOE 폭발 (반경 5m)
- [ ] 페이즈 전이 2초 무적 + 이펙트

### 3.3 퍽 시스템
- [ ] `perks.json` 외부화 (12종)
- [ ] 웨이브 클리어 시 3택 1 UI
- [ ] `PerkChoice` 적용 로직 (PlayerStats 변경)
- [ ] 누적 퍽 표시

### 3.4 UI / HUD
- [ ] `UIManager` 골격
- [ ] HUD: 체력바, 탄약, 웨이브/콤보, 크로스헤어
- [ ] 미니맵 (200×200, 0.1초 인터벌 렌더)
- [ ] 데미지 넘버 (3D 부유 텍스트, 풀)
- [ ] 히트마커 (일반/크리)
- [ ] 피격 비네팅 + 저체력 펄스
- [ ] 메인 메뉴 (시작/옵션/크레딧)
- [ ] 일시정지 메뉴
- [ ] 퍽 선택 화면 (3택)
- [ ] 결과 화면 (점수/처치/정확도/콤보/웨이브)

### 3.5 오디오
- [ ] `AudioManager` (Howler + Three.js PositionalAudio)
- [ ] BGM 전투/메뉴 트랙
- [ ] SFX 무기/피격/픽업/UI/적 음성
- [ ] 자막 토글 (보스 음성)

### 3.6 옵션 / 세이브
- [ ] `OptionsManager` — 감도/FOV/볼륨/그래픽 프리셋
- [ ] 그래픽 프리셋 3단계 (low/medium/high)
- [ ] 키 리매핑 UI
- [ ] `SaveManager` — LocalStorage 직렬화 + 버전 마이그레이션
- [ ] 하이스코어 Top 10 (난이도별)
- [ ] 누적 통계 저장

### 3.7 온보딩
- [ ] 첫 진입 컨트롤 힌트 페이드인
- [ ] 첫 사격/재장전 힌트 (1회만)
- [ ] 튜토리얼 플래그 LocalStorage 저장

**M3 완료 조건**: 1~5 웨이브 + 보스 클리어 가능, 모든 UI 작동, 옵션 저장

---

## M4: 폴리시 (2주) — 최적화 + 접근성 + 텔레메트리

### 4.1 성능 최적화
- [ ] `InstancedMesh`로 엄폐물/타일 결합
- [ ] LOD (적 메시 거리별 단순화)
- [ ] Occlusion culling 적용
- [ ] GC 회피: `_tempVec` 캐싱 전수 점검
- [ ] Object Pool 누락 항목 점검 (총알, 파티클, 데미지 텍스트)
- [ ] KTX2 텍스처 변환 스크립트 (`scripts/build-assets.ts`)
- [ ] glTF 압축 (Draco)
- [ ] 번들 분석 + 동적 import

### 4.2 이펙트
- [ ] 파티클 시스템 (피격, 폭발, 죽음)
- [ ] 머즐 플래시
- [ ] 보스 페이즈 전이 이펙트
- [ ] 화면 셰이크 (피격, 폭발)

### 4.3 3인칭 카메라
- [ ] TPV 모드 + V 토글
- [ ] 어깨 너머 오프셋 + 보간 (0.3초)
- [ ] 카메라-플레이어 raycast (벽 끼임 방지)
- [ ] viewmodel 가시성 토글

### 4.4 ADS
- [ ] RMB 홀드 시 FOV 70→50 보간
- [ ] 이동속도 0.6× + spread 0.4× + 감도 0.7×
- [ ] viewmodel ADS 포즈

### 4.5 접근성
- [ ] 색맹 팔레트 (Protanopia/Deuteranopia/Tritanopia)
- [ ] 자막 시스템
- [ ] 모션블러/카메라셰이크 OFF 토글
- [ ] UI 스케일 (80/100/125/150%)
- [ ] 크로스헤어 종류 선택

### 4.6 텔레메트리
- [ ] `TelemetrySystem` 이벤트 스키마
- [ ] 옵트인 동의 다이얼로그 (첫 진입)
- [ ] 배치 전송 + `sendBeacon`
- [ ] 백엔드 엔드포인트 (Cloudflare Workers + D1) 또는 PostHog

### 4.7 안정성
- [ ] WebGL context loss 핸들링
- [ ] 에셋 로드 실패 재시도 + 폴백
- [ ] 글로벌 에러 캡처 + 리포트
- [ ] 메모리 누수 검증 (5분 힙 트래킹)

### 4.8 테스트
- [ ] Playwright E2E 스모크 (메뉴 → 게임 → 결과)
- [ ] 디바이스별 수동 QA (Mac/Win, Chrome/Edge/Safari)
- [ ] 60fps 안정성 측정

### 4.9 밸런싱
- [ ] 평균 TTK 검증 (Grunt 3발 등)
- [ ] 웨이브당 시간 측정 (60~90초)
- [ ] 퍽 12종 밸런스 패스
- [ ] 난이도 4단계 검증

### 4.10 에셋 / 라이선스
- [ ] CC0 에셋 수집 (Kenney, Quaternius)
- [ ] `ASSETS.md` 라이선스 트래킹
- [ ] 크레딧 화면

**M4 완료 조건**: 미드 사양 60fps 안정, 모든 옵션 작동, KPI 측정 가능

---

## 출시 (Week 11)

- [ ] Cloudflare Pages 배포 설정
- [ ] CSP 헤더 검증
- [ ] 도메인 연결
- [ ] itch.io 페이지 생성
- [ ] 릴리스 노트 작성
- [ ] 소셜 미디어 자료 (스크린샷, GIF, 30초 트레일러)

---

## Post-MVP 백로그

- [ ] 멀티플레이어 코옵 (2~4인, WebRTC/WebSocket)
- [ ] 추가 맵 3종 (도시/사막/우주정거장)
- [ ] 추가 적 6종 + 추가 보스 2종
- [ ] 무기 모드 시스템 (스코프, 확장 탄창)
- [ ] 무기 스킨 시스템
- [ ] 모바일 터치 컨트롤
- [ ] 게임패드 지원 (Gamepad API)
- [ ] 글로벌 리더보드
- [ ] 일일 챌린지 (고정 시드)
- [ ] 라이선스 정리 후 상용 에셋 교체
