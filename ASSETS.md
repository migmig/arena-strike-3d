# Assets — License & Source Tracking

모든 정적 에셋의 출처와 라이선스를 이곳에 기록합니다.
산출물 배포 전 반드시 검증 필요.

## Models (.glb)

| File | Source | License | Author | Notes |
|---|---|---|---|---|
| _none yet_ | — | — | — | 외부 모델 미포함. 절차적 메시 사용 (`src/entities/EnemyMesh.ts`, `src/entities/Viewmodel.ts`). 추가 시 `public/models/` 참조 |

## Textures (.ktx2 / .png)

| File | Source | License | Author | Notes |
|---|---|---|---|---|
| `Arena ground / wall / cover` | self (`src/entities/ProceduralTextures.ts`) | CC0 1.0 | Arena Strike 3D | CanvasTexture로 런타임 생성, 외부 파일 없음 |

## Audio (.ogg / .mp3)

| File | Source | License | Author | Notes |
|---|---|---|---|---|
| _procedural_ | self (`src/managers/AudioManager.ts`) | CC0 1.0 | Arena Strike 3D | Web Audio Oscillator 합성 |

## Fonts

| Family | Source | License |
|---|---|---|
| system-ui | OS default | — |

## Procedural Assets (자체 제작 = CC0)

| Asset | Source | License | Notes |
|---|---|---|---|
| Enemy meshes (Grunt / Shooter / Charger / Boss) | `src/entities/EnemyMesh.ts` | CC0 1.0 | Three.js 프리미티브 조합 |
| Weapon viewmodels (Pistol / SMG / Shotgun) | `src/entities/Viewmodel.ts` | CC0 1.0 | Box + Cylinder 조합, ADS 포즈 보간 |
| Hit particles / Death fragments / Tracers / Muzzle flash | `src/entities/*.ts` | CC0 1.0 | Three.js geometry + CanvasTexture |
| All UI overlays | `src/ui/*.ts` | MIT | DOM + inline CSS |

## 외부 CC0 자산 추가 시 권장 출처

| Source | Type | License | URL |
|---|---|---|---|
| Kenney | Models / Textures / Audio | CC0 1.0 | https://kenney.nl/assets |
| Quaternius | Stylized models | CC0 1.0 | https://quaternius.com |
| Poly Haven | PBR textures / HDRIs | CC0 1.0 | https://polyhaven.com |
| ambientCG | PBR textures | CC0 1.0 | https://ambientcg.com |
| Freesound (CC0 필터) | SFX | CC0 또는 CC-BY | https://freesound.org |
| OpenGameArt (CC0 필터) | Mixed | 라이선스별 확인 | https://opengameart.org |

추가 시 절차:
1. 다운로드 → `public/models/` 또는 `public/textures/` 에 배치
2. 위 표에 한 줄 추가 (file / source / license / author / notes)
3. CC-BY인 경우 게임 내 크레딧 화면(`src/ui/Credits.ts`)에 노출
4. `src/utils/assetLoader.ts` 의 `setAssetManifest()` 로 슬롯 등록

## License Priority

1. **자체 제작** (1순위) — 현재 모든 자산이 여기 해당
2. **CC0** (저작권 포기): Kenney, Quaternius, Poly Haven, ambientCG
3. **CC-BY** (크레딧 명기): freesound.org 일부
4. **상용 라이선스**: 상용 배포 시에만 검토

## 검증 체크리스트

- [x] 모든 외부 에셋이 표에 등록되어 있다 (현재 외부 자산 0개)
- [x] CC-BY 에셋의 크레딧이 게임 내 크레딧 화면에 노출된다 (CC-BY 자산 없음)
- [x] 상용 라이선스 에셋 확인서를 별도 보관한다 (상용 자산 없음)
- [x] 폰트 라이선스 (OFL 등) 동봉 여부 확인 (system-ui만 사용)
