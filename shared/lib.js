/* ============================================================
   확률과 통계, 눈으로 보기 — 공통 헬퍼 라이브러리.
   전역 네임스페이스 VZ. 모든 챕터가 <script src> 로 로드.
   ============================================================ */
(function (global) {
  'use strict';

  const fmt = (n, d = 2) => {
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const r = Number(n).toFixed(d);
    return Object.is(parseFloat(r), -0) ? (0).toFixed(d) : r;
  };
  const PALETTE = ['#60a5fa', '#fbbf24', '#94a3b8', '#34d399', '#f472b6', '#c084fc', '#fb7185', '#37bdf8'];
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // 스텝퍼: data-s 버튼 ↔ data-panel 패널 전환
  function setupStepper(stepperSel = '#stepper', panelSel = '[data-panel]') {
    const stepper = document.querySelector(stepperSel);
    if (!stepper) return;
    const panels = [...document.querySelectorAll(panelSel)];
    stepper.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      stepper.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      panels.forEach(p => p.classList.toggle('show', p.dataset.panel === b.dataset.s));
      const top = stepper.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  // 뷰 토글: toggle 안 button[data-v] → views[data-v]만 표시, onShow(v)로 지연 렌더
  function setupViewToggle(toggleSel, views, onShow) {
    const toggle = document.querySelector(toggleSel);
    if (!toggle) return;
    const shown = {};
    toggle.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      toggle.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (onShow && !shown[v]) { onShow(v); shown[v] = true; }
      Object.keys(views).forEach(key => { const el = document.querySelector(views[key]); if (el) el.style.display = (key === v) ? '' : 'none'; });
    });
  }

  // 상단 네비: 허브 링크 + 챕터 배지
  function mountTopnav(sel, badge) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = `<a class="home" href="index.html">← 목차로</a><span class="chapbadge">${badge}</span>`;
  }

  // 가로 막대 행
  function barRow(label, frac, { win = false, color = null, pctText = null } = {}) {
    const c = color || (win ? 'var(--hot)' : 'var(--q)');
    return `<div class="barrow ${win ? 'win' : ''}">
      <div class="bw">${label}${win ? ' 🏆' : ''}</div>
      <div class="track"><div class="fill" style="width:${(clamp(frac, 0, 1) * 100).toFixed(1)}%;background:${c}"></div></div>
      <div class="pct">${pctText != null ? pctText : (frac * 100).toFixed(1) + '%'}</div>
    </div>`;
  }

  global.VZ = { fmt, PALETTE, clamp, setupStepper, setupViewToggle, mountTopnav, barRow };
})(window);

