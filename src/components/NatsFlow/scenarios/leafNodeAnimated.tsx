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

// Colors: leaf link is the structural connection, the two flows are tinted to
// distinguish "hub → edge" (blue) from "edge → hub" (green).
const LEAF_LINK_COLOR = "#9333ea"; // purple — the outbound leaf connection
const HUB_TO_EDGE_COLOR = "#3b82f6"; // blue — interest/message bridged down
const EDGE_TO_HUB_COLOR = "#10b981"; // green — interest/message bridged up

type Phase = "connect" | "bridgeDown" | "bridgeUp";

// Each phase holds for a beat so the eye can follow the single highlighted flow.
const PHASE_DURATION_MS: Record<Phase, number> = {
    connect: 4000,
    bridgeDown: 5000,
    bridgeUp: 5000,
};

const PHASE_ORDER: Phase[] = ["connect", "bridgeDown", "bridgeUp"];

function LeafNodeAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [phase, setPhase] = useState<Phase>("connect");

    // Auto-advance through the phases, looping back to the start.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase((prev) => {
                const idx = PHASE_ORDER.indexOf(prev);
                return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
            });
        }, PHASE_DURATION_MS[phase]);
        return () => clearTimeout(timer);
    }, [phase]);

    // Once the leaf has connected, the link stays up for every later phase.
    const connected = phase !== "connect";

    const nodes = [
        // ----- Hub cluster (top) -----
        {
            id: "hub-pub",
            type: "publisher",
            position: { x: 40, y: 30 },
            data: { label: "Hub client" },
        },
        {
            id: "n1-east",
            type: "server",
            position: { x: 240, y: 20 },
            data: { label: "n1-east" },
        },
        {
            id: "n2-east",
            type: "server",
            position: { x: 460, y: 20 },
            data: { label: "n2-east" },
        },
        // ----- Leaf node (bottom) -----
        {
            id: "factory-1",
            type: "server",
            position: { x: 240, y: 250 },
            data: { label: "factory-1" },
            style: {
                opacity: connected ? 1 : 0.55,
            },
        },
        {
            id: "edge-sub",
            type: "subscriber",
            position: { x: 460, y: 210 },
            data: { label: "Edge client" },
            style: {
                opacity: connected ? 1 : 0.55,
            },
        },
        {
            id: "edge-pub",
            type: "publisher",
            position: { x: 460, y: 300 },
            data: { label: "Edge sensor" },
            style: {
                opacity: connected ? 1 : 0.55,
            },
        },
    ];

    const edges: any[] = [];

    // Structural cluster route between the two hub servers — always present.
    edges.push({
        id: "e-cluster-east",
        source: "n1-east",
        target: "n2-east",
        type: "animated",
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: "#94a3b8",
            animated: false,
            label: "cluster east",
            labelColor: "#64748b",
        },
    });

    // The outbound leaf connection: factory-1 dials UP into the hub. During the
    // connect phase we animate dots traveling from leaf → hub to show the
    // direction the connection is initiated. After that it stays as a steady
    // (non-animated) structural link so the interest flows read clearly.
    edges.push({
        id: `e-leaf-link-${phase}`,
        source: "factory-1",
        target: "n1-east",
        type: "animated",
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: LEAF_LINK_COLOR,
            animated: phase === "connect",
            label: "leaf connection (outbound) ↑",
            labelColor: LEAF_LINK_COLOR,
            interval: 1200,
        },
    });

    if (connected) {
        // Hub edge client publishers feed into the hub at all times once linked.
        edges.push({
            id: `e-hub-pub-n1-${phase}`,
            source: "hub-pub",
            target: "n1-east",
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: phase === "bridgeDown"
                    ? HUB_TO_EDGE_COLOR
                    : "#cbd5e1",
                animated: phase === "bridgeDown",
                interval: 1600,
            },
        });

        // factory-1 fans the bridged message out to its local edge client.
        edges.push({
            id: `e-factory-edgesub-${phase}`,
            source: "factory-1",
            target: "edge-sub",
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: phase === "bridgeDown"
                    ? HUB_TO_EDGE_COLOR
                    : "#cbd5e1",
                animated: phase === "bridgeDown",
                // Slight delay so the message visually arrives at factory-1
                // before continuing on to the edge client.
                delay: phase === "bridgeDown" ? 700 : 0,
                interval: 1600,
            },
        });

        // Edge sensor publishes up into factory-1.
        edges.push({
            id: `e-edgepub-factory-${phase}`,
            source: "edge-pub",
            target: "factory-1",
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: phase === "bridgeUp"
                    ? EDGE_TO_HUB_COLOR
                    : "#cbd5e1",
                animated: phase === "bridgeUp",
                interval: 1600,
            },
        });

        // factory-1 bridges the edge message UP the leaf link into the hub.
        edges.push({
            id: `e-factory-n1-up-${phase}`,
            source: "factory-1",
            target: "n2-east",
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: phase === "bridgeUp"
                    ? EDGE_TO_HUB_COLOR
                    : "#cbd5e1",
                animated: phase === "bridgeUp",
                delay: phase === "bridgeUp" ? 700 : 0,
                interval: 1600,
            },
        });
    }

    const description = (() => {
        switch (phase) {
            case "connect":
                return "factory-1 opens an outbound connection up into cluster east (n1-east). The hub never dials the leaf.";
            case "bridgeDown":
                return "Interest bridges down: a hub client's message crosses the leaf link and reaches an edge client on factory-1.";
            case "bridgeUp":
                return "Interest bridges up: an edge sensor's message crosses the leaf link the other way and reaches the hub.";
        }
    })();

    const phaseLabel: Record<Phase, string> = {
        connect: "1. Connect out",
        bridgeDown: "2. Hub → edge",
        bridgeUp: "3. Edge → hub",
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "6px 14px",
        fontSize: "13px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? LEAF_LINK_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Step controls */}
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
                    Step:
                </span>
                {PHASE_ORDER.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPhase(p)}
                        style={buttonStyle(phase === p)}
                    >
                        {phaseLabel[p]}
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
                    minZoom={0.5}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* Cluster / leaf zone labels */}
                <div
                    style={{
                        position: "absolute",
                        left: "12px",
                        top: "8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#64748b",
                    }}
                >
                    Hub — cluster east
                </div>
                <div
                    style={{
                        position: "absolute",
                        left: "12px",
                        bottom: "8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: LEAF_LINK_COLOR,
                    }}
                >
                    Leaf — factory-1
                </div>
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
            <div
                style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#9ca3af",
                    fontStyle: "italic",
                }}
            >
                The leaf connects out, so factory-1 can live anywhere with
                outbound access to the hub — no inbound ports, no public
                address required.
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
