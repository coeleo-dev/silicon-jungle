/**
 * Layout do kit de fachada (só visual). Sem colisores.
 */
export function pilasterXs(width, count = 4) {
  if (count < 2) return [0];
  const xs = [];
  for (let i = 0; i < count; i++) {
    xs.push(-width / 2 + (i / (count - 1)) * width);
  }
  return xs;
}

export function corniceY(height) {
  return height + 0.32;
}

export function setbackOutset() {
  return 0.4;
}

export function awningClearsDoor(awningHalfW, doorW) {
  return awningHalfW * 2 >= doorW && awningHalfW * 2 <= doorW + 4.0;
}

export function windowStyleFor(kind) {
  if (kind === 'tower') return { w: 2.4, h: 2.2, cols: 3 };
  if (kind === 'silo') return { w: 1.6, h: 1.8, cols: 0 };
  if (kind === 'shop') return { w: 3.8, h: 3.4, cols: 2 };
  return { w: 3.2, h: 2.6, cols: 2 };
}
