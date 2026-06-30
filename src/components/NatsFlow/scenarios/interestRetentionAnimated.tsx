import React, { useEffect, useState } from "react";

// interestRetentionAnimated
// Interest retention, both behaviors, alternating one case per cycle.
//   Case A — an order on orders.shipped, which both consumers subscribe to:
//            stored, then removed once EVERY consumer has acked.
//   Case B — an order on orders.archived, which no consumer subscribes to:
//            dropped the instant it's published; nothing is stored.
// One order glides publisher -> stream; the rest is shown with colour and fades.

const TICK_MS = 80;
const CYCLE_MS = 6800;
const EASE = "cubic-bezier(0.4,0,0.2,1)";

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const RED = "#ef4444";

const W = 560;
const H = 212;
const PUB_L = 14;
const PUB_W = 90;
const MIDY = 108;
const STREAM_L = 196;
const STREAM_W = 122;
const STREAM_T = 80;
const STREAM_H = 58;
const STREAM_CX = STREAM_L + STREAM_W / 2;
const STREAM_R = STREAM_L + STREAM_W;
const CONS_L = 392;
const CONS_W = 152;
const CONS_A_T = 56;
const CONS_B_T = 122;
const CONS_A_MIDY = CONS_A_T + 24;
const CONS_B_MIDY = CONS_B_T + 24;

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

function InterestRetentionAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const cycle = Math.floor(elapsed / CYCLE_MS);
    const caseA = cycle % 2 === 0;
    const cp = (elapsed % CYCLE_MS) / CYCLE_MS;
    const n = cycle + 1;
    const subject = caseA ? "orders.shipped" : "orders.archived";

    // phase thresholds
    const atPub = cp < 0.16;
    const billingAcked = caseA && cp >= 0.46;
    const analyticsAcked = caseA && cp >= 0.64;
    const removed = caseA && cp >= 0.8;

    // stored cell (case A) present from arrival until removal
    const storedPresent = caseA && cp >= 0.32 && !removed;
    const removeGhost = removed ? clamp((cp - 0.8) / 0.16, 0, 1) : 1;

    // case B drop
    const dropped = !caseA && cp >= 0.42;
    const dropGhost = dropped ? clamp((cp - 0.42) / 0.2, 0, 1) : 1;

    // the moving order pill
    const pillTarget = atPub ? { x: PUB_L + PUB_W + 46, y: MIDY } : { x: STREAM_CX, y: MIDY };
    // pill fades once handed to the stream (A) or dropped (B)
    const pillOpacity = caseA ? (cp < 0.34 ? 1 : 0) : dropped ? 0 : 1;
    const pillColor = !caseA && cp >= 0.3 ? RED : atPub ? CONSUMER_GREEN : STREAM_BLUE;

    const connectorsLit = caseA && cp >= 0.32;

    let status: string;
    if (caseA) {
        if (removed) status = "Every consumer acked → removed.";
        else if (analyticsAcked) status = "analytics acked too — all done → removed.";
        else if (billingAcked) status = "billing acked. Still stored — waiting on analytics.";
        else if (cp >= 0.32) status = `Stored on ${subject}. Both consumers want it.`;
        else status = `Publishing an order on ${subject}…`;
    } else {
        if (dropped) status = `No consumer wants ${subject} → dropped on publish. Nothing stored.`;
        else status = `Publishing an order on ${subject}…`;
    }

    const caseLabel = caseA
        ? "orders.shipped — both consumers subscribe"
        : "orders.archived — no consumer subscribes";

    const consumer = (which: "A" | "B") => {
        const top = which === "A" ? CONS_A_T : CONS_B_T;
        const name = which === "A" ? "billing" : "analytics";
        const acked = which === "A" ? billingAcked : analyticsAcked;
        const has = caseA && cp >= 0.32 && !acked && !removed;
        const ready = caseA && cp < 0.32;
        const border = acked ? CONSUMER_GREEN : has ? STREAM_BLUE : ready ? WORKER_NAVY : caseA ? WORKER_NAVY : "#cbd5e1";
        const bg = acked ? "#ecfdf5" : caseA ? "white" : "#f3f4f6";
        const tag = acked ? "✓ ack" : has ? `#${n}` : caseA ? "ready" : "no match";
        const tagColor = acked ? CONSUMER_GREEN : has ? STREAM_BLUE : caseA ? "#6b7280" : "#9ca3af";
        return (
            <div style={{ position: "absolute", left: CONS_L, top, width: CONS_W, height: 48, borderRadius: 9, border: `2px solid ${border}`, background: bg, padding: "0 11px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s", boxShadow: acked ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: caseA ? "#374151" : "#9ca3af" }}>{name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: tagColor, whiteSpace: "nowrap", transition: "color 0.3s" }}>{tag}</span>
                </div>
                <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>wants orders.shipped</span>
            </div>
        );
    };

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 14, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Interest.</strong> A message is kept only while a consumer wants it — removed once
                every consumer acks, or dropped at once if no consumer subscribes to its subject.
            </div>

            <div style={{ position: "relative", width: W, height: H, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                {/* case label */}
                <div style={{ position: "absolute", left: 14, top: 12, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: caseA ? STREAM_BLUE : RED, transition: "color 0.3s" }}>
                    {caseLabel}
                </div>

                {/* connectors to consumers */}
                <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                    <line x1={STREAM_R} y1={MIDY} x2={CONS_L} y2={CONS_A_MIDY} stroke={connectorsLit ? STREAM_BLUE : "#e5e7eb"} strokeWidth={2} style={{ transition: "stroke 0.3s" }} />
                    <line x1={STREAM_R} y1={MIDY} x2={CONS_L} y2={CONS_B_MIDY} stroke={connectorsLit ? STREAM_BLUE : "#e5e7eb"} strokeWidth={2} style={{ transition: "stroke 0.3s" }} />
                </svg>

                {/* publisher */}
                <div style={{ position: "absolute", left: PUB_L, top: MIDY - 25, width: PUB_W, height: 50, borderRadius: 9, border: `2px solid ${WORKER_NAVY}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: WORKER_NAVY }}>
                    publisher
                </div>

                {/* stream */}
                <div style={{ position: "absolute", left: STREAM_L, top: STREAM_T, width: STREAM_W, height: STREAM_H, borderRadius: 10, border: `2px solid ${STREAM_BLUE}`, background: "white", boxShadow: `0 1px 3px ${STREAM_BLUE}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 9px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: storedPresent ? STREAM_BLUE : "#9ca3af", transition: "color 0.3s" }}>{storedPresent ? 1 : 0} msg</span>
                    </div>
                </div>

                {/* stored cell (case A) */}
                {storedPresent && (
                    <div style={{ position: "absolute", left: STREAM_CX - 16, top: STREAM_T + 28, width: 32, height: 22, borderRadius: 5, border: `2px solid ${STREAM_BLUE}`, background: "#eff9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: STREAM_BLUE }}>
                        #{n}
                    </div>
                )}
                {/* removal ghost (case A) */}
                {removed && removeGhost < 1 && (
                    <div style={{ position: "absolute", left: STREAM_CX - 16, top: STREAM_T + 28 + 24 * removeGhost, width: 32, height: 22, borderRadius: 5, border: `2px solid ${RED}`, background: `${RED}14`, opacity: 1 - removeGhost, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: RED }}>
                        gone
                    </div>
                )}
                {/* drop ghost (case B) */}
                {dropped && dropGhost < 1 && (
                    <div style={{ position: "absolute", left: STREAM_CX - 18, top: MIDY - 11 + 22 * dropGhost, width: 36, height: 22, borderRadius: 5, border: `2px solid ${RED}`, background: `${RED}14`, opacity: 1 - dropGhost, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: RED }}>
                        dropped
                    </div>
                )}

                {/* the moving order pill */}
                <div
                    key={cycle}
                    style={{
                        position: "absolute",
                        left: pillTarget.x,
                        top: pillTarget.y,
                        transform: "translate(-50%, -50%)",
                        transition: `left 0.6s ${EASE}, top 0.6s ${EASE}, opacity 0.35s linear`,
                        opacity: pillOpacity,
                        padding: "4px 8px",
                        borderRadius: 7,
                        border: `2px solid ${pillColor}`,
                        background: atPub ? "#ecfdf5" : "white",
                        fontSize: 9,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: pillColor,
                        whiteSpace: "nowrap",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                >
                    #{n} ·{subject.replace("orders.", "")}
                </div>

                {consumer("A")}
                {consumer("B")}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function InterestRetentionAnimated(_props: { width?: number; height?: number } = {}) {
    return <InterestRetentionAnimatedInner />;
}
