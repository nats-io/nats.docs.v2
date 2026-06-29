import React, { useEffect, useState } from "react";

// priorityPinnedAnimated
// Pinned_client policy. The server pins one worker and sends it every message
// while the others stand by. The pinned worker goes quiet; once PinnedTTL
// elapses the server pins a standby instead, stamps its messages with a new
// Nats-Pin-Id, and the old worker's next pull (carrying the stale id) comes
// back 423 — it clears the id and rejoins the standby pool.

const TICK_MS = 80;
const PIN1_END = 4600;
const QUIET_END = 6700;
const REPIN_END = 8000;
const PIN2_END = 12600;
const CYCLE_MS = 13800;

// Message-flow dots that travel along the active line to the pinned worker.
const DOT_PERIOD = 850;
const N_DOTS = 3;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const CRASH_RED = "#ef4444";
const AMBER = "#f59e0b";
const IDLE_GREY = "#9ca3af";

const PIN1 = "a1c3";
const PIN2 = "b7f2";

const WBOX_H = 50;
const WBOX_GAP = 16;
const COL_H = 3 * WBOX_H + 2 * WBOX_GAP;
const FAN_W = 86;
const workerCenterY = (w: number) => w * (WBOX_H + WBOX_GAP) + WBOX_H / 2;

function PriorityPinnedAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;
    const stage =
        t < PIN1_END ? "pin1" : t < QUIET_END ? "quiet" : t < REPIN_END ? "repin" : t < PIN2_END ? "pin2" : "pause";

    const pinId = stage === "pin1" || stage === "quiet" ? PIN1 : PIN2;
    const receiving = stage === "pin1" ? 0 : stage === "pin2" || stage === "pause" ? 1 : -1;
    const ttlFrac = stage === "quiet" ? (t - PIN1_END) / (QUIET_END - PIN1_END) : stage === "repin" ? 1 : 0;

    // Worker 1: pinned -> quiet -> rejected(423) -> standby. Worker 2: standby ->
    // pinned. Worker 3: always standby.
    type WState = "pinned" | "quiet" | "rejected" | "standby";
    const w1: WState = stage === "pin1" ? "pinned" : stage === "quiet" ? "quiet" : stage === "repin" ? "rejected" : "standby";
    const w2: WState = stage === "pin2" || stage === "pause" ? "pinned" : stage === "repin" ? "pinned" : "standby";
    const workers: { label: string; state: WState }[] = [
        { label: "Worker 1", state: w1 },
        { label: "Worker 2", state: w2 },
        { label: "Worker 3", state: "standby" },
    ];

    const status =
        stage === "pin1"
            ? `Worker 1 is pinned (id ${PIN1}); it gets every message while Workers 2 and 3 stand by.`
            : stage === "quiet"
            ? "Worker 1 stopped pulling. With no pull, PinnedTTL counts down."
            : stage === "repin"
            ? `PinnedTTL elapsed — the server pins Worker 2 (id ${PIN2}). Worker 1's stale pull gets 423.`
            : "Worker 2 is pinned now; Worker 1 cleared its id and is back on standby.";

    const styleFor = (s: WState) => {
        if (s === "pinned") return { border: CONSUMER_GREEN, bg: "#ecfdf5", text: CONSUMER_GREEN };
        if (s === "quiet") return { border: AMBER, bg: "#fffbeb", text: AMBER };
        if (s === "rejected") return { border: CRASH_RED, bg: "#fef2f2", text: CRASH_RED };
        return { border: "#d7dbe0", bg: "white", text: IDLE_GREY };
    };
    const subFor = (s: WState, i: number) =>
        s === "pinned" ? `pinned · id ${i === 0 ? PIN1 : PIN2}` : s === "quiet" ? "pinned · no pull" : s === "rejected" ? "423 · cleared id" : "standby";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Pinned client.</strong> The server pins one worker and
                sends it everything; the rest stand by. If the pin goes quiet
                past <span style={{ color: AMBER, fontWeight: 600 }}>PinnedTTL</span>,
                a standby is pinned instead and the old one's stale pull gets a 423.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "18px 16px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#fafafa", width: "fit-content" }}>
                {/* dispatch consumer with current pin */}
                <div style={{ width: 130 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
                        dispatch
                    </div>
                    <div style={{ height: 50, borderRadius: 8, border: `2px solid ${receiving >= 0 ? CONSUMER_GREEN : AMBER}`, background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "border-color 0.3s" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Nats-Pin-Id</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: STREAM_BLUE }}>{pinId}</div>
                    </div>
                </div>

                {/* fan: active line goes to the receiving (pinned) worker, with
                    message dots flowing along it while delivery is happening */}
                <svg width={FAN_W} height={COL_H} style={{ flex: "none", overflow: "visible" }}>
                    {workers.map((_, i) => {
                        const active = i === receiving;
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
                    {receiving >= 0 &&
                        Array.from({ length: N_DOTS }, (_, d) => {
                            const f = (((elapsed % DOT_PERIOD) / DOT_PERIOD) + d / N_DOTS) % 1;
                            const y1 = workerCenterY(receiving);
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
                        const s = styleFor(w.state);
                        const receivingNow = i === receiving;
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 156,
                                    height: WBOX_H,
                                    boxSizing: "border-box",
                                    borderRadius: 8,
                                    border: `2px solid ${s.border}`,
                                    background: s.bg,
                                    boxShadow: receivingNow ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                                    padding: "6px 10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
                                }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 700, color: w.state === "standby" ? WORKER_NAVY : s.text }}>{w.label}</div>
                                <div style={{ fontSize: 10, fontFamily: "monospace", color: s.text, marginTop: 1 }}>{subFor(w.state, i)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* PinnedTTL timer */}
            <div style={{ marginTop: 12, width: 300 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 3, fontFamily: "monospace" }}>
                    <span>PinnedTTL</span>
                    <span style={{ color: ttlFrac > 0.66 ? AMBER : STREAM_BLUE }}>{ttlFrac >= 1 ? "elapsed" : ttlFrac === 0 ? "reset by pulls" : `${Math.round(ttlFrac * 100)}%`}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#eef0f3", overflow: "hidden" }}>
                    <div style={{ width: `${ttlFrac * 100}%`, height: "100%", background: ttlFrac > 0.66 ? AMBER : STREAM_BLUE, transition: "width 0.2s linear, background 0.3s" }} />
                </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function PriorityPinnedAnimated(_props: { width?: number; height?: number } = {}) {
    return <PriorityPinnedAnimatedInner />;
}
