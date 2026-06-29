import React, { useEffect, useState } from "react";

// priorityOverflowAnimated
// Overflow policy. A near worker (us-east) pulls with no threshold and always
// drains the ORDERS backlog; a far worker (us-west) pulls with min_pending and
// is served only while the backlog sits above that threshold. A burst pushes
// the backlog over the line, us-west takes the overflow, and once the backlog
// falls back under, us-west goes idle again.

const TICK_MS = 80;
const CYCLE_MS = 8200;
const THRESHOLD = 1000;
const MAXBL = 2000;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const AMBER = "#f59e0b";
const IDLE_GREY = "#9ca3af";

const WBOX_H = 54;
const WBOX_GAP = 24;
const COL_H = 2 * WBOX_H + WBOX_GAP;
const FAN_W = 86;
const workerCenterY = (w: number) => w * (WBOX_H + WBOX_GAP) + WBOX_H / 2;

function backlogAt(t: number) {
    if (t < 2400) return 300;
    if (t < 3400) return 300 + (1800 - 300) * ((t - 2400) / 1000);
    if (t < 6000) return 1800 - (1800 - 220) * ((t - 3400) / 2600);
    return 220;
}

function PriorityOverflowAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;
    const backlog = Math.round(backlogAt(t));
    const over = backlog >= THRESHOLD;

    const workers = [
        { label: "us-east", sub: "no threshold", active: true },
        { label: "us-west", sub: `min_pending ${THRESHOLD}`, active: over },
    ];

    const status = over
        ? "Backlog over min_pending — us-west takes the overflow."
        : "Backlog under the threshold — us-east drains it alone; us-west waits.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Overflow.</strong> us-east pulls with no threshold and
                always drains <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>ORDERS</span>;
                us-west pulls with <span style={{ color: AMBER, fontWeight: 600 }}>min_pending</span> and
                is served only while the backlog is above it.
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "18px 16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                {/* ORDERS box with backlog count */}
                <div style={{ width: 120 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
                        ORDERS
                    </div>
                    <div
                        style={{
                            height: 54,
                            borderRadius: 8,
                            border: `2px solid ${over ? AMBER : STREAM_BLUE}`,
                            background: "white",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "border-color 0.3s",
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: over ? AMBER : STREAM_BLUE }}>
                            {backlog.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>pending</div>
                    </div>
                </div>

                {/* fan to the two workers */}
                <svg width={FAN_W} height={COL_H} style={{ flex: "none", overflow: "visible" }}>
                    {workers.map((w, i) => (
                        <line
                            key={i}
                            x1={0}
                            y1={COL_H / 2}
                            x2={FAN_W}
                            y2={workerCenterY(i)}
                            stroke={w.active ? CONSUMER_GREEN : "#e0e3e8"}
                            strokeWidth={w.active ? 2.5 : 1.5}
                            strokeDasharray={w.active ? undefined : "4 4"}
                            style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                        />
                    ))}
                </svg>

                {/* workers */}
                <div style={{ display: "flex", flexDirection: "column", gap: WBOX_GAP }}>
                    {workers.map((w, i) => (
                        <div
                            key={i}
                            style={{
                                width: 150,
                                height: WBOX_H,
                                boxSizing: "border-box",
                                borderRadius: 8,
                                border: `2px solid ${w.active ? CONSUMER_GREEN : "#d7dbe0"}`,
                                background: w.active ? "#ecfdf5" : "white",
                                boxShadow: w.active ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                                padding: "6px 10px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 700, color: w.active ? CONSUMER_GREEN : WORKER_NAVY }}>
                                {w.label}
                            </div>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: w.active ? CONSUMER_GREEN : IDLE_GREY, marginTop: 1 }}>
                                {w.sub} · {w.active ? "pulling" : "waiting"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* backlog bar with threshold marker */}
            <div style={{ marginTop: 12, width: 360, position: "relative" }}>
                <div style={{ height: 10, borderRadius: 5, background: "#eef0f3", overflow: "hidden" }}>
                    <div
                        style={{
                            width: `${Math.min(100, (backlog / MAXBL) * 100)}%`,
                            height: "100%",
                            background: over ? AMBER : STREAM_BLUE,
                            transition: "width 0.2s linear, background 0.3s",
                        }}
                    />
                </div>
                {/* threshold tick */}
                <div style={{ position: "absolute", left: `${(THRESHOLD / MAXBL) * 100}%`, top: -3, bottom: -3, width: 2, background: "#9ca3af" }} />
                <div style={{ position: "absolute", left: `${(THRESHOLD / MAXBL) * 100}%`, top: 14, transform: "translateX(-50%)", fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>
                    min_pending
                </div>
            </div>

            <div style={{ marginTop: 24, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function PriorityOverflowAnimated(_props: { width?: number; height?: number } = {}) {
    return <PriorityOverflowAnimatedInner />;
}
