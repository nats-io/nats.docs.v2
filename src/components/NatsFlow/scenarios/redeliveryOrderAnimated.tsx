import React, { useEffect, useState } from "react";

// redeliveryOrderAnimated
// Shows that redelivery is in delivery order, not stream order. A consumer
// delivers messages 1..5; the client acks 1, 2, 4, 5 but skips 3. Each
// message arrives, the client takes a beat to process, then an ack drops in
// below it — a green check when it acks, a red cross when it doesn't. While #3
// sits unacked, an Ack Wait timer fills; when it completes the server
// redelivers #3, so it returns AFTER 4 and 5 — out of stream order.

const TICK_MS = 70;

interface Ev {
    seq: number;
    kind: "acked" | "skip" | "redeliver";
}

const EVENTS: Ev[] = [
    { seq: 1, kind: "acked" },
    { seq: 2, kind: "acked" },
    { seq: 3, kind: "skip" },
    { seq: 4, kind: "acked" },
    { seq: 5, kind: "acked" },
    { seq: 3, kind: "redeliver" },
    { seq: 6, kind: "acked" },
];

// When each message is delivered (ms). The last one fires when the Ack Wait
// timer on #3 completes.
const DELIVER = [0, 1000, 2000, 3000, 4000, 5800, 6800];
const ACK_DELAY = 520; // client processes a beat, then acks (or doesn't)
const AW_START = DELIVER[2]; // #3 delivered
const AW_END = DELIVER[5]; // redelivery fires
const CYCLE = 9000;

const GREEN = "#34A574";
const RED = "#dc2626";
const AMBER = "#f59e0b";
const GREY = "#9ca3af";

function MsgBox({ ev, pulse }: { ev: Ev; pulse: number }) {
    const isSkip = ev.kind === "skip";
    const border = isSkip ? RED : ev.kind === "redeliver" ? GREEN : "#d1d5db";
    return (
        <div
            style={{
                width: 76,
                borderRadius: 8,
                border: `1.5px ${ev.kind === "redeliver" ? "dashed" : "solid"} ${border}`,
                background: isSkip ? "#fef2f2" : "white",
                padding: "7px 4px",
                textAlign: "center",
                boxShadow: pulse > 0 ? `0 0 0 ${3 * pulse}px ${RED}33` : "none",
            }}
        >
            <div style={{ fontSize: 9.5, color: "#6b7280", fontFamily: "monospace" }}>
                stream
            </div>
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: "#111827",
                    lineHeight: 1.1,
                }}
            >
                #{ev.seq}
            </div>
        </div>
    );
}

function AckChip({ ev }: { ev: Ev }) {
    const acked = ev.kind === "acked" || ev.kind === "redeliver";
    return (
        <div
            style={{
                width: 76,
                borderRadius: 7,
                padding: "4px 2px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                background: acked ? GREEN : "white",
                color: acked ? "white" : RED,
                border: acked ? `1.5px solid ${GREEN}` : `1.5px dashed ${RED}`,
            }}
        >
            {acked ? "ack ✓" : "no ack ✗"}
        </div>
    );
}

function Processing() {
    return (
        <div
            style={{
                width: 76,
                borderRadius: 7,
                padding: "4px 2px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "#cbd5e1",
                border: "1.5px dashed #e5e7eb",
            }}
        >
            …
        </div>
    );
}

// Circular Ack Wait timer that fills clockwise as progress goes 0 -> 1.
function AckWaitTimer({ progress }: { progress: number }) {
    const r = 13;
    const c = 2 * Math.PI * r;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 4 }}>
            <svg width={34} height={34} viewBox="0 0 34 34">
                <circle cx={17} cy={17} r={r} fill="none" stroke="#fde68a" strokeWidth={4} />
                <circle
                    cx={17}
                    cy={17}
                    r={r}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - progress)}
                    transform="rotate(-90 17 17)"
                />
            </svg>
            <div style={{ fontSize: 8.5, color: AMBER, fontWeight: 700, marginTop: 1 }}>
                Ack Wait
            </div>
        </div>
    );
}

function RedeliveryOrderAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);
    const t = elapsed % CYCLE;
    const cycleIndex = Math.floor(elapsed / CYCLE);

    const shown = DELIVER.filter((d) => d <= t).length;
    const pending = shown >= 3 && shown < 6; // #3 delivered, not yet redelivered
    const pulse = pending ? 0.5 + 0.5 * Math.sin(elapsed / 160) : 0;
    const awProgress = Math.max(0, Math.min(1, (t - AW_START) / (AW_END - AW_START)));

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", width: "fit-content" }}>
            <div
                style={{
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#6b7280",
                    fontStyle: "italic",
                }}
            >
                A message arrives, the client processes it for a moment, then
                sends an ack back — except for <strong>#3</strong>. Its Ack Wait
                timer fills, and when it completes the server redelivers #3, so
                it returns <strong>after</strong> #4 and #5 — out of stream
                order.
            </div>

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    padding: "14px 16px",
                }}
            >
                <div
                    style={{
                        fontSize: 9,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 600,
                        marginBottom: 8,
                    }}
                >
                    Delivered, in the order received →
                </div>

                <div
                    key={cycleIndex}
                    style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        // Reserve space for the tallest column state (message +
                        // ack chip + Ack Wait timer) so the timer appearing and
                        // disappearing doesn't reflow the page below.
                        minHeight: 160,
                    }}
                >
                    {EVENTS.slice(0, shown).map((ev, i) => {
                        const ackShown = t >= DELIVER[i] + ACK_DELAY;
                        const isSkip = ev.kind === "skip";
                        return (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <MsgBox ev={ev} pulse={isSkip && pending && ackShown ? pulse : 0} />
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: ackShown ? "#9ca3af" : "#e5e7eb",
                                        lineHeight: 1,
                                    }}
                                >
                                    ↓
                                </div>
                                {ackShown ? <AckChip ev={ev} /> : <Processing />}
                                {isSkip && ackShown && pending && (
                                    <AckWaitTimer progress={awProgress} />
                                )}
                                {ev.kind === "redeliver" && ackShown && (
                                    <div
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: RED,
                                            marginTop: 2,
                                        }}
                                    >
                                        out of order
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        color: pending ? RED : GREY,
                        fontFamily: "monospace",
                        minHeight: 16,
                    }}
                >
                    {pending
                        ? "⧖ #3 still unacked — Ack Wait running while #4, #5 go by"
                        : shown >= 6
                        ? "✓ all acked — but #3 only came back after #5"
                        : " "}
                </div>
            </div>
        </div>
    );
}

// width / height accepted for API parity with the loader; the diagram
// self-sizes from its content.
export function RedeliveryOrderAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <RedeliveryOrderAnimatedInner />;
}
