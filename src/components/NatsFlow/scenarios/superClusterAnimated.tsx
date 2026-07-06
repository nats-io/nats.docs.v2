import React from "react";
import {
    Background,
    ReactFlow,
    ReactFlowProvider,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge, FloatingEdge } from "../edges";

// Two clusters, joined by one gateway. `order-svc` publishes in east; the order
// enters at an outer east server, hops the intra-cluster route to the
// gateway-facing server, crosses the gateway to west, hops to an outer west
// server, and reaches `warehouse`. The whole path sits on one row so every hop
// is a clean horizontal line (circular nodes only have edge-point handles, so a
// diagonal animated hop wouldn't land cleanly on the circle). The third server
// in each cluster sits below, joined by idle gray FloatingEdges. Clients attach
// to the outer servers so their lines never cut across the mesh. Blue = a
// message moving inside a cluster; amber = the gateway hop.
const EAST = "#10b981"; // green — cluster east
const WEST = "#f59e0b"; // amber — cluster west
const MSG = "#27AAE1"; // NATS blue — a message in flight inside a cluster
const GATEWAY = "#f59e0b"; // amber — the cross-cluster gateway hop
const ROUTE = "#94a3b8"; // gray — idle intra-cluster route mesh

// A tinted, titled box that visually contains one cluster's servers.
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
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
    floating: FloatingEdge,
};

// Parent region nodes must be listed before their children. Server positions are
// relative to their region. In each cluster the two servers on the message row
// (n1 inner, n2 outer) share a y so their hop is horizontal; n3 sits below.
const nodes: any[] = [
    {
        id: "cluster-east",
        type: "region",
        position: { x: 90, y: 20 },
        style: { width: 240, height: 260 },
        data: { label: "cluster east", bg: "#ecfdf5", border: EAST, labelColor: "#065f46" },
        selectable: false,
        draggable: false,
    },
    {
        id: "cluster-west",
        type: "region",
        position: { x: 470, y: 20 },
        style: { width: 240, height: 260 },
        data: { label: "cluster west", bg: "#fffbeb", border: WEST, labelColor: "#92400e" },
        selectable: false,
        draggable: false,
    },
    // East: n2 outer (left, client side) and n1 inner (right, gateway) share the
    // message row; n3 sits below. Servers are spaced ~30px apart so the routes
    // between them stay visible.
    { id: "n2-east", type: "server", parentId: "cluster-east", extent: "parent", position: { x: 10, y: 40 }, data: { label: "n2-east", circular: true, borderColor: EAST } },
    { id: "n1-east", type: "server", parentId: "cluster-east", extent: "parent", position: { x: 130, y: 40 }, data: { label: "n1-east", circular: true, borderColor: EAST } },
    { id: "n3-east", type: "server", parentId: "cluster-east", extent: "parent", position: { x: 70, y: 145 }, data: { label: "n3-east", circular: true, borderColor: EAST } },
    // West: n1 inner (left, gateway) and n2 outer (right, client side) share the
    // message row; n3 sits below.
    { id: "n1-west", type: "server", parentId: "cluster-west", extent: "parent", position: { x: 10, y: 40 }, data: { label: "n1-west", circular: true, borderColor: WEST } },
    { id: "n2-west", type: "server", parentId: "cluster-west", extent: "parent", position: { x: 130, y: 40 }, data: { label: "n2-west", circular: true, borderColor: WEST } },
    { id: "n3-west", type: "server", parentId: "cluster-west", extent: "parent", position: { x: 70, y: 145 }, data: { label: "n3-west", circular: true, borderColor: WEST } },
    // Clients attach to the outer servers, well to the outside so their lines and
    // labels clear the region boxes.
    { id: "app", type: "publisher", position: { x: -110, y: 80 }, data: { label: "order-svc" } },
    { id: "worker", type: "subscriber", position: { x: 800, y: 80 }, data: { label: "warehouse" } },
];

const INTERVAL = 3600;

const edges: any[] = [
    // Idle intra-cluster routes to n3 — gray, undirected. The n1<->n2 leg is the
    // carrying route below (animated), so only the two legs to n3 are idle here.
    { id: "re-13", source: "n1-east", target: "n3-east", type: "floating", data: { color: ROUTE } },
    { id: "re-23", source: "n2-east", target: "n3-east", type: "floating", data: { color: ROUTE } },
    { id: "rw-13", source: "n1-west", target: "n3-west", type: "floating", data: { color: ROUTE } },
    { id: "rw-23", source: "n2-west", target: "n3-west", type: "floating", data: { color: ROUTE } },
    // The order's path — one horizontal row from order-svc to warehouse.
    { id: "m-in", source: "app", target: "n2-east", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 0, label: "orders.created", labelColor: MSG } },
    { id: "m-route-east", source: "n2-east", target: "n1-east", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 700 } },
    { id: "m-gw", source: "n1-east", target: "n1-west", type: "animated", data: { color: GATEWAY, animated: true, straight: true, interval: INTERVAL, delay: 1400, label: "gateway (east ↔ west)", labelColor: "#b45309" } },
    { id: "m-route-west", source: "n1-west", target: "n2-west", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 2100 } },
    { id: "m-out", source: "n2-west", target: "worker", type: "animated", data: { color: MSG, animated: true, straight: true, interval: INTERVAL, delay: 2800 } },
];

function SuperClusterAnimatedInner({ width = 760, height = 380 }: { width?: number; height?: number }) {
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
                    fitViewOptions={{ padding: 0.06 }}
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
                An order published in the <strong>east</strong> cluster crosses the
                gateway to a subscriber in <strong>west</strong>. Each region keeps
                its own three-server route mesh; only the gateway hop leaves the
                cluster.
            </div>
        </div>
    );
}

export function SuperClusterAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <SuperClusterAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
