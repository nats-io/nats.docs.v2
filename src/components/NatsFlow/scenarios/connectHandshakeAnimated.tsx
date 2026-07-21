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

// Brand-ish palette.
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — frame in flight
const SUCCESS_COLOR = "#34A574"; // NATS green — accepted (PONG / CONNECTED)
const FAILURE_COLOR = "#ef4444"; // red — rejected (-ERR)
const NAVY_COLOR = "#375C93"; // navy accent — credentials

// The NATS client connect handshake, one frame per stage. The cycle ends in a
// success state, then branches to show the rejection (-ERR) end state, then
// loops back to the start.
type Stage = "tcp" | "info" | "connect" | "ok" | "err";

const STAGE_ORDER: Stage[] = ["tcp", "info", "connect", "ok", "err"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    tcp: 3000,
    info: 3500,
    connect: 4000,
    ok: 4500,
    err: 4500,
};

// Each stage lights up exactly one direction of the link. `null` = the dim
// idle lane. Keeping one edge per direction means the two lanes never overlap
// and only one label is on screen at a time.
type ActiveEdge = { color: string; label: string } | null;

const FORWARD: Record<Stage, ActiveEdge> = {
    tcp: { color: MSG_COLOR, label: "TCP connect" },
    info: null,
    connect: { color: NAVY_COLOR, label: "CONNECT + creds, then PING" },
    ok: null,
    err: null,
};

const BACKWARD: Record<Stage, ActiveEdge> = {
    tcp: null,
    info: { color: MSG_COLOR, label: "INFO" },
    connect: null,
    ok: { color: SUCCESS_COLOR, label: "PONG" },
    err: { color: FAILURE_COLOR, label: "-ERR auth violation" },
};

const CAPTION: Record<Stage, string> = {
    tcp:
        "order-svc opens a TCP connection to the server. No NATS protocol has been spoken yet — just a socket.",
    info:
        "The server speaks first, sending an INFO frame that advertises its capabilities (server id, TLS, max payload) and whether auth is required.",
    connect:
        "order-svc replies with a CONNECT frame carrying its credentials (user/password, token, JWT, or nkey signature) and client options, immediately followed by a PING.",
    ok:
        "The server answers the PING with a PONG. order-svc is now CONNECTED and can publish and subscribe. (Only in verbose mode does the server also send +OK for the CONNECT itself.)",
    err:
        "If the credentials are wrong, the server returns -ERR 'Authorization Violation' instead and closes the socket — order-svc stays rejected.",
};

function ConnectHandshakeAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("tcp");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const connected = stage === "ok";
    const rejected = stage === "err";

    // The client end state: green when CONNECTED, red when rejected.
    const clientStatus = connected
        ? "CONNECTED"
        : rejected
        ? "rejected"
        : "connecting…";
    const clientStatusColor = connected
        ? SUCCESS_COLOR
        : rejected
        ? FAILURE_COLOR
        : IDLE_COLOR;

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 40, y: 150 },
            data: { label: "order-svc" },
            style: {
                opacity: rejected ? 0.55 : 1,
                filter: rejected ? "grayscale(0.4)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "server",
            type: "server",
            position: { x: 420, y: 150 },
            data: { label: "server" },
        },
    ];

    // One edge per direction, re-keyed per stage so the AnimatedEdge remounts
    // and spawns a fresh bubble at every stage change. The server → client
    // direction pins the request-reply handles so the edge runs between the
    // facing sides of the pair instead of looping around.
    const forward = FORWARD[stage];
    const backward = BACKWARD[stage];

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
                {/* End-state badge */}
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "12px",
                        zIndex: 5,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#ffffff",
                        backgroundColor: clientStatusColor,
                        transition: "background-color 0.4s ease",
                    }}
                >
                    {clientStatus}
                </div>

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

export function ConnectHandshakeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ConnectHandshakeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
