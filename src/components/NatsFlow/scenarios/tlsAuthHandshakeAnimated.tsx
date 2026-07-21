import React, { useEffect, useState } from "react";
import {
    Background,
    Handle,
    MarkerType,
    Position,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

// The trust anchor is a certificate the client holds, not a NATS server, so it
// gets a plain box rather than the branded server node.
function CaNode({ data }: { data: any }) {
    return (
        <div
            style={{
                border: "2px dashed #375C93",
                borderRadius: "8px",
                background: "#ffffff",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "#375C93",
                whiteSpace: "nowrap",
            }}
        >
            {data.label}
            <Handle
                type="target"
                position={Position.Bottom}
                style={{ opacity: 0 }}
            />
        </div>
    );
}

const nodeTypes = {
    publisher: PublisherNode,
    server: ServerNode,
    ca: CaNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active step in flight
const IDLE_COLOR = "#94a3b8"; // gray — inactive link
const SUCCESS_COLOR = "#34A574"; // NATS green — PONG accepted
const FAILURE_COLOR = "#ef4444"; // red — -ERR rejected
const ACCENT_NAVY = "#375C93"; // navy — cert / CA validation accent

// Sequenced stages telling the TLS + auth story end to end. After +OK the
// machine shows the rejected branch, then loops back to the handshake.
type Stage = "tls" | "verify" | "connect" | "ok" | "reject";

const STAGE_ORDER: Stage[] = ["tls", "verify", "connect", "ok", "reject"];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    tls: 3000,
    verify: 3500,
    connect: 3000,
    ok: 4000,
    reject: 4500,
};

// Each stage lights up at most one edge. `null` = the dim idle link. One edge
// per direction keeps the lanes and their labels from stacking up.
type ActiveEdge = { color: string; label: string } | null;

const FORWARD: Record<Stage, ActiveEdge> = {
    tls: { color: MSG_COLOR, label: "TLS handshake" },
    verify: null,
    connect: { color: ACCENT_NAVY, label: "CONNECT + creds" },
    ok: null,
    reject: null,
};

const BACKWARD: Record<Stage, ActiveEdge> = {
    tls: null,
    verify: null,
    connect: null,
    ok: { color: SUCCESS_COLOR, label: "PONG" },
    reject: { color: FAILURE_COLOR, label: "-ERR Authorization Violation" },
};

const CAPTION: Record<Stage, string> = {
    tls:
        "In the default handshake the server first sends its INFO line in plaintext (advertising tls_required); the link then upgrades to TLS and the transport is encrypted. No credential is sent before this.",
    verify:
        "order-svc validates the server's certificate against its trusted CA. A cert signed by an unknown CA is rejected here — this is how the client knows it reached the real server.",
    connect:
        "Over the now-encrypted link, order-svc sends CONNECT carrying its credentials (a JWT, token, or user/password).",
    ok:
        "Credentials check out. The server confirms with a PONG and the connection is live — order-svc can now publish and subscribe.",
    reject:
        "If the credentials are wrong or expired, the server replies -ERR 'Authorization Violation' and closes the connection. The branch shows the rejected path.",
};

function TlsAuthHandshakeAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("tls");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const rejected = stage === "reject";

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 60, y: 180 },
            data: { label: "order-svc" },
            style: {
                opacity: rejected ? 0.55 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "server",
            type: "server",
            position: { x: 460, y: 180 },
            data: { label: "server (cert)" },
            style: {
                opacity: rejected ? 0.85 : 1,
                filter: rejected ? "grayscale(0.3)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // Trust anchor the client checks the server cert against. It sits
        // directly above the client so its edge runs straight up, clear of the
        // two client ↔ server lanes.
        {
            id: "ca",
            type: "ca",
            position: { x: 55, y: 30 },
            data: { label: "trusted CA" },
            style: {
                opacity: stage === "verify" ? 1 : 0.4,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    // One edge per direction of the client ↔ server link, plus the vertical
    // edge to the trust anchor. Every edge is re-keyed per stage so the
    // AnimatedEdge remounts and spawns a fresh bubble at each stage change.
    // The server → client direction pins the request-reply handles so the edge
    // runs between the facing sides of the pair instead of looping around.
    const forward = FORWARD[stage];
    const backward = BACKWARD[stage];
    const verifying = stage === "verify";

    const edges: any[] = [
        {
            id: `fwd-${stage}`,
            source: "client",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: forward ? 1 : 0.3 },
            data: {
                bow: -55,
                color: forward ? forward.color : IDLE_COLOR,
                ...(forward
                    ? { label: forward.label, labelColor: forward.color }
                    : {}),
                animated: forward !== null,
                interval: 1500,
            },
        },
        {
            id: `back-${stage}`,
            source: "server",
            target: "client",
            sourceHandle: "reply-out",
            targetHandle: "reply",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: backward ? 1 : 0.3 },
            data: {
                bow: 55,
                color: backward ? backward.color : IDLE_COLOR,
                ...(backward
                    ? {
                        label: backward.label,
                        labelColor: backward.color,
                        labelOffset: 15,
                    }
                    : {}),
                animated: backward !== null,
                interval: 1500,
            },
        },
        // Cert validation: the client checks the server cert against its CA.
        {
            id: `verify-${stage}`,
            source: "client",
            target: "ca",
            sourceHandle: "top-out",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: verifying ? 1 : 0.3 },
            data: {
                straight: true,
                color: verifying ? ACCENT_NAVY : IDLE_COLOR,
                ...(verifying
                    ? {
                        label: "verify cert vs CA",
                        labelColor: ACCENT_NAVY,
                        labelOffset: 0,
                    }
                    : {}),
                animated: verifying,
                interval: 1500,
            },
        },
    ];

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

export function TlsAuthHandshakeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <TlsAuthHandshakeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
