import React, {useEffect, useRef} from 'react';
import styles from './styles.module.css';

// Points drift and link when close; every few seconds a message enters right of the headline and
// fans out three hops along whatever links exist when it reaches each point. Messages never cross
// a sibling marked data-net-avoid, where they would compete with its own animation. Reduced motion
// draws one still frame, and frames only run while the canvas is on screen and the tab is visible.
const LINK = 120; // px within which two points are linked
const SPEED = 0.07; // px per ms for a message along a link
const DENSITY = 9000; // px² of hero per point
const HOPS = 3;
const EVERY = 5000; // ms between messages
const FADE = 1400; // ms a delivered hop stays lit
const CLEAR = 24; // px kept free of messages around the avoided element

type Pt = {x: number; y: number; vx: number; vy: number};
type Hop = {i: number; j: number; t0: number; dur: number; depth: number; seen: Set<number>; arrived: boolean};
type RGB = [number, number, number];
type Box = {x0: number; y0: number; x1: number; y1: number};

const rgb = (v: string): RGB => {
  v = v.trim();
  if (v[0] === '#') {
    if (v.length === 4) v = '#' + [...v.slice(1)].map((x) => x + x).join('');
    return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB;
  }
  const m = v.match(/\d+/g);
  return m ? (m.slice(0, 3).map(Number) as RGB) : [128, 128, 128];
};
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export default function HeroNet(): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const root = document.documentElement;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    let W = 0, H = 0, onScreen = false, lastT = 0, raf = 0;
    let pts: Pt[] = [], hops: Hop[] = [];
    let col: {line?: RGB; msg?: RGB; dk?: boolean} = {};
    let Z: Box | null = null;
    const fig = cv.parentElement?.querySelector('[data-net-avoid]') ?? null;
    // Animation time only advances while frames run, so a pause resumes mid-message.
    let clock = 0, lastSpawn = 800 - EVERY;

    const rand = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

    function colours() {
      const s = getComputedStyle(root);
      col = {
        line: rgb(s.getPropertyValue('--stroke')),
        msg: rgb(s.getPropertyValue('--l-blue')),
        dk: root.dataset.theme === 'dark',
      };
      paint(clock);
    }

    function zone() {
      const c = cv!.getBoundingClientRect(), f = fig?.getBoundingClientRect();
      // A hidden element (zero size) has nothing to avoid.
      Z = f && f.width ? {x0: f.left - c.left - CLEAR, y0: f.top - c.top - CLEAR, x1: f.right - c.left + CLEAR, y1: f.bottom - c.top + CLEAR} : null;
    }
    const inZone = (x: number, y: number) => !!Z && x > Z.x0 && x < Z.x1 && y > Z.y0 && y < Z.y1;
    // A hop is clear when its ends and three points along it are outside the zone.
    const clear = (a: Pt, b: Pt) => [0, 0.25, 0.5, 0.75, 1].every((t) => !inZone(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));

    function build() {
      zone();
      const r = cv!.getBoundingClientRect();
      if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 1 && pts.length) return;
      W = r.width; H = r.height;
      const dpr = Math.min(2, devicePixelRatio || 1);
      cv!.width = Math.round(W * dpr); cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const R = rand(11);
      pts = Array.from({length: Math.round((W * H) / DENSITY)}, () => ({
        x: R() * W, y: R() * H, vx: (R() - 0.5) * 0.016, vy: (R() - 0.5) * 0.016,
      }));
      hops = [];
      paint(clock);
    }

    function hopFrom(i: number, depth: number, t: number, seen: Set<number>) {
      const near: number[] = [];
      for (let j = 0; j < pts.length; j++) if (j !== i && !seen.has(j) && dist(pts[i], pts[j]) < LINK * 0.9 && clear(pts[i], pts[j])) near.push(j);
      near.sort(() => Math.random() - 0.5).slice(0, depth ? 2 : 3).forEach((j) => {
        seen.add(j);
        hops.push({i, j, t0: t, dur: dist(pts[i], pts[j]) / SPEED, depth, seen, arrived: false});
      });
    }

    function spawn(now: number) {
      // Re-measure each time: web fonts landing after the first build can move the element.
      zone();
      // On wide layouts start right of the headline, where the mask is strongest.
      const pool: number[] = [], minX = W > 960 ? W * 0.45 : 20;
      pts.forEach((p, i) => { if (p.x > minX && p.x < W - 20 && p.y > 20 && p.y < H - 20 && !inZone(p.x, p.y)) pool.push(i); });
      if (!pool.length) return;
      const o = pool[(Math.random() * pool.length) | 0];
      hopFrom(o, 0, now, new Set([o]));
    }

    function paint(now: number) {
      ctx!.clearRect(0, 0, W, H);
      const {line, msg, dk} = col;
      if (!line || !msg) return;
      const eA = dk ? 0.34 : 0.32, nA = dk ? 0.7 : 0.65;
      ctx!.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = dist(pts[i], pts[j]);
        if (d < LINK) {
          ctx!.strokeStyle = rgba(line, eA * (1 - d / LINK));
          ctx!.beginPath(); ctx!.moveTo(pts[i].x, pts[i].y); ctx!.lineTo(pts[j].x, pts[j].y); ctx!.stroke();
        }
      }
      ctx!.fillStyle = rgba(line, nA);
      for (const p of pts) { ctx!.beginPath(); ctx!.arc(p.x, p.y, 1.6, 0, 7); ctx!.fill(); }

      ctx!.lineWidth = 1.25;
      for (let k = hops.length - 1; k >= 0; k--) {
        const h = hops[k], a = pts[h.i], b = pts[h.j], u = (now - h.t0) / h.dur;
        if (u < 0) continue;
        if (u <= 1) {
          const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
          ctx!.strokeStyle = rgba(msg, 0.38); ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(x, y); ctx!.stroke();
          ctx!.fillStyle = rgba(msg, 0.55); ctx!.beginPath(); ctx!.arc(x, y, 1.8, 0, 7); ctx!.fill();
          continue;
        }
        if (!h.arrived) { h.arrived = true; if (h.depth < HOPS - 1) hopFrom(h.j, h.depth + 1, now, h.seen); }
        const f = 1 - (now - h.t0 - h.dur) / FADE;
        if (f <= 0) { hops.splice(k, 1); continue; }
        ctx!.strokeStyle = rgba(msg, 0.3 * f); ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
        ctx!.fillStyle = rgba(msg, 0.4 * f); ctx!.beginPath(); ctx!.arc(b.x, b.y, 2, 0, 7); ctx!.fill();
      }
    }

    const active = () => onScreen && !document.hidden && !still.matches;
    function wake() { if (!raf && active()) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
    function frame(now: number) {
      raf = 0;
      if (!active()) return;
      const dt = Math.min(64, now - lastT); lastT = now;
      clock += dt;
      if (clock - lastSpawn > EVERY) { lastSpawn = clock; spawn(clock); }
      pts.forEach((p, i) => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const {x, y} = p;
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
        // A point that wraps jumps across the hero; hops on it would stretch with it.
        if (p.x !== x || p.y !== y) hops = hops.filter((h) => h.i !== i && h.j !== i);
      });
      paint(clock);
      raf = requestAnimationFrame(frame);
    }
    const onMotion = () => { hops = []; paint(clock); wake(); };

    const ro = new ResizeObserver(build);
    ro.observe(cv);
    if (fig) ro.observe(fig);
    const io = new IntersectionObserver((es) => es.forEach((e) => { onScreen = e.isIntersecting; wake(); }));
    io.observe(cv);
    const mo = new MutationObserver(colours);
    mo.observe(root, {attributes: true, attributeFilter: ['data-theme']});
    document.addEventListener('visibilitychange', wake);
    still.addEventListener('change', onMotion);
    build();
    colours();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange', wake);
      still.removeEventListener('change', onMotion);
    };
  }, []);

  return <canvas ref={ref} className={styles.net} aria-hidden="true" />;
}
