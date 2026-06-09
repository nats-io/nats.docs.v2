import React, { useState } from "react";
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

const CLIENT_COLOR = "#3b82f6"; // client <-> server links
const ROUTE_COLOR = "#8b5cf6"; // intra-cluster route links
const SINGLE_COLOR = "#3b82f6";
const CLUSTER_COLOR = "#10b981";

type Mode = "single" | "cluster";

// Two stable client identities. Their NATS subject/role stays the same; only
// which server they connect to changes when we scale out to a cluster.
const CLIENTS = [
    {
        id: "orders",
        type: "publisher" as const,
        label: "orders-api",
        // y position is fixed; x/server target changes per mode.
        y: 40,
    },
    {
        id: "billing",
        type: "subscriber" as const,
        label: "billing-svc",
        y: 160,
    },
    {
        id: "shipping",
        type: "subscriber" as const,
        label: "shipping-svc",
        y: 280,
    },
];

function SingleToClusterAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [mode, setMode] = useState<Mode>("single");
    const isCluster = mode === "cluster";
    const accent = isCluster ? CLUSTER_COLOR : SINGLE_COLOR;

    // ----- Nodes -----------------------------------------------------------
    // Clients live on the left; servers on the right. In single mode all
    // clients point at one server (n1-east). In cluster mode they redistribute
    // across the three-node "east" cluster.
    const clientNodes = CLIENTS.map((c) => ({
        id: c.id,
        type: c.type,
        position: { x: 30, y: c.y },
        data: { label: c.label },
    }));

    const serverNodes = isCluster
        ? [
            {
                id: "n1-east",
                type: "server" as const,
                position: { x: 380, y: 30 },
                data: { label: "n1-east" },
            },
            {
                id: "n2-east",
                type: "server" as const,
                position: { x: 540, y: 150 },
                data: { label: "n2-east" },
            },
            {
                id: "n3-east",
                type: "server" as const,
                position: { x: 380, y: 270 },
                data: { label: "n3-east" },
            },
        ]
        : [
            {
                id: "n1-east",
                type: "server" as const,
                position: { x: 440, y: 150 },
                data: { label: "n1-east" },
            },
        ];

    const nodes = [...clientNodes, ...serverNodes];

    // ----- Edges -----------------------------------------------------------
    // Client links: keyed by `mode` so React Flow remounts them and the bubble
    // animation restarts cleanly when we toggle.
    const clientTargets: Record<string, string> = isCluster
        ? { orders: "n1-east", billing: "n2-east", shipping: "n3-east" }
        : { orders: "n1-east", billing: "n1-east", shipping: "n1-east" };

    const edges: any[] = CLIENTS.map((c) => ({
        id: `e-${c.id}-${clientTargets[c.id]}-${mode}`,
        source: c.id,
        target: clientTargets[c.id],
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: CLIENT_COLOR,
            animated: true,
            interval: 2200,
        },
    }));

    // Cluster route mesh: every server connected to every other server.
    // Full mesh of 3 nodes = 3 undirected links. We draw them as animated
    // route edges with ArrowClosed markers and a "route" label on one.
    if (isCluster) {
        const routePairs: Array<[string, string, boolean]> = [
            ["n1-east", "n2-east", true],
            ["n2-east", "n3-east", false],
            ["n3-east", "n1-east", false],
        ];
        for (const [a, b, labeled] of routePairs) {
            edges.push({
                id: `route-${a}-${b}`,
                source: a,
                target: b,
                type: "animated",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
                markerStart: { type: MarkerType.ArrowClosed },
                data: {
                    color: ROUTE_COLOR,
                    animated: true,
                    interval: 1600,
                    label: labeled ? "route" : undefined,
                    labelColor: ROUTE_COLOR,
                },
            });
        }
    }

    const description = isCluster
        ? "Cluster east: three full-mesh servers (n1/n2/n3-east) share all subjects over routes. Clients spread out, and if one server is lost the rest carry the traffic."
        : "A single server (n1-east) handles every client. Simple to run — but it is a single point of failure: if it goes down, everything stops.";

    const handleModeChange = (newMode: Mode) => {
        if (newMode === mode) return;
        setMode(newMode);
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "6px 14px",
        fontSize: "13px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? accent : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Mode toggle */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                }}
            >
                <span
                    style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginRight: "4px",
                    }}
                >
                    Topology:
                </span>
                <button
                    onClick={() => handleModeChange("single")}
                    style={buttonStyle(mode === "single")}
                >
                    Single
                </button>
                <button
                    onClick={() => handleModeChange("cluster")}
                    style={buttonStyle(mode === "cluster")}
                >
                    Cluster
                </button>
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
                    minZoom={0.5}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* Cluster badge */}
                {isCluster && (
                    <div
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "12px",
                            padding: "4px 12px",
                            background: "#ecfdf5",
                            border: `1px solid ${CLUSTER_COLOR}`,
                            borderRadius: "999px",
                            fontSize: "12px",
                            color: "#065f46",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                        }}
                    >
                        cluster: east
                    </div>
                )}
            </div>

            {/* Status */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                }}
            >
                {description}
            </div>
        </div>
    );
}

export function SingleToClusterAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <SingleToClusterAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
