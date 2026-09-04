/**
 * Overlay de início deve pausar a simulação mesmo antes de hasGameStarted
 * (senão inimigos atiram com o menu aberto e o som toca ao iniciar o áudio).
 * Rode: node js/utils/simPause.test.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSimPaused } from './simPause.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(isSimPaused({ isGameOver: true, overlayDisplay: 'none', overlayOpacity: '0' }), 'game over pausa');
assert(
  isSimPaused({ isGameOver: false, overlayDisplay: 'flex', overlayOpacity: '' }),
  'overlay inicial (opacity CSS vazia) pausa — não depende de hasGameStarted'
);
assert(
  isSimPaused({ isGameOver: false, overlayDisplay: 'flex', overlayOpacity: '1' }),
  'overlay opaco pausa'
);
assert(
  !isSimPaused({ isGameOver: false, overlayDisplay: 'flex', overlayOpacity: '0' }),
  'overlay já esmaecido não pausa o gameplay'
);
assert(
  !isSimPaused({ isGameOver: false, overlayDisplay: 'none', overlayOpacity: '1' }),
  'overlay display none não pausa'
);

const dir = dirname(fileURLToPath(import.meta.url));
const mainSrc = readFileSync(join(dir, '../main.js'), 'utf8');
assert(mainSrc.includes('isSimPaused'), 'main.js usa isSimPaused');
assert(
  !/isOverlayVisible && this\.player && this\.player\.hasGameStarted/.test(mainSrc),
  'pause do overlay não deve exigir hasGameStarted'
);

if (process.exitCode) console.error('simPause tests failed');
else console.log('simPause tests passed');
