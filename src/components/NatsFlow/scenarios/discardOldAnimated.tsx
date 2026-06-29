import React, { useEffect, useState } from "react";

// discardOldAnimated
// Discard Old policy on a full stream (MaxMsgs=5). A new order travels to
// ORDERS, is stored, and the oldest is discarded out the far side to make room.
// The publish always succeeds — the contents roll forward.

const TICK_MS = 80;
const STEP_MS = 1700;
const ACCEPT_AT = 0.5;

const W = 520;
const H = 150;
const MID_Y = 64;
const SX = 96; // travel start (publisher right edge)
const STREAM_X = 250;
const STREAM_W = 196;
const CELL_W = 30;
const CELL_GAP = 6;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const RED = "#ef4444";

function DiscardOldAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const n = Math.floor(elapsed / STEP_MS) + 5; // newest order id (start past 5)
    const p = (elapsed % STEP_MS) / STEP_MS;
    const accepted = p >= ACCEPT_AT;

    // newest on the left (nearest the publisher), oldest on the right
    const cells = [];
    for (let i = 0; i < 5; i++) cells.push((accepted ? n : n - 1) - i);
    const evictedId = n - 5;

    const travelX = SX + (STREAM_X - 28 - SX) * Math.min(1, p / ACCEPT_AT);

    const status = accepted
        ? `Stored order #${n}. Oldest (#${evictedId}) discarded — publish succeeded.`
        : `Order #${n} on its way to a full stream...`;

    const cellLeft = (i: number) => STREAM_X + 10 + i * (CELL_W + CELL_GAP);

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Discard Old.</strong> The stream is full. A new order is stored
                and the <strong>oldest is discarded</strong>; the publish always succeeds.
            </div>

            <div style={{ position: "relative", width: W, height: H, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                {/* publisher */}
                <div style={{ position: "absolute", left: 10, top: MID_Y - 22, width: 80, height: 44, borderRadius: 8, border: `2px solid ${WORKER_NAVY}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: WORKER_NAVY }}>
                    publisher
                </div>
                {/* ack pill */}
                <div style={{ position: "absolute", left: 10, top: MID_Y + 30, width: 80, textAlign: "center", fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: CONSUMER_GREEN, opacity: accepted ? 1 : 0 }}>
                    stored ✓
                </div>

                {/* traveling new order */}
                {!accepted && (
                    <div style={{ position: "absolute", left: travelX, top: MID_Y - 15, width: 28, height: 30, borderRadius: 6, border: `2px solid ${CONSUMER_GREEN}`, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: CONSUMER_GREEN }}>
                        #{n}
                    </div>
                )}

                {/* stream box */}
                <div style={{ position: "absolute", left: STREAM_X, top: MID_Y - 34, width: STREAM_W, height: 68, borderRadius: 8, border: `2px solid ${STREAM_BLUE}`, background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: STREAM_BLUE }}>5/5 full</span>
                    </div>
                </div>
                {/* stream cells */}
                {cells.map((id, i) => {
                    const isNewest = id === n;
                    const color = isNewest ? CONSUMER_GREEN : STREAM_BLUE;
                    return (
                        <div key={id} style={{ position: "absolute", left: cellLeft(i), top: MID_Y - 8, width: CELL_W, height: 28, borderRadius: 5, border: `2px solid ${color}`, background: isNewest ? "#ecfdf5" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "monospace", fontWeight: 700, color, transition: "left 0.2s linear" }}>
                            {id}
                        </div>
                    );
                })}

                {/* discarded ghost flying off the right */}
                {accepted && (
                    <div style={{ position: "absolute", left: STREAM_X + STREAM_W - 6 + ((p - ACCEPT_AT) / (1 - ACCEPT_AT)) * 38, top: MID_Y - 8, width: CELL_W, height: 28, borderRadius: 5, border: `2px solid ${RED}`, background: `${RED}14`, opacity: Math.max(0, 1 - (p - ACCEPT_AT) / (1 - ACCEPT_AT)), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: RED }}>
                        #{evictedId}
                    </div>
                )}
                <div style={{ position: "absolute", left: STREAM_X + STREAM_W - 2, top: MID_Y + 24, fontSize: 9, color: RED, fontWeight: 600 }}>discarded</div>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function DiscardOldAnimated(_props: { width?: number; height?: number } = {}) {
    return <DiscardOldAnimatedInner />;
}
