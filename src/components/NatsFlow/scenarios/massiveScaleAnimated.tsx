import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    PublisherNode,
    ServerNode,
    ServiceNode,
    SubscriberNode,
} from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Edge link colors — distinct so route / gateway / leaf reads at a glance.
const ROUTE_COLOR = "#3b82f6"; // intra-cluster mesh
const GATEWAY_COLOR = "#8b5cf6"; // cluster-to-cluster
const LEAF_COLOR = "#10b981"; // leaf uplink
const CLIENT_COLOR = "#f59e0b"; // edge client traffic

// Auto-cycle through the three highlighted flows so the eye is led around the
// composite picture without any interaction required.
const STEP_DURATION_MS = 5000;

type Step = 0 | 1 | 2;

const STEP_CAPTIONS: Record<Step, string> = {
    0: "Inside cluster east, the three servers route messages to each other over a full mesh.",
    1: "Gateways bridge cluster east and cluster west — one optimized link per cluster pair.",
    2: "Leaf nodes hang off a cluster and carry their edge clients' traffic up the uplink.",
};

function MassiveScaleAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [step, setStep] = useState<Step>(0);

    // Cycle the highlighted flow on a fixed cadence.
    useEffect(() => {
        const timer = setTimeout(() => {
            setStep((s) => ((s + 1) % 3) as Step);
        }, STEP_DURATION_MS);
        return () => clearTimeout(timer);
    }, [step]);

    const routeActive = step === 0;
    const gatewayActive = step === 1;
    const leafActive = step === 2;

    // ── Nodes ────────────────────────────────────────────────────────────
    // Left column: cluster east (3-server mesh). Right column: cluster west
    // (2-server mesh). Leaf nodes drop below each cluster with their clients.
    const nodes = [
        // Cluster east
        {
            id: "n1-east",
            type: "server",
            position: { x: 60, y: 30 },
            data: { label: "n1-east" },
        },
        {
            id: "n2-east",
            type: "server",
            position: { x: 60, y: 150 },
            data: { label: "n2-east" },
        },
        {
            id: "n3-east",
            type: "server",
            position: { x: 60, y: 270 },
            data: { label: "n3-east" },
        },
        // Cluster west
        {
            id: "n1-west",
            type: "server",
            position: { x: 420, y: 70 },
            data: { label: "n1-west" },
        },
        {
            id: "n2-west",
            type: "server",
            position: { x: 420, y: 200 },
            data: { label: "n2-west" },
        },
        // Leaf node off cluster east + its edge client
        {
            id: "factory-1",
            type: "server",
            position: { x: 240, y: 420 },
            data: { label: "factory-1" },
        },
        {
            id: "sensor",
            type: "publisher",
            position: { x: 60, y: 440 },
            data: { label: "sensor" },
        },
        // Leaf node off cluster west + its edge client
        {
            id: "factory-2",
            type: "server",
            position: { x: 620, y: 360 },
            data: { label: "factory-2" },
        },
        {
            id: "robot",
            type: "subscriber",
            position: { x: 800, y: 380 },
            data: { label: "robot" },
        },
    ];

    // ── Edges ────────────────────────────────────────────────────────────
    const edges: any[] = [];

    // Cluster east internal mesh (routes).
    const eastRoutes: Array<[string, string]> = [
        ["n1-east", "n2-east"],
        ["n2-east", "n3-east"],
        ["n1-east", "n3-east"],
    ];
    eastRoutes.forEach(([source, target], i) => {
        edges.push({
            id: `route-east-${i}-${routeActive}`,
            source,
            target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: ROUTE_COLOR,
                animated: routeActive,
                label: i === 0 ? "routes (mesh)" : undefined,
                interval: 1800,
            },
        });
    });

    // Cluster west internal mesh (route).
    edges.push({
        id: `route-west-0-${routeActive}`,
        source: "n1-west",
        target: "n2-west",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: ROUTE_COLOR,
            animated: routeActive,
            interval: 1800,
        },
    });

    // Gateway link: cluster east ↔ cluster west (one representative pair).
    edges.push({
        id: `gateway-0-${gatewayActive}`,
        source: "n1-east",
        target: "n1-west",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: GATEWAY_COLOR,
            animated: gatewayActive,
            label: "gateway",
            labelColor: GATEWAY_COLOR,
            interval: 1600,
        },
    });

    // Leaf uplinks: factory leaf nodes connect up into a cluster server.
    edges.push({
        id: `leaf-east-${leafActive}`,
        source: "n3-east",
        target: "factory-1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: LEAF_COLOR,
            animated: leafActive,
            label: "leaf",
            labelColor: LEAF_COLOR,
            interval: 1600,
        },
    });
    edges.push({
        id: `leaf-west-${leafActive}`,
        source: "n2-west",
        target: "factory-2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: LEAF_COLOR,
            animated: leafActive,
            label: "leaf",
            labelColor: LEAF_COLOR,
            interval: 1600,
        },
    });

    // Edge clients on the leaf nodes — always lightly animated so the leaves
    // never look idle.
    edges.push({
        id: "client-sensor",
        source: "sensor",
        target: "factory-1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: CLIENT_COLOR,
            animated: true,
            interval: 2400,
        },
    });
    edges.push({
        id: "client-robot",
        source: "factory-2",
        target: "robot",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: CLIENT_COLOR,
            animated: true,
            interval: 2400,
        },
    });

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "6px 12px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? "#375C93" : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Step toggles */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <span
                    style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginRight: "4px",
                    }}
                >
                    Highlight:
                </span>
                <button
                    onClick={() => setStep(0)}
                    style={buttonStyle(routeActive)}
                >
                    Routes
                </button>
                <button
                    onClick={() => setStep(1)}
                    style={buttonStyle(gatewayActive)}
                >
                    Gateways
                </button>
                <button
                    onClick={() => setStep(2)}
                    style={buttonStyle(leafActive)}
                >
                    Leaf nodes
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
                    fitViewOptions={{ padding: 0.15 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    zoomOnScroll={false}
                    panOnDrag={false}
                    preventScrolling={true}
                    minZoom={0.3}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* Cluster region labels */}
                <div
                    style={{
                        position: "absolute",
                        left: "8%",
                        top: "4%",
                        padding: "2px 10px",
                        background: "#eff6ff",
                        border: `1px solid ${ROUTE_COLOR}`,
                        borderRadius: "999px",
                        fontSize: "11px",
                        color: "#1e40af",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    cluster east
                </div>
                <div
                    style={{
                        position: "absolute",
                        right: "6%",
                        top: "4%",
                        padding: "2px 10px",
                        background: "#eff6ff",
                        border: `1px solid ${ROUTE_COLOR}`,
                        borderRadius: "999px",
                        fontSize: "11px",
                        color: "#1e40af",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    cluster west
                </div>
            </div>

            {/* Status / caption */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                }}
            >
                {STEP_CAPTIONS[step]}
            </div>
            <div
                style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#9ca3af",
                    fontStyle: "italic",
                }}
            >
                Same client code everywhere — routes, gateways, and leaf nodes
                are shapes that compose into one fabric.
            </div>
        </div>
    );
}

export function MassiveScaleAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MassiveScaleAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
