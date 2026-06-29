import React, { useEffect, useState } from "react";

// maxMsgsAnimated
// MaxMsgs limit (count). ORDERS is capped at 5 messages. The publisher pushes
// orders in from the left; it fills 1..5, then every publish past the cap
// discards the oldest out the right to make room — the count, not the clock,
// triggers the discard. Restart replays the fill from empty.

const TICK_MS = 80;
const STEP_MS = 920; // one publish per step
const MAX_MSGS = 5;
const SLOT_W = 46;
const SLOT_GAP = 8;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const RED = "#ef4444";

function MaxMsgsAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const n = Math.floor(elapsed / STEP_MS); // publishes so far (id of newest)
    const p = (elapsed % STEP_MS) / STEP_MS; // progress within the step
    const size = Math.min(MAX_MSGS, n + 1);

    const rolling = n >= MAX_MSGS;
    const evictedId = rolling ? n - MAX_MSGS : null;

    const status = rolling
        ? "Stream full at MaxMsgs=5. Each new order discards the oldest to fit."
        : `Filling: ${size} of 5. The cap hasn't been reached yet.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>MaxMsgs.</strong>{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>ORDERS</span> holds at
                most <strong>5</strong> messages. The 6th publish discards the oldest.
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                {/* publish pill on the left */}
                <div
                    style={{
                        flex: "none",
                        padding: "5px 9px",
                        borderRadius: 6,
                        background: CONSUMER_GREEN,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        opacity: 0.55 + 0.45 * (1 - p),
                    }}
                >
                    publish ✓
                </div>

                {/* the stream: 5 fixed slots, newest on the left */}
                <div>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: rolling ? RED : STREAM_BLUE }}>{size}/5</span>
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {Array.from({ length: MAX_MSGS }).map((_, slot) => {
                            const filled = slot < size;
                            const id = filled ? n - slot : undefined;
                            const isNewest = slot === 0 && filled;
                            const color = isNewest ? CONSUMER_GREEN : STREAM_BLUE;
                            return (
                                <div
                                    key={slot}
                                    style={{
                                        width: SLOT_W,
                                        height: 34,
                                        borderRadius: 6,
                                        border: filled ? `2px solid ${color}` : "2px dashed #d7dbe0",
                                        background: filled ? (isNewest ? "#ecfdf5" : "white") : "#f3f4f6",
                                        opacity: isNewest ? 0.5 + 0.5 * p : 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "border-color 0.2s, background 0.2s",
                                    }}
                                >
                                    {filled && (
                                        <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color }}>
                                            #{id! + 1}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* discard ghost flies off the right */}
                <div style={{ width: 56, height: 40, position: "relative", flex: "none" }}>
                    {evictedId !== null && (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 3,
                                width: SLOT_W,
                                height: 34,
                                borderRadius: 6,
                                border: `2px solid ${RED}`,
                                background: `${RED}14`,
                                opacity: Math.max(0, 1 - p),
                                transform: `translateX(${18 * p}px)`,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <div style={{ fontSize: 9, color: RED, fontWeight: 700 }}>discard</div>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: RED }}>#{evictedId + 1}</div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                    onClick={() => setElapsed(0)}
                    style={{
                        flex: "none",
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: `1px solid ${STREAM_BLUE}`,
                        background: "white",
                        color: STREAM_BLUE,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "system-ui, sans-serif",
                        cursor: "pointer",
                    }}
                >
                    ↺ Restart
                </button>
                <span style={{ fontSize: 13, color: "#374151" }}>{status}</span>
            </div>
        </div>
    );
}

export function MaxMsgsAnimated(_props: { width?: number; height?: number } = {}) {
    return <MaxMsgsAnimatedInner />;
}
