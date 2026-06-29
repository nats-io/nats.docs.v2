import React, { useEffect, useState } from "react";

// priorityPrioritizedAnimated
// Prioritized policy. Three regions pull at priority 0, 1, 2. The server serves
// the lowest priority that is currently pulling, with no threshold and no delay.
// The "open pulls" row shows which priorities are asking right now; the served
// one is always the lowest of them. us-east (0) gets everything while it pulls;
// the moment it goes quiet the work falls to us-west (1), then to eu-west (2);
// when us-east returns the work snaps straight back to priority 0.

const TICK_MS = 80;
const P0_END = 2800;
const P0GONE_END = 5600;
const P1GONE_END = 8000;
const BACK_END = 10000;
const CYCLE_MS = 11200;

// Message-flow dots traveling along the active line to the served region.
const DOT_PERIOD = 850;
const N_DOTS = 3;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";

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

    // Which regions are currently pulling (quiet = not asking).
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
            ? "All three are pulling, so the lowest priority — us-east (0) — gets the work."
            : stage === "p0gone"
            ? "us-east stopped pulling. The lowest open pull is now us-west (1), so work falls to it."
            : stage === "p1gone"
            ? "us-east and us-west are both quiet — the only open pull left is eu-west (2)."
            : "us-east is pulling again, so it's the lowest open pull once more — work snaps back to 0.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Prioritized.</strong> Each region pulls at a{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>priority</span> (0–9).
                The server serves the <em>lowest number that is currently
                pulling</em>, so work shifts the instant a nearer region goes
                quiet or comes back.
            </div>

            {/* open pulls: which priorities are asking right now, served one in green */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12 }}>
                <span style={{ color: "#6b7280" }}>open pulls:</span>
                {workers.map((w, i) => {
                    const isPulling = pulling[i];
                    const isServed = i === served;
                    return (
                        <span
                            key={i}
                            style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                padding: "2px 10px",
                                borderRadius: 6,
                                border: `1.5px solid ${isServed ? CONSUMER_GREEN : isPulling ? STREAM_BLUE : "#e5e7eb"}`,
                                background: isServed ? CONSUMER_GREEN : isPulling ? "white" : "#f3f4f6",
                                color: isServed ? "white" : isPulling ? STREAM_BLUE : "#c2c8d0",
                                transition: "all 0.3s",
                            }}
                        >
                            p{w.pri}
                            {isServed ? " ← served" : !isPulling ? " quiet" : ""}
                        </span>
                    );
                })}
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

                {/* fan: pulling workers have a line; the served one is green with
                    flowing message dots; quiet workers drop their connection */}
                <svg width={FAN_W} height={COL_H} style={{ flex: "none", overflow: "visible" }}>
                    {workers.map((_, i) => {
                        if (!pulling[i]) return null;
                        const active = i === served;
                        return (
                            <line
                                key={i}
                                x1={0}
                                y1={COL_H / 2}
                                x2={FAN_W}
                                y2={workerCenterY(i)}
                                stroke={active ? CONSUMER_GREEN : "#9fb4cf"}
                                strokeWidth={active ? 2.5 : 1.5}
                                strokeDasharray={active ? undefined : "5 5"}
                                style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                            />
                        );
                    })}
                    {Array.from({ length: N_DOTS }, (_, d) => {
                        const f = (((elapsed % DOT_PERIOD) / DOT_PERIOD) + d / N_DOTS) % 1;
                        const y1 = workerCenterY(served);
                        return (
                            <circle
                                key={`dot-${d}`}
                                cx={f * FAN_W}
                                cy={COL_H / 2 + f * (y1 - COL_H / 2)}
                                r={4}
                                fill={CONSUMER_GREEN}
                            />
                        );
                    })}
                </svg>

                {/* workers */}
                <div style={{ display: "flex", flexDirection: "column", gap: WBOX_GAP }}>
                    {workers.map((w, i) => {
                        const isServed = i === served;
                        const isQuiet = !pulling[i];
                        const border = isServed ? CONSUMER_GREEN : isQuiet ? "#e5e7eb" : "#aebfd6";
                        const sub = isServed ? "serving" : isQuiet ? "quiet · not pulling" : "pulling · parked";
                        const subColor = isServed ? CONSUMER_GREEN : isQuiet ? "#c2c8d0" : STREAM_BLUE;
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 166,
                                    height: WBOX_H,
                                    boxSizing: "border-box",
                                    borderRadius: 8,
                                    border: `2px solid ${border}`,
                                    borderStyle: isQuiet ? "dashed" : "solid",
                                    background: isServed ? "#ecfdf5" : "white",
                                    boxShadow: isServed ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                                    padding: "6px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    opacity: isQuiet ? 0.65 : 1,
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
                                        color: isServed ? CONSUMER_GREEN : isQuiet ? "#c2c8d0" : STREAM_BLUE,
                                        border: `1px solid ${isServed ? CONSUMER_GREEN : isQuiet ? "#e5e7eb" : "#aebfd6"}`,
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
