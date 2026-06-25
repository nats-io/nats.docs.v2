import React, { useEffect, useState } from "react";

// doubleAckAnimated
// Contrasts a plain ack with a double ack. In both, the server (the consumer)
// delivers a message to the client and the client sends an ack back. A plain
// ack is fire-and-forget: the client moves on the instant it sends it. A
// double ack is a request — the client waits for the server to confirm the
// ack landed before treating the message as done.

const TICK_MS = 60;

// Shared timeline (ms within one cycle).
const MSG = [200, 900]; // server -> client: deliver
const ACK = [1050, 1750]; // client -> server: ack
const CONFIRM = [1900, 2600]; // server -> client: confirm (double ack only)
const PLAIN_DONE = ACK[1];
const DOUBLE_DONE = CONFIRM[1];
const CYCLE = 3500;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const NAVY = "#375C93";

const TRACK = 220;

function seg(t: number, [start, end]: number[]) {
    if (t < start) return -1; // not started
    if (t >= end) return 2; // finished
    return (t - start) / (end - start); // 0..1 in progress
}

// A token travelling along the track. dir 'right' = server->client.
function Token(
    { progress, dir, label, color }: {
        progress: number;
        dir: "right" | "left";
        label: string;
        color: string;
    },
) {
    const x = dir === "right" ? progress * TRACK : (1 - progress) * TRACK;
    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: "50%",
                transform: "translate(-50%, -50%)",
                background: color,
                color: "white",
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 10,
                whiteSpace: "nowrap",
                fontFamily: "monospace",
            }}
        >
            {label}
        </div>
    );
}

function Node({ label, color }: { label: string; color: string }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 48,
                borderRadius: 8,
                border: `2px solid ${color}`,
                background: "white",
                fontSize: 11,
                fontWeight: 700,
                color,
                textAlign: "center",
                lineHeight: 1.15,
                flexShrink: 0,
            }}
        >
            {label}
        </div>
    );
}

function Panel(
    { t, title, sub, double }: {
        t: number;
        title: string;
        sub: string;
        double: boolean;
    },
) {
    const msg = seg(t, MSG);
    const ack = seg(t, ACK);
    const confirm = seg(t, CONFIRM);
    const doneAt = double ? DOUBLE_DONE : PLAIN_DONE;
    const done = t >= doneAt;

    // Client-side status text.
    let status: string;
    let statusColor = "#6b7280";
    if (msg >= 0 && msg < 2) status = "processing…";
    else if (ack >= 0 && ack < 2) status = "sending ack";
    else if (double && confirm < 2) {
        status = "waiting for confirm";
        statusColor = NAVY;
    } else if (done) {
        status = "done";
        statusColor = GREEN;
    } else status = "processing…";

    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {title}
                </span>{" "}
                <span style={{ fontSize: 12, color: "#6b7280" }}>— {sub}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Node label={"Server\n(consumer)"} color={BLUE} />
                <div
                    style={{
                        position: "relative",
                        width: TRACK,
                        height: 40,
                        borderTop: "1px dashed #d1d5db",
                        borderBottom: "1px dashed #d1d5db",
                    }}
                >
                    {/* deliver: server -> client */}
                    {msg >= 0 && msg < 2 && (
                        <Token progress={msg} dir="right" label="message" color={BLUE} />
                    )}
                    {/* ack: client -> server */}
                    {ack >= 0 && ack < 2 && (
                        <Token
                            progress={ack}
                            dir="left"
                            label={double ? "ack (request)" : "ack"}
                            color={GREEN}
                        />
                    )}
                    {/* confirm: server -> client (double ack only) */}
                    {double && confirm >= 0 && confirm < 2 && (
                        <Token progress={confirm} dir="right" label="confirmed ✓" color={NAVY} />
                    )}
                </div>
                <Node label={"Client"} color={GREEN} />
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: statusColor,
                    marginTop: 3,
                    marginLeft: 74,
                    fontFamily: "monospace",
                }}
            >
                client: {status}
            </div>
        </div>
    );
}

function DoubleAckAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);
    const t = elapsed % CYCLE;

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
                Both deliver a message and get an ack back. A{" "}
                <strong>plain ack</strong> is fire-and-forget; a{" "}
                <strong>double ack</strong> waits for the server to confirm the
                ack landed.
            </div>
            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    padding: "14px 16px",
                }}
            >
                <Panel
                    t={t}
                    title="Plain ack"
                    sub="client moves on the moment it sends the ack"
                    double={false}
                />
                <Panel
                    t={t}
                    title="Double ack"
                    sub="client waits for the server's confirmation"
                    double
                />
            </div>
        </div>
    );
}

// width / height accepted for API parity with the loader; the diagram
// self-sizes from its content.
export function DoubleAckAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <DoubleAckAnimatedInner />;
}
