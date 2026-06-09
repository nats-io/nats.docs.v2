import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand-ish palette: blue for routes / core flow, red for the failure,
// green for the successful reconnect.
const ROUTE_COLOR = "#94a3b8"; // idle route mesh (gray-blue)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const DOWN_COLOR = "#ef4444"; // failed server
const RECONNECT_COLOR = "#34A574"; // NATS green — new client link

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "publish" | "route" | "deliver" | "fail" | "reconnect";

const STAGE_ORDER: Stage[] = [
    "publish",
    "route",
    "deliver",
    "fail",
    "reconnect",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 3000,
    route: 3000,
    deliver: 3000,
    fail: 3500,
    reconnect: 5000,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "client-A publishes on n1-east. The message lands on its directly-connected server.",
    route:
        "n1-east forwards the message across the cluster route to n3-east, where an interested subscriber lives.",
    deliver:
        "n3-east delivers the message to client-C. A subscriber anywhere in the mesh receives messages published anywhere — clustering makes the servers act as one.",
    fail:
        "n2-east goes down. Its client (client-B) loses its connection — but the surviving servers stay fully meshed.",
    reconnect:
        "client-B automatically reconnects to a surviving server (n3-east) and resumes publishing. No subscriber anywhere missed a beat.",
};

function ClusterMeshAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("publish");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const n2Down = stage === "fail" || stage === "reconnect";
    const reconnected = stage === "reconnect";

    // Triangle of servers (full mesh), each with a client beside it.
    const nodes: any[] = [
        // --- Servers (triangle) ---
        {
            id: "n1",
            type: "server",
            position: { x: 80, y: 60 },
            data: { label: "n1-east" },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 380, y: 60 },
            data: { label: "n2-east" },
            style: {
                opacity: n2Down ? 0.25 : 1,
                filter: n2Down ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 230, y: 280 },
            data: { label: "n3-east" },
        },
        // --- Clients ---
        {
            id: "clientA",
            type: "publisher",
            position: { x: -60, y: 60 },
            data: { label: "client-A" },
        },
        {
            id: "clientB",
            type: "publisher",
            position: { x: 540, y: 60 },
            data: { label: "client-B" },
            style: {
                opacity: n2Down && !reconnected ? 0.4 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "clientC",
            type: "subscriber",
            position: { x: 470, y: 290 },
            data: { label: "client-C" },
        },
    ];

    const edges: any[] = [];

    // --- Route mesh between the three servers (always present) ---
    // n2's routes go dim/red when it fails; the n1<->n3 route stays healthy.
    const routeMeta: Array<
        { id: string; source: string; target: string; touchesN2: boolean }
    > = [
        { id: "r-n1-n2", source: "n1", target: "n2", touchesN2: true },
        { id: "r-n2-n3", source: "n2", target: "n3", touchesN2: true },
        { id: "r-n1-n3", source: "n1", target: "n3", touchesN2: false },
    ];

    for (const r of routeMeta) {
        const isDeadRoute = n2Down && r.touchesN2;
        // The n1->n3 route carries the message during the "route" stage.
        const carriesMsg = r.id === "r-n1-n3" &&
            (stage === "route" || stage === "deliver");
        edges.push({
            id: `${r.id}-${stage}`,
            source: r.source,
            target: r.target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: isDeadRoute ? 0.25 : 1 },
            data: {
                color: isDeadRoute
                    ? DOWN_COLOR
                    : carriesMsg
                    ? MSG_COLOR
                    : ROUTE_COLOR,
                label: "route",
                labelColor: isDeadRoute ? DOWN_COLOR : "#64748b",
                animated: carriesMsg,
                interval: 1500,
            },
        });
    }

    // --- client-A -> n1 (publishes during "publish" stage) ---
    edges.push({
        id: `a-n1-${stage}`,
        source: "clientA",
        target: "n1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "publish" ? MSG_COLOR : ROUTE_COLOR,
            animated: stage === "publish",
            interval: 1500,
        },
    });

    // --- n3 -> client-C (delivers during "deliver" stage) ---
    edges.push({
        id: `n3-c-${stage}`,
        source: "n3",
        target: "clientC",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "deliver" ? MSG_COLOR : ROUTE_COLOR,
            animated: stage === "deliver",
            interval: 1500,
        },
    });

    // --- client-B link: to n2 while healthy, re-drawn to n3 after reconnect ---
    if (reconnected) {
        edges.push({
            id: "b-n3-reconnect",
            source: "clientB",
            target: "n3",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: RECONNECT_COLOR,
                label: "reconnect",
                labelColor: RECONNECT_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    } else {
        edges.push({
            id: `b-n2-${stage}`,
            source: "clientB",
            target: "n2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: n2Down ? 0.2 : 1 },
            data: {
                color: n2Down ? DOWN_COLOR : ROUTE_COLOR,
                animated: false,
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

export function ClusterMeshAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ClusterMeshAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
