import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const IDLE_COLOR = "#94a3b8"; // idle link (gray)
const DROP_COLOR = "#ef4444"; // dropped / overflow message (red)
const ERROR_COLOR = "#ef4444"; // SlowConsumer async error
const NAVY = "#375C93";

// The warehouse subscriber's pending buffer can hold this many messages
// before NATS gives up and drops the slow consumer.
const PENDING_LIMIT = 5;

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "publish" | "fill" | "lag" | "overflow" | "drop";

const STAGE_ORDER: Stage[] = [
    "publish",
    "fill",
    "lag",
    "overflow",
    "drop",
];

// How many messages sit in warehouse's pending buffer at each stage.
const BUFFER_FILL: Record<Stage, number> = {
    publish: 1,
    fill: 3,
    lag: 5,
    overflow: 5,
    drop: 0,
};

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 2800,
    fill: 3000,
    lag: 3500,
    overflow: 3200,
    drop: 4500,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "order-svc publishes ORDERS messages fast. The server forwards each one toward the warehouse subscriber.",
    fill:
        "warehouse handles messages slower than they arrive, so the server's outbound buffer for this subscriber starts filling up.",
    lag:
        "The pending buffer hits its limit (5 messages / max-pending bytes). The slow handler still hasn't drained it.",
    overflow:
        "The next message can't fit. Rather than block the whole server, NATS drops the overflow message for this one slow subscriber.",
    drop:
        "The warehouse client drops the overflow and fires its async error callback — the signal is raised inside the application, nothing crosses the wire. The app can react: scale out, drop work, or fix the handler.",
};

function SlowConsumerAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("publish");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const atLimit = stage === "lag" || stage === "overflow";
    const overflowing = stage === "overflow" || stage === "drop";
    const erroring = stage === "drop";

    const nodes: any[] = [
        // Fast publisher.
        {
            id: "orderSvc",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: { label: "order-svc" },
        },
        // The server.
        {
            id: "server",
            type: "server",
            position: { x: 230, y: 150 },
            data: { label: "server" },
        },
        // Slow subscriber — flashes red when the SlowConsumer error fires.
        {
            id: "warehouse",
            type: "subscriber",
            position: { x: 470, y: 150 },
            data: { label: "warehouse" },
            style: {
                opacity: 1,
                filter: erroring
                    ? "drop-shadow(0 0 6px #ef4444)"
                    : "none",
                transition: "filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> server: the publisher keeps producing fast ---
    edges.push({
        id: `pub-${stage}`,
        source: "orderSvc",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: MSG_COLOR,
            label: "ORDERS",
            labelColor: NAVY,
            // Publisher is always pushing across the whole story.
            animated: true,
            interval: 1200,
        },
    });

    // --- server -> warehouse: delivery, then the overflow drop ---
    if (overflowing) {
        // The overflow message can't be buffered: it animates to a drop.
        edges.push({
            id: `drop-${stage}`,
            source: "server",
            target: "warehouse",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 1 },
            data: {
                color: DROP_COLOR,
                label: "dropped",
                labelColor: DROP_COLOR,
                animated: true,
                interval: 1400,
            },
        });
    } else {
        // Normal (but lagging) delivery into the buffer.
        const delivering = stage === "publish" || stage === "fill" ||
            stage === "lag";
        edges.push({
            id: `deliver-${stage}`,
            source: "server",
            target: "warehouse",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: atLimit ? 0.6 : 1 },
            data: {
                color: delivering ? MSG_COLOR : IDLE_COLOR,
                label: atLimit ? "buffering" : "deliver",
                labelColor: atLimit ? NAVY : "#64748b",
                animated: delivering,
                interval: 2200, // slow drain — handler can't keep up
            },
        });
    }

    // The slow-consumer signal is deliberately not an edge. This page covers the
    // *local* slow consumer: the client library drops the overflow and fires the
    // async error callback inside the application, so nothing travels back to
    // the server. It shows as a badge on the warehouse client instead.

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;
    const filled = BUFFER_FILL[stage];

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "5px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? MSG_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    // Pending-buffer overlay: PENDING_LIMIT slots that fill blue, turn navy at
    // the limit, and show a red overflow slot when a message is dropped.
    const slotColor = (i: number): string => {
        if (i >= PENDING_LIMIT) return DROP_COLOR;
        if (i >= filled) return "#e5e7eb"; // empty slot
        return atLimit ? NAVY : MSG_COLOR; // occupied slot
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Stage stepper */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <span
                    style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginRight: "4px",
                    }}
                >
                    Stage:
                </span>
                {STAGE_ORDER.map((s) => (
                    <button
                        key={s}
                        onClick={() => setStage(s)}
                        style={buttonStyle(stage === s)}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Diagram */}
            <div
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.25 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    panOnDrag={false}
                    preventScrolling={true}
                    minZoom={0.4}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* The async error callback firing, on the client itself */}
                {erroring && (
                    <div
                        style={{
                            position: "absolute",
                            right: "16px",
                            bottom: "110px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#fef2f2",
                            border: `1px solid ${ERROR_COLOR}`,
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#b91c1c",
                            whiteSpace: "nowrap",
                        }}
                    >
                        ⚠ async error callback — SlowConsumer
                    </div>
                )}

                {/* Pending-buffer overlay, anchored under the warehouse node */}
                <div
                    style={{
                        position: "absolute",
                        right: "16px",
                        bottom: "16px",
                        background: "rgba(255,255,255,0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                >
                    <div
                        style={{
                            fontSize: "10px",
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            fontWeight: 600,
                            marginBottom: "5px",
                        }}
                    >
                        warehouse pending buffer
                    </div>
                    <div style={{ display: "flex", gap: "4px" }}>
                        {Array.from(
                            { length: PENDING_LIMIT + 1 },
                            (_, i) => i,
                        ).map((i) => {
                            const isOverflow = i >= PENDING_LIMIT;
                            const show = isOverflow ? overflowing : true;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "3px",
                                        border: isOverflow
                                            ? `1px dashed ${DROP_COLOR}`
                                            : "1px solid #d1d5db",
                                        background: show
                                            ? slotColor(i)
                                            : "transparent",
                                        opacity: show ? 1 : 0.3,
                                        transition:
                                            "background 0.4s ease, opacity 0.4s ease",
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div
                        style={{
                            fontSize: "10px",
                            color: atLimit || overflowing ? DROP_COLOR : "#6b7280",
                            marginTop: "5px",
                            fontWeight: 500,
                        }}
                    >
                        {overflowing
                            ? "limit exceeded — dropping"
                            : `${filled} / ${PENDING_LIMIT} pending`}
                    </div>
                </div>
            </div>

            {/* Caption */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                    minHeight: "34px",
                }}
            >
                <strong style={{ color: "#374151" }}>
                    {stageNum}/{STAGE_ORDER.length}
                </strong>{" "}
                {CAPTION[stage]}
            </div>
        </div>
    );
}

export function SlowConsumerAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <SlowConsumerAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
