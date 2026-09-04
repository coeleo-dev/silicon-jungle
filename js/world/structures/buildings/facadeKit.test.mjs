import { pilasterXs, corniceY, setbackOutset, awningClearsDoor, windowStyleFor } from './facadeKit.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const xs = pilasterXs(18, 4);
assert(xs.length === 4, '4 pilastras');
assert(Math.abs(xs[0] + 9) < 1e-6, 'pilastra no canto esquerdo');
assert(Math.abs(xs[3] - 9) < 1e-6, 'pilastra no canto direito');
assert(corniceY(14) > 14, 'cornija acima do parapeito');
assert(setbackOutset() > 0 && setbackOutset() < 0.6, 'recuo falso raso, sem colisor');
assert(awningClearsDoor(3.5, 5), 'toldo cobre a porta sem ser muralha');
assert(windowStyleFor('tower').w < windowStyleFor('shop').w, 'torre tem vãos menores que loja');
assert(windowStyleFor('silo').cols === 0, 'silo não ganha grade de janela extra');

if (process.exitCode) console.error('facadeKit tests failed');
else console.log('facadeKit tests passed');
