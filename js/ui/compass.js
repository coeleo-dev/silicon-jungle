const compassCanvas = document.getElementById('compass-canvas');
const compassCtx = compassCanvas.getContext('2d');
const compassHeadingEl = document.getElementById('compass-heading');

export function renderCompass(yawAngle) {
  compassCtx.clearRect(0, 0, 220, 220);
  const cx = 110, cy = 110, r = 95;

  compassCtx.save();
  compassCtx.translate(cx, cy);

  compassCtx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
  compassCtx.lineWidth = 3;
  compassCtx.beginPath();
  compassCtx.arc(0, 0, r, 0, Math.PI * 2);
  compassCtx.stroke();

  compassCtx.strokeStyle = 'rgba(255, 210, 77, 0.3)';
  compassCtx.lineWidth = 1;
  compassCtx.beginPath();
  compassCtx.arc(0, 0, r - 8, 0, Math.PI * 2);
  compassCtx.stroke();

  compassCtx.rotate(yawAngle);

  for (let i = 0; i < 360; i += 30) {
    const rad = (i * Math.PI) / 180;
    const isMajor = i % 90 === 0;
    const len = isMajor ? 12 : 6;
    compassCtx.strokeStyle = isMajor ? '#00ffaa' : 'rgba(0, 255, 170, 0.4)';
    compassCtx.lineWidth = isMajor ? 2 : 1;

    compassCtx.beginPath();
    compassCtx.moveTo(Math.sin(rad) * (r - 2), -Math.cos(rad) * (r - 2));
    compassCtx.lineTo(Math.sin(rad) * (r - 2 - len), -Math.cos(rad) * (r - 2 - len));
    compassCtx.stroke();
  }

  compassCtx.font = 'bold 15px "Orbitron", sans-serif';
  compassCtx.textAlign = 'center';
  compassCtx.textBaseline = 'middle';

  compassCtx.fillStyle = '#ff3b56';
  compassCtx.fillText('N', 0, -r + 20);

  compassCtx.fillStyle = '#00f0ff';
  compassCtx.fillText('⏚ E', r - 20, 0);

  compassCtx.fillStyle = '#ffd24d';
  compassCtx.fillText('S', 0, r - 20);

  compassCtx.fillStyle = '#00ffaa';
  compassCtx.fillText('〰 W', -r + 20, 0);

  compassCtx.restore();

  compassCtx.fillStyle = '#ff3b56';
  compassCtx.beginPath();
  compassCtx.moveTo(cx, cy - 35);
  compassCtx.lineTo(cx - 7, cy);
  compassCtx.lineTo(cx + 7, cy);
  compassCtx.closePath();
  compassCtx.fill();

  compassCtx.fillStyle = '#5588ff';
  compassCtx.beginPath();
  compassCtx.moveTo(cx, cy + 35);
  compassCtx.lineTo(cx - 7, cy);
  compassCtx.lineTo(cx + 7, cy);
  compassCtx.closePath();
  compassCtx.fill();

  compassCtx.fillStyle = '#ffffff';
  compassCtx.beginPath();
  compassCtx.arc(cx, cy, 4, 0, Math.PI * 2);
  compassCtx.fill();

  let deg = Math.round((-yawAngle * 180 / Math.PI) % 360);
  if (deg < 0) deg += 360;
  let dirName = 'NORTH';
  if (deg >= 45 && deg < 135) dirName = 'EAST';
  else if (deg >= 135 && deg < 225) dirName = 'SOUTH';
  else if (deg >= 225 && deg < 315) dirName = 'WEST';
  compassHeadingEl.textContent = `${deg.toString().padStart(3, '0')}° ${dirName}`;
}
