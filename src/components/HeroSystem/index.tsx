import React, {useEffect, useRef} from 'react';
import type {MouseEvent, ReactNode} from 'react';
import {useHistory} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import s from './styles.module.css';

// The four capabilities from the nats.io hero diagram as a 2x2 grid, each linking to where the docs
// cover it. The SVG as authored is the still frame; one small animation per tile then plays in turn
// while the diagram is on screen. Artwork keeps the nats.io diagram's coordinates and is translated
// into each tile, so the two stay easy to compare.
const NS = 'http://www.w3.org/2000/svg';
const PACE = 0.8; // the timeline plays at this fraction of real time
const CYCLE = 10000; // ms of timeline per round; services, the last band, clears at 8.6s
// Sine in-out peaks at 1.57x the average speed, so dots glide rather than surge.
const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

const MESSAGING = (
  <>
    <circle className={s.mPub} cx="280" cy="102" r="3.5" />
    <path data-k="m-in" className={s.mLine} d="M284 102 H322" />
    <path data-k="m-b0" className={s.mLine} d="M322 102 C340 102 340 88 358 88 H392" />
    <path data-k="m-b1" className={s.mLine} d="M322 102 H392" />
    <path data-k="m-b2" className={s.mLine} d="M322 102 C340 102 340 116 358 116 H392" />
    {[84, 98, 112].map((y) => <rect key={y} data-k="m-sub" className={s.mSub} x="394" y={y} width="8" height="8" rx="1.5" />)}
  </>
);
const STREAMING = (
  <>
    {[272, 288, 304, 320, 336, 352, 368, 384, 400].map((x, i) => (
      <rect key={x} data-k="s-cell" className={`${s.sCell} ${i < 6 ? s.on : ''}`} x={x} y="151" width="13" height="14" rx="1.5" />
    ))}
    <path data-k="s-cur" className={s.sCur} d="M326.5 169 l-3.5 5 h7 z" />
  </>
);
const KV = (
  <>
    <text className={s.k} x="304" y="218" textAnchor="end">config</text>
    <rect data-k="kv-box" className={s.kvBox} x="312" y="204" width="34" height="20" rx="2" />
    <text data-k="kv-val" className={s.k} x="329" y="218" textAnchor="middle">30</text>
    <text data-k="kv-rev" className={s.d} x="354" y="218">rev 3</text>
  </>
);
const SERVICES = (
  <>
    <circle className={s.vReq} cx="280" cy="270" r="3.5" />
    <path data-k="v-in" className={s.vLine} d="M284 270 H318" />
    <path data-k="v-b0" className={`${s.vLine} ${s.vBranch}`} d="M318 270 C336 270 336 258 354 258 H378" />
    <path data-k="v-b1" className={`${s.vLine} ${s.vBranch}`} d="M318 270 H378" />
    <path data-k="v-b2" className={`${s.vLine} ${s.vBranch}`} d="M318 270 C336 270 336 282 354 282 H378" />
    {[253, 265, 277].map((y) => <rect key={y} data-k="v-inst" className={s.vInst} x="380" y={y} width="26" height="10" rx="2" />)}
  </>
);

// cx/cy is the centre of the band's artwork, used to place it in its tile.
type Band = {cx: number; cy: number; swatch: string; name: string; desc: string; to: string; art: ReactNode};
const BANDS: Band[] = [
  {cx: 339, cy: 102, swatch: s.swBlue, name: 'Messaging', desc: 'pub/sub, request/reply, queues', to: '/concepts/pub-sub-basics', art: MESSAGING},
  {cx: 342.5, cy: 162.5, swatch: s.swGreen, name: 'Streaming (JetStream)', desc: 'durable streams, replay', to: '/concepts/jetstream', art: STREAMING},
  {cx: 321, cy: 214, swatch: s.swDkblue, name: 'Key-value and object store', desc: 'buckets built on streams', to: '/learn/key-value', art: KV},
  {cx: 341, cy: 270, swatch: s.swLgreen, name: 'Services', desc: 'discovery, stats, balancing', to: '/learn/services', art: SERVICES},
];

type Box = {x: number; y: number; w: number; h: number; dx: number; dy: number};
const TILE_W = 208, TILE_H = 112, GAP = 10;
function boxFor(b: Band, i: number): Box {
  const x = (i % 2) * (TILE_W + GAP), y = Math.floor(i / 2) * (TILE_H + GAP);
  // artwork sits centred in the space below the tile's two lines of text
  return {x, y, w: TILE_W, h: TILE_H, dx: x + TILE_W / 2 - b.cx, dy: y + 80 - b.cy};
}

function BandLink({band, box}: {band: Band; box: Box}) {
  const history = useHistory();
  const href = useBaseUrl(band.to);
  // Client-side navigation like a <Link>, but modified clicks still open a new tab.
  const go = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    history.push(band.to);
  };
  return (
    <a href={href} onClick={go} className={s.bandLink} aria-label={`${band.name}: ${band.desc}`}>
      <rect className={s.band} x={box.x} y={box.y} width={box.w} height={box.h} rx="3" />
      <rect x={box.x + 12} y={box.y + 13} width="8" height="8" rx="1.5" className={band.swatch} />
      <text className={s.n} x={box.x + 28} y={box.y + 21}>{band.name}</text>
      <text className={s.d} x={box.x + 28} y={box.y + 37}>{band.desc}</text>
    </a>
  );
}

