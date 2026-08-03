import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BoxNode, ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

// wsUpgradeAnimated
// One connection, five steps: an HTTP request asking to change protocols, the
// 101 response, then ordinary NATS protocol messages as binary frames.
//
// The exchange is strictly sequential, so exactly one edge is drawn at a time
// and its direction flips per step. BoxNode and ServerNode both expose their
// request/reply handles at vertical centre on the facing sides, so every step
// draws on the same horizontal line rather than fanning into parallel arrows.

// Scenario metadata picked up by scripts/rehype-nats-flow.mjs — the plugin
// reads the first description key it finds in this file, so keep this object
// first and don't add that key anywhere else.
export const wsUpgradeMeta = {
    description:
        "A WebSocket connection to NATS starts as an HTTP request carrying an Upgrade header. The server answers 101 Switching Protocols, and from that point the same TCP connection carries ordinary NATS protocol messages inside binary WebSocket frames: the server sends INFO, the client replies with CONNECT, and subscriptions and messages follow. Only the first exchange is HTTP; everything after it is the protocol a nats:// connection would use, which is why subjects, queue groups and JetStream behave identically over either transport.",
};

const nodeTypes = {
    box: BoxNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

const HTTP_COLOR = "#f59e0b"; // amber — the HTTP phase
const SWITCH_COLOR = "#8DC63F"; // lime — the 101 that ends it
const NATS_COLOR = "#27AAE1"; // brand blue — NATS protocol in frames

type Stage = "upgrade" | "switching" | "info" | "connect" | "traffic";

const STAGE_ORDER: Stage[] = [
    "upgrade",
    "switching",
    "info",
    "connect",
    "traffic",
];

const STAGE_DURATION_MS: Record<Stage, number> = {
    upgrade: 5500,
    switching: 5000,
    info: 5000,
    connect: 5000,
    traffic: 6500,
};

// Every step is one message in one direction. "out" is client to server.
const STEP: Record<
    Stage,
    { dir: "out" | "in"; color: string; label: string; caption: string }
> = {
    upgrade: {
        dir: "out",
        color: HTTP_COLOR,
        label: "GET / — Upgrade: websocket",
        caption:
            "The client opens a normal HTTP request to the websocket{} listener, asking to change protocols. This is the only HTTP in the whole exchange.",
    },
    switching: {
        dir: "in",
        color: SWITCH_COLOR,
        label: "101 Switching Protocols",
        caption:
            "The server agrees. The TCP connection stays open, and both sides stop speaking HTTP.",
    },
    info: {
        dir: "in",
        color: NATS_COLOR,
        label: "INFO {…}",
        caption:
            "Now it's NATS. The server sends INFO first, exactly as it would on a nats:// connection — carried in a binary WebSocket frame.",
    },
    connect: {
        dir: "out",
        color: NATS_COLOR,
        label: "CONNECT {…}",
        caption:
            "The client answers with CONNECT, naming its options and any credentials. That completes the NATS handshake.",
    },
    traffic: {
        dir: "in",
        color: NATS_COLOR,
        label: "MSG orders.new 1 8",
        caption:
            "Subscriptions and messages flow for as long as the connection lives. Subjects, wildcards, queue groups and JetStream behave exactly as they do over TCP, because above the transport this is the same protocol.",
    },
};

const STEP_LABELS: Record<Stage, string> = {
    upgrade: "1. Upgrade request",
    switching: "2. 101 Switching",
    info: "3. INFO",
    connect: "4. CONNECT",
    traffic: "5. SUB / MSG",
};

function WsUpgradeAnimatedInner({
    width = 660,
    height = 260,
}: {
    width?: number;
    height?: number;
}) {
    const [stageIndex, setStageIndex] = useState<number>(0);

    useEffect(() => {
        const stage = STAGE_ORDER[stageIndex];
        const timer = setTimeout(() => {
            setStageIndex((i) => (i + 1) % STAGE_ORDER.length);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stageIndex]);

    const stage = STAGE_ORDER[stageIndex];
    const step = STEP[stage];
    const isHttpPhase = stage === "upgrade" || stage === "switching";

    // y values chosen so the two nodes' vertical centres line up: ServerNode
    // renders 95px tall against BoxNode's 41, so the client sits (95-41)/2 = 27
    // lower. That is what keeps the edge exactly horizontal.
    const nodes: any[] = [
        {
            id: "client",
            type: "box",
            position: { x: 40, y: 147 },
            data: { label: "browser client" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 420, y: 120 },
            data: { label: "nats-server", subtitle: "websocket {} listener" },
        },
    ];

    // Exactly one edge, redrawn per step. Both directions use the facing-side
    // centre handles, so the line never moves — only the arrow and label do.
    const outbound = step.dir === "out";
    const edges: any[] = [
        {
            // Re-key per stage so AnimatedEdge remounts and spawns a fresh bubble.
            id: `msg-${stage}`,
            source: outbound ? "client" : "server",
            target: outbound ? "server" : "client",
            sourceHandle: outbound ? "request-out" : "reply-out",
            targetHandle: outbound ? "request-in" : "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: step.color,
                label: step.label,
                labelColor: step.color,
                animated: true,
                interval: 1500,
            },
        },
    ];

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "4px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? "#27AAE1" : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    const phaseStyle = (variant: "http" | "nats"): React.CSSProperties => ({
        position: "absolute",
        top: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "4px 12px",
        background: variant === "http" ? "#fffbeb" : "#eff6ff",
        border: `1px solid ${variant === "http" ? "#fbbf24" : "#27AAE1"}`,
        borderRadius: "999px",
        fontSize: "11px",
        color: variant === "http" ? "#92400e" : "#1e40af",
        fontWeight: 600,
        whiteSpace: "nowrap",
    });

    return (
        <div style={{ position: "relative" }}>
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                {STAGE_ORDER.map((s, i) => (
                    <button
                        key={s}
                        onClick={() => setStageIndex(i)}
                        style={buttonStyle(stage === s)}
                    >
                        {STEP_LABELS[s]}
                    </button>
                ))}
            </div>

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

                <div style={phaseStyle(isHttpPhase ? "http" : "nats")}>
                    {isHttpPhase
                        ? "HTTP — one exchange"
                        : "NATS protocol in binary frames"}
                </div>
            </div>

            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                    minHeight: "34px",
                }}
            >
                <strong style={{ color: "#374151" }}>
                    {stageIndex + 1}/{STAGE_ORDER.length}
                </strong>{" "}
                {step.caption}
            </div>
        </div>
    );
}

export function WsUpgradeAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <WsUpgradeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
