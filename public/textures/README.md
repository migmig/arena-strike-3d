# Textures drop-in

CC0 텍스처 (`.ktx2` 권장 / `.png`·`.jpg` 가능)를 이 디렉토리에 넣고 직접 로드하세요.

```ts
import { TextureLoader } from 'three';
const tex = new TextureLoader().load('/textures/concrete_albedo.ktx2');
```

현재 Arena 텍스처는 **절차적(CanvasTexture)** 으로 생성되어 외부 파일 없이 동작합니다.
외부 텍스처로 교체하려면 `src/entities/Arena.ts`의 `buildGroundTexture` / `buildWallTexture` / `buildCoverTexture` 호출을 텍스처 로드로 대체하세요.

## 추천 CC0 출처

- [Poly Haven Textures](https://polyhaven.com/textures) — CC0 PBR 텍스처
- [ambientCG](https://ambientcg.com/) — CC0 PBR 셋
- [Kenney Texture Packs](https://kenney.nl/assets?q=texture) — CC0 픽셀/스타일라이즈드

자산을 추가했다면 `ASSETS.md`에 출처를 기록하세요.
