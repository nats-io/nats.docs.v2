import React, { useEffect, useState } from "react";

// workQueueRetentionAnimated
// WorkQueue retention. Each order is delivered to ONE worker; the first ack
// removes it for everyone, so the stream drains. One order glides
// publisher -> stream -> a worker, the worker acks, and it's gone — the count
// returns to zero. Workers take turns.

const TICK_MS = 80;
const STEP_MS = 3200;
const EASE = "cubic-bezier(0.4,0,0.2,1)";

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const RED = "#ef4444";

const W = 560;
const H = 200;
const PUB_L = 16;
const PUB_W = 98;
const MIDY = 100;
const STREAM_L = 198;
const STREAM_W = 150;
const STREAM_T = 72;
const STREAM_H = 56;
const STREAM_CX = STREAM_L + STREAM_W / 2;
const STREAM_R = STREAM_L + STREAM_W;
const WK_L = 426;
const WK_W = 118;
const WK_A_T = 46;
const WK_B_T = 112;
const WK_A_MIDY = WK_A_T + 24;
const WK_B_MIDY = WK_B_T + 24;
const PILL_WK_X = WK_L + 6;

function WorkQueueRetentionAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const step = Math.floor(elapsed / STEP_MS);
    const n = step + 1;
    const w = step % 2; // 0 -> worker-1, 1 -> worker-2
    const cp = (elapsed % STEP_MS) / STEP_MS;
    const wkMidY = w === 0 ? WK_A_MIDY : WK_B_MIDY;

    // phases: 0 at publisher, 1 stored in stream, 2 delivered to worker, 3 acked/gone
    const phase = cp < 0.2 ? 0 : cp < 0.5 ? 1 : cp < 0.78 ? 2 : 3;

    const stored = phase === 1 || phase === 2;
    const delivering = phase === 2;
    const acked = phase === 3;
    const count = stored ? 1 : 0;

    // pill center target by phase
    const target =
        phase === 0
            ? { x: PUB_L + PUB_W + 22, y: MIDY }
            : phase === 1
              ? { x: STREAM_CX, y: MIDY }
              : { x: PILL_WK_X, y: wkMidY };

    const status = acked
        ? `worker-${w + 1} acked #${n} → removed. Stream back to empty.`
        : phase === 2
          ? `#${n} delivered to worker-${w + 1} only — the others don't get a copy.`
          : phase === 1
            ? `#${n} stored. One worker will take it.`
            : `Publishing order #${n}…`;

    const worker = (idx: 0 | 1) => {
        const top = idx === 0 ? WK_A_T : WK_B_T;
        const isTarget = idx === w;
        const has = isTarget && phase === 2;
        const justAcked = isTarget && acked;
        const border = justAcked ? CONSUMER_GREEN : has ? STREAM_BLUE : WORKER_NAVY;
        const tag = justAcked ? "✓ ack" : has ? `#${n}` : "idle";
        const tagColor = justAcked ? CONSUMER_GREEN : has ? STREAM_BLUE : "#9ca3af";
        return (
            <div style={{ position: "absolute", left: WK_L, top, width: WK_W, height: 48, borderRadius: 9, border: `2px solid ${border}`, background: justAcked ? "#ecfdf5" : "white", padding: "0 11px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s", boxShadow: justAcked ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>worker-{idx + 1}</span>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: tagColor, transition: "color 0.3s" }}>{tag}</span>
            </div>
        );
    };

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 14, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>WorkQueue.</strong> Each order goes to <strong>one</strong> worker. The first ack
                removes it for everyone, so the stream drains to empty.
            </div>

            <div style={{ position: "relative", width: W, height: H, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                {/* connectors to workers */}
                <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                    <line x1={STREAM_R} y1={MIDY} x2={WK_L} y2={WK_A_MIDY} stroke={w === 0 && delivering ? STREAM_BLUE : "#e5e7eb"} strokeWidth={2} style={{ transition: "stroke 0.3s" }} />
                    <line x1={STREAM_R} y1={MIDY} x2={WK_L} y2={WK_B_MIDY} stroke={w === 1 && delivering ? STREAM_BLUE : "#e5e7eb"} strokeWidth={2} style={{ transition: "stroke 0.3s" }} />
                </svg>

                {/* publisher */}
                <div style={{ position: "absolute", left: PUB_L, top: MIDY - 25, width: PUB_W, height: 50, borderRadius: 9, border: `2px solid ${WORKER_NAVY}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: WORKER_NAVY }}>
                    publisher
                </div>

                {/* stream */}
                <div style={{ position: "absolute", left: STREAM_L, top: STREAM_T, width: STREAM_W, height: STREAM_H, borderRadius: 10, border: `2px solid ${STREAM_BLUE}`, background: "white", boxShadow: `0 1px 3px ${STREAM_BLUE}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: count ? STREAM_BLUE : "#9ca3af", transition: "color 0.3s" }}>{count} msg</span>
                    </div>
                </div>

                {/* the order, gliding publisher -> stream -> worker, fading on ack */}
                <div
                    key={step}
                    style={{
                        position: "absolute",
                        left: target.x,
                        top: target.y,
                        transform: "translate(-50%, -50%)",
                        transition: `left 0.6s ${EASE}, top 0.6s ${EASE}, opacity 0.35s linear`,
                        opacity: acked ? 0 : 1,
                        padding: "4px 9px",
                        borderRadius: 7,
                        border: `2px solid ${acked ? RED : phase === 0 ? CONSUMER_GREEN : STREAM_BLUE}`,
                        background: phase === 0 ? "#ecfdf5" : "white",
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: phase === 0 ? CONSUMER_GREEN : STREAM_BLUE,
                        whiteSpace: "nowrap",
                        boxShadow: `0 1px 2px rgba(0,0,0,0.08)`,
                    }}
                >
                    #{n}
                </div>

                {worker(0)}
                {worker(1)}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function WorkQueueRetentionAnimated(_props: { width?: number; height?: number } = {}) {
    return <WorkQueueRetentionAnimatedInner />;
}
