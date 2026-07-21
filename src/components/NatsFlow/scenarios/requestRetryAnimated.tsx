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
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const SUCCESS_COLOR = "#34A574"; // NATS green — the reply that returns
const FAIL_COLOR = "#ef4444"; // red — timeout / 503
const ACCENT_NAVY = "#375C93"; // navy — backoff pulse
const LIME = "#8DC63F"; // lime — retry attempt

// Two branches, one mechanism per stage, looping forever.
//   Branch A (responder present): request -> timeout -> backoff -> retry -> reply
//   Branch B (no responder):      no-responders 503 returned instantly
type Stage =
    | "request"
    | "timeout"
    | "backoff"
    | "retry"
    | "reply"
    | "noresponder";

const STAGE_ORDER: Stage[] = [
    "request",
    "timeout",
    "backoff",
    "retry",
    "reply",
    "noresponder",
];

// Per-stage hold before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    request: 3000,
    timeout: 3000,
    backoff: 2500,
    retry: 3000,
    reply: 4000,
    noresponder: 4500,
};

const CAPTION: Record<Stage, string> = {
    request:
        "order-svc sends a request on orders.inventory.check with a reply inbox. The server routes it toward the inventory responder.",
    timeout:
        "No reply arrives before the deadline — the responder was busy or the message was lost. The request times out; no reply edge ever comes back.",
    backoff:
        "Rather than retry instantly, order-svc waits a short backoff so a struggling responder gets room to recover.",
    retry:
        "order-svc retries: a fresh request with a new reply inbox goes back out on orders.inventory.check.",
    reply:
        "This time inventory answers. The reply travels back through the server to order-svc's inbox — the retry succeeds.",
    noresponder:
        "Different failure: with no responder subscribed at all, the server returns a no-responders 503 immediately — order-svc fails fast instead of waiting for a timeout.",
};

function RequestRetryAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("request");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // In the no-responders branch there is no live responder.
    const noResponder = stage === "noresponder";

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 54, y: 140 },
            data: { label: "order-svc" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 378, y: 140 },
            data: { label: "server" },
        },
        {
            id: "inventory",
            type: "service",
            position: { x: 702, y: 140 },
            data: { label: "inventory" },
            // The responder is "gone" in the no-responders branch.
            style: {
                opacity: noResponder ? 0.2 : 1,
                filter: noResponder ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> server (the request leg) ---
    // Carries the message during request / retry / noresponder stages.
    const requestActive = stage === "request" || stage === "retry" ||
        stage === "noresponder";
    edges.push({
        id: `req-client-server-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: requestActive ? MSG_COLOR : IDLE_COLOR,
            label: stage === "retry" ? "retry" : "request",
            labelColor: stage === "retry" ? LIME : "#64748b",
            animated: requestActive,
            interval: 1500,
        },
    });

    // --- server -> inventory (request forwarded to the responder) ---
    // Forwarded on request / retry. Severed (red, dim) in the no-responder branch.
    const forwardActive = stage === "request" || stage === "retry";
    edges.push({
        id: `req-server-inv-${stage}`,
        source: "server",
        target: "inventory",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: noResponder ? 0.2 : 1 },
        data: {
            color: noResponder
                ? FAIL_COLOR
                : forwardActive
                ? MSG_COLOR
                : IDLE_COLOR,
            animated: forwardActive,
            interval: 1500,
        },
    });

    // --- inventory -> server -> client (the reply leg, only on "reply") ---
    if (stage === "reply") {
        edges.push({
            id: "reply-inv-server",
            source: "inventory",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                label: "reply",
                labelColor: SUCCESS_COLOR,
                animated: true,
                interval: 1500,
            },
        });
        edges.push({
            id: "reply-server-client",
            source: "server",
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- server -> client failure return: timeout (no edge back) vs 503 ---
    // The timeout stage deliberately draws NO reply edge — the absence is the point.
    if (stage === "timeout") {
        edges.push({
            id: "timeout-marker",
            source: "client",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 0.6 },
            data: {
                bow: 55,
                color: FAIL_COLOR,
                label: "timeout — no reply",
                labelColor: FAIL_COLOR,
                animated: false,
                interval: 1500,
            },
        });
    }

    if (noResponder) {
        // Instant 503 from the server straight back to order-svc.
        edges.push({
            id: "noresp-server-client",
            source: "server",
            target: "client",
            sourceHandle: "reply-out",
            targetHandle: "reply",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAIL_COLOR,
                bow: 60,
                label: "503 no responders",
                labelOffset: 22,
                labelColor: FAIL_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- backoff: a navy pulse looping on the client while it waits ---
    if (stage === "backoff") {
        edges.push({
            id: "backoff-pulse",
            source: "client",
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: ACCENT_NAVY,
                label: "backoff…",
                labelColor: ACCENT_NAVY,
                animated: true,
                interval: 1200,
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

export function RequestRetryAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <RequestRetryAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
