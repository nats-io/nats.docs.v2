import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, ServiceNode, SubscriberNode } from "../nodes";
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

// Colors: traffic that stays inside a cluster is "local" green; traffic that
// has to cross the gateway to the other cluster is "remote" amber.
const LOCAL_COLOR = "#10b981";
const REMOTE_COLOR = "#f59e0b";
const ROUTE_COLOR = "#94a3b8";
const GATEWAY_COLOR = "#f59e0b";

const LOCAL_DURATION_MS = 6000;
const REMOTE_DURATION_MS = 6500;

// Two phases auto-cycle to contrast geo-affinity vs. a gateway crossing.
type Phase = "local" | "remote";

function SuperClusterAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [phase, setPhase] = useState<Phase>("local");

    // Auto-cycle: linger on the all-local case, then show the rarer crossing.
    useEffect(() => {
        const duration = phase === "local"
            ? LOCAL_DURATION_MS
            : REMOTE_DURATION_MS;
        const timer = setTimeout(() => {
            setPhase((p) => (p === "local" ? "remote" : "local"));
        }, duration);
        return () => clearTimeout(timer);
    }, [phase]);

    const isRemote = phase === "remote";

    // In the "local" phase the east worker has interest, so the request is
    // served inside east and the west worker sits idle. In the "remote" phase
    // there is no local interest, so the message has to ride the gateway west.
    const eastWorkerActive = !isRemote;
    const westWorkerActive = isRemote;

    const nodes: any[] = [
        // --- EAST cluster ---
        {
            id: "requester",
            type: "publisher",
            position: { x: 0, y: 130 },
            data: { label: "App (east)" },
        },
        {
            id: "n1-east",
            type: "server",
            position: { x: 170, y: 60 },
            data: { label: "n1-east" },
        },
        {
            id: "n2-east",
            type: "server",
            position: { x: 170, y: 220 },
            data: { label: "n2-east" },
        },
        {
            id: "east-worker",
            type: "service",
            position: { x: 360, y: 230 },
            data: { label: "worker (east)" },
            style: { opacity: eastWorkerActive ? 1 : 0.3 },
        },
        // --- WEST cluster ---
        {
            id: "n3-west",
            type: "server",
            position: { x: 430, y: 60 },
            data: { label: "n3-west" },
        },
        {
            id: "west-worker",
            type: "service",
            position: { x: 600, y: 60 },
            data: { label: "worker (west)" },
            style: { opacity: westWorkerActive ? 1 : 0.3 },
        },
    ];

    const edges: any[] = [
        // Requester always reaches its local cluster entry point.
        {
            id: `e-req-n1-${phase}`,
            source: "requester",
            target: "n1-east",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: isRemote ? REMOTE_COLOR : LOCAL_COLOR,
                animated: true,
                interval: 2200,
            },
        },
        // Intra-cluster route between the two east servers — always present,
        // gently animated to show the cluster is a full mesh.
        {
            id: "e-route-east",
            source: "n1-east",
            target: "n2-east",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: ROUTE_COLOR,
                animated: true,
                label: "route (cluster east)",
                labelColor: "#64748b",
                interval: 3000,
            },
        },
        // The gateway link itself is always drawn so the topology is stable,
        // but it only carries circles in the remote phase.
        {
            id: `e-gateway-${phase}`,
            source: "n1-east",
            target: "n3-west",
            type: "animated",
            animated: isRemote,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: GATEWAY_COLOR,
                animated: isRemote,
                label: "gateway (east ↔ west)",
                labelColor: "#b45309",
                interval: 2200,
            },
        },
    ];

    if (isRemote) {
        // No local interest: the message crosses west and is served there.
        edges.push({
            id: "e-n3-westworker",
            source: "n3-west",
            target: "west-worker",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: REMOTE_COLOR,
                animated: true,
                interval: 2200,
            },
        });
    } else {
        // Local interest: east serves the request and nothing leaves the cluster.
        edges.push({
            id: "e-n2-eastworker",
            source: "n2-east",
            target: "east-worker",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: LOCAL_COLOR,
                animated: true,
                interval: 2200,
            },
        });
    }

    const description = isRemote
        ? "No interest in east — the request crosses the gateway to west, where a worker is subscribed."
        : "A worker in east is subscribed, so the request is served locally and never touches the gateway.";

    const statusColor = isRemote ? REMOTE_COLOR : LOCAL_COLOR;

    return (
        <div style={{ position: "relative" }}>
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
                    fitViewOptions={{ padding: 0.18 }}
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

                {/* Cluster region badges */}
                <div
                    style={{
                        position: "absolute",
                        left: "12px",
                        top: "10px",
                        padding: "3px 10px",
                        background: "#ecfdf5",
                        border: `1px solid ${LOCAL_COLOR}`,
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#065f46",
                        letterSpacing: "1px",
                    }}
                >
                    cluster east
                </div>
                <div
                    style={{
                        position: "absolute",
                        right: "12px",
                        top: "10px",
                        padding: "3px 10px",
                        background: "#fffbeb",
                        border: `1px solid ${REMOTE_COLOR}`,
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#92400e",
                        letterSpacing: "1px",
                    }}
                >
                    cluster west
                </div>

                {/* Phase pill */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "12px",
                        transform: "translateX(-50%)",
                        padding: "4px 12px",
                        background: "#ffffff",
                        border: `1px solid ${statusColor}`,
                        borderRadius: "999px",
                        fontSize: "12px",
                        color: statusColor,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    {isRemote ? "Gateway crossing" : "Served locally (geo-affinity)"}
                </div>
            </div>

            {/* Status caption */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                }}
            >
                {description}
            </div>
            <div
                style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#9ca3af",
                    fontStyle: "italic",
                }}
            >
                Gateways carry only traffic that has interest on the other side
                {" "}— a subscriber there. Everything else stays in its home
                cluster.
            </div>
        </div>
    );
}

export function SuperClusterAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <SuperClusterAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
