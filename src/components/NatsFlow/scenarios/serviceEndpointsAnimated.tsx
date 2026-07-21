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
const REPLY_COLOR = "#34A574"; // NATS green — reply in flight
const NAVY = "#375C93"; // accent — the check endpoint
const LIME = "#8DC63F"; // accent — the grouped quote endpoint

// One service exposes two endpoints. We walk through a request to each,
// showing how the subject on the request selects the endpoint — and how a
// group adds a subject prefix in front of its endpoints.
type Stage =
    | "idle"
    | "checkRequest"
    | "checkReply"
    | "quoteRequest"
    | "quoteReply";

const STAGE_ORDER: Stage[] = [
    "idle",
    "checkRequest",
    "checkReply",
    "quoteRequest",
    "quoteReply",
];

const STAGE_DURATION_MS: Record<Stage, number> = {
    idle: 2500,
    checkRequest: 3500,
    checkReply: 3000,
    quoteRequest: 3500,
    quoteReply: 3000,
};

const CAPTION: Record<Stage, string> = {
    idle:
        "One inventory service registers two endpoints: check on orders.inventory.check, and quote inside a shipping group on shipping.quote.",
    checkRequest:
        "The client requests orders.inventory.check. The server matches that exact subject to the check endpoint — only it runs.",
    checkReply:
        "The check endpoint handles the request and replies. The other endpoint never sees the message.",
    quoteRequest:
        "The client requests shipping.quote. The shipping group prefixes its endpoints, so quote listens on shipping.quote and lights up instead.",
    quoteReply:
        "The grouped quote endpoint replies. Two endpoints, two subjects, one service — the subject on the request decides which handler runs.",
};

function ServiceEndpointsAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("idle");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const checkActive = stage === "checkRequest" || stage === "checkReply";
    const quoteActive = stage === "quoteRequest" || stage === "quoteReply";

    // Layout: client -> server -> service, with the service's two endpoints
    // drawn as nodes to the right of the service so routing is visible.
    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: { label: "client" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 260, y: 150 },
            data: { label: "server" },
        },
        {
            id: "service",
            type: "service",
            position: { x: 520, y: 150 },
            data: { label: "inventory svc" },
        },
        // --- Endpoint: check (exact subject) ---
        {
            id: "check",
            type: "service",
            position: { x: 806, y: 60 },
            data: { label: "check" },
            style: {
                opacity: !checkActive && (quoteActive) ? 0.4 : 1,
                filter: !checkActive && quoteActive ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // --- Endpoint: quote (inside the shipping group) ---
        {
            id: "quote",
            type: "service",
            position: { x: 806, y: 250 },
            data: { label: "quote" },
            style: {
                opacity: !quoteActive && checkActive ? 0.4 : 1,
                filter: !quoteActive && checkActive ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client <-> server: request flows in, reply flows back ---
    const requesting = stage === "checkRequest" || stage === "quoteRequest";
    const replying = stage === "checkReply" || stage === "quoteReply";
    const requestSubject = quoteActive
        ? "shipping.quote"
        : "orders.inventory.check";

    edges.push({
        id: `client-server-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: requesting ? MSG_COLOR : replying ? REPLY_COLOR : IDLE_COLOR,
            label: stage === "idle" ? undefined : requestSubject,
            labelColor: requesting
                ? MSG_COLOR
                : replying
                ? REPLY_COLOR
                : "#64748b",
            animated: requesting || replying,
            interval: 1500,
        },
    });

    // --- server -> service: the matched request is dispatched to the svc ---
    edges.push({
        id: `server-service-${stage}`,
        source: "server",
        target: "service",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: requesting ? MSG_COLOR : replying ? REPLY_COLOR : IDLE_COLOR,
            animated: requesting || replying,
            interval: 1500,
        },
    });

    // --- service -> check endpoint ---
    edges.push({
        id: `service-check-${stage}`,
        source: "service",
        target: "check",
        sourceHandle: "out-right",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: !checkActive && quoteActive ? 0.3 : 1 },
        data: {
            color: stage === "checkRequest"
                ? MSG_COLOR
                : stage === "checkReply"
                ? REPLY_COLOR
                : IDLE_COLOR,
            label: "orders.inventory.check",
            labelColor: checkActive ? NAVY : "#64748b",
            animated: checkActive,
            interval: 1500,
        },
    });

    // --- service -> quote endpoint (group prefixes the subject) ---
    edges.push({
        id: `service-quote-${stage}`,
        source: "service",
        target: "quote",
        sourceHandle: "out-right",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: !quoteActive && checkActive ? 0.3 : 1 },
        data: {
            color: stage === "quoteRequest"
                ? MSG_COLOR
                : stage === "quoteReply"
                ? REPLY_COLOR
                : IDLE_COLOR,
            label: "shipping.quote",
            labelColor: quoteActive ? LIME : "#64748b",
            animated: quoteActive,
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

export function ServiceEndpointsAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ServiceEndpointsAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
