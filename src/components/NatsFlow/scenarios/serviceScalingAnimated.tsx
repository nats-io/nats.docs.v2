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

const edgeTypes = { animated: AnimatedEdge };

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — idle subscription link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const REPLY_COLOR = "#34A574"; // NATS green — reply in flight
const ACCENT_NAVY = "#375C93"; // queue-group accent

// The five OrderInventory instances all share queue group `q` and subscribe to
// `orders.inventory.check`. Each round, the server picks exactly one.
const INSTANCES = ["id1", "id2", "id3", "id4", "id5"] as const;
type InstanceId = typeof INSTANCES[number];

// Sequenced stages tell one mechanism per step, then loop.
type Stage =
    | "subscribe"
    | "request1"
    | "select1"
    | "reply1"
    | "request2"
    | "select2"
    | "reply2";

const STAGE_ORDER: Stage[] = [
    "subscribe",
    "request1",
    "select1",
    "reply1",
    "request2",
    "select2",
    "reply2",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    subscribe: 3500,
    request1: 2800,
    select1: 3000,
    reply1: 3000,
    request2: 2800,
    select2: 3000,
    reply2: 3000,
};

const CAPTION: Record<Stage, string> = {
    subscribe:
        "Five OrderInventory instances each subscribe to orders.inventory.check under the shared queue group q. To NATS they are one logical endpoint.",
    request1:
        "A client sends request #1 to orders.inventory.check. It reaches the server with no idea which instance will handle it.",
    select1:
        "The server picks one queue-group member at random — this round it routes request #1 to id3. Exactly one instance receives it.",
    reply1:
        "id3 processes the request and replies straight back to the client. No other instance saw the message.",
    request2:
        "The client sends request #2 to the same subject. Again it lands on the server, which load-balances independently.",
    select2:
        "This round the server picks id1. There is no coordinator — each request is balanced across the live members on its own.",
    reply2:
        "id1 replies to the client. Add or remove instances at any time and NATS spreads the load automatically — that is how services scale horizontally.",
};

// Which instance is chosen in each round, and during which stages it is hot.
const ROUND1_PICK: InstanceId = "id3";
const ROUND2_PICK: InstanceId = "id1";

function ServiceScalingAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("subscribe");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // Per-stage flags driving which edge carries the message.
    const requestActive = stage === "request1" || stage === "request2";
    const round1Selecting = stage === "select1";
    const round2Selecting = stage === "select2";
    const round1Replying = stage === "reply1";
    const round2Replying = stage === "reply2";

    // The instance currently lit up (chosen + still on screen for its reply).
    const hotInstance: InstanceId | null = round1Selecting || round1Replying
        ? ROUND1_PICK
        : round2Selecting || round2Replying
        ? ROUND2_PICK
        : null;

    // Vertical column of five service instances on the right.
    const instanceY = (idx: number) => idx * 78;

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: -54, y: instanceY(2) },
            data: { label: "client" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 310, y: instanceY(2) - 10 },
            data: { label: "nats-server" },
        },
    ];

    INSTANCES.forEach((id, idx) => {
        const isHot = hotInstance === id;
        nodes.push({
            id,
            type: "service",
            position: { x: 729, y: instanceY(idx) },
            data: { label: `OrderInventory ${id}` },
            style: {
                opacity: hotInstance && !isHot ? 0.4 : 1,
                filter: hotInstance && !isHot ? "grayscale(0.6)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        });
    });

    const edges: any[] = [];

    // --- client -> server (request in flight during request stages) ---
    edges.push({
        id: `client-server-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: requestActive ? MSG_COLOR : IDLE_COLOR,
            label: requestActive ? "orders.inventory.check" : undefined,
            labelColor: MSG_COLOR,
            animated: requestActive,
            interval: 1500,
        },
    });

    // --- server -> each instance (queue-group subscription links) ---
    // All five links exist always (the queue-group fan-in). Only the chosen
    // member's link lights up blue during its selection stage.
    INSTANCES.forEach((id) => {
        const isSelectedNow = (round1Selecting && id === ROUND1_PICK) ||
            (round2Selecting && id === ROUND2_PICK);
        const dim = hotInstance && hotInstance !== id;
        edges.push({
            id: `server-${id}-${stage}`,
            source: "server",
            target: id,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: dim ? 0.2 : 1 },
            data: {
                color: isSelectedNow
                    ? MSG_COLOR
                    : stage === "subscribe"
                    ? ACCENT_NAVY
                    : IDLE_COLOR,
                label: stage === "subscribe" && id === "id3" ? "queue: q" : undefined,
                labelColor: ACCENT_NAVY,
                animated: isSelectedNow,
                interval: 1500,
            },
        });
    });

    // --- chosen instance -> client (reply in flight during reply stages) ---
    if (round1Replying || round2Replying) {
        const replier = round1Replying ? ROUND1_PICK : ROUND2_PICK;
        edges.push({
            id: `${replier}-client-reply-${stage}`,
            source: replier,
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                // The server sits between the instances and the client, so this
                // arcs under it rather than laying its label on the node.
                bow: 115,
                color: REPLY_COLOR,
                label: "reply",
                labelOffset: 92,
                labelColor: REPLY_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

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

export function ServiceScalingAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ServiceScalingAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
