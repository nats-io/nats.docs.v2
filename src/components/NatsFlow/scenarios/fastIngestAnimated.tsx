import React, { useEffect, useState } from "react";

// fastIngestAnimated
// Fast-ingest batch publish. order-svc streams messages without a PubAck per
// message; the SERVER paces it by acking whole BATCHES, and widens the batch as
// the publisher keeps up: one ack covers 1 message, then 2, then 4 — fewer acks,
// higher throughput. Not atomic: a dropped message is never acked and leaves a
// gap; gap:ok stores the rest and keeps going (gap:fail would abort the batch).
// Each phase sends ONE batch that travels left→right; the batch visibly doubles
// as the flow window ramps, so "the window widens" IS the animation.

const TICK_MS = 80;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";
const NAVY = "#375C93";
const AMBER = "#d97706";

type Phase = { key: string; w: number; drop: number; dur: number };

const PHASES: Phase[] = [
    { key: "w1", w: 1, drop: 0, dur: 1600 },
    { key: "w2", w: 2, drop: 0, dur: 1700 },
    { key: "w4", w: 4, drop: 0, dur: 1800 },
    { key: "gap", w: 4, drop: 1, dur: 2100 },
    { key: "cont", w: 4, drop: 0, dur: 2100 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);
const GAP_IDX = PHASES.findIndex((p) => p.key === "gap");

// cumulative messages stored before each phase begins
const BASE: number[] = [];
PHASES.reduce((acc, ph, i) => {
    BASE[i] = acc;
    return acc + (ph.w - ph.drop);
}, 0);

const TRACK_W = 360;
const DOT = 16;
const DOT_GAP = 6;
const ARR = 0.82; // batch reaches ORDERS by this fraction of the phase, then it's acked

function phaseAt(t: number) {
    let acc = 0;
    for (let i = 0; i < PHASES.length; i++) {
        if (t < acc + PHASES[i].dur) return { ph: PHASES[i], idx: i, p: (t - acc) / PHASES[i].dur };
        acc += PHASES[i].dur;
    }
    const i = PHASES.length - 1;
    return { ph: PHASES[i], idx: i, p: 1 };
}

function FastIngestAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { ph, idx, p } = phaseAt(elapsed % CYCLE);
    const w = ph.w;
    const travel = Math.min(p / ARR, 1);
    const arrived = p > ARR;
    const add = w - ph.drop;
    const stored = BASE[idx] + Math.round(add * travel);
    const gapShown = idx >= GAP_IDX;
    const isGapPhase = ph.key === "gap";

    const clusterW = w * DOT + (w - 1) * DOT_GAP;
    const x = (TRACK_W - clusterW) * travel;

    const status =
        ph.key === "w1"
            ? "Slow start: the server acks every single message while it gauges the load."
            : ph.key === "w2"
              ? "Keeping up, the server widens the window — now one ack covers two messages."
              : ph.key === "w4"
                ? "Faster still: one ack per four messages. Fewer acks, higher throughput."
                : isGapPhase
                  ? "A message is dropped in flight. It's never acked, so it leaves a gap."
                  : "gap:ok stores the rest and keeps going. (gap:fail would abort the batch instead.)";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Fast-ingest: the server sets the pace.</strong> No PubAck per message — the server{" "}
                <span style={{ color: GREEN, fontWeight: 600 }}>acks whole batches</span> and widens the batch as you
                keep up. Not atomic: a dropped message leaves a{" "}
                <span style={{ color: RED, fontWeight: 600 }}>gap</span>.
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                {/* publisher */}
                <div
                    style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: `2px solid ${BLUE}`,
                        background: "white",
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "#374151",
                    }}
                >
                    order-svc
                </div>

                {/* travel track */}
                <div style={{ width: TRACK_W, position: "relative" }}>
                    {/* current flow window */}
                    <div style={{ height: 18, marginBottom: 4, textAlign: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 4, padding: "1px 7px", background: "white" }}>
                            flow window: 1 ack · {w} message{w > 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* the path the batch travels */}
                    <div style={{ position: "relative", height: DOT + 12 }}>
                        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px dashed #e2e8f0" }} />

                        {/* dropped-message marker stays where it was lost */}
                        {isGapPhase && p > 0.45 && (
                            <span style={{ position: "absolute", top: "50%", left: TRACK_W * 0.42, transform: "translate(-50%, -50%)", color: RED, fontSize: 14, fontWeight: 800 }}>
                                ✕
                            </span>
                        )}

                        {/* the traveling batch */}
                        <div style={{ position: "absolute", top: "50%", left: x, transform: "translateY(-50%)", display: "flex", gap: DOT_GAP }}>
                            {Array.from({ length: w }).map((_, i) => {
                                const dropped = ph.drop > 0 && i === w - 1;
                                const op = dropped ? Math.max(0, 1 - Math.max(0, (p - 0.4) / 0.28)) : 1;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            width: DOT,
                                            height: DOT,
                                            borderRadius: 4,
                                            background: dropped ? "#fef2f2" : BLUE,
                                            border: `2px solid ${dropped ? RED : BLUE}`,
                                            opacity: op,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* flow-control return: one ack per batch */}
                    <div style={{ height: 18, marginTop: 4, textAlign: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: arrived ? GREEN : "#cbd5e1", transition: "color 0.15s" }}>
                            {arrived ? "← BatchFlowAck ✓" : "← waiting for the batch…"}
                        </span>
                    </div>
                </div>

                {/* ORDERS sink */}
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: `2px solid ${arrived ? GREEN : "#e5e7eb"}`,
                        background: "white",
                        textAlign: "center",
                        minWidth: 92,
                        transition: "border-color 0.15s",
                    }}
                >
                    <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>ORDERS</div>
                    <div style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 800, color: gapShown ? AMBER : GREEN, transition: "color 0.2s" }}>
                        {stored}
                    </div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>stored{gapShown ? " · 1 gap" : ""}</div>
                </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                    onClick={() => setElapsed(0)}
                    style={{ flex: "none", padding: "5px 12px", borderRadius: 6, border: `1px solid ${BLUE}`, background: "white", color: BLUE, fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}
                >
                    ↺ Restart
                </button>
                <span style={{ fontSize: 13, color: "#374151" }}>{status}</span>
            </div>
        </div>
    );
}

export function FastIngestAnimated(_props: { width?: number; height?: number } = {}) {
    return <FastIngestAnimatedInner />;
}
