import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'favicon.svg', 'src', 'styles', 'assets', 'admin']) {
  await cp(resolve(root, entry), resolve(dist, entry), { recursive: true, force: true });
}