/* ============================================================
   꺾은선 차트 (VZ.linePlot) — 수렴/곡선용
   series: [{pts:[[x,y]...], color, label, dash?}]
   opts: {W,H, xlab, ylab, xmin,xmax,ymin,ymax(생략시 자동), legend, hline:{y,label}, aria}
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function linePlot(series, opts = {}) {
    const W = opts.W || 460, H = opts.H || 230, padL = 44, padR = 14, padT = opts.legend === false ? 14 : 30, padB = 34;
    const all = series.filter(s => s.pts && s.pts.length);
    let xmin = opts.xmin, xmax = opts.xmax, ymin = opts.ymin, ymax = opts.ymax;
    if (xmin == null) xmin = Math.min(...all.flatMap(s => s.pts.map(p => p[0])), 0);
    if (xmax == null) xmax = Math.max(...all.flatMap(s => s.pts.map(p => p[0])), 1);
    if (ymin == null) ymin = Math.min(...all.flatMap(s => s.pts.map(p => p[1])), 0);
    if (ymax == null) ymax = Math.max(...all.flatMap(s => s.pts.map(p => p[1])), 1);
    if (ymax === ymin) ymax = ymin + 1;
    if (xmax === xmin) xmax = xmin + 1;
    const px = x => padL + (x - xmin) / (xmax - xmin) * (W - padL - padR);
    const py = y => H - padB - (y - ymin) / (ymax - ymin) * (H - padT - padB);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const yv = ymin + (ymax - ymin) * i / 4, y = py(yv);
      g += `<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
      g += `<text class="axislabel" x="${padL - 6}" y="${y + 3}" text-anchor="end">${VZ.fmt(yv, Math.abs(ymax - ymin) >= 10 ? 0 : 1)}</text>`;
    }
    for (let i = 1; i < 4; i++) { const xv = xmin + (xmax - xmin) * i / 4; g += `<line class="gridline" x1="${px(xv)}" y1="${padT}" x2="${px(xv)}" y2="${H - padB}"/>`; }
    g += `<line class="axis" x1="${padL}" y1="${py(ymin)}" x2="${W - padR}" y2="${py(ymin)}"/>`;
    g += `<line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}"/>`;
    g += `<text class="axislabel" x="${padL}" y="${H - padB + 16}" text-anchor="start">${VZ.fmt(xmin, 0)}</text>`;
    g += `<text class="axislabel" x="${W - padR}" y="${H - padB + 16}" text-anchor="end">${VZ.fmt(xmax, 0)}</text>`;
    if (opts.xlab) g += `<text class="axislabel" x="${(padL + W - padR) / 2}" y="${H - padB + 16}" text-anchor="middle">${opts.xlab}</text>`;
    else g += `<text class="axislabel" x="${px((xmin + xmax) / 2)}" y="${H - padB + 16}" text-anchor="middle">${VZ.fmt((xmin + xmax) / 2, 0)}</text>`;
    if (opts.ylab) g += `<text class="axislabel" x="${padL - 30}" y="${(padT + H - padB) / 2}" text-anchor="middle" transform="rotate(-90 ${padL - 30} ${(padT + H - padB) / 2})">${opts.ylab}</text>`;
    if (opts.hline) {
      const y = py(opts.hline.y);
      g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 3"/>`;
      if (opts.hline.label) g += `<text class="axislabel" x="${W - padR}" y="${y - 4}" text-anchor="end" fill="var(--faint)">${opts.hline.label}</text>`;
    }
    all.forEach(s => {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
    });
    if (opts.legend !== false) {
      let lx = padL;
      all.forEach(s => { if (!s.label) return;
        g += `<line x1="${lx}" y1="10" x2="${lx + 16}" y2="10" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
        g += `<text x="${lx + 20}" y="13" font-size="11" font-family="JetBrains Mono" fill="var(--muted)">${s.label}</text>`;
        lx += 26 + (s.label.length * 7.2); });
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || (opts.ylab ? opts.ylab + ' 곡선' : '꺾은선 차트')}" style="max-width:100%;display:block">${g}</svg>`;
  }
  VZ.linePlot = linePlot;
})(window);

/* ============================================================
   통계 시각화 엔진 (VZ.ST)
   - normalPdf(x, mu, sd)
   - histogram(values, opts): 도수 히스토그램 SVG (정규곡선 overlay 지원)
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;

  const normalPdf = (x, mu, sd) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));

  // 누적분포 Φ — erf 근사(Abramowitz–Stegun 7.1.26), 정밀도 ~1e-7
  function erf(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  }
  const normalCdf = (x, mu = 0, sd = 1) => 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));

  // values: 숫자 배열. opts: {W,H, bins, min,max, color, overlay:{fn,color,label}, band:{lo,hi,color,label}, xlab}
  function histogram(values, opts = {}) {
    const W = opts.W || 480, H = opts.H || 240, padL = 36, padR = 14, padT = 14, padB = 30;
    const bins = opts.bins || 24;
    let lo = opts.min, hi = opts.max;
    if (lo == null) lo = Math.min(...values);
    if (hi == null) hi = Math.max(...values);
    if (!(hi > lo)) hi = lo + 1;
    const cnt = new Array(bins).fill(0);
    values.forEach(v => { let b = Math.floor((v - lo) / (hi - lo) * bins); if (b < 0) b = 0; if (b >= bins) b = bins - 1; cnt[b]++; });
    const binW = (hi - lo) / bins, N = values.length || 1;
    let maxC = Math.max(...cnt, 1);
    // overlay(밀도함수)를 도수 스케일로: 기대도수 ≈ N·pdf·binW
    let overlayMax = 0, oFn = null;
    if (opts.overlay) { oFn = x => N * opts.overlay.fn(x) * binW; for (let i = 0; i <= 60; i++) overlayMax = Math.max(overlayMax, oFn(lo + (hi - lo) * i / 60)); maxC = Math.max(maxC, overlayMax); }
    const plotW = W - padL - padR;
    const px = x => padL + (x - lo) / (hi - lo) * plotW;
    const py = c => H - padB - (c / maxC) * (H - padT - padB);
    const bw = plotW / bins;
    let g = '';
    // band: 세로 영역 강조(예: 오차범위, 신뢰구간). {lo,hi,color,label}
    if (opts.band) {
      const bl = px(Math.max(lo, opts.band.lo)), bh = px(Math.min(hi, opts.band.hi));
      g += `<rect x="${bl.toFixed(1)}" y="${padT}" width="${Math.max(0, bh - bl).toFixed(1)}" height="${(H - padT - padB).toFixed(1)}" fill="${opts.band.color || 'var(--v)'}" opacity="0.16"/>`;
      g += `<line x1="${bl.toFixed(1)}" y1="${padT}" x2="${bl.toFixed(1)}" y2="${H - padB}" stroke="${opts.band.color || 'var(--v)'}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>`;
      g += `<line x1="${bh.toFixed(1)}" y1="${padT}" x2="${bh.toFixed(1)}" y2="${H - padB}" stroke="${opts.band.color || 'var(--v)'}" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>`;
      if (opts.band.label) g += `<text class="axislabel" x="${((bl + bh) / 2).toFixed(1)}" y="${padT + 12}" text-anchor="middle" fill="${opts.band.color || 'var(--v)'}">${opts.band.label}</text>`;
    }
    for (let i = 0; i < bins; i++) {
      const x = padL + i * bw, y = py(cnt[i]);
      g += `<rect x="${(x + 0.5).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${Math.max(0, H - padB - y).toFixed(1)}" rx="1.5" fill="${opts.color || 'var(--q)'}" opacity="0.78"/>`;
    }
    g += `<line class="axis" x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}"/>`;
    if (oFn) {
      let d = ''; for (let i = 0; i <= 80; i++) { const x = lo + (hi - lo) * i / 80; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ',' + py(oFn(x)).toFixed(1); }
      g += `<path d="${d}" fill="none" stroke="${opts.overlay.color || 'var(--hot)'}" stroke-width="2.5"/>`;
    }
    g += `<text class="axislabel" x="${padL}" y="${H - padB + 16}" text-anchor="start">${VZ.fmt(lo, 1)}</text>`;
    g += `<text class="axislabel" x="${W - padR}" y="${H - padB + 16}" text-anchor="end">${VZ.fmt(hi, 1)}</text>`;
    if (opts.xlab) g += `<text class="axislabel" x="${(padL + W - padR) / 2}" y="${H - padB + 16}" text-anchor="middle">${opts.xlab}</text>`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || '히스토그램'}" style="max-width:100%;display:block">${g}</svg>`;
  }

  VZ.ST = { normalPdf, normalCdf, histogram };
})(window);
