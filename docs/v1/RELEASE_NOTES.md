# Arena Strike 3D — v0.1.0 Release Notes

웹 브라우저에서 즉시 즐기는 1인칭 아레나 슈터의 첫 공개 빌드입니다.

## Highlights

- **5 웨이브 + 보스전** — 1~4 웨이브 동안 잡병을 제압한 뒤 5웨이브 보스(3페이즈)에 도전합니다.
- **무기 3종** — Pistol / SMG / Shotgun, 트레이서·머즐 플래시·SFX 포함.
- **퍽 시스템** — 웨이브 클리어마다 3택1 퍽으로 빌드를 조립합니다 (12종).
- **난이도 4단계** — Easy / Normal / Hard / Nightmare. HP·데미지·스폰 수가 스케일링.
- **데이터 주도 설계** — `weapons.json`, `enemies.json`, `waves.json`, `perks.json`, `difficulty.json`, `pickups.json`.

## What's New in v0.1.0

### Combat
- 헤드샷 (적 모델 상단 25% 영역) 1.5× 데미지
- ADS — 우클릭 홀드, FOV 70 → 50, 이동·확산·감도 감소 보간
- 3인칭 카메라 (`V`) — 어깨 너머 시점 + 벽 끼임 방지 raycast
- 적 3종: Grunt(추적·근접), Shooter(거리유지·투사체), Charger(돌진·자폭)

### UI / HUD
- 좌상단 미니맵 (200×200) — 적·보스·픽업 위치, 플레이어 헤딩 회전
- 데미지 넘버, 히트마커(일반·크리), 적 머리 위 HP 바
- 저체력 비네팅 펄스
- 일시정지 → 설정 / 크레딧 진입

### Options & Accessibility
- 감도·FOV·Invert Y
- BGM·SFX 볼륨, 그래픽 프리셋 (low/medium/high)
- 색맹 팔레트 (Protanopia/Deuteranopia/Tritanopia)
- UI 스케일 (80/100/125/150%)
- 모션 감소 토글 — 화면 흔들림 + 저체력 펄스 비활성화
- 크로스헤어 스타일 (dot/cross/circle/none)
- **키 리매핑 UI** — 모든 액션을 자유롭게 재바인딩, LocalStorage 저장

### Save & Telemetry
- LocalStorage 기반 세이브, 버전 마이그레이션 포함
- 난이도별 Top 10 하이스코어
- 누적 통계 (총 처치 수, 플레이 시간, 세션 수)
- 옵트인 텔레메트리 (sendBeacon 배치 전송)

### Stability & Performance
- 적 메시 거리 기반 LOD 2단계 (애니메이션·라이트 축소)
- WebGL 컨텍스트 손실 자동 처리 (PAUSED 전이)
- 글로벌 에러 캡처
- 외부 자원 로드 재시도 유틸리티 (지수 백오프)
- `InstancedMesh` 엄폐물, 트레이서·파편·데미지 넘버 풀링

### Dev / CI
- pnpm + Vite + TypeScript strict
- GitHub Actions: lint → typecheck → test → build
- Playwright E2E smoke test
- 번들 사이즈 게이트 (< 30 MB)
- Cloudflare Pages 자동 배포 워크플로

## Controls (default)

| Action | Default |
|---|---|
| Move | WASD |
| Jump / Dash | Space / Shift |
| Fire / ADS | Mouse L / Mouse R |
| Reload | R |
| Weapons | 1 / 2 / 3, Q (prev) |
| Interact | F |
| Toggle camera | V |
| Pause | Esc |

키는 모두 일시정지 메뉴 → Settings → Keys에서 재할당 가능합니다.

## Known Limitations

- 모델은 모두 프리미티브 도형 (실제 3D 모델 없음). 향후 CC0 자산 통합 예정.
- 오디오는 절차적 합성 — 외부 샘플 미포함.
- 모바일 / 터치 / 게임패드 미지원 (Post-MVP 백로그).
- 텔레메트리 백엔드 미연결 (수집만 가능, 전송 엔드포인트는 사용자가 설정).
- KTX2 텍스처·Draco glTF 파이프라인은 자산 도입 시 추가 예정.

## Browser Support

- Chrome / Edge / Safari 데스크탑 최신 안정 버전
- WebGL 2.0 필요
- Pointer Lock API 지원 필요 (모바일 미지원)

## Credits

게임 내 일시정지 → Settings → Credits, 또는 `ASSETS.md`를 참고하세요.
