import React, { useEffect, useState } from "react";

// limitsRetentionAnimated
// Limits retention. The ORDERS stream holds every message. A consumer (billing)
// reads and acks each one in turn — and each one STAYS. Acking never removes a
// message under Limits; only a limit (MaxAge / MaxBytes / MaxMsgs) does. A read
// cursor glides across the stored messages while all of them remain in place.

const TICK_MS = 80;
const STEP_MS = 1500;
const N = 5;
const EASE = "cubic-bezier(0.4,0,0.2,1)";

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";

const W = 560;
const H = 196;
const STREAM_L = 66;
const STREAM_T = 72;
const STREAM_W = 312;
const STREAM_H = 104;
const CELL_W = 42;
const CELL_GAP = 12;

function LimitsRetentionAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const step = Math.floor(elapsed / STEP_MS);
    const cp = (elapsed % STEP_MS) / STEP_MS;
    const round = Math.floor(step / (N + 1));
    const roundStep = step % (N + 1); // 0..N-1 sweep, N = pause on a full pass
    const sweeping = roundStep < N;
    const cursorIdx = sweeping ? roundStep : N - 1;

    const acked = (i: number) => roundStep > i || (sweeping && roundStep === i && cp > 0.55);
    const reading = (i: number) => sweeping && roundStep === i && cp > 0.2 && cp < 0.9;

    const innerStart = STREAM_L + (STREAM_W - (N * CELL_W + (N - 1) * CELL_GAP)) / 2;
    const cellLeft = (i: number) => innerStart + i * (CELL_W + CELL_GAP);
    const slotCenter = (i: number) => cellLeft(i) + CELL_W / 2;
    const cellTop = STREAM_T + 30;

    const status = sweeping
        ? `billing read #${cursorIdx + 1} and acked — still stored. ${N}/${N} kept.`
        : `All ${N} acked, still ${N}/${N} kept — only a limit removes them.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 14, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Limits.</strong> A consumer reads and acks every order, and each one
                <strong> stays in the stream</strong>. Only a limit removes a message here, never an ack.
            </div>

            <div style={{ position: "relative", width: W, height: H, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa" }}>
                {/* read cursor (billing) gliding across the stored messages */}
                <div
                    key={`cur-${round}`}
                    style={{
                        position: "absolute",
                        left: slotCenter(cursorIdx),
                        top: 22,
                        transform: "translateX(-50%)",
                        transition: `left 0.55s ${EASE}, opacity 0.3s linear`,
                        opacity: sweeping ? 1 : 0.35,
                        padding: "4px 11px",
                        borderRadius: 8,
                        background: "#ecfdf5",
                        border: `2px solid ${CONSUMER_GREEN}`,
                        color: CONSUMER_GREEN,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                    }}
                >
                    billing reads #{cursorIdx + 1}
                </div>
                {/* tick from cursor down to the cell */}
                <div
                    key={`tick-${round}`}
                    style={{
                        position: "absolute",
                        left: slotCenter(cursorIdx) - 1,
                        top: 44,
                        width: 2,
                        height: cellTop - 44,
                        background: CONSUMER_GREEN,
                        opacity: sweeping ? 0.6 : 0,
                        transition: `left 0.55s ${EASE}, opacity 0.3s linear`,
                    }}
                />

                {/* stream box */}
                <div style={{ position: "absolute", left: STREAM_L, top: STREAM_T, width: STREAM_W, height: STREAM_H, borderRadius: 10, border: `2px solid ${STREAM_BLUE}`, background: "white", boxShadow: `0 1px 3px ${STREAM_BLUE}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px 0", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: STREAM_BLUE }}>Limits · {N}/{N} kept</span>
                    </div>
                    <div style={{ position: "absolute", left: 12, bottom: 8, fontSize: 10, color: "#9ca3af" }}>
                        removed by a limit, not an ack
                    </div>
                </div>

                {/* stored cells — always present */}
                {Array.from({ length: N }).map((_, i) => {
                    const isReading = reading(i);
                    const isAcked = acked(i);
                    return (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                left: cellLeft(i),
                                top: cellTop,
                                width: CELL_W,
                                height: 42,
                                borderRadius: 7,
                                border: `2px solid ${isReading ? CONSUMER_GREEN : STREAM_BLUE}`,
                                background: isReading ? "#ecfdf5" : "white",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
                                boxShadow: isReading ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                            }}
                        >
                            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: isReading ? CONSUMER_GREEN : STREAM_BLUE }}>#{i + 1}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: CONSUMER_GREEN, opacity: isAcked ? 1 : 0, transition: "opacity 0.3s linear" }}>✓ ack</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function LimitsRetentionAnimated(_props: { width?: number; height?: number } = {}) {
    return <LimitsRetentionAnimatedInner />;
}
