import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand-ish palette. Blue = request in flight, green = JSON response,
// gray = idle wire, navy for the active endpoint accent.
const IDLE_COLOR = "#94a3b8"; // idle wire
const REQUEST_COLOR = "#27AAE1"; // NATS primary blue — GET in flight
const RESPONSE_COLOR = "#34A574"; // NATS green — JSON returned
const NAVY = "#375C93";

// The monitoring port serves three endpoints. Each stage shows one
// synchronous GET -> on-demand JSON response cycle, then the next.
type Stage = "idle" | "varz" | "connz" | "jsz";

const STAGE_ORDER: Stage[] = ["idle", "varz", "connz", "jsz"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    idle: 2500,
    varz: 4000,
    connz: 4000,
    jsz: 4000,
};

const CAPTION: Record<Stage, string> = {
    idle:
        "n1-east exposes a read-only HTTP monitoring port on :8222. Nothing is pushed — endpoints answer only when you ask.",
    varz:
        "GET /varz returns a JSON snapshot of the server itself: version, uptime, connection counts, memory and CPU.",
    connz:
        "GET /connz?acc=ORDERS returns the live connections — here scoped to the ORDERS account — with subjects, in/out bytes and pending data.",
    jsz:
        "GET /jsz returns JetStream state: streams, consumers, messages and bytes stored. Each call is a fresh synchronous snapshot.",
};

// Which JSON card each stage lights up, plus the request path label.
const STAGE_PATH: Record<Stage, string> = {
    idle: "",
    varz: "GET /varz",
    connz: "GET /connz?acc=ORDERS",
    jsz: "GET /jsz",
};

const STAGE_CARD: Record<Stage, string | null> = {
    idle: null,
    varz: "varz",
    connz: "connz",
    jsz: "jsz",
};

function MonitoringEndpointsAnimatedInner({
    width = 640,
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

    const activeCard = STAGE_CARD[stage];

    // Left: the client (nats CLI / curl). Center: the server with its
    // :8222 monitoring port. Right: the three endpoint result cards.
    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: { label: "nats / curl" },
        },
        {
            id: "n1",
            type: "server",
            position: { x: 324, y: 140 },
            data: { label: "n1-east :8222" },
        },
        // --- Endpoint result cards (light up only when queried) ---
        {
            id: "varz",
            type: "box",
            position: { x: 675, y: 20 },
            data: { label: "/varz JSON" },
            style: {
                opacity: activeCard === "varz" ? 1 : 0.4,
                filter: activeCard === "varz" ? "none" : "grayscale(1)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "connz",
            type: "box",
            position: { x: 675, y: 150 },
            data: { label: "/connz JSON" },
            style: {
                opacity: activeCard === "connz" ? 1 : 0.4,
                filter: activeCard === "connz" ? "none" : "grayscale(1)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "jsz",
            type: "box",
            position: { x: 675, y: 280 },
            data: { label: "/jsz JSON" },
            style: {
                opacity: activeCard === "jsz" ? 1 : 0.4,
                filter: activeCard === "jsz" ? "none" : "grayscale(1)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client -> server: the GET request in flight ---
    const requesting = stage !== "idle";
    edges.push({
        id: `req-${stage}`,
        source: "client",
        target: "n1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: requesting ? REQUEST_COLOR : IDLE_COLOR,
            label: requesting ? STAGE_PATH[stage] : "HTTP :8222",
            labelColor: requesting ? NAVY : "#64748b",
            animated: requesting,
            interval: 1500,
        },
    });

    // --- server -> the queried endpoint card: the JSON response ---
    const cardMeta: Array<{ id: Stage; target: string }> = [
        { id: "varz", target: "varz" },
        { id: "connz", target: "connz" },
        { id: "jsz", target: "jsz" },
    ];

    for (const c of cardMeta) {
        const isActive = stage === c.id;
        edges.push({
            id: `resp-${c.id}-${stage}`,
            source: "n1",
            target: c.target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: isActive ? 1 : 0.2 },
            data: {
                color: isActive ? RESPONSE_COLOR : IDLE_COLOR,
                label: isActive ? "200 JSON" : undefined,
                labelColor: RESPONSE_COLOR,
                animated: isActive,
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
        backgroundColor: active ? REQUEST_COLOR : "#ffffff",
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
                    Endpoint:
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

export function MonitoringEndpointsAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MonitoringEndpointsAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
