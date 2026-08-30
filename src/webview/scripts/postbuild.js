// instead of
// mkdir -p ../../out && rimraf ../../out/webview && mv dist ../../out/webview && rimraf ../../docs/fishbone/static/online && cp -r ../../out/webview/ ../../docs/fishbone/static/online

import { mkdir, rm, rename, cp } from 'fs/promises';
import { join } from 'path';

async function postbuild() {
  const outDir = join('..', '..', 'out');
  const webviewDir = join(outDir, 'webview');
  const docsDir = join('..', '..', 'docs', 'fishbone', 'static', 'online');
  
  await mkdir(outDir, { recursive: true });
  await rm(webviewDir, { recursive: true, force: true });
  await rename('dist', webviewDir);
  await rm(docsDir, { recursive: true, force: true });
  await cp(webviewDir, docsDir, { recursive: true });
}

postbuild().catch(console.error);
