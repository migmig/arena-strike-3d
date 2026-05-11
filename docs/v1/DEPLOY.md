# 배포 가이드 — Cloudflare Pages

## 사전 준비 (1회)

1. Cloudflare 계정 생성 후 **Pages** 활성화
2. 프로젝트 생성: Dashboard → Workers & Pages → "Create application" → Pages → Connect to Git
   - 또는 CLI로 직접: `pnpm dlx wrangler pages project create arena-strike-3d`
3. **Account ID** 확인: Dashboard 우측 사이드바
4. **API Token** 발급:
   - https://dash.cloudflare.com/profile/api-tokens
   - 템플릿 "Edit Cloudflare Workers" 사용 또는 커스텀:
     - Permissions: `Account → Cloudflare Pages → Edit`
     - Account Resources: 해당 계정만

## GitHub 자동 배포

`.github/workflows/deploy.yml`이 `main` 푸시 시 빌드 → 배포 수행.

**필요한 GitHub Secrets** (Repo Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 로컬 수동 배포

```bash
# 최초 1회 로그인
pnpm dlx wrangler login

# 배포 (빌드 포함)
pnpm deploy
```

## 산출물 구성

| 파일 | 역할 |
|---|---|
| `public/_headers` | CSP, HSTS, X-Frame-Options 등 보안 헤더 + 캐시 정책 |
| `public/_redirects` | SPA fallback (`/*` → `/index.html`) |
| `wrangler.toml` | 프로젝트 메타 (build output dir 등) |
| `dist/` | Vite 빌드 산출물 (CDN 업로드 대상) |

## CSP 정책

`public/_headers`의 `Content-Security-Policy`:
- `script-src 'self' 'wasm-unsafe-eval'` — Rapier(WASM) 실행 허용
- `style-src 'self' 'unsafe-inline'` — Three.js 인라인 스타일 + HUD 동적 스타일
- `worker-src 'self' blob:` — Three.js 워커
- `connect-src 'self'` — 텔레메트리 엔드포인트 추가 시 도메인 명시 필요

> **텔레메트리 활성화 시**: `VITE_TELEMETRY_ENDPOINT` 환경변수에 URL 지정 후, CSP `connect-src`에 같은 origin 추가.

## 커스텀 도메인 연결

Cloudflare Pages 프로젝트 → Custom domains → Set up a custom domain.
DNS는 동일 Cloudflare 계정이면 자동 프로비저닝, 외부 DNS는 CNAME 직접 설정.

## 검증 체크리스트

- [ ] `pnpm build` 성공, `dist/` 생성 확인
- [ ] 프리뷰: `pnpm preview` → http://localhost:4173 정상
- [ ] CSP가 콘솔 에러 없이 동작 (Network 탭에서 헤더 확인)
- [ ] 캐시: `index.html`은 `max-age=0`, `assets/*`는 `immutable`
- [ ] `_redirects`로 모든 경로 → SPA fallback
- [ ] 도메인 HTTPS 자동 인증 확인

## 롤백

Cloudflare Pages는 모든 배포 히스토리 보관. Dashboard → Deployments → 이전 배포 → "Rollback to this deployment".
