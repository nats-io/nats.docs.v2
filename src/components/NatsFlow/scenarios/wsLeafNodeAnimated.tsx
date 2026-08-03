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

// wsLeafNodeAnimated
// A branch leaf node reaches its hub through the HTTPS ingress that fronts the
// cluster. The ingress publishes only HTTP routes, so the WebSocket listener
// is the endpoint published through it — the same one browser clients use.

// Scenario metadata picked up by scripts/rehype-nats-flow.mjs — the plugin
// reads the first description key it finds in this file, so keep this object
// first and don't add that key anywhere else.
export const wsLeafNodeMeta = {
    description:
        "A retail branch runs a leaf node that reaches the east cluster through the HTTPS ingress in front of it. The ingress publishes only HTTP routes, so the leafnode port is not reachable through it and the WebSocket listener is — the same endpoint the browser dashboard uses. The remote points at wss://nats.acme.example:443, the scheme drives a TLS handshake, and the leaf registers exactly as it would over port 7422. Once the link is up, subject interest and messages flow in both directions across it.",
};

const nodeTypes = {
    server: ServerNode,
    box: BoxNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

const DIAL_COLOR = "#375C93"; // navy — the dial and TLS handshake
const TLS_COLOR = "#8DC63F"; // lime — the handshake the scheme triggers
const TRAFFIC_COLOR = "#27AAE1"; // brand blue — messages once the link is up
const IDLE_COLOR = "#cbd5e1";

type Stage = "dial" | "tls" | "up" | "traffic";

const STAGE_ORDER: Stage[] = ["dial", "tls", "up", "traffic"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    dial: 6000,
    tls: 5500,
    up: 5000,
    traffic: 6500,
};

const CAPTION: Record<Stage, string> = {
    dial: "The branch remote points at wss://nats.acme.example:443. That is the HTTPS ingress in front of the cluster — the leafnode port is not published through it, the WebSocket listener is.",
    tls: "The wss:// scheme is enough to trigger a TLS handshake — no tls{} block is needed for that. A tls{} block is what supplies a CA the branch does not already trust, and it turns TLS on by itself where the scheme has not.",
    up: "The hub accepts it as a leaf node. Nothing about the leaf node changed — same account, same subject interest — only the transport it arrived on.",
    traffic:
        "Orders flow to the branch and till events flow back across the one link, exactly as they would over port 7422.",
};

const STEP_LABELS: Record<Stage, string> = {
    dial: "1. Dial wss://",
    tls: "2. TLS handshake",
    up: "3. Leaf registered",
    traffic: "4. Traffic",
};

function WsLeafNodeAnimatedInner({
    width = 680,
    height = 380,
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

    const nodes: any[] = [
        {
            id: "branch",
            type: "server",
            position: { x: 20, y: 130 },
            data: { label: "branch-42", subtitle: "leaf node" },
        },
        {
            id: "ingress",
            type: "box",
            position: { x: 270, y: 140 },
            data: { label: "HTTPS ingress" },
        },
        {
            id: "hub",
            type: "server",
            position: { x: 500, y: 130 },
            data: { label: "n1-east", subtitle: "websocket {} listener" },
        },
    ];

    // Left segment: branch → ingress. Right segment: ingress → hub.
    const leftActive =
        stage === "dial"
            ? { color: DIAL_COLOR, label: "wss://nats.acme.example:443" }
            : stage === "tls"
              ? { color: TLS_COLOR, label: "TLS handshake" }
              : stage === "traffic"
                ? { color: TRAFFIC_COLOR, label: "till events" }
                : null;

    const rightActive =
        stage === "dial"
            ? { color: DIAL_COLOR, label: "routed to websocket listener" }
            : stage === "up"
              ? { color: DIAL_COLOR, label: "leaf registered" }
              : stage === "traffic"
                ? { color: TRAFFIC_COLOR, label: "orders.>" }
                : null;

    const edges: any[] = [
        {
            id: `left-${stage}`,
            source: "branch",
            target: "ingress",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: leftActive ? 1 : 0.4 },
            data: {
                color: leftActive ? leftActive.color : IDLE_COLOR,
                ...(leftActive
                    ? { label: leftActive.label, labelColor: leftActive.color }
                    : {}),
                animated: leftActive !== null,
                interval: 1500,
            },
        },
        {
            id: `right-${stage}`,
            source: "ingress",
            target: "hub",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: rightActive ? 1 : 0.25 },
            data: {
                color: rightActive ? rightActive.color : IDLE_COLOR,
                ...(rightActive
                    ? { label: rightActive.label, labelColor: rightActive.color }
                    : {}),
                animated: rightActive !== null,
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

                <div
                    style={{
                        position: "absolute",
                        bottom: "12px",
                        left: "12px",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: "#6b7280",
                        fontWeight: 600,
                    }}
                >
                    same listener the browser dashboard uses
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
                {CAPTION[stage]}
            </div>
        </div>
    );
}

export function WsLeafNodeAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <WsLeafNodeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
