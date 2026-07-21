import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — link not yet formed / dormant
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active step
const SUCCESS_COLOR = "#34A574"; // NATS green — link established
const ACCENT_NAVY = "#375C93"; // navy — gossip INFO accent

// One mechanism per stage; the cycle loops forever.
type Stage = "seed" | "explicit" | "info" | "gossip" | "mesh";

const STAGE_ORDER: Stage[] = ["seed", "explicit", "info", "gossip", "mesh"];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    seed: 3000,
    explicit: 3500,
    info: 4000,
    gossip: 3500,
    mesh: 4500,
};

const CAPTION: Record<Stage, string> = {
    seed:
        "Three servers start up. n1-east is configured with one explicit route — to n2-east. It knows nothing about n3-east yet.",
    explicit:
        "n1-east dials the explicit (configured) route to n2-east. The two servers complete a route connection.",
    info:
        "n2-east replies with an INFO message that lists every peer it knows — including n3-east. This is the gossip protocol.",
    gossip:
        "Having learned n3-east from that INFO, n1-east opens an implicit (gossip-learned) route to it. No config edit was needed.",
    mesh:
        "Every server is now routed to every other. A full mesh formed itself from a single seed route — that is cluster auto-discovery.",
};

function ClusterGossipAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("seed");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // n3-east is "unknown" to the cluster until the gossip INFO reveals it.
    const n3Known = stage === "gossip" || stage === "mesh";

    // Triangle of three servers in the east cluster.
    const nodes: any[] = [
        {
            id: "n1",
            type: "server",
            position: { x: 72, y: 70 },
            data: { label: "n1-east" },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 456, y: 70 },
            data: { label: "n2-east" },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 264, y: 290 },
            data: { label: "n3-east" },
            style: {
                opacity: n3Known ? 1 : 0.3,
                filter: n3Known ? "none" : "grayscale(1)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- Explicit route: n1-east -> n2-east (configured seed) ---
    // Active during "explicit"; stays established (green) afterwards.
    const explicitActive = stage === "explicit";
    const explicitFormed = stage === "explicit" || stage === "info" ||
        stage === "gossip" || stage === "mesh";
    edges.push({
        id: `r-n1-n2-${stage}`,
        source: "n1",
        target: "n2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: explicitActive
                ? MSG_COLOR
                : explicitFormed
                ? SUCCESS_COLOR
                : IDLE_COLOR,
            label: "explicit route",
            labelOffset: 26,
            labelColor: explicitActive
                ? MSG_COLOR
                : explicitFormed
                ? SUCCESS_COLOR
                : IDLE_COLOR,
            animated: explicitActive,
            interval: 1500,
        },
    });

    // --- INFO (gossip) message: n2-east -> n1-east ---
    // Only present once the explicit route exists; animates during "info".
    if (stage === "info" || stage === "gossip" || stage === "mesh") {
        const infoActive = stage === "info";
        edges.push({
            id: `info-n2-n1-${stage}`,
            source: "n2",
            target: "n1",
            sourceHandle: "reply-out",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: infoActive ? 1 : 0.25 },
            data: {
                color: infoActive ? ACCENT_NAVY : IDLE_COLOR,
                label: "INFO (gossip)",
                labelColor: infoActive ? ACCENT_NAVY : IDLE_COLOR,
                animated: infoActive,
                interval: 1500,
            },
        });
    }

    // --- Implicit route: n1-east -> n3-east (gossip-learned) ---
    // Appears only after n3 is known; animates during "gossip".
    if (n3Known) {
        const gossipActive = stage === "gossip";
        edges.push({
            id: `r-n1-n3-${stage}`,
            source: "n1",
            target: "n3",
            sourceHandle: "bottom-out",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: gossipActive ? MSG_COLOR : SUCCESS_COLOR,
                label: "implicit route",
                labelColor: gossipActive ? MSG_COLOR : SUCCESS_COLOR,
                animated: gossipActive,
                interval: 1500,
            },
        });
    }

    // --- Final mesh link: n2-east -> n3-east (mesh completes itself) ---
    // The third leg of the triangle, established once everyone knows everyone.
    if (stage === "mesh") {
        edges.push({
            id: "r-n2-n3-mesh",
            source: "n2",
            target: "n3",
            sourceHandle: "bottom-out",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                label: "implicit route",
                labelColor: SUCCESS_COLOR,
                animated: true,
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

export function ClusterGossipAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ClusterGossipAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
