import React, { useEffect, useState } from "react";

// jetStreamPipelineAnimated
// A producer publishes into the ORDERS stream; the server appends each message
// and assigns it a stream sequence. One consumer then reads the stored
// messages in order, advancing its own consumer sequence as it goes, and hands
// each one to a client. The two sequence counters are labelled separately so
// the relation between them is visible: the stream sequence is the message's
// fixed position in the log; the consumer sequence is how many messages this
// consumer has been delivered.

const N_SLOTS = 6;
const SLOT_W = 46;
const SLOT_H = 46;
const SLOT_GAP = 6;
const TICK_MS = 80;

const PRODUCE_STEP_MS = 420; // one new message stored every step
const GAP_AFTER_PRODUCE_MS = 600;
const CONSUME_STEP_MS = 680; // consumer reads one message every step
const RESET_PAUSE_MS = 1600;

const PRODUCE_END = N_SLOTS * PRODUCE_STEP_MS;
const CONSUME_START = PRODUCE_END + GAP_AFTER_PRODUCE_MS;
const CONSUME_END = CONSUME_START + N_SLOTS * CONSUME_STEP_MS;
const CYCLE_MS = CONSUME_END + RESET_PAUSE_MS;

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const PRODUCER_NAVY = "#375C93";

const SLOTS_WIDTH = N_SLOTS * SLOT_W + (N_SLOTS - 1) * SLOT_GAP;
const slotLeft = (i: number) => i * (SLOT_W + SLOT_GAP);
const slotCenter = (i: number) => slotLeft(i) + SLOT_W / 2;

function JetStreamPipelineAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const cycleIndex = Math.floor(elapsed / CYCLE_MS);
    const t = elapsed % CYCLE_MS;

    // How many slots are stored so far (producing fills them one by one).
    const stored = t < PRODUCE_END
        ? Math.min(N_SLOTS, Math.floor(t / PRODUCE_STEP_MS) + 1)
        : N_SLOTS;
    const producing = t < PRODUCE_END;

    // Consumer position: -1 before it starts, else the index it is reading.
    const consuming = t >= CONSUME_START && t < CONSUME_END;
    const consumeIndex = consuming
        ? Math.min(N_SLOTS - 1, Math.floor((t - CONSUME_START) / CONSUME_STEP_MS))
        : t >= CONSUME_END
        ? N_SLOTS - 1
        : -1;
    const consumerDone = t >= CONSUME_END;

    // consumer sequence = number of messages delivered so far (1-based).
    const consumerSeq = consumeIndex >= 0 ? consumeIndex + 1 : 0;
    const streamSeq = consumeIndex >= 0 ? consumeIndex + 1 : 0;

    // A token flies from the current slot to the client on each consume step.
    const deliveredToClient = consumeIndex >= 0;

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
                A producer publishes into the <strong>ORDERS</strong>{" "}
                stream; one consumer reads the stored messages in order and
                hands each to a client. Watch the two counters: the{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>
                    stream sequence
                </span>{" "}
                is the message's fixed slot, the{" "}
                <span style={{ color: CONSUMER_GREEN, fontWeight: 600 }}>
                    consumer sequence
                </span>{" "}
                is how many this consumer has read.
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "18px 16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                {/* Producer */}
                <Node
                    label="Producer"
                    sub="orders.>"
                    color={PRODUCER_NAVY}
                    pulsing={producing}
                />

                <Arrow active={producing} color={PRODUCER_NAVY} />

                {/* Stream + consumer cursor */}
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

                    {/* Slot row */}
                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {Array.from({ length: N_SLOTS }, (_, i) => {
                            const present = i < stored;
                            const read = consumeIndex >= 0 && i < consumeIndex;
                            const current = i === consumeIndex && consuming;
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
                                        background: !present
                                            ? "#f3f4f6"
                                            : current
                                            ? "#ecfdf5"
                                            : read
                                            ? "#f9fafb"
                                            : "white",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        fontFamily: "monospace",
                                        color: !present
                                            ? "#d1d5db"
                                            : read
                                            ? "#9ca3af"
                                            : current
                                            ? CONSUMER_GREEN
                                            : STREAM_BLUE,
                                        opacity: present ? 1 : 0.6,
                                        transition:
                                            "background 0.25s, color 0.25s, border-color 0.25s, opacity 0.25s",
                                    }}
                                >
                                    {present ? `#${i + 1}` : ""}
                                </div>
                            );
                        })}
                    </div>

                    {/* Consumer cursor */}
                    <div
                        style={{
                            position: "relative",
                            height: 52,
                            width: SLOTS_WIDTH,
                            marginTop: 2,
                        }}
                    >
                        {consumeIndex >= 0 && (
                            <div
                                key={cycleIndex}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                }}
                            >
                                {/* connector line */}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: slotCenter(consumeIndex) - 1,
                                        top: 0,
                                        width: 2,
                                        height: 12,
                                        background: CONSUMER_GREEN,
                                        transition:
                                            "left 0.45s cubic-bezier(0.4,0,0.2,1)",
                                    }}
                                />
                                {/* cursor pill */}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: slotCenter(consumeIndex),
                                        top: 12,
                                        transform: "translateX(-50%)",
                                        transition:
                                            "left 0.45s cubic-bezier(0.4,0,0.2,1)",
                                        padding: "4px 10px",
                                        background: "#ecfdf5",
                                        border: `1px solid ${CONSUMER_GREEN}`,
                                        borderRadius: 8,
                                        fontSize: 11,
                                        whiteSpace: "nowrap",
                                        textAlign: "center",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            color: CONSUMER_GREEN,
                                        }}
                                    >
                                        shipping
                                    </div>
                                    <div style={{ fontFamily: "monospace" }}>
                                        <span style={{ color: CONSUMER_GREEN }}>
                                            consumer #{consumerSeq}
                                        </span>{" "}
                                        ·{" "}
                                        <span style={{ color: STREAM_BLUE }}>
                                            stream #{streamSeq}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Arrow active={deliveredToClient} color={CONSUMER_GREEN} />

                {/* Client */}
                <Node
                    label="Client"
                    sub={
                        consumerDone
                            ? "all read"
                            : deliveredToClient
                            ? `got #${streamSeq}`
                            : "waiting"
                    }
                    color={CONSUMER_GREEN}
                    pulsing={deliveredToClient && !consumerDone}
                />
            </div>
        </div>
    );
}

function Node(
    { label, sub, color, pulsing }: {
        label: string;
        sub: string;
        color: string;
        pulsing: boolean;
    },
) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 84,
                height: 56,
                borderRadius: 8,
                border: `2px solid ${color}`,
                background: "white",
                boxShadow: pulsing ? `0 0 0 4px ${color}22` : "none",
                transition: "box-shadow 0.2s",
            }}
        >
            <div style={{ fontSize: 12, fontWeight: 700, color }}>{label}</div>
            <div
                style={{
                    fontSize: 10,
                    color: "#6b7280",
                    fontFamily: "monospace",
                    marginTop: 2,
                }}
            >
                {sub}
            </div>
        </div>
    );
}

function Arrow({ active, color }: { active: boolean; color: string }) {
    return (
        <div
            style={{
                fontSize: 18,
                color: active ? color : "#d1d5db",
                transition: "color 0.2s",
            }}
        >
            →
        </div>
    );
}

// width / height are accepted for API parity with the NatsFlow loader and peer
// scenarios, but the diagram self-sizes (fit-content), so they aren't applied.
export function JetStreamPipelineAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <JetStreamPipelineAnimatedInner />;
}
