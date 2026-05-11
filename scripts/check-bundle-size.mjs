import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 30 * 1024 * 1024;
const DIST = 'dist';

function totalSize(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    total += st.isDirectory() ? totalSize(path) : st.size;
  }
  return total;
}

const size = totalSize(DIST);
const mb = (size / 1024 / 1024).toFixed(2);
console.info(`Bundle size: ${mb} MB (limit: 30 MB)`);
if (size > MAX_BYTES) {
  console.error(`Bundle exceeds limit: ${mb} MB`);
  process.exit(1);
}
