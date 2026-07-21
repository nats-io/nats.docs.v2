import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode, SubscriberNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — in-flight redelivery
const IDLE_COLOR = "#94a3b8"; // idle / gray
const COMMIT_COLOR = "#34A574"; // NATS green — advisory delivered
const FAIL_COLOR = "#ef4444"; // red — poison message, limit hit
const NAVY = "#375C93"; // advisory subject accent

// One mechanism per stage; the cycle loops forever.
type Stage =
    | "redeliver"
    | "limit"
    | "emit"
    | "receive"
    | "latejoin";

const STAGE_ORDER: Stage[] = [
    "redeliver",
    "limit",
    "emit",
    "receive",
    "latejoin",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    redeliver: 4000,
    limit: 3000,
    emit: 3000,
    receive: 3000,
    latejoin: 4500,
};

const CAPTION: Record<Stage, string> = {
    redeliver:
        "The shipping consumer keeps redelivering one poison order. The client never acks, so JetStream retries: delivery 1, 2, 3, 4, 5.",
    limit:
        "On the 5th attempt the consumer's MaxDeliver limit is reached. JetStream gives up redelivering this message.",
    emit:
        "Hitting the limit, the JetStream layer on n2-east publishes exactly ONE advisory on $JS.EVENT.ADVISORY.MAX_DELIVERIES.ORDERS.shipping.",
    receive:
        "The monitoring subscriber is already subscribed to the advisory subject, so it receives the event and can alert on the stuck order.",
    latejoin:
        "A subscriber that joins later sees nothing — advisories are published once, in real time. Not subscribed at emit time means the event is missed.",
};

// Redelivery attempt shown per stage (1..5).
const DELIVERY_AT: Record<Stage, number> = {
    redeliver: 4,
    limit: 5,
    emit: 5,
    receive: 5,
    latejoin: 5,
};

function AdvisoryFlowAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("redeliver");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const limitHit = stage === "limit" || stage === "emit" ||
        stage === "receive" || stage === "latejoin";
    const advisoryLive = stage === "emit" || stage === "receive";
    const monitorGotIt = stage === "receive" || stage === "latejoin";
    const lateVisible = stage === "latejoin";

    const delivery = DELIVERY_AT[stage];

    const nodes: any[] = [
        // --- shipping consumer (the thing being redelivered to) ---
        {
            id: "shipping",
            type: "subscriber",
            position: { x: -70, y: 70 },
            data: {
                label: `shipping  (try ${delivery}/5)`,
            },
            style: {
                opacity: 1,
                filter: limitHit ? "grayscale(0.4)" : "none",
                transition: "filter 0.4s ease",
            },
        },
        // --- JetStream layer on n2-east ---
        {
            id: "n2",
            type: "server",
            position: { x: 200, y: 70 },
            data: { label: "n2-east  JetStream" },
        },
        // --- the advisory subject node ---
        {
            id: "subject",
            type: "box",
            position: { x: 470, y: 70 },
            data: { label: "$JS.EVENT.ADVISORY…\nMAX_DELIVERIES.ORDERS.shipping", subtitle: "advisory subject" },
            style: {
                opacity: advisoryLive || monitorGotIt ? 1 : 0.4,
                transition: "opacity 0.4s ease",
            },
        },
        // --- monitoring subscriber (subscribed before the event) ---
        {
            id: "monitor",
            type: "subscriber",
            position: { x: 470, y: 250 },
            data: { label: "monitor" },
        },
        // --- late-joining subscriber (only appears in the last stage) ---
        {
            id: "late",
            type: "subscriber",
            position: { x: 200, y: 250 },
            data: { label: "late subscriber" },
            style: {
                opacity: lateVisible ? 1 : 0.15,
                filter: lateVisible ? "grayscale(1)" : "grayscale(1)",
                transition: "opacity 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- n2 -> shipping: the redelivery loop (active while retrying) ---
    edges.push({
        id: `redeliver-${stage}`,
        source: "n2",
        target: "shipping",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: limitHit && stage !== "limit" ? 0.3 : 1 },
        data: {
            color: stage === "redeliver"
                ? MSG_COLOR
                : stage === "limit"
                ? FAIL_COLOR
                : IDLE_COLOR,
            label: stage === "redeliver"
                ? `redeliver #${delivery}`
                : stage === "limit"
                ? "MaxDeliver reached"
                : undefined,
            labelColor: stage === "limit" ? FAIL_COLOR : "#64748b",
            animated: stage === "redeliver",
            interval: 1500,
        },
    });

    // --- n2 (JetStream) -> advisory subject: ONE advisory at the limit ---
    edges.push({
        id: `emit-${stage}`,
        source: "n2",
        target: "subject",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: advisoryLive || monitorGotIt ? 1 : 0.25 },
        data: {
            color: advisoryLive ? NAVY : IDLE_COLOR,
            label: stage === "emit" ? "advisory ×1" : undefined,
            labelColor: NAVY,
            animated: stage === "emit",
            interval: 1500,
        },
    });

    // --- advisory subject -> monitor: real-time delivery to the subscriber ---
    edges.push({
        id: `receive-${stage}`,
        source: "subject",
        target: "monitor",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: monitorGotIt ? 1 : 0.25 },
        data: {
            color: monitorGotIt ? COMMIT_COLOR : IDLE_COLOR,
            label: stage === "receive" ? "delivered" : undefined,
            labelColor: COMMIT_COLOR,
            animated: stage === "receive",
            interval: 1500,
        },
    });

    // --- advisory subject -> late subscriber: nothing arrives (greyed) ---
    edges.push({
        id: `late-${stage}`,
        source: "subject",
        target: "late",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: lateVisible ? 0.4 : 0.1 },
        data: {
            color: IDLE_COLOR,
            label: lateVisible ? "no replay — missed" : undefined,
            labelColor: "#94a3b8",
            animated: false,
            interval: 1500,
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

export function AdvisoryFlowAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <AdvisoryFlowAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
