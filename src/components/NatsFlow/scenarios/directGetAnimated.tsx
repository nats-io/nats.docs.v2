import React, { useEffect, useState } from "react";

// directGetAnimated
// ORDERS is replicated across three servers — a leader and two replicas, each
// holding a full copy. A reader fires a stream of Direct Gets, each for a
// different sequence number. Every read is answered by whichever copy serves
// it — sometimes the leader, sometimes a replica — so read load spreads across
// all three. A per-server tally shows the spread.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const NAVY = "#375C93";

// The reads: each is a (sequence number, answering server). Server 0 is the
// leader, 1 and 2 are replicas. The mix is fixed (deterministic) but varied —
// different sequence each time, served by leader and both replicas.
const GETS = [
    { seq: 3, srv: 1 },
    { seq: 7, srv: 2 },
    { seq: 1, srv: 0 },
    { seq: 9, srv: 2 },
    { seq: 4, srv: 1 },
    { seq: 10, srv: 0 },
    { seq: 2, srv: 2 },
    { seq: 8, srv: 1 },
    { seq: 5, srv: 0 },
    { seq: 6, srv: 2 },
];

const ASK_MS = 360;
const REPLY_MS = 500;
const GAP_MS = 120;
const GET_MS = ASK_MS + REPLY_MS + GAP_MS;
const RUN_MS = GETS.length * GET_MS;
const HOLD_MS = 1700;
const CYCLE = RUN_MS + HOLD_MS;

// Geometry within a 640-wide stage.
const CLIENT_X = 22;
const CLIENT_W = 128;
const CLIENT_CX = CLIENT_X + CLIENT_W; // right edge
const CLIENT_Y = 118;
const COPY_X = 452;
const COPY_W = 166;
const COPY_Y = [14, 92, 170];
const COPY_H = 56;
const SRV_LABEL = ["leader", "replica", "replica"];
const SRV_COLOR = [NAVY, BLUE, BLUE];

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}

function DirectGetInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE;
    const done = t >= RUN_MS;

    // Which get is active, and where in its ask/reply/gap cycle.
    const gi = done ? GETS.length : Math.floor(t / GET_MS);
    const local = done ? 0 : t % GET_MS;
    const phase = done
        ? "hold"
        : local < ASK_MS
          ? "ask"
          : local < ASK_MS + REPLY_MS
            ? "reply"
            : "gap";

    const cur = done ? null : GETS[gi];
    const target = cur ? cur.srv : -1;
    const targetMidY = target >= 0 ? COPY_Y[target] + COPY_H / 2 : CLIENT_Y;

    // How many reads each server has fully served (reply landed).
    const completed = gi + (phase === "gap" ? 1 : 0);
    const served = [0, 0, 0];
    for (let j = 0; j < Math.min(completed, GETS.length); j++) served[GETS[j].srv]++;

    // The travelling token: request dot out, message block back.
    let token: { x: number; y: number; kind: "req" | "msg" } | null = null;
    if (phase === "ask") {
        const p = local / ASK_MS;
        token = { x: lerp(CLIENT_CX + 6, COPY_X - 16, p), y: lerp(CLIENT_Y, targetMidY, p), kind: "req" };
    } else if (phase === "reply") {
        const p = (local - ASK_MS) / REPLY_MS;
        token = { x: lerp(COPY_X - 16, CLIENT_CX + 6, p), y: lerp(targetMidY, CLIENT_Y, p), kind: "msg" };
    }

    // The answering server lights up once the request reaches it, through reply.
    const serving = cur && (phase === "reply" || (phase === "ask" && local / ASK_MS > 0.55)) ? target : -1;

    const status = done
        ? `10 reads, spread across the leader and both replicas — any copy can serve a Direct Get.`
        : `Read ${gi + 1}/10 · sequence ${cur!.seq} answered by ${target === 0 ? "the leader" : "a replica"}.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Direct Get</strong> fetches one message by sequence — answered by any copy of the stream, so reads spread.
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
                        {cur ? `get seq ${cur.seq}` : "10 reads done"}
                    </span>
                </div>

                {/* three stream copies, with per-server served tally */}
                {COPY_Y.map((cy, i) => {
                    const isLeader = i === 0;
                    const lit = serving === i;
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
                        </div>
                    );
                })}

                {/* travelling token */}
                {token && token.kind === "req" && (
                    <div
                        style={{
                            position: "absolute",
                            left: token.x - 7,
                            top: token.y - 7,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: BLUE,
                            opacity: 0.9,
                        }}
                    />
                )}
                {token && token.kind === "msg" && cur && (
                    <div
                        style={{
                            position: "absolute",
                            left: token.x - 11,
                            top: token.y - 11,
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: SRV_COLOR[cur.srv],
                            border: "1.5px solid #fff",
                            boxShadow: `0 1px 6px ${SRV_COLOR[cur.srv]}66`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "monospace",
                        }}
                    >
                        {cur.seq}
                    </div>
                )}

                {/* (direct) tag on the reply path */}
                {phase === "reply" && (
                    <span
                        style={{
                            position: "absolute",
                            left: (CLIENT_CX + COPY_X) / 2 - 18,
                            top: lerp(targetMidY, CLIENT_Y, (local - ASK_MS) / REPLY_MS) - 28,
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: GREEN,
                        }}
                    >
                        (direct)
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

export function DirectGetAnimated(_props: { width?: number; height?: number } = {}) {
    return <DirectGetInner />;
}
