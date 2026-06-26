import React, { useEffect, useState } from "react";

// consumerServerSideAnimated
// Shows that a consumer is a SERVER-SIDE construct. The NATS server box holds
// two entities — the ORDERS stream and the billing consumer (a cursor
// over the stream). The client is a separate application outside the server:
// it asks the consumer for messages (pull) and receives them (deliver). The
// stored messages and the read position both live on the server; the client
// holds neither.

const N_SLOTS = 6;
const SLOT = 30;
const SLOT_GAP = 4;
const TICK_MS = 90;

const STEP_MS = 900; // one pull+deliver per step
const RESET_PAUSE_MS = 1500;
const CYCLE_MS = N_SLOTS * STEP_MS + RESET_PAUSE_MS;

const BLUE = "#27AAE1";
const NAVY = "#375C93";
const GREEN = "#34A574";

function ConsumerServerSideAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;
    const cursor = Math.min(N_SLOTS, Math.floor(t / STEP_MS)); // messages delivered so far
    const withinStep = (t % STEP_MS) / STEP_MS;
    const active = cursor < N_SLOTS; // a delivery is in progress this step

    // Phase of the current delivery: pull (client->consumer) then deliver (->client)
    const pulling = active && withinStep < 0.45;
    const delivering = active && withinStep >= 0.45;

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
                The <strong>stream</strong> and the <strong>consumer</strong>{" "}
                both live inside the NATS server. The{" "}
                <strong>client</strong> is your application: it asks the
                consumer for messages and receives them, but it holds no stored
                messages and no read position of its own.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* NATS server boundary */}
                <div
                    style={{
                        border: `2px solid ${NAVY}`,
                        borderRadius: 10,
                        background: "#f8fafc",
                        padding: "10px 14px 14px",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            color: NAVY,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            marginBottom: 8,
                        }}
                    >
                        NATS server
                    </div>

                    {/* Stream entity */}
                    <div
                        style={{
                            border: `1px solid ${BLUE}`,
                            borderRadius: 8,
                            background: "white",
                            padding: "8px 10px",
                            marginBottom: 26,
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                color: BLUE,
                                fontWeight: 600,
                                marginBottom: 6,
                            }}
                        >
                            Stream · ORDERS
                        </div>
                        <div style={{ display: "flex", gap: SLOT_GAP }}>
                            {Array.from({ length: N_SLOTS }, (_, i) => {
                                const read = i < cursor;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            width: SLOT,
                                            height: SLOT,
                                            borderRadius: 4,
                                            border: "1px solid #d1d5db",
                                            background: read ? "#f3f4f6" : "white",
                                            color: read ? "#9ca3af" : BLUE,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 11,
                                            fontFamily: "monospace",
                                            fontWeight: 600,
                                            transition: "background .25s, color .25s",
                                        }}
                                    >
                                        #{i + 1}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* arrow: stream feeds consumer */}
                    <div
                        style={{
                            position: "absolute",
                            left: 60,
                            top: 92,
                            fontSize: 11,
                            color: "#9ca3af",
                        }}
                    >
                        ↓ reads
                    </div>

                    {/* Consumer entity */}
                    <div
                        style={{
                            border: `1px solid ${GREEN}`,
                            borderRadius: 8,
                            background: "#ecfdf5",
                            padding: "8px 10px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                color: GREEN,
                                fontWeight: 600,
                            }}
                        >
                            Consumer · billing
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: "#6b7280",
                                fontFamily: "monospace",
                                marginTop: 3,
                            }}
                        >
                            cursor:{" "}
                            {cursor >= N_SLOTS
                                ? "caught up"
                                : `next #${cursor + 1}`}
                        </div>
                    </div>
                </div>

                {/* link between server (consumer) and client */}
                <div
                    style={{
                        width: 96,
                        position: "relative",
                        alignSelf: "stretch",
                        minHeight: 120,
                    }}
                >
                    {/* pull request (client -> consumer) */}
                    <div
                        style={{
                            position: "absolute",
                            top: "58%",
                            left: 6,
                            right: 6,
                            textAlign: "center",
                            fontSize: 10,
                            color: pulling ? NAVY : "#cbd5e1",
                            transition: "color .2s",
                        }}
                    >
                        ← pull
                    </div>
                    {/* deliver (consumer -> client) */}
                    <div
                        style={{
                            position: "absolute",
                            top: "40%",
                            left: 6,
                            right: 6,
                            textAlign: "center",
                            fontSize: 10,
                            color: delivering ? GREEN : "#cbd5e1",
                            transition: "color .2s",
                        }}
                    >
                        messages →
                    </div>
                    {/* moving message token */}
                    {delivering && (
                        <div
                            style={{
                                position: "absolute",
                                top: "40%",
                                left: `${6 + (withinStep - 0.45) / 0.55 * 70}%`,
                                width: 14,
                                height: 14,
                                marginTop: -2,
                                borderRadius: 3,
                                background: GREEN,
                                color: "white",
                                fontSize: 9,
                                fontFamily: "monospace",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            #{cursor}
                        </div>
                    )}
                </div>

                {/* Client (outside the server) */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 96,
                        height: 64,
                        borderRadius: 8,
                        border: `2px solid ${GREEN}`,
                        background: "white",
                        boxShadow: delivering ? `0 0 0 4px ${GREEN}22` : "none",
                        transition: "box-shadow .2s",
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>
                        Client
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>
                        your app
                    </div>
                </div>
            </div>
        </div>
    );
}

// width / height accepted for API parity with the loader; the diagram
// self-sizes from its content.
export function ConsumerServerSideAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <ConsumerServerSideAnimatedInner />;
}
