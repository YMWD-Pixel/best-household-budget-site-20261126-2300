// NestEgg charts: small canvas drawings, no library, no network.
// A donut for "where the money went" and bars for the monthly trend.

function setupCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

export function drawDonut(canvas, slices, opts = {}) {
  const size = opts.size || 220;
  const thick = opts.thick || 34;
  const ctx = setupCanvas(canvas, size, size);
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#e4dccb";
    ctx.lineWidth = thick;
    ctx.stroke();
    ctx.fillStyle = "#5c6b63";
    ctx.font = "600 13px -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Nothing spent yet", cx, cy);
    return;
  }
  let start = -Math.PI / 2;
  for (const s of slices) {
    const frac = s.amount / total;
    const end = start + frac * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - thick / 2, start, end);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = thick;
    ctx.stroke();
    start = end;
  }
  // Center label: the total, so the donut answers its own question.
  ctx.fillStyle = "#22302a";
  ctx.font = "700 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.centerTop || "", cx, cy - 4);
  ctx.fillStyle = "#5c6b63";
  ctx.font = "12px -apple-system, Segoe UI, sans-serif";
  ctx.fillText(opts.centerBottom || "", cx, cy + 16);
}

export function drawBars(canvas, points, opts = {}) {
  const w = opts.width || 560;
  const h = opts.height || 240;
  const ctx = setupCanvas(canvas, w, h);
  const padL = 46;
  const padB = 26;
  const padT = 12;
  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = w - padL - 10;
  const innerH = h - padT - padB;
  const slot = innerW / points.length;
  const barW = Math.min(44, slot * 0.55);

  // Gridlines with $ labels.
  ctx.strokeStyle = "#e4dccb";
  ctx.fillStyle = "#5c6b63";
  ctx.font = "11px -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (innerH * i) / 4;
    const val = max * (1 - i / 4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.fillText("$" + Math.round(val).toLocaleString("en-US"), padL - 6, y + 4);
  }

  points.forEach((p, i) => {
    const bh = (p.value / max) * innerH;
    const x = padL + slot * i + (slot - barW) / 2;
    const y = padT + innerH - bh;
    ctx.fillStyle = p.color || "#1d4a38";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#22302a";
    ctx.font = "600 11px -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$" + Math.round(p.value).toLocaleString("en-US"), x + barW / 2, y - 5);
    ctx.fillStyle = "#5c6b63";
    ctx.font = "11px -apple-system, Segoe UI, sans-serif";
    ctx.fillText(p.label, x + barW / 2, h - 8);
  });
}

export function drawTrend(canvas, series) {
  // Two series on one chart: bars for spending, a line for income.
  const w = 560;
  const h = 260;
  const ctx = setupCanvas(canvas, w, h);
  const padL = 46;
  const padB = 26;
  const padT = 16;
  const max = Math.max(1, ...series.flatMap((s) => [s.spent, s.income]));
  const innerW = w - padL - 10;
  const innerH = h - padT - padB;
  const slot = innerW / series.length;
  const barW = Math.min(34, slot * 0.4);

  ctx.strokeStyle = "#e4dccb";
  ctx.fillStyle = "#5c6b63";
  ctx.font = "11px -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (innerH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - 10, y);
    ctx.stroke();
    ctx.fillText("$" + Math.round(max * (1 - i / 4)).toLocaleString("en-US"), padL - 6, y + 4);
  }

  const incomePts = [];
  series.forEach((s, i) => {
    const bh = (s.spent / max) * innerH;
    const x = padL + slot * i + (slot - barW) / 2;
    const y = padT + innerH - bh;
    ctx.fillStyle = s.spent > s.income ? "#b3402e" : "#1d4a38";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#22302a";
    ctx.font = "600 11px -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$" + Math.round(s.spent).toLocaleString("en-US"), x + barW / 2, y - 5);
    incomePts.push([x + barW / 2, padT + innerH - (s.income / max) * innerH]);
    ctx.fillStyle = "#5c6b63";
    ctx.font = "11px -apple-system, Segoe UI, sans-serif";
    ctx.fillText(s.label, x + barW / 2, h - 8);
  });

  // Income line with dots.
  ctx.strokeStyle = "#e8a33d";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  incomePts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = "#e8a33d";
  for (const [x, y] of incomePts) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "#e8a33d";
    ctx.lineWidth = 2.5;
  }
}
