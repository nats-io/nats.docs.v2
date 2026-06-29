import React, { useEffect, useState } from "react";

// discardNewAnimated
// Discard New policy on a full stream (MaxMsgs=5). A new order travels to
// ORDERS, hits the full stream, and bounces back rejected. The stored messages
// never change; the publish fails with "maximum messages exceeded".

const TICK_MS = 80;
const STEP_MS = 1900;
const HIT_AT = 0.5;

const W = 520;
const H = 150;
const MID_Y = 64;
const SX = 96; // travel start (publisher right edge)
const STREAM_X = 250;
const STREAM_W = 196;
const CELL_W = 30;
const CELL_GAP = 6;
const HIT_X = STREAM_X - 8;

const STREAM_BLUE = "#27AAE1";
const WORKER_NAVY = "#375C93";
const RED = "#ef4444";

function DiscardNewAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const n = Math.floor(elapsed / STEP_MS) + 6; // attempted order id
    const p = (elapsed % STEP_MS) / STEP_MS;
    const rejected = p >= HIT_AT;

    // stored ids never change under Discard New
    const cells = [1, 2, 3, 4, 5];

    // travel out then bounce back
    const inboundX = SX + (HIT_X - SX) * (p / HIT_AT);
    const outboundX = HIT_X - (HIT_X - SX) * ((p - HIT_AT) / (1 - HIT_AT));
    const msgX = rejected ? outboundX : inboundX;

    const status = rejected
        ? `Order #${n} rejected: maximum messages exceeded. Stored messages untouched.`
        : `Order #${n} on its way to a full stream...`;

    const cellLeft = (i: number) => STREAM_X + 10 + i * (CELL_W + CELL_GAP);

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Discard New.</strong> The stream is full. The new order is
                <strong> rejected</strong> and the publish fails; stored messages are never discarded.
            </div>

            <div style={{ position: "relative", width: W, height: H, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                {/* publisher */}
                <div style={{ position: "absolute", left: 10, top: MID_Y - 22, width: 80, height: 44, borderRadius: 8, border: `2px solid ${rejected ? RED : WORKER_NAVY}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: rejected ? RED : WORKER_NAVY, transition: "border-color 0.2s, color 0.2s" }}>
                    publisher
                </div>
                {/* error pill */}
                <div style={{ position: "absolute", left: 0, top: MID_Y + 30, width: 100, textAlign: "center", fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: RED, opacity: rejected ? 1 : 0, lineHeight: 1.2 }}>
                    publish ✗<br />max msgs
                </div>

                {/* traveling order (green inbound, red bouncing back) */}
                <div style={{ position: "absolute", left: msgX, top: MID_Y - 15, width: 28, height: 30, borderRadius: 6, border: `2px solid ${rejected ? RED : STREAM_BLUE}`, background: rejected ? `${RED}14` : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: rejected ? RED : STREAM_BLUE }}>
                    #{n}
                </div>

                {/* wall flash when rejected */}
                <div style={{ position: "absolute", left: STREAM_X - 4, top: MID_Y - 32, width: 3, height: 64, background: RED, opacity: rejected ? Math.max(0, 1 - (p - HIT_AT) / 0.3) : 0 }} />

                {/* stream box */}
                <div style={{ position: "absolute", left: STREAM_X, top: MID_Y - 34, width: STREAM_W, height: 68, borderRadius: 8, border: `2px solid ${STREAM_BLUE}`, background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: STREAM_BLUE }}>5/5 full</span>
                    </div>
                </div>
                {/* stream cells — frozen */}
                {cells.map((id, i) => (
                    <div key={id} style={{ position: "absolute", left: cellLeft(i), top: MID_Y - 8, width: CELL_W, height: 28, borderRadius: 5, border: `2px solid ${STREAM_BLUE}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: STREAM_BLUE }}>
                        {id}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function DiscardNewAnimated(_props: { width?: number; height?: number } = {}) {
    return <DiscardNewAnimatedInner />;
}
