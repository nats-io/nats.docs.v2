import React, { useEffect, useState } from "react";

// batchGetAnimated
// A batch Direct Get returns many messages over one request. ORDERS is
// replicated across three servers — a leader and two replicas, each a full
// copy. Three batches run in turn, and each is served by a different copy, so
// batch reads spread across all three. Within a batch the server streams the
// messages back one after another, each carrying a Nats-Num-Pending header that
// counts down to 0 on the last message.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const NAVY = "#375C93";
const AMBER = "#d97706";

const BATCH = 3; // messages per batch
const SERVERS = 3; // one batch each, so each batch is served by a different copy

const ASK_MS = 420;
const MSG_MS = 460;
const GAP_MS = 520;
const BATCH_MS = ASK_MS + BATCH * MSG_MS + GAP_MS;
const RUN_MS = SERVERS * BATCH_MS;
const HOLD_MS = 1700;
const CYCLE = RUN_MS + HOLD_MS;

// Geometry within a 640-wide stage.
const CLIENT_X = 22;
const CLIENT_W = 128;
const CLIENT_CX = CLIENT_X + CLIENT_W; // right edge
const CLIENT_Y = 92;
const COPY_X = 452;
const COPY_W = 166;
const COPY_Y = [14, 92, 170];
const COPY_H = 56;
const SRV_LABEL = ["leader", "replica", "replica"];
const SRV_COLOR = [NAVY, BLUE, BLUE];
const SLOT_Y = 150;
const SLOT_X0 = CLIENT_X + 6;
const SLOT_W = 34;

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}

function BatchGetInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE;
    const done = t >= RUN_MS;

    // Which batch is active (0..2), and where in its ask/stream/gap cycle.
    const bi = done ? SERVERS : Math.floor(t / BATCH_MS);
    const local = done ? 0 : t % BATCH_MS;
    const streamStart = ASK_MS;
    const streamEnd = ASK_MS + BATCH * MSG_MS;
    const phase = done ? "hold" : local < streamStart ? "ask" : local < streamEnd ? "stream" : "gap";

    // The server serving this batch is a different copy each time.
    const srv = done ? -1 : bi;
    const srvMidY = srv >= 0 ? COPY_Y[srv] + COPY_H / 2 : CLIENT_Y;

    // The message currently streaming (0-based within the batch) and its pending count.
    let mi = -1;
    let mprog = 0;
    if (phase === "stream") {
        mi = Math.floor((local - streamStart) / MSG_MS);
        mprog = ((local - streamStart) % MSG_MS) / MSG_MS;
    }
    const seq = mi + 1;
    const pending = BATCH - seq; // 2, 1, 0

    // Collected so far within the current batch.
    const collectedInBatch = phase === "gap" ? BATCH : phase === "stream" ? mi : 0;

    // Batches each server has served (one per server).
    const served = [0, 0, 0];
    for (let b = 0; b < Math.min(bi + (phase === "gap" ? 1 : 0), SERVERS); b++) served[b]++;

    // Request token on the way out to the serving server.
    let reqX: number | null = null;
    let reqY = CLIENT_Y;
    if (phase === "ask") {
        const p = local / ASK_MS;
        reqX = lerp(CLIENT_CX + 6, COPY_X - 14, p);
        reqY = lerp(CLIENT_Y, srvMidY, p);
    }

    const lastPending = phase === "stream" ? pending : phase === "gap" || done ? 0 : null;
    const pendingColor = lastPending === 0 ? GREEN : AMBER;

    const status = done
        ? "Three batches, each served by a different copy — batch reads spread across the leader and replicas."
        : phase === "ask"
          ? `Batch ${bi + 1}/3 · one request to ${srv === 0 ? "the leader" : "a replica"}.`
          : phase === "gap"
            ? `Batch ${bi + 1}/3 complete · pending reached 0.`
            : `Batch ${bi + 1}/3 · message ${seq} streams back · Nats-Num-Pending ${pending}.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                A <strong>batch get</strong> returns many messages over one request — and any copy can serve it, so batches spread.
            </div>

            <div style={{ position: "relative", width: 640, height: 240, margin: "0 auto" }}>
                {/* reader */}
                <div
                    style={{
                        position: "absolute",
                        left: CLIENT_X,
                        top: CLIENT_Y - 27,
                        width: CLIENT_W,
                        height: 54,
                        borderRadius: 8,
                        border: `2px solid ${BLUE}`,
                        background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Reader</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: BLUE, minHeight: 13 }}>
                        {done ? "3 batches done" : "batch · seq 1, ×3"}
                    </span>
                </div>

                {/* three stream copies, with per-server batches-served tally */}
                {COPY_Y.map((cy, i) => {
                    const isLeader = i === 0;
                    const lit = srv === i;
                    const col = SRV_COLOR[i];
                    return (
                        <div key={i}>
                            <div
                                style={{
                                    position: "absolute",
                                    left: COPY_X,
                                    top: cy,
                                    width: COPY_W,
                                    height: COPY_H,
                                    borderRadius: 8,
                                    border: `2px solid ${lit ? col : "#d1d5db"}`,
                                    background: lit ? (isLeader ? "#eef2f9" : "#eaf6fd") : "#fff",
                                    boxShadow: lit ? `0 1px 7px ${col}55` : "none",
                                    transition: "all 0.18s",
                                    padding: "7px 10px",
                                    boxSizing: "border-box",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>
                                        ORDERS
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: 0.4,
                                            color: isLeader ? NAVY : "#9ca3af",
                                            border: `1px solid ${isLeader ? NAVY : "#d1d5db"}`,
                                            borderRadius: 3,
                                            padding: "0 4px",
                                        }}
                                    >
                                        {SRV_LABEL[i]}
                                    </span>
                                </div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>
                                    full copy · served{" "}
                                    <strong style={{ color: served[i] > 0 ? col : "#9ca3af" }}>{served[i]}</strong>
                                </div>
                            </div>
                            {/* pending pill on the serving server */}
                            {lit && lastPending !== null && (
                                <span
                                    style={{
                                        position: "absolute",
                                        left: COPY_X,
                                        top: cy + COPY_H + 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: pendingColor,
                                        border: `1px solid ${pendingColor}`,
                                        borderRadius: 4,
                                        padding: "1px 6px",
                                        background: `${pendingColor}12`,
                                    }}
                                >
                                    Nats-Num-Pending {lastPending}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* single request token going out */}
                {reqX !== null && (
                    <div
                        style={{
                            position: "absolute",
                            left: reqX - 7,
                            top: reqY - 7,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: BLUE,
                            opacity: 0.9,
                        }}
                    />
                )}

                {/* the message currently streaming back from the serving server */}
                {phase === "stream" && srv >= 0 && (
                    <>
                        <div
                            style={{
                                position: "absolute",
                                left: lerp(COPY_X - 16, CLIENT_CX + 6, mprog) - 12,
                                top: lerp(srvMidY, CLIENT_Y, mprog) - 12,
                                width: 24,
                                height: 24,
                                borderRadius: 5,
                                background: SRV_COLOR[srv],
                                border: "1.5px solid #fff",
                                boxShadow: `0 1px 6px ${SRV_COLOR[srv]}66`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: "monospace",
                            }}
                        >
                            {seq}
                        </div>
                        <span
                            style={{
                                position: "absolute",
                                left: lerp(COPY_X - 16, CLIENT_CX + 6, mprog) - 30,
                                top: lerp(srvMidY, CLIENT_Y, mprog) - 30,
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: pending === 0 ? GREEN : AMBER,
                                whiteSpace: "nowrap",
                            }}
                        >
                            pending {pending}
                        </span>
                    </>
                )}

                {/* collected blocks for the current batch settle under the reader */}
                {Array.from({ length: collectedInBatch }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: SLOT_X0 + i * SLOT_W,
                            top: SLOT_Y,
                            width: 28,
                            height: 28,
                            borderRadius: 5,
                            background: `${BLUE}1a`,
                            border: `1.5px solid ${BLUE}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: NAVY,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "monospace",
                        }}
                    >
                        {i + 1}
                    </div>
                ))}
                {!done && (
                    <span style={{ position: "absolute", left: SLOT_X0, top: SLOT_Y + 34, fontSize: 11, color: "#6b7280" }}>
                        collected {collectedInBatch}/{BATCH}
                    </span>
                )}
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

export function BatchGetAnimated(_props: { width?: number; height?: number } = {}) {
    return <BatchGetInner />;
}
