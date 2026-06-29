import React, { useEffect, useState } from "react";

// workerPoolAnimated
// Several workers share one pull consumer. The ORDERS stream holds a backlog of
// stored orders; the single `shipping` consumer has one read position that
// advances through them. Each order is handed to exactly one worker, rotating
// round-robin across whichever workers are asking — so three workers end up
// with an even share. Acked orders stay in the stream (slots grey out, they
// don't disappear): the workers share a read position, not the messages.

const N_ORDERS = 6;
const N_WORKERS = 3;

const TICK_MS = 80;
const START_PAUSE_MS = 700; // show the backlog before delivery starts
const STEP_MS = 950; // one order handed out per step
const END_PAUSE_MS = 2000; // hold the finished state, then loop

const DELIVER_END = START_PAUSE_MS + N_ORDERS * STEP_MS;
const CYCLE_MS = DELIVER_END + END_PAUSE_MS;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const IDLE_GREY = "#9ca3af";

const SLOT_W = 40;
const SLOT_H = 40;
const SLOT_GAP = 6;
const SLOTS_WIDTH = N_ORDERS * SLOT_W + (N_ORDERS - 1) * SLOT_GAP;
const slotCenter = (i: number) => i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;

// Worker column geometry (used by the SVG fan and the boxes).
const WBOX_H = 52;
const WBOX_GAP = 16;
const COL_H = N_WORKERS * WBOX_H + (N_WORKERS - 1) * WBOX_GAP;
const FAN_W = 78;
const workerCenterY = (w: number) => w * (WBOX_H + WBOX_GAP) + WBOX_H / 2;

function WorkerPoolAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const cycleIndex = Math.floor(elapsed / CYCLE_MS);
    const t = elapsed % CYCLE_MS;

    const delivering = t >= START_PAUSE_MS && t < DELIVER_END;
    const done = t >= DELIVER_END;

    // idx = order currently being handed out, -1 before the first.
    const idx = delivering
        ? Math.min(N_ORDERS - 1, Math.floor((t - START_PAUSE_MS) / STEP_MS))
        : done
        ? N_ORDERS - 1
        : -1;

    const activeWorker = idx >= 0 ? idx % N_WORKERS : -1;

    // How many orders each worker has shipped so far (current one counts).
    const shipped = Array.from({ length: N_WORKERS }, (_, w) => {
        let c = 0;
        for (let j = 0; j <= idx; j++) if (j % N_WORKERS === w) c++;
        return c;
    });

    // The consumer's single read position (1-based count of orders handed out).
    const readPos = idx >= 0 ? idx + 1 : 0;

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
                Three workers share the one{" "}
                <span style={{ color: CONSUMER_GREEN, fontWeight: 600 }}>
                    shipping
                </span>{" "}
                consumer. Its single read position sweeps the{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>
                    ORDERS
                </span>{" "}
                backlog, handing each order round-robin to one worker. The
                tallies stay even, and acked orders stay in the stream.
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
                {/* ORDERS stream + shipping read position */}
                <div>
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
                        ORDERS stream
                    </div>

                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {Array.from({ length: N_ORDERS }, (_, i) => {
                            const read = idx >= 0 && i < idx;
                            const current = i === idx && delivering;
                            const shippedNow = done || read || current;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        width: SLOT_W,
                                        height: SLOT_H,
                                        border: `1px solid ${
                                            current ? CONSUMER_GREEN : "#d1d5db"
                                        }`,
                                        borderRadius: 4,
                                        background: current
                                            ? "#ecfdf5"
                                            : shippedNow
                                            ? "#f3f4f6"
                                            : "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        fontFamily: "monospace",
                                        color: current
                                            ? CONSUMER_GREEN
                                            : shippedNow
                                            ? "#c2c8d0"
                                            : STREAM_BLUE,
                                        textDecoration: (done || read)
                                            ? "line-through"
                                            : "none",
                                        transition:
                                            "background 0.25s, color 0.25s, border-color 0.25s",
                                    }}
                                >
                                    #{i + 1}
                                </div>
                            );
                        })}
                    </div>

                    {/* shipping read position */}
                    <div
                        style={{
                            position: "relative",
                            height: 40,
                            width: SLOTS_WIDTH,
                            marginTop: 2,
                        }}
                    >
                        {idx >= 0 && (
                            <div key={cycleIndex}>
                                <div
                                    style={{
                                        position: "absolute",
                                        left: slotCenter(idx) - 1,
                                        top: 0,
                                        width: 2,
                                        height: 10,
                                        background: CONSUMER_GREEN,
                                        transition:
                                            "left 0.5s cubic-bezier(0.4,0,0.2,1)",
                                    }}
                                />
                                <div
                                    style={{
                                        position: "absolute",
                                        left: slotCenter(idx),
                                        top: 10,
                                        transform: "translateX(-50%)",
                                        transition:
                                            "left 0.5s cubic-bezier(0.4,0,0.2,1)",
                                        padding: "3px 9px",
                                        background: "#ecfdf5",
                                        border: `1px solid ${CONSUMER_GREEN}`,
                                        borderRadius: 8,
                                        fontSize: 11,
                                        whiteSpace: "nowrap",
                                        fontFamily: "monospace",
                                        fontWeight: 700,
                                        color: CONSUMER_GREEN,
                                    }}
                                >
                                    read #{readPos}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fan: one consumer, three workers; active line lights up */}
                <svg
                    width={FAN_W}
                    height={COL_H}
                    style={{ flex: "none", overflow: "visible" }}
                >
                    {Array.from({ length: N_WORKERS }, (_, w) => {
                        const active = w === activeWorker;
                        return (
                            <line
                                key={w}
                                x1={0}
                                y1={COL_H / 2}
                                x2={FAN_W}
                                y2={workerCenterY(w)}
                                stroke={active ? CONSUMER_GREEN : "#e0e3e8"}
                                strokeWidth={active ? 2.5 : 1.5}
                                style={{
                                    transition: "stroke 0.25s, stroke-width 0.25s",
                                }}
                            />
                        );
                    })}
                </svg>

                {/* Workers */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: WBOX_GAP,
                    }}
                >
                    {Array.from({ length: N_WORKERS }, (_, w) => {
                        const active = w === activeWorker;
                        return (
                            <div
                                key={w}
                                style={{
                                    width: 124,
                                    height: WBOX_H,
                                    boxSizing: "border-box",
                                    borderRadius: 8,
                                    border: `2px solid ${
                                        active ? CONSUMER_GREEN : "#d7dbe0"
                                    }`,
                                    background: active ? "#ecfdf5" : "white",
                                    boxShadow: active
                                        ? `0 0 0 4px ${CONSUMER_GREEN}22`
                                        : "none",
                                    padding: "6px 10px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    transition:
                                        "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: active
                                            ? CONSUMER_GREEN
                                            : WORKER_NAVY,
                                    }}
                                >
                                    Worker {w + 1}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontFamily: "monospace",
                                        color: active ? CONSUMER_GREEN : IDLE_GREY,
                                        marginTop: 1,
                                    }}
                                >
                                    {active
                                        ? `shipping #${idx + 1}`
                                        : "waiting"}{" "}
                                    · sent {shipped[w]}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* status line */}
            <div
                style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "#6b7280",
                }}
            >
                {idx < 0
                    ? "Backlog stored, workers waiting to pull."
                    : done
                    ? "Backlog cleared. Each worker shipped an even share; every order is still in ORDERS."
                    : (
                        <>
                            Order <strong>#{idx + 1}</strong> → {" "}
                            <strong style={{ color: CONSUMER_GREEN }}>
                                Worker {activeWorker + 1}
                            </strong>
                            {"  ·  next order goes to the next worker in line."}
                        </>
                    )}
            </div>
        </div>
    );
}

// width / height are accepted for API parity with the NatsFlow loader and peer
// scenarios, but the diagram self-sizes (fit-content), so they aren't applied.
export function WorkerPoolAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <WorkerPoolAnimatedInner />;
}
