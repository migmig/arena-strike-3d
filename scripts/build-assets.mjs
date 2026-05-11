#!/usr/bin/env node
// @ts-check
/**
 * build-assets — KTX2 텍스처 변환 파이프라인
 *
 * `public/textures/` 아래의 .png / .jpg / .jpeg 파일을 KTX2 (UASTC) 로 변환하여
 * 같은 디렉토리에 .ktx2 로 출력합니다. 외부 의존: `toktx` (KTX-Software).
 *
 * 사용:
 *   pnpm build-assets                # 누락된 .ktx2만 생성
 *   pnpm build-assets --force        # 모두 재생성
 *   pnpm build-assets --check        # 변환 가능한 파일만 나열 (CI용)
 *
 * 설치:
 *   macOS:  brew install ktx
 *   Ubuntu: apt install -y libktx-dev ktx-tools
 *   기타:   https://github.com/KhronosGroup/KTX-Software/releases
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEX_DIR = join(ROOT, 'public', 'textures');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');

const SUPPORTED = new Set(['.png', '.jpg', '.jpeg']);

/** Recursively walk dir, yielding file paths. */
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function hasToolchain() {
  try {
    execFileSync('toktx', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function convert(input, output) {
  // UASTC 4 = best quality / size tradeoff; Zstd supercompression on top.
  const args = [
    '--genmipmap',
    '--encode',
    'uastc',
    '--uastc_quality',
    '2',
    '--zcmp',
    '18',
    '--assign_oetf',
    'srgb',
    output,
    input,
  ];
  execFileSync('toktx', args, { stdio: 'inherit' });
}

function main() {
  const files = walk(TEX_DIR).filter((p) => SUPPORTED.has(extname(p).toLowerCase()));
  if (files.length === 0) {
    console.log('build-assets: no source textures found under public/textures/');
    return;
  }

  if (CHECK) {
    for (const f of files) console.log(relative(ROOT, f));
    return;
  }

  if (!hasToolchain()) {
    console.error('build-assets: `toktx` not found in PATH. Install KTX-Software:');
    console.error('  https://github.com/KhronosGroup/KTX-Software/releases');
    process.exit(2);
  }

  let converted = 0;
  let skipped = 0;
  for (const src of files) {
    const dst = src.replace(/\.(png|jpe?g)$/i, '.ktx2');
    if (!FORCE && existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
      skipped += 1;
      continue;
    }
    console.log(`→ ${relative(ROOT, dst)}`);
    convert(src, dst);
    converted += 1;
  }
  console.log(`build-assets: ${converted} converted, ${skipped} up-to-date`);
}

main();
