import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active step in flight
const IDLE_COLOR = "#94a3b8"; // gray — inactive link
const SUCCESS_COLOR = "#34A574"; // NATS green — +OK accepted
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

const CAPTION: Record<Stage, string> = {
    tls:
        "order-svc opens a TLS handshake with the server. Before any NATS protocol flows, the transport is encrypted.",
    verify:
        "order-svc validates the server's certificate against its trusted CA. A cert signed by an unknown CA is rejected here — this is how the client knows it reached the real server.",
    connect:
        "Over the now-encrypted link, order-svc sends CONNECT carrying its credentials (a JWT, token, or user/password).",
    ok:
        "Credentials check out. The server replies +OK and the connection is live — order-svc can now publish and subscribe.",
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
            position: { x: 60, y: 140 },
            data: { label: "order-svc" },
            style: {
                opacity: rejected ? 0.55 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "server",
            type: "server",
            position: { x: 420, y: 140 },
            data: { label: "server (cert)" },
            style: {
                opacity: rejected ? 0.85 : 1,
                filter: rejected ? "grayscale(0.3)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // Trust anchor the client checks the server cert against.
        {
            id: "ca",
            type: "server",
            position: { x: 60, y: -20 },
            data: { label: "trusted CA" },
            style: {
                opacity: stage === "verify" ? 1 : 0.4,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- 1. TLS handshake: client -> server ---
    edges.push({
        id: `tls-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "tls" ? MSG_COLOR : IDLE_COLOR,
            label: "TLS handshake",
            labelColor: stage === "tls" ? MSG_COLOR : "#64748b",
            animated: stage === "tls",
            interval: 1500,
        },
    });

    // --- 2. Cert validation: client checks server cert against the CA ---
    edges.push({
        id: `verify-${stage}`,
        source: "client",
        target: "ca",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "verify" ? 1 : 0.3 },
        data: {
            color: stage === "verify" ? ACCENT_NAVY : IDLE_COLOR,
            label: "verify cert vs CA",
            labelColor: stage === "verify" ? ACCENT_NAVY : "#64748b",
            animated: stage === "verify",
            interval: 1500,
        },
    });

    // --- 3. CONNECT carrying credentials: client -> server ---
    edges.push({
        id: `connect-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        // Offset slightly so it reads as a second client->server message.
        style: { opacity: stage === "connect" ? 1 : 0.0 },
        data: {
            color: stage === "connect" ? MSG_COLOR : IDLE_COLOR,
            label: "CONNECT + creds",
            labelColor: stage === "connect" ? MSG_COLOR : "#64748b",
            animated: stage === "connect",
            interval: 1500,
        },
    });

    // --- 4 / 5. Server reply: +OK (green) on success, -ERR (red) on reject ---
    if (rejected) {
        edges.push({
            id: "reply-reject",
            source: "server",
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAILURE_COLOR,
                label: "-ERR Authorization Violation",
                labelColor: FAILURE_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    } else {
        edges.push({
            id: `reply-ok-${stage}`,
            source: "server",
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: stage === "ok" ? 1 : 0.0 },
            data: {
                color: stage === "ok" ? SUCCESS_COLOR : IDLE_COLOR,
                label: "+OK",
                labelColor: stage === "ok" ? SUCCESS_COLOR : "#64748b",
                animated: stage === "ok",
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
