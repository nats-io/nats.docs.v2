import React, { useEffect, useState } from "react";

const STREAM_SIZE = 8;
const SLOT_WIDTH = 44;
const SLOT_GAP = 4;
const TICK_MS = 100;
const RESET_PAUSE_MS = 1500;
const ROW_HEIGHT = 30;

interface ConsumerConfig {
    id: string;
    name: string;
    color: string;
    bg: string;
    speedMs: number;
    startPosition: number;
}

const CONSUMER_CONFIG: ConsumerConfig[] = [
    {
        id: "inventory",
        name: "Inventory",
        color: "#10b981",
        bg: "#ecfdf5",
        speedMs: 1500,
        startPosition: 1,
    },
    {
        id: "email",
        name: "Email",
        color: "#3b82f6",
        bg: "#eff6ff",
        speedMs: 1200,
        startPosition: 3,
    },
    {
        id: "analytics",
        name: "Analytics",
        color: "#8b5cf6",
        bg: "#f5f3ff",
        speedMs: 900,
        startPosition: 6,
    },
];

const LONGEST_CATCHUP_MS = Math.max(
    ...CONSUMER_CONFIG.map((c) => (STREAM_SIZE - c.startPosition) * c.speedMs),
);
const CYCLE_LENGTH_MS = LONGEST_CATCHUP_MS + RESET_PAUSE_MS;

const SLOTS_TOTAL_WIDTH = STREAM_SIZE * SLOT_WIDTH +
    (STREAM_SIZE - 1) * SLOT_GAP;
const HORIZONTAL_PAD = 56;

const slotCenterX = (position: number) =>
    (position - 1) * (SLOT_WIDTH + SLOT_GAP) + SLOT_WIDTH / 2;

function JetStreamConsumersAnimatedInner() {
    const [totalElapsedMs, setTotalElapsedMs] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTotalElapsedMs((t) => t + TICK_MS);
        }, TICK_MS);
        return () => clearInterval(interval);
    }, []);

    const cycleIndex = Math.floor(totalElapsedMs / CYCLE_LENGTH_MS);
    const cycleElapsedMs = totalElapsedMs % CYCLE_LENGTH_MS;

    const cursorAreaHeight = CONSUMER_CONFIG.length * ROW_HEIGHT + 12;

    return (
        <div>
            <div
                style={{
                    marginBottom: 10,
                    fontSize: 13,
                    color: "#6b7280",
                    fontStyle: "italic",
                }}
            >
                Three consumers — each a server-side cursor over the{" "}
                <strong>ORDERS</strong>{" "}
                stream — advance at their own pace as their clients ack messages.
            </div>

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fafafa",
                    padding: `16px ${HORIZONTAL_PAD}px`,
                    width: "fit-content",
                    boxSizing: "content-box",
                }}
            >
                <div
                    style={{
                        fontSize: 11,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginBottom: 6,
                        fontWeight: 600,
                    }}
                >
                    ORDERS stream
                </div>

                {/* Slot row */}
                <div style={{ display: "flex", gap: SLOT_GAP }}>
                    {Array.from({ length: STREAM_SIZE }, (_, i) => i + 1).map(
                        (seq) => (
                            <div
                                key={seq}
                                style={{
                                    width: SLOT_WIDTH,
                                    height: SLOT_WIDTH,
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    background: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: "#6b7280",
                                    fontFamily: "monospace",
                                }}
                            >
                                #{seq}
                            </div>
                        ),
                    )}
                </div>

                {/* Cursor area */}
                <div
                    style={{
                        position: "relative",
                        height: cursorAreaHeight,
                        width: SLOTS_TOTAL_WIDTH,
                    }}
                >
                    {CONSUMER_CONFIG.map((config, idx) => {
                        const advances = Math.min(
                            Math.floor(cycleElapsedMs / config.speedMs),
                            STREAM_SIZE - config.startPosition,
                        );
                        const position = config.startPosition + advances;
                        const xPos = slotCenterX(position);
                        const pillTop = idx * ROW_HEIGHT + 8;
                        const lineHeight = pillTop;
                        const isCaughtUp = position >= STREAM_SIZE;
                        const transition = "left 0.45s cubic-bezier(0.4, 0, 0.2, 1)";

                        // Keying with cycleIndex forces a fresh mount on cycle
                        // reset, so the snap-back to startPosition has no
                        // CSS transition.
                        return (
                            <div
                                key={`${config.id}-${cycleIndex}`}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                }}
                            >
                                {/* Arrowhead pointing up at the slot */}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: xPos,
                                        top: -2,
                                        transform: "translateX(-50%)",
                                        transition,
                                        color: config.color,
                                        fontSize: 10,
                                        lineHeight: 1,
                                    }}
                                >
                                    ▲
                                </div>

                                {/* Connector line */}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: xPos - 1,
                                        top: 6,
                                        width: 2,
                                        height: lineHeight - 4,
                                        background: config.color,
                                        transition,
                                        opacity: 0.8,
                                    }}
                                />

                                {/* Pill */}
                                <div
                                    style={{
                                        position: "absolute",
                                        left: xPos,
                                        top: pillTop,
                                        transform: "translateX(-50%)",
                                        transition,
                                        padding: "3px 10px",
                                        background: config.bg,
                                        border: `1px solid ${config.color}`,
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: config.color,
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {config.name}{" "}
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            color: "#6b7280",
                                        }}
                                    >
                                        {isCaughtUp
                                            ? "(caught up)"
                                            : `at #${position}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// width / height are accepted for API parity with the NatsFlow loader and
// peer scenarios, but the diagram self-sizes from the stream slot count
// (the inner container uses width: fit-content), so they aren't applied.
export function JetStreamConsumersAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <JetStreamConsumersAnimatedInner />;
}
