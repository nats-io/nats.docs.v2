import React from "react";
import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LabelNode, PublisherNode, ServerNode } from "../nodes";
import { FloatingEdge } from "../edges";

// The composed Acme topology, all layers at once and color-coded: two clusters
// (east, west) each a full mesh of blue routes, an amber gateway between them,
// and a green leaf link down to factory-1 with its own edge client. Static —
// it shows the end-state structure, not a message in flight.
const ROUTE = "#27AAE1"; // blue — routes inside a cluster
const GATEWAY = "#f59e0b"; // amber — gateway between clusters
const LEAF = "#10b981"; // green — the leaf link
const CLIENT = "#94a3b8"; // gray — an edge client's connection
const SERVER = "#375C93"; // navy — a cluster server

function RegionNode({ data }: NodeProps) {
    const d = data as any;
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                background: d.bg,
                border: `1.5px solid ${d.border}`,
                borderRadius: 14,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 8,
                    left: 14,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: d.labelColor,
                }}
            >
                {d.label}
            </div>
        </div>
    );
}

const nodeTypes = {
    region: RegionNode,
    label: LabelNode,
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = { floating: FloatingEdge };

const BOX = { bg: "#f8fafc", border: "#cbd5e1", labelColor: "#64748b" };

const nodes: any[] = [
    // Cluster boxes (parents first) — sized with comfortable padding around the servers.
    { id: "east", type: "region", position: { x: 70, y: 30 }, style: { width: 300, height: 290 }, data: { label: "cluster east", ...BOX }, selectable: false, draggable: false },
    { id: "west", type: "region", position: { x: 540, y: 30 }, style: { width: 300, height: 290 }, data: { label: "cluster west", ...BOX }, selectable: false, draggable: false },
    // East servers (triangle; n1 faces the gateway, n3 hosts the leaf).
    { id: "n1-east", type: "server", parentId: "east", extent: "parent", position: { x: 165, y: 105 }, data: { label: "n1-east", circular: true, borderColor: SERVER } },
    { id: "n2-east", type: "server", parentId: "east", extent: "parent", position: { x: 30, y: 35 }, data: { label: "n2-east", circular: true, borderColor: SERVER } },
    { id: "n3-east", type: "server", parentId: "east", extent: "parent", position: { x: 30, y: 160 }, data: { label: "n3-east", circular: true, borderColor: SERVER } },
    // West servers (mirror triangle; n1 faces the gateway).
    { id: "n1-west", type: "server", parentId: "west", extent: "parent", position: { x: 30, y: 105 }, data: { label: "n1-west", circular: true, borderColor: SERVER } },
    { id: "n2-west", type: "server", parentId: "west", extent: "parent", position: { x: 165, y: 35 }, data: { label: "n2-west", circular: true, borderColor: SERVER } },
    { id: "n3-west", type: "server", parentId: "west", extent: "parent", position: { x: 165, y: 160 }, data: { label: "n3-west", circular: true, borderColor: SERVER } },
    // The leaf and its edge client sit outside the clusters.
    { id: "factory-1", type: "server", position: { x: 100, y: 370 }, data: { label: "factory-1", circular: true, borderColor: LEAF } },
    { id: "sensor", type: "publisher", position: { x: -60, y: 385 }, data: { label: "sensor" } },
    // Layer labels, color-matched. "leaf" sits right beside its short vertical link.
    { id: "l-routes", type: "label", position: { x: -18, y: 158 }, data: { label: "routes (mesh)", color: ROUTE, fontSize: 12 } },
    { id: "l-gw", type: "label", position: { x: 448, y: 148 }, data: { label: "gateway", color: "#b45309", fontSize: 12 } },
    { id: "l-leaf", type: "label", position: { x: 158, y: 338 }, data: { label: "leaf", color: "#047857", fontSize: 12 } },
];

const edges: any[] = [
    // Routes (blue) — full mesh inside each cluster.
    { id: "e-12", source: "n1-east", target: "n2-east", type: "floating", data: { color: ROUTE } },
    { id: "e-13", source: "n1-east", target: "n3-east", type: "floating", data: { color: ROUTE } },
    { id: "e-23", source: "n2-east", target: "n3-east", type: "floating", data: { color: ROUTE } },
    { id: "w-12", source: "n1-west", target: "n2-west", type: "floating", data: { color: ROUTE } },
    { id: "w-13", source: "n1-west", target: "n3-west", type: "floating", data: { color: ROUTE } },
    { id: "w-23", source: "n2-west", target: "n3-west", type: "floating", data: { color: ROUTE } },
    // Gateway (amber) — one link between the clusters.
    { id: "gw", source: "n1-east", target: "n1-west", type: "floating", data: { color: GATEWAY } },
    // Leaf (green) — factory-1 dials east.
    { id: "lf", source: "n3-east", target: "factory-1", type: "floating", data: { color: LEAF } },
    // Edge client (gray) — a sensor behind the leaf.
    { id: "cl", source: "sensor", target: "factory-1", type: "floating", data: { color: CLIENT } },
];

function MassiveScaleAnimatedInner({ width = 820, height = 470 }: { width?: number; height?: number }) {
    return (
        <div style={{ position: "relative" }}>
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
                    fitViewOptions={{ padding: 0.08 }}
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
            <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
                The whole Acme deployment, composed: two clusters meshed by{" "}
                <strong style={{ color: ROUTE }}>routes</strong>, joined by a{" "}
                <strong style={{ color: "#b45309" }}>gateway</strong>, with a{" "}
                <strong style={{ color: "#047857" }}>leaf</strong> bridging{" "}
                <code>factory-1</code> in from the edge. Same ORDERS workload on
                all of it.
            </div>
        </div>
    );
}

export function MassiveScaleAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <MassiveScaleAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
