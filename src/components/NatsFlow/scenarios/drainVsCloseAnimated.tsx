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
const SUCCESS_COLOR = "#34A574"; // NATS green — clean shutdown
const FAILURE_COLOR = "#ef4444"; // red — dropped / abrupt teardown
const NAVY = "#375C93"; // accent navy

// We tell two stories side by side over the ORDERS world. The top row is the
// Close() path (abrupt); the bottom row is the Drain() path (graceful). Each
// stage isolates one mechanism, and the cycle loops forever.
type Stage =
    | "steady"
    | "closeCall"
    | "closeDropped"
    | "drainUnsub"
    | "drainFlush"
    | "drainClosed";

const STAGE_ORDER: Stage[] = [
    "steady",
    "closeCall",
    "closeDropped",
    "drainUnsub",
    "drainFlush",
    "drainClosed",
];

const STAGE_DURATION_MS: Record<Stage, number> = {
    steady: 3000,
    closeCall: 3000,
    closeDropped: 3500,
    drainUnsub: 3000,
    drainFlush: 4000,
    drainClosed: 4500,
};

const CAPTION: Record<Stage, string> = {
    steady:
        "Both apps are healthy: each holds a connection to the server, with subscriptions on orders.* delivering messages to their handlers.",
    closeCall:
        "Close() path — the app calls Close(). The socket is torn down at once, with no chance to process what is already in flight.",
    closeDropped:
        "Close() path — messages the server had already pushed are dropped on the floor, and any unflushed publishes never reach the server (red).",
    drainUnsub:
        "Drain() path — Drain() first sends UNSUB so the server stops delivering new messages, but the connection stays open to finish what is buffered.",
    drainFlush:
        "Drain() path — the last in-flight messages run through the handlers and pending publishes are flushed to the server. Nothing is lost (green).",
    drainClosed:
        "Drain() path — only once handlers and the outbound buffer are empty does the connection close cleanly. Drain trades a little time for zero message loss.",
};

function DrainVsCloseAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("steady");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const isCloseStage = stage === "closeCall" || stage === "closeDropped";
    const isDrainStage = stage === "drainUnsub" || stage === "drainFlush" ||
        stage === "drainClosed";

    // The Close() connection is gone once it has been torn down.
    const closeTorn = stage === "closeDropped";
    // The Drain() connection finally closes — but cleanly.
    const drainClosed = stage === "drainClosed";

    const dimStyle = (faded: boolean): React.CSSProperties => ({
        opacity: faded ? 0.3 : 1,
        filter: faded ? "grayscale(1)" : "none",
        transition: "opacity 0.4s ease, filter 0.4s ease",
    });

    // --- Nodes: two parallel app -> connection -> subscription -> server rows.
    const nodes: any[] = [
        // Top row — Close() path.
        {
            id: "closeApp",
            type: "publisher",
            position: { x: -56, y: 30 },
            data: { label: "App (Close)" },
            style: dimStyle(false),
        },
        {
            id: "closeSub",
            type: "subscriber",
            position: { x: 294, y: 30 },
            data: { label: "orders.* sub" },
            style: dimStyle(closeTorn),
        },
        {
            id: "closeServer",
            type: "server",
            position: { x: 644, y: 30 },
            data: { label: "server" },
            style: dimStyle(false),
        },
        // Bottom row — Drain() path.
        {
            id: "drainApp",
            type: "publisher",
            position: { x: -56, y: 250 },
            data: { label: "App (Drain)" },
            style: dimStyle(false),
        },
        {
            id: "drainSub",
            type: "subscriber",
            position: { x: 294, y: 250 },
            data: { label: "orders.* sub" },
            style: dimStyle(drainClosed),
        },
        {
            id: "drainServer",
            type: "server",
            position: { x: 644, y: 250 },
            data: { label: "server" },
            style: dimStyle(false),
        },
    ];

    const edges: any[] = [];

    // ===== Top row: Close() path =====

    // server -> subscription: delivery of in-flight messages.
    // Steady: blue active. closeCall: still arriving (blue). closeDropped: red,
    // these are the messages dropped on teardown.
    const closeDeliverActive = stage === "steady" || stage === "closeCall";
    edges.push({
        id: `close-srv-sub-${stage}`,
        source: "closeServer",
        target: "closeSub",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: closeTorn ? 0.5 : 1 },
        data: {
            color: closeTorn
                ? FAILURE_COLOR
                : closeDeliverActive
                ? MSG_COLOR
                : IDLE_COLOR,
            label: closeTorn ? "dropped" : "deliver",
            labelColor: closeTorn ? FAILURE_COLOR : "#64748b",
            animated: closeDeliverActive,
            interval: 1500,
        },
    });

    // subscription -> app: handler receiving messages. Severed on teardown.
    edges.push({
        id: `close-sub-app-${stage}`,
        source: "closeSub",
        target: "closeApp",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: closeTorn ? 0.4 : 1 },
        data: {
            color: closeTorn
                ? FAILURE_COLOR
                : closeDeliverActive
                ? MSG_COLOR
                : IDLE_COLOR,
            animated: stage === "steady",
            interval: 1500,
        },
    });

    // app -> server: the Close() call / pending publish that never flushes.
    edges.push({
        id: `close-app-srv-${stage}`,
        source: "closeApp",
        target: "closeServer",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: closeTorn ? 0.4 : 1 },
        data: {
            color: stage === "closeCall"
                ? FAILURE_COLOR
                : closeTorn
                ? FAILURE_COLOR
                : IDLE_COLOR,
            label: stage === "closeCall"
                ? "Close()"
                : closeTorn
                ? "unflushed"
                : undefined,
            labelColor: FAILURE_COLOR,
            animated: stage === "closeCall",
            interval: 1500,
        },
    });

    // ===== Bottom row: Drain() path =====

    // app -> server: the UNSUB request that Drain sends first.
    edges.push({
        id: `drain-app-srv-${stage}`,
        source: "drainApp",
        target: "drainServer",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: drainClosed ? 0.4 : 1 },
        data: {
            color: stage === "drainUnsub"
                ? SUCCESS_COLOR
                : stage === "drainFlush"
                ? MSG_COLOR
                : IDLE_COLOR,
            label: stage === "drainUnsub"
                ? "UNSUB"
                : stage === "drainFlush"
                ? "flush"
                : undefined,
            labelOffset: -72,
            labelColor: stage === "drainUnsub" ? SUCCESS_COLOR : MSG_COLOR,
            animated: stage === "drainUnsub" || stage === "drainFlush",
            interval: 1500,
        },
    });

    // server -> subscription: last in-flight messages still being delivered
    // during drain, then the link goes idle once closed.
    edges.push({
        id: `drain-srv-sub-${stage}`,
        source: "drainServer",
        target: "drainSub",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: drainClosed ? 0.4 : 1 },
        data: {
            color: stage === "drainFlush"
                ? MSG_COLOR
                : stage === "steady"
                ? IDLE_COLOR
                : IDLE_COLOR,
            label: stage === "drainFlush" ? "in-flight" : undefined,
            labelColor: "#64748b",
            animated: stage === "drainFlush",
            interval: 1500,
        },
    });

    // subscription -> app: handlers draining the buffered messages.
    edges.push({
        id: `drain-sub-app-${stage}`,
        source: "drainSub",
        target: "drainApp",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: drainClosed ? 0.4 : 1 },
        data: {
            color: drainClosed
                ? SUCCESS_COLOR
                : stage === "drainFlush"
                ? MSG_COLOR
                : IDLE_COLOR,
            label: drainClosed ? "closed" : undefined,
            labelOffset: -72,
            labelColor: SUCCESS_COLOR,
            animated: stage === "drainFlush",
            interval: 1500,
        },
    });

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "5px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active
            ? isCloseStage ? FAILURE_COLOR : isDrainStage ? SUCCESS_COLOR : NAVY
            : "#ffffff",
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

export function DrainVsCloseAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <DrainVsCloseAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
