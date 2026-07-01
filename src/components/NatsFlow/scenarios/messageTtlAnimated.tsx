import React, { useEffect, useState } from "react";

// messageTtlAnimated
// Three stored messages with different lifespans, on one timeline. A "now"
// marker sweeps left to right. orders.cancelled carries a 1h per-message TTL
// and expires first, well before the stream's 7-day MaxAge. orders.created has
// no TTL, so it lives until MaxAge. orders.schema carries Nats-TTL: never and
// outlives even MaxAge. The earlier deadline always wins — except never, which
// has no deadline at all.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const NAVY = "#375C93";
const AMBER = "#d97706";
const GREY = "#9ca3af";

const SWEEP_MS = 5200;
const HOLD_MS = 1900;
const CYCLE = SWEEP_MS + HOLD_MS;
const NOW_MAX = 0.92; // how far the "now" marker sweeps across the timeline

const MAXAGE = 0.68; // MaxAge position on the timeline

// Each message: its deadline as a fraction of the timeline. "never" sits beyond
// the sweep, so it is never reached.
const MSGS = [
    { subj: "orders.cancelled", tag: "TTL 1h", deadline: 0.28, color: AMBER, reason: "TTL" },
    { subj: "orders.created", tag: "MaxAge", deadline: MAXAGE, color: BLUE, reason: "MaxAge" },
    { subj: "orders.schema", tag: "never", deadline: 2, color: GREEN, reason: "" },
];

// Geometry within a 640-wide stage.
const LBL_X = 4;
const LBL_W = 152;
const X0 = 168;
const X1 = 604;
const W = X1 - X0;
const ROW_Y = [30, 88, 146];
const ROW_H = 42;
const BAR_H = 16;

function fx(frac: number) {
    return X0 + Math.min(frac, 1) * W;
}

function MessageTtlInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE;
    const nowFrac = Math.min(NOW_MAX, (t / SWEEP_MS) * NOW_MAX);
    const nowX = X0 + nowFrac * W;
    const maxX = X0 + MAXAGE * W;

    const cancelledGone = nowFrac >= MSGS[0].deadline;
    const createdGone = nowFrac >= MSGS[1].deadline;

    const status = !cancelledGone
        ? "orders.cancelled carries a 1-hour TTL; the others live to MaxAge."
        : !createdGone
          ? "orders.cancelled expired at its 1h TTL — long before the 7-day MaxAge."
          : "MaxAge reached: orders.created expired. orders.schema (never) outlives it.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                A <strong>per-message TTL</strong> expires one message on its own deadline — the earlier of the TTL and the
                stream's MaxAge wins, and <strong>never</strong> outlives both.
            </div>

            <div style={{ position: "relative", width: 640, height: 200, margin: "0 auto" }}>
                {/* MaxAge reference line across all rows */}
                <div
                    style={{
                        position: "absolute",
                        left: maxX,
                        top: 22,
                        width: 0,
                        height: 168,
                        borderLeft: `2px dashed ${GREY}`,
                    }}
                />
                <span
                    style={{
                        position: "absolute",
                        left: maxX - 30,
                        top: 6,
                        width: 60,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: GREY,
                    }}
                >
                    MaxAge 7d
                </span>

                {/* message rows */}
                {MSGS.map((m, i) => {
                    const y = ROW_Y[i];
                    const midY = y + ROW_H / 2;
                    const isNever = m.reason === "";
                    const endX = isNever ? X1 : fx(m.deadline);
                    const expired = !isNever && nowFrac >= m.deadline;
                    const barColor = expired ? "#e5e7eb" : m.color;
                    const textCol = expired ? GREY : m.color;
                    return (
                        <div key={i}>
                            {/* label */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: LBL_X,
                                    top: y,
                                    width: LBL_W,
                                    height: ROW_H,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: expired ? GREY : NAVY }}>
                                    {m.subj}
                                </span>
                                <span
                                    style={{
                                        alignSelf: "flex-start",
                                        marginTop: 2,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: textCol,
                                        border: `1px solid ${textCol}`,
                                        borderRadius: 3,
                                        padding: "0 4px",
                                        background: `${m.color}12`,
                                    }}
                                >
                                    {m.tag}
                                </span>
                            </div>

                            {/* track */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: X0,
                                    top: midY - 1,
                                    width: W,
                                    height: 2,
                                    background: "#f3f4f6",
                                }}
                            />

                            {/* lifespan bar */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: X0,
                                    top: midY - BAR_H / 2,
                                    width: endX - X0,
                                    height: BAR_H,
                                    borderRadius: 4,
                                    background: `${barColor}${expired ? "" : "22"}`,
                                    border: `1.5px solid ${barColor}`,
                                    boxSizing: "border-box",
                                    transition: "background 0.2s, border-color 0.2s",
                                }}
                            />

                            {/* never: arrow continuing past the timeline */}
                            {isNever && (
                                <span style={{ position: "absolute", left: X1 + 2, top: midY - 9, fontSize: 14, fontWeight: 700, color: GREEN }}>
                                    →
                                </span>
                            )}

                            {/* the stored message block at t0 */}
                            <div
                                style={{
                                    position: "absolute",
                                    left: X0 - 9,
                                    top: midY - 9,
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    background: expired ? "#e5e7eb" : m.color,
                                    border: "1.5px solid #fff",
                                    boxShadow: expired ? "none" : `0 1px 5px ${m.color}66`,
                                    transition: "all 0.2s",
                                }}
                            />

                            {/* expiry marker at the deadline */}
                            {expired && (
                                <span
                                    style={{
                                        position: "absolute",
                                        left: endX - 24,
                                        top: midY - 9,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: GREY,
                                        background: "#fff",
                                        padding: "0 3px",
                                    }}
                                >
                                    ✕ {m.reason}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* the sweeping "now" marker */}
                <div style={{ position: "absolute", left: nowX, top: 22, width: 0, height: 168, borderLeft: `2px solid ${NAVY}` }} />
                <span
                    style={{
                        position: "absolute",
                        left: nowX - 16,
                        top: 188,
                        width: 32,
                        textAlign: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: NAVY,
                    }}
                >
                    now
                </span>
            </div>

            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
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

export function MessageTtlAnimated(_props: { width?: number; height?: number } = {}) {
    return <MessageTtlInner />;
}
