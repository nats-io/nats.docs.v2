import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, ServiceNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const REPLY_COLOR = "#34A574"; // NATS green — service reply
const ACCENT_NAVY = "#375C93"; // navy accent for the targeted instance

// Sequenced stages. Each advances on a timer; the cycle loops.
// The story: a broadcast discovery request fans to every instance, then a
// targeted query reaches exactly one instance by its id.
type Stage =
    | "ask-info"
    | "fan-info"
    | "reply-info"
    | "ask-stats"
    | "reply-stats";

const STAGE_ORDER: Stage[] = [
    "ask-info",
    "fan-info",
    "reply-info",
    "ask-stats",
    "reply-stats",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    "ask-info": 3000,
    "fan-info": 3000,
    "reply-info": 4000,
    "ask-stats": 3000,
    "reply-stats": 4000,
};

const CAPTION: Record<Stage, string> = {
    "ask-info":
        "The client publishes a request on $SRV.INFO.OrderInventory — the wildcard discovery subject every instance of the service subscribes to.",
    "fan-info":
        "The server fans the request out to all three running instances — id1, id2 and id3 — because they all listen on the same discovery subject.",
    "reply-info":
        "Each instance answers with its own INFO descriptor. The client learns every instance that is currently alive.",
    "ask-stats":
        "Now the client queries one instance directly: $SRV.STATS.OrderInventory.id2 carries the target's id in the subject.",
    "reply-stats":
        "Only id2 matches that subject, so only id2 replies with its STATS. Same service, but a precise targeted query instead of a broadcast.",
};

function ServiceDiscoveryAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("ask-info");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const targetedPhase = stage === "ask-stats" || stage === "reply-stats";

    // During the targeted phase, dim the two instances that don't match.
    const dimUntargeted = (id: string): React.CSSProperties => {
        const muted = targetedPhase && id !== "id2";
        return {
            opacity: muted ? 0.3 : 1,
            filter: muted ? "grayscale(1)" : "none",
            transition: "opacity 0.4s ease, filter 0.4s ease",
        };
    };

    // Client on the left, the server in the middle, three service instances
    // stacked on the right.
    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: -50, y: 150 },
            data: { label: "client" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 275, y: 150 },
            data: { label: "server" },
        },
        {
            id: "id1",
            type: "service",
            position: { x: 588, y: 30 },
            data: { label: "OrderInventory id1" },
            style: dimUntargeted("id1"),
        },
        {
            id: "id2",
            type: "service",
            position: { x: 588, y: 150 },
            data: { label: "OrderInventory id2" },
            style: dimUntargeted("id2"),
        },
        {
            id: "id3",
            type: "service",
            position: { x: 588, y: 270 },
            data: { label: "OrderInventory id3" },
            style: dimUntargeted("id3"),
        },
    ];

    const edges: any[] = [];

    // --- client -> server (the request leg) ---
    // Carries the broadcast INFO request, then later the targeted STATS request.
    const clientAsking = stage === "ask-info" || stage === "ask-stats";
    edges.push({
        id: `client-server-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: clientAsking
                ? (stage === "ask-stats" ? ACCENT_NAVY : MSG_COLOR)
                : IDLE_COLOR,
            label: stage === "ask-info"
                ? "$SRV.INFO.OrderInventory"
                : stage === "ask-stats"
                ? "$SRV.STATS.OrderInventory.id2"
                : undefined,
            labelColor: stage === "ask-stats" ? ACCENT_NAVY : MSG_COLOR,
            animated: clientAsking,
            interval: 1500,
        },
    });

    // --- server -> each instance, and each instance -> server (the replies) ---
    const instances = ["id1", "id2", "id3"];
    for (const id of instances) {
        // Forward request leg: fans to all three during fan-info; reaches only
        // id2 during the targeted ask-stats stage.
        const fansToThis = stage === "fan-info";
        const targetsThis = stage === "ask-stats" && id === "id2";
        const requestActive = fansToThis || targetsThis;
        edges.push({
            id: `server-${id}-${stage}`,
            source: "server",
            target: id,
            targetHandle: "request",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
                opacity: targetedPhase && id !== "id2" ? 0.2 : 1,
            },
            data: {
                color: requestActive
                    ? (targetsThis ? ACCENT_NAVY : MSG_COLOR)
                    : IDLE_COLOR,
                animated: requestActive,
                interval: 1500,
            },
        });

        // Reply leg: every instance replies during reply-info; only id2 replies
        // during reply-stats.
        const repliesInfo = stage === "reply-info";
        const repliesStats = stage === "reply-stats" && id === "id2";
        const replyActive = repliesInfo || repliesStats;
        edges.push({
            id: `${id}-server-reply-${stage}`,
            source: id,
            target: "server",
            sourceHandle: "reply",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
                opacity: targetedPhase && id !== "id2" ? 0.2 : 1,
            },
            data: {
                color: replyActive ? REPLY_COLOR : IDLE_COLOR,
                label: repliesInfo
                    ? "INFO"
                    : repliesStats
                    ? "STATS"
                    : undefined,
                labelColor: REPLY_COLOR,
                animated: replyActive,
                interval: 1500,
            },
        });
    }

    // --- server -> client (final reply delivery back to the client) ---
    const deliveringReply = stage === "reply-info" || stage === "reply-stats";
    edges.push({
        id: `server-client-${stage}`,
        source: "server",
        target: "client",
        // The client sits to the left, so leave from the server's left-hand
        // reply handle and take a lane under the outbound request.
        sourceHandle: "reply-out",
        targetHandle: "reply",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: deliveringReply ? 1 : 0.35 },
        data: {
            bow: 55,
            color: deliveringReply ? REPLY_COLOR : IDLE_COLOR,
            animated: deliveringReply,
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

export function ServiceDiscoveryAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ServiceDiscoveryAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