export default function HeroSystem(): React.JSX.Element {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    if (!svg || still.matches) return;
    const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-k="${k}"]`)!;
    const qa = (k: string) => Array.from(svg.querySelectorAll<SVGElement>(`[data-k="${k}"]`));

    // A clock that only advances while the diagram is on screen, so a pause resumes mid-animation.
    let clock = 0, last = 0, raf = 0, onScreen = false;
    const tasks: {t: number; fn: () => void}[] = [];
    const tweens: {t0: number; dur: number; step: (k: number) => void; done?: () => void}[] = [];
    const at = (delay: number, fn: () => void) => tasks.push({t: clock + delay, fn});
    const tween = (dur: number, step: (k: number) => void, done?: () => void) => tweens.push({t0: clock, dur, step, done});

    function dot(path: SVGPathElement, dur: number, done?: () => void) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '2.6');
      c.setAttribute('class', s.dot);
      // in the path's own group, so a translated tile keeps the dot on its path
      path.parentNode!.appendChild(c);
      const len = path.getTotalLength();
      tween(dur, (k) => {
        const p = path.getPointAtLength(len * k);
        c.setAttribute('cx', String(p.x));
        c.setAttribute('cy', String(p.y));
      }, () => { c.remove(); done?.(); });
    }
    function flash(el: Element, hold = 700) {
      el.classList.add(s.hit);
      at(hold, () => el.classList.remove(s.hit));
    }

    // Messaging: one publish, three deliveries.
    const subs = qa('m-sub');
    const messaging = () =>
      dot(q('m-in'), 900, () => [0, 1, 2].forEach((i) => dot(q(`m-b${i}`), 1200, () => flash(subs[i]))));

    // Streaming: append to the log, then the consumer cursor steps forward; replay when full.
    const cells = qa('s-cell'), cur = q<SVGPathElement>('s-cur');
    let filled = 6, pos = 3;
    const cellX = (i: number) => i * 16;
    function moveCursor(to: number, dur: number) {
      const from = pos;
      pos = to;
      tween(dur, (k) => cur.setAttribute('transform',
        `translate(${(cellX(from) + (cellX(to) - cellX(from)) * k - cellX(3)).toFixed(2)} 0)`));
    }
    function streaming() {
      if (filled < cells.length) {
        cells[filled++].classList.add(s.on);
        at(700, () => { if (pos < filled - 1) moveCursor(pos + 1, 900); });
      } else {
        for (let i = 6; i < cells.length; i++) cells[i].classList.remove(s.on);
        filled = 6;
        moveCursor(3, 1400);
      }
    }

    // Key-value: the same key updates in place and its revision ticks up.
    const val = q<SVGTextElement>('kv-val'), rev = q<SVGTextElement>('kv-rev'), box = q('kv-box');
    let v = 30, r = 3;
    function kv() {
      tween(350, (k) => { val.style.opacity = rev.style.opacity = String(1 - k); }, () => {
        if (v >= 34) { v = 30; r = 3; } else { v += 1; r += 1; }
        val.textContent = String(v);
        rev.textContent = `rev ${r}`;
        flash(box, 600);
        tween(450, (k) => { val.style.opacity = rev.style.opacity = String(k); });
      });
    }

    // Services: each request goes to the next instance.
    const insts = qa('v-inst');
    let next = 0;
    function services() {
      const i = next;
      next = (next + 1) % insts.length;
      dot(q('v-in'), 800, () => dot(q(`v-b${i}`), 1000, () => flash(insts[i], 800)));
    }

    function cycle() {
      at(0, messaging); at(2000, streaming); at(4000, kv); at(6000, services);
      at(CYCLE, cycle);
    }
    at(500, cycle);

    const live = () => onScreen && !document.hidden && !still.matches;
    function wake() { if (!raf && live()) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function frame(now: number) {
      raf = 0;
      if (!live()) return;
      clock += Math.min(64, now - last) * PACE;
      last = now;
      for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i].t <= clock) tasks.splice(i, 1)[0].fn();
      for (let i = tweens.length - 1; i >= 0; i--) {
        const w = tweens[i], k = Math.min(1, (clock - w.t0) / w.dur);
        w.step(ease(k));
        if (k >= 1) { tweens.splice(i, 1); w.done?.(); }
      }
      raf = requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; wake(); }, {threshold: 0.3});
    io.observe(svg);
    document.addEventListener('visibilitychange', wake);
    still.addEventListener('change', wake);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', wake);
      still.removeEventListener('change', wake);
    };
  }, []);

  const boxes = BANDS.map(boxFor);
  return (
    <figure className={s.fig} data-net-avoid>
      <svg ref={ref} viewBox="-1 -1 428 236" aria-label="What NATS provides">
        {BANDS.map((b, i) => <BandLink key={b.name} band={b} box={boxes[i]} />)}
        {/* The animations sit over the links but must not swallow their clicks. */}
        <g aria-hidden="true" className={s.art}>
          {BANDS.map((b, i) => (
            <g key={b.name} transform={`translate(${boxes[i].dx} ${boxes[i].dy})`}>{b.art}</g>
          ))}
        </g>
      </svg>
    </figure>
  );
}
