# Models drop-in

Drop CC0 / 자체 제작 glTF (`.glb`) 파일을 이 디렉토리에 넣으면 `loadModel('models/<name>.glb')` 로 불러올 수 있습니다.

## 권장 슬롯 (`assetManifest`에 등록 시)

| Slot | 용도 | 추천 출처 (CC0) |
|---|---|---|
| `enemy_grunt` | M2 Grunt 메시 교체 | Kenney Robots / Quaternius RPG Monsters |
| `enemy_shooter` | M2 Shooter 메시 교체 | Kenney Robots |
| `enemy_charger` | M2 Charger 메시 교체 | Quaternius Monsters |
| `boss` | M3.2 보스 메시 교체 | Quaternius Boss Pack |
| `weapon_pistol` | 1인칭 viewmodel pistol | Kenney Blaster Kit |
| `weapon_smg` | 1인칭 viewmodel SMG | Kenney Blaster Kit |
| `weapon_shotgun` | 1인칭 viewmodel shotgun | Kenney Blaster Kit |
| `pickup_health` | 헬스팩 메시 | Kenney Prototype Kit |
| `pickup_ammo` | 탄약팩 메시 | Kenney Prototype Kit |

## 사용 예 (Game.init 등에서)

```ts
import { setAssetManifest, loadModel } from '@utils/assetLoader';

setAssetManifest([
  { slot: 'enemy_grunt', url: 'models/robot_grunt.glb', scale: 0.6, groundOffsetY: 0 },
  { slot: 'weapon_pistol', url: 'models/blaster_pistol.glb', scale: 0.15 },
]);
```

자산을 추가했다면 반드시 루트의 `ASSETS.md`에 출처/라이선스를 기록하세요.
모델이 없으면 절차적 프리미티브 메시가 그대로 사용됩니다.

## 라이선스 가이드

- **CC0** 자산만 권장: Kenney, Quaternius, Poly Haven
- **Draco 압축** 사용 시 자동 디코드됨 (CDN 디코더 사용)
- 번들 사이즈 < 30 MB 유지 권장 (CI 게이트)
