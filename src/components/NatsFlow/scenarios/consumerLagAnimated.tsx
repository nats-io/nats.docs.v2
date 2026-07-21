import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — quiet edges
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const COMMIT_COLOR = "#34A574"; // NATS green — ack / cursor advance
const FAIL_COLOR = "#ef4444"; // red — failed delivery / redelivery
const NAVY = "#375C93"; // navy — the stream log
const LIME = "#8DC63F"; // lime accent

// The ORDERS stream is a log. The shipping consumer keeps a cursor.
// Lag = LastSeq - Delivered. Each stage tells one piece of that story.
type Stage = "append" | "lag" | "fetch" | "ack" | "redeliver";

const STAGE_ORDER: Stage[] = [
    "append",
    "lag",
    "fetch",
    "ack",
    "redeliver",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    append: 3000,
    lag: 3500,
    fetch: 3000,
    ack: 3000,
    redeliver: 4500,
};

const CAPTION: Record<Stage, string> = {
    append:
        "order-svc appends new orders to the ORDERS stream. The log head — LastSeq — advances to 1000.",
    lag:
        "The shipping consumer's cursor sits at Delivered 980. The gap between LastSeq and the cursor is consumer lag = 20: messages waiting to be worked.",
    fetch:
        "warehouse fetches the next batch. Those messages are now in-flight — delivered to a worker but not yet acknowledged.",
    ack:
        "warehouse acks the batch. The shipping cursor advances toward LastSeq, shrinking the lag — the consumer is catching up.",
    redeliver:
        "One message failed before its ack deadline. JetStream pulls it back and redelivers it, ticking NumRedelivered to 1 — redelivery replays a message from behind the cursor.",
};

function ConsumerLagAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("append");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // Cursor (Delivered) position as the consumer catches up.
    // append/lag/fetch: 980 (fetch is in-flight, not yet acked),
    // ack/redeliver: 998 — the batch has been acknowledged.
    const lastSeq = 1000;
    const delivered = stage === "ack" || stage === "redeliver" ? 998 : 980;
    const lag = lastSeq - delivered;
    const inFlight = stage === "fetch";
    const numRedelivered = stage === "redeliver" ? 1 : 0;

    // Layout: publisher -> stream log; the log feeds the cursor (the gap)
    // and serves the worker. Subscriber nodes are only ever edge targets.
    const nodes: any[] = [
        {
            id: "publisher",
            type: "publisher",
            position: { x: -40, y: 150 },
            data: { label: "order-svc" },
        },
        {
            id: "stream",
            type: "box",
            position: { x: 210, y: 60 },
            data: { label: `ORDERS  LastSeq ${lastSeq}`, subtitle: "stream" },
        },
        {
            id: "cursor",
            type: "subscriber",
            position: { x: 210, y: 280 },
            data: { label: `shipping  Delivered ${delivered}` },
            style: {
                outline: lag > 0 ? `2px solid ${FAIL_COLOR}` : "none",
                outlineOffset: "3px",
                borderRadius: "8px",
                transition: "outline 0.4s ease",
            },
        },
        {
            id: "worker",
            type: "subscriber",
            position: { x: 500, y: 170 },
            data: {
                label: numRedelivered > 0
                    ? `warehouse  redeliv ${numRedelivered}`
                    : "warehouse",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> ORDERS: appends advance LastSeq (active on "append") ---
    edges.push({
        id: `pub-stream-${stage}`,
        source: "publisher",
        target: "stream",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "append" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "append" ? "append → 1000" : "append",
            labelColor: stage === "append" ? MSG_COLOR : "#64748b",
            animated: stage === "append",
            interval: 1500,
        },
    });

    // --- The lag gap: ORDERS -> shipping cursor.
    // Highlighted red on "lag", green while shrinking on "ack". ---
    const lagActive = stage === "lag";
    const lagShrinking = stage === "ack";
    edges.push({
        id: `stream-cursor-${stage}`,
        source: "stream",
        target: "cursor",
        sourceHandle: "bottom-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: lag > 0 || lagShrinking ? 1 : 0.4 },
        data: {
            color: lagActive
                ? FAIL_COLOR
                : lagShrinking
                ? COMMIT_COLOR
                : NAVY,
            label: lagShrinking ? `ack → lag ${lag}` : `lag ${lag}`,
            labelColor: lagActive
                ? FAIL_COLOR
                : lagShrinking
                ? COMMIT_COLOR
                : "#64748b",
            animated: lagActive || lagShrinking,
            interval: 1500,
        },
    });

    // --- ORDERS -> warehouse: serves the fetched batch.
    // Blue + in-flight on "fetch"; red replay on "redeliver". ---
    const serving = inFlight || stage === "redeliver";
    edges.push({
        id: `stream-worker-${stage}`,
        source: "stream",
        target: "worker",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: serving ? 1 : 0.4 },
        data: {
            color: stage === "redeliver"
                ? FAIL_COLOR
                : inFlight
                ? MSG_COLOR
                : IDLE_COLOR,
            label: stage === "redeliver"
                ? "redeliver"
                : inFlight
                ? "in-flight"
                : "fetch",
            labelColor: stage === "redeliver"
                ? FAIL_COLOR
                : inFlight
                ? MSG_COLOR
                : "#64748b",
            animated: serving,
            interval: stage === "redeliver" ? 1200 : 1500,
        },
    });

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

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

            {/* Live metrics strip */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    fontFamily: "monospace",
                }}
            >
                <span style={{ color: NAVY }}>
                    LastSeq <strong>{lastSeq}</strong>
                </span>
                <span style={{ color: COMMIT_COLOR }}>
                    Delivered <strong>{delivered}</strong>
                </span>
                <span style={{ color: lag > 0 ? FAIL_COLOR : COMMIT_COLOR }}>
                    Lag <strong>{lag}</strong>
                </span>
                <span style={{ color: inFlight ? MSG_COLOR : IDLE_COLOR }}>
                    In-flight <strong>{inFlight ? "yes" : "0"}</strong>
                </span>
                <span
                    style={{ color: numRedelivered > 0 ? FAIL_COLOR : LIME }}
                >
                    NumRedelivered <strong>{numRedelivered}</strong>
                </span>
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
                    fitViewOptions={{ padding: 0.2 }}
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

export function ConsumerLagAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ConsumerLagAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
