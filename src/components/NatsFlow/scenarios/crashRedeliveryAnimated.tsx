import React, { useEffect, useState } from "react";

// crashRedeliveryAnimated
// One order is delivered to a worker that crashes before it acks. The order
// stays in progress on the shipping consumer while the AckWait timer runs; the
// crash doesn't tell the server anything, only the missing ack does. When
// AckWait elapses the server redelivers the same order to a surviving worker,
// which ships it and acks. The order is handled exactly once even though the
// first attempt failed.

const TICK_MS = 80;

// Stage boundaries within one cycle (ms).
const DELIVER_END = 1600; // W1 pulled the order and is shipping
const CRASH_END = 2500; // W1 died before acking
const WAIT_END = 4600; // AckWait counts down with the order held
const REDELIVER_END = 6000; // server hands the order to W2
const ACK_END = 7100; // W2 ships and acks
const CYCLE_MS = 8600; // hold, then loop

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const CRASH_RED = "#ef4444";
const AMBER = "#f59e0b";

const WBOX_H = 54;
const WBOX_GAP = 18;
const COL_H = 2 * WBOX_H + WBOX_GAP;
const FAN_W = 84;
const workerCenterY = (w: number) => w * (WBOX_H + WBOX_GAP) + WBOX_H / 2;

const ORDER = "#5";

function CrashRedeliveryAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;

    const stage =
        t < DELIVER_END
            ? "deliver"
            : t < CRASH_END
            ? "crash"
            : t < WAIT_END
            ? "wait"
            : t < REDELIVER_END
            ? "redeliver"
            : t < ACK_END
            ? "ack"
            : "done";

    // AckWait timer fills from delivery until redelivery, then resets once the
    // order is acked. Compressed visually; the real default is 30 seconds.
    const timerFrac =
        stage === "deliver" || stage === "crash" || stage === "wait"
            ? Math.min(1, t / WAIT_END)
            : stage === "redeliver"
            ? 1
            : 0;
    const timerColor = timerFrac > 0.66 ? AMBER : STREAM_BLUE;

    // Worker 1: shipping, then crashed for the rest of the cycle.
    const w1Crashed = stage !== "deliver";
    const w1Shipping = stage === "deliver";

    // Worker 2: idle until redelivery, then shipping, then done.
    const w2Shipping = stage === "redeliver";
    const w2Done = stage === "ack" || stage === "done";

    // Which fan line is carrying the order right now.
    const activeTarget =
        stage === "deliver" ? 0 : stage === "redeliver" ? 1 : -1;

    const orderState =
        stage === "deliver"
            ? { text: `${ORDER} → Worker 1`, color: CONSUMER_GREEN }
            : stage === "crash"
            ? { text: `${ORDER} in progress`, color: AMBER }
            : stage === "wait"
            ? { text: `${ORDER} awaiting ack`, color: AMBER }
            : stage === "redeliver"
            ? { text: `${ORDER} → Worker 2`, color: CONSUMER_GREEN }
            : { text: `${ORDER} acked`, color: CONSUMER_GREEN };

    const status =
        stage === "deliver"
            ? "Worker 1 pulled order #5 and started shipping it."
            : stage === "crash"
            ? "Worker 1 died before acking. The order stays in progress on the consumer."
            : stage === "wait"
            ? "No ack arrives. AckWait counts down while the order is held."
            : stage === "redeliver"
            ? "AckWait elapsed, so the server redelivers order #5 to Worker 2."
            : "Worker 2 ships it and acks. The order was handled exactly once.";

    const workers = [
        {
            label: "Worker 1",
            crashed: w1Crashed,
            shipping: w1Shipping,
            done: false,
        },
        {
            label: "Worker 2",
            crashed: false,
            shipping: w2Shipping,
            done: w2Done,
        },
    ];

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div
                style={{
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#6b7280",
                    fontStyle: "italic",
                }}
            >
                A worker crashes mid-order. The server can't see the crash, only
                the missing ack, so the order waits out{" "}
                <span style={{ color: AMBER, fontWeight: 600 }}>AckWait</span>{" "}
                and is redelivered to a surviving worker. It ships once.
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
                {/* shipping consumer holding the in-progress order */}
                <div style={{ width: 150 }}>
                    <div
                        style={{
                            fontSize: 11,
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            fontWeight: 600,
                            marginBottom: 6,
                        }}
                    >
                        shipping consumer
                    </div>
                    <div
                        style={{
                            height: 54,
                            borderRadius: 8,
                            border: `2px solid ${orderState.color}`,
                            background: "white",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "border-color 0.25s",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: STREAM_BLUE,
                            }}
                        >
                            {ORDER}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                fontFamily: "monospace",
                                color: orderState.color,
                                marginTop: 1,
                                transition: "color 0.25s",
                            }}
                        >
                            {orderState.text}
                        </div>
                    </div>
                </div>

                {/* fan: consumer -> worker 1 / worker 2 */}
                <svg
                    width={FAN_W}
                    height={COL_H}
                    style={{ flex: "none", overflow: "visible" }}
                >
                    {[0, 1].map((w) => {
                        const active = w === activeTarget;
                        const dead = w === 0 && w1Crashed;
                        return (
                            <line
                                key={w}
                                x1={0}
                                y1={COL_H / 2}
                                x2={FAN_W}
                                y2={workerCenterY(w)}
                                stroke={
                                    active
                                        ? CONSUMER_GREEN
                                        : dead
                                        ? "#f0c2c2"
                                        : "#e0e3e8"
                                }
                                strokeWidth={active ? 2.5 : 1.5}
                                strokeDasharray={dead ? "4 4" : undefined}
                                style={{
                                    transition: "stroke 0.25s, stroke-width 0.25s",
                                }}
                            />
                        );
                    })}
                </svg>

                {/* workers */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: WBOX_GAP,
                    }}
                >
                    {workers.map((wk, i) => {
                        const border = wk.crashed
                            ? CRASH_RED
                            : wk.shipping || wk.done
                            ? CONSUMER_GREEN
                            : "#d7dbe0";
                        const sub = wk.crashed
                            ? "✗ crashed"
                            : wk.shipping
                            ? `shipping ${ORDER}`
                            : wk.done
                            ? `✓ shipped ${ORDER}`
                            : "idle";
                        const subColor = wk.crashed
                            ? CRASH_RED
                            : wk.shipping || wk.done
                            ? CONSUMER_GREEN
                            : "#9ca3af";
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 150,
                                    height: WBOX_H,
                                    boxSizing: "border-box",
                                    borderRadius: 8,
                                    border: `2px solid ${border}`,
                                    background: wk.crashed
                                        ? "#fef2f2"
                                        : wk.shipping || wk.done
                                        ? "#ecfdf5"
                                        : "white",
                                    boxShadow: wk.shipping
                                        ? `0 0 0 4px ${CONSUMER_GREEN}22`
                                        : "none",
                                    padding: "6px 10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    opacity: wk.crashed ? 0.85 : 1,
                                    transition:
                                        "border-color 0.25s, background 0.25s, box-shadow 0.2s, opacity 0.25s",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: wk.crashed
                                            ? CRASH_RED
                                            : WORKER_NAVY,
                                    }}
                                >
                                    {wk.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontFamily: "monospace",
                                        color: subColor,
                                        marginTop: 1,
                                        transition: "color 0.25s",
                                    }}
                                >
                                    {sub}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* AckWait timer */}
            <div style={{ marginTop: 12, width: 320 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "#6b7280",
                        marginBottom: 3,
                        fontFamily: "monospace",
                    }}
                >
                    <span>AckWait (30s default)</span>
                    <span style={{ color: timerColor }}>
                        {timerFrac >= 1
                            ? "elapsed"
                            : timerFrac === 0
                            ? "—"
                            : `${Math.round(timerFrac * 100)}%`}
                    </span>
                </div>
                <div
                    style={{
                        height: 8,
                        borderRadius: 4,
                        background: "#eef0f3",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: `${timerFrac * 100}%`,
                            height: "100%",
                            background: timerColor,
                            transition: "width 0.2s linear, background 0.25s",
                        }}
                    />
                </div>
            </div>

            {/* status line */}
            <div style={{ marginTop: 10, fontSize: 13, color: "#374151" }}>
                {status}
            </div>
        </div>
    );
}

// width / height are accepted for API parity with the NatsFlow loader and peer
// scenarios, but the diagram self-sizes (fit-content), so they aren't applied.
export function CrashRedeliveryAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <CrashRedeliveryAnimatedInner />;
}
