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
    server: ServerNode,
    service: ServiceNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette. Blue carries the request, navy the routed hop, green the
// successful reply. Gray is the idle / not-yet-active link.
const IDLE_COLOR = "#94a3b8"; // idle link (gray)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const ROUTE_COLOR = "#375C93"; // navy — server routing to the endpoint
const REPLY_COLOR = "#34A574"; // NATS green — reply travelling back

// One mechanism per stage; the cycle loops forever.
type Stage = "request" | "route" | "handle" | "reply" | "deliver";

const STAGE_ORDER: Stage[] = [
    "request",
    "route",
    "handle",
    "reply",
    "deliver",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    request: 3000,
    route: 3000,
    handle: 3500,
    reply: 3000,
    deliver: 3000,
};

const CAPTION: Record<Stage, string> = {
    request:
        "order-svc sends a request on orders.inventory.check. The micro framework attaches a unique reply subject behind the scenes.",
    route:
        "NATS routes the request to the OrderInventory service. Its 'check' endpoint subscribes via a default queue group 'q', so exactly one instance is picked.",
    handle:
        "The chosen instance runs the 'check' handler on the order payload — the named endpoint is just an ordinary request-reply subscription wrapped by the framework.",
    reply:
        "The handler publishes its result to the reply subject embedded in the request. NATS sends it straight back toward the caller.",
    deliver:
        "order-svc receives the reply on its private inbox and the request() call returns. Request-reply, made first-class by the micro framework.",
};

function ServiceRequestAnimatedInner({
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

    const handling = stage === "handle";

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 58, y: 150 },
            data: { label: "order-svc" },
        },
        {
            id: "nats",
            type: "server",
            position: { x: 435, y: 150 },
            data: { label: "NATS" },
        },
        {
            id: "service",
            type: "service",
            position: { x: 783, y: 150 },
            data: { label: "OrderInventory" },
            style: {
                // The handler "lights up" while it runs.
                opacity: 1,
                filter: handling ? "drop-shadow(0 0 8px #34A574)" : "none",
                transition: "filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> NATS : the outbound request ---
    {
        const active = stage === "request";
        edges.push({
            id: `req-${stage}`,
            source: "client",
            target: "nats",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: active ? MSG_COLOR : IDLE_COLOR,
                label: "orders.inventory.check",
                labelColor: active ? MSG_COLOR : "#64748b",
                animated: active,
                interval: 1500,
            },
        });
    }

    // --- NATS -> OrderInventory : routed to the queue-group endpoint ---
    {
        const active = stage === "route";
        edges.push({
            id: `route-${stage}`,
            source: "nats",
            target: "service",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: active ? ROUTE_COLOR : IDLE_COLOR,
                label: 'queue group "q"',
                labelColor: active ? ROUTE_COLOR : "#64748b",
                animated: active,
                interval: 1500,
            },
        });
    }

    // --- OrderInventory -> NATS : the reply heads back ---
    {
        const active = stage === "reply";
        edges.push({
            id: `reply-${stage}`,
            source: "service",
            target: "nats",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            sourceHandle: "reply",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: active || stage === "deliver" ? 1 : 0.35 },
            data: {
                color: active ? REPLY_COLOR : IDLE_COLOR,
                label: "_INBOX reply",
                labelOffset: 20,
                labelColor: active ? REPLY_COLOR : "#64748b",
                animated: active,
                interval: 1500,
            },
        });
    }

    // --- NATS -> order-svc : reply delivered to the caller's inbox ---
    {
        const active = stage === "deliver";
        edges.push({
            id: `deliver-${stage}`,
            source: "nats",
            target: "client",
            // The client sits to the left, so leave from the server's left-hand
            // reply handle and take a lane under the outbound request.
            sourceHandle: "reply-out",
            targetHandle: "reply",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: active || stage === "reply" ? 1 : 0.35 },
            data: {
                bow: 55,
                color: active ? REPLY_COLOR : IDLE_COLOR,
                label: "reply",
                labelColor: active ? REPLY_COLOR : "#64748b",
                animated: active,
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

export function ServiceRequestAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ServiceRequestAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
