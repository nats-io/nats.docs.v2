import React, { useEffect, useState } from "react";

// priorityPrioritizedAnimated
// Prioritized policy. Three regions pull at priority 0, 1, 2. The server serves
// the lowest priority that is currently pulling, with no threshold and no delay.
// us-east (0) gets everything while it pulls; the moment it goes quiet the work
// falls to us-west (1), then to eu-west (2); when us-east returns the work snaps
// straight back to priority 0.

const TICK_MS = 80;
const P0_END = 2200;
const P0GONE_END = 4400;
const P1GONE_END = 6200;
const BACK_END = 7400;
const CYCLE_MS = 8400;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const IDLE_GREY = "#9ca3af";

const WBOX_H = 50;
const WBOX_GAP = 16;
const COL_H = 3 * WBOX_H + 2 * WBOX_GAP;
const FAN_W = 86;
const workerCenterY = (w: number) => w * (WBOX_H + WBOX_GAP) + WBOX_H / 2;

function PriorityPrioritizedAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;
    const stage =
        t < P0_END ? "p0" : t < P0GONE_END ? "p0gone" : t < P1GONE_END ? "p1gone" : t < BACK_END ? "back" : "pause";

    // Which regions are currently pulling (quiet = not pulling).
    const pulling = [
        stage === "p0" || stage === "back" || stage === "pause", // us-east (pri 0)
        stage !== "p1gone", // us-west (pri 1) — quiet only while p1gone
        true, // eu-west (pri 2) — always pulling
    ];
    // Served = lowest-priority index that is pulling.
    const served = pulling.findIndex(Boolean);

    const workers = [
        { label: "us-east", pri: 0 },
        { label: "us-west", pri: 1 },
        { label: "eu-west", pri: 2 },
    ];

    const status =
        stage === "p0"
            ? "us-east (priority 0) is pulling, so all work goes to it."
            : stage === "p0gone"
            ? "us-east went quiet — work falls to us-west (priority 1) with no delay."
            : stage === "p1gone"
            ? "us-west is quiet too — eu-west (priority 2) picks up."
            : "us-east is back — work snaps straight back to priority 0.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Prioritized.</strong> Each region pulls at a{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>priority</span> (0–9).
                The server always serves the lowest number that's pulling, with
                no delay — work falls to the next region the instant the nearer
                one goes quiet.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "18px 16px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa", width: "fit-content" }}>
                {/* dispatch consumer */}
                <div style={{ width: 128 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
                        dispatch
                    </div>
                    <div style={{ height: 50, borderRadius: 8, border: `2px solid ${STREAM_BLUE}`, background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>serving</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: CONSUMER_GREEN }}>
                            priority {workers[served].pri}
                        </div>
                    </div>
                </div>

                {/* fan: active line goes to the served region */}
                <svg width={FAN_W} height={COL_H} style={{ flex: "none", overflow: "visible" }}>
                    {workers.map((_, i) => {
                        const active = i === served;
                        return (
                            <line
                                key={i}
                                x1={0}
                                y1={COL_H / 2}
                                x2={FAN_W}
                                y2={workerCenterY(i)}
                                stroke={active ? CONSUMER_GREEN : "#e0e3e8"}
                                strokeWidth={active ? 2.5 : 1.5}
                                strokeDasharray={active ? undefined : "4 4"}
                                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                            />
                        );
                    })}
                </svg>

                {/* workers */}
                <div style={{ display: "flex", flexDirection: "column", gap: WBOX_GAP }}>
                    {workers.map((w, i) => {
                        const isServed = i === served;
                        const isQuiet = !pulling[i];
                        const border = isServed ? CONSUMER_GREEN : isQuiet ? "#e5e7eb" : "#d7dbe0";
                        const sub = isServed ? "serving" : isQuiet ? "quiet (not pulling)" : "pulling · waiting";
                        const subColor = isServed ? CONSUMER_GREEN : isQuiet ? "#c2c8d0" : IDLE_GREY;
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 162,
                                    height: WBOX_H,
                                    boxSizing: "border-box",
                                    borderRadius: 8,
                                    border: `2px solid ${border}`,
                                    background: isServed ? "#ecfdf5" : "white",
                                    boxShadow: isServed ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                                    padding: "6px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    opacity: isQuiet ? 0.7 : 1,
                                    transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s, opacity 0.3s",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: isServed ? CONSUMER_GREEN : WORKER_NAVY }}>{w.label}</div>
                                    <div style={{ fontSize: 10, fontFamily: "monospace", color: subColor, marginTop: 1 }}>{sub}</div>
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontFamily: "monospace",
                                        fontWeight: 700,
                                        color: isServed ? CONSUMER_GREEN : "#9ca3af",
                                        border: `1px solid ${isServed ? CONSUMER_GREEN : "#d7dbe0"}`,
                                        borderRadius: 5,
                                        padding: "1px 6px",
                                    }}
                                >
                                    p{w.pri}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function PriorityPrioritizedAnimated(_props: { width?: number; height?: number } = {}) {
    return <PriorityPrioritizedAnimatedInner />;
}
