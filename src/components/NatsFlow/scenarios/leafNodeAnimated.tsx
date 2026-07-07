import React from "react";
import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LabelNode, PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge, FloatingEdge } from "../edges";

// A hub (cluster east) stacked over a leaf (factory-1), joined by one outbound
// leaf connection. A hub client publishes; the order rides down the single leaf
// link to a subscriber on the factory floor. The link is drawn vertically
// between n1-east and factory-1 so it's the one line crossing between the two
// boxes. The leaf is one server, so its box is small and its client sits
// outside it — just as the hub client sits outside the cluster box.
const HUB = "#375C93"; // navy — the hub cluster
const LEAF = "#7c3aed"; // purple — the leaf
const MSG = "#27AAE1"; // NATS blue — a message inside a system
const ROUTE = "#94a3b8"; // gray — idle intra-cluster route

// A tinted, titled box. The title sits at the top by default, or the bottom
// when `labelPos` is "bottom" (so a link entering the top edge doesn't cross it).
function RegionNode({ data }: NodeProps) {
    const d = data as any;
    const vertical = d.labelPos === "bottom" ? { bottom: 8 } : { top: 8 };
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
                    ...vertical,
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
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
    floating: FloatingEdge,
};

// Parent region nodes first; server positions are relative to their region.
const nodes: any[] = [
    {
        id: "hub-region",
        type: "region",
        position: { x: 110, y: 20 },
        style: { width: 480, height: 160 },
        data: { label: "HUB — cluster east", bg: "#eff6ff", border: HUB, labelColor: "#1e3a5f" },
        selectable: false,
        draggable: false,
    },
    {
        id: "leaf-region",
        type: "region",
        position: { x: 110, y: 355 },
        style: { width: 200, height: 150 },
        data: { label: "LEAF — factory-1", bg: "#faf5ff", border: LEAF, labelColor: "#6b21a8", labelPos: "bottom" },
        selectable: false,
        draggable: false,
    },
    // Hub: n1-east holds the leaf link; n2-east is an idle cluster peer.
    { id: "n1-east", type: "server", parentId: "hub-region", extent: "parent", position: { x: 40, y: 45 }, data: { label: "n1-east", circular: true, borderColor: HUB } },
    { id: "n2-east", type: "server", parentId: "hub-region", extent: "parent", position: { x: 300, y: 45 }, data: { label: "n2-east", circular: true, borderColor: HUB } },
    // Leaf: just factory-1, directly below n1-east.
    { id: "factory-1", type: "server", parentId: "leaf-region", extent: "parent", position: { x: 40, y: 15 }, data: { label: "factory-1", circular: true, borderColor: LEAF } },
    // Clients sit outside their boxes.
    { id: "hub-pub", type: "publisher", position: { x: -30, y: 85 }, data: { label: "hub client" } },
    { id: "edge-client", type: "subscriber", position: { x: 360, y: 380 }, data: { label: "edge client" } },
    // The leaf link's label, placed beside the vertical line (not on it).
    { id: "leaf-link-label", type: "label", position: { x: 250, y: 250 }, data: { label: "leaf connection (outbound)", color: LEAF, fontSize: 12 } },
];

const INTERVAL = 2800;

const edges: any[] = [
    // Idle intra-cluster route — gray, undirected.
    { id: "route-e", source: "n1-east", target: "n2-east", type: "floating", data: { color: ROUTE } },
    // The order: hub client -> n1-east -> down the leaf link -> factory-1 -> edge client.
    { id: "m-in", source: "hub-pub", target: "n1-east", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 0 } },
    { id: "m-leaf", source: "n1-east", sourceHandle: "bottom-out", target: "factory-1", targetHandle: "top-in", type: "animated", data: { color: LEAF, animated: true, straight: true, interval: INTERVAL, delay: 700 } },
    { id: "m-out", source: "factory-1", target: "edge-client", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 1400 } },
];

function LeafNodeAnimatedInner({ width = 640, height = 500 }: { width?: number; height?: number }) {
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
                <code>factory-1</code> dials one outbound connection up to the{" "}
                <strong>east</strong> hub. An order published on the hub rides that
                single link down to a subscriber on the factory floor — no inbound
                connection to the factory needed.
            </div>
        </div>
    );
}

export function LeafNodeAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <LeafNodeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
