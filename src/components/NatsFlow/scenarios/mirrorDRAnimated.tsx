import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // idle link (gray)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message / write in flight
const SYNC_COLOR = "#34A574"; // NATS green — mirror fully caught up
const NAVY = "#375C93"; // accent navy

// Replication-as-DR story: order-svc writes to ORDERS on site1; messages
// replicate continuously to the ORDERS_DR mirror on site2, with a visible
// lag counter trending toward zero. No promotion happens — this is the
// steady-state DR picture.
type Stage = "publish" | "replicate" | "catchup" | "synced";

const STAGE_ORDER: Stage[] = ["publish", "replicate", "catchup", "synced"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 3000,
    replicate: 3500,
    catchup: 4000,
    synced: 4500,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "order-svc publishes to ORDERS on site1. site1 holds the authoritative copy of every order message.",
    replicate:
        "ORDERS_DR on site2 is a mirror of ORDERS. It pulls new messages across the link continuously — replication runs on its own, no client involvement.",
    catchup:
        "The mirror works through the backlog. The lag counter — how many messages ORDERS_DR is behind ORDERS — trends toward zero.",
    synced:
        "Lag reaches 0: ORDERS_DR holds a complete, up-to-date copy of every order. site2 is a hot standby, ready for disaster recovery. No promotion yet — site1 still serves all traffic.",
};

// Visible lag counter per stage (messages ORDERS_DR is behind ORDERS).
const LAG_BY_STAGE: Record<Stage, number> = {
    publish: 12,
    replicate: 12,
    catchup: 4,
    synced: 0,
};

function MirrorDRAnimatedInner({
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

    const lag = LAG_BY_STAGE[stage];
    const inSync = stage === "synced";
    const replicating = stage === "replicate" || stage === "catchup";

    const nodes: any[] = [
        // --- Publisher writing to the primary ---
        {
            id: "orderSvc",
            type: "publisher",
            position: { x: -40, y: 130 },
            data: { label: "order-svc" },
        },
        // --- site1: ORDERS primary ---
        {
            id: "site1",
            type: "server",
            position: { x: 200, y: 130 },
            data: { label: "site1 · ORDERS" },
        },
        // --- site2: ORDERS_DR mirror ---
        {
            id: "site2",
            type: "server",
            position: { x: 470, y: 130 },
            data: { label: "site2 · ORDERS_DR" },
            style: {
                opacity: inSync ? 1 : 0.92,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> site1 (writes during "publish" stage) ---
    edges.push({
        id: `svc-site1-${stage}`,
        source: "orderSvc",
        target: "site1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "publish" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "publish" ? "publish" : "write",
            labelColor: stage === "publish" ? MSG_COLOR : "#64748b",
            animated: stage === "publish",
            interval: 1500,
        },
    });

    // --- site1 -> site2 replication link (the mirror pulls continuously) ---
    edges.push({
        id: `repl-${stage}`,
        source: "site1",
        target: "site2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: 1 },
        data: {
            color: inSync ? SYNC_COLOR : replicating ? MSG_COLOR : IDLE_COLOR,
            label: inSync ? "in sync" : `replicate · lag ${lag}`,
            labelColor: inSync ? SYNC_COLOR : replicating ? MSG_COLOR : NAVY,
            animated: replicating,
            interval: 1500,
        },
    });

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

    const lagColor = inSync ? SYNC_COLOR : lag > 8 ? "#ef4444" : NAVY;

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

                {/* Lag counter overlay */}
                <div
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${lagColor}`,
                        background: "#ffffff",
                        fontSize: "12px",
                        color: "#374151",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        textAlign: "center",
                        minWidth: "92px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "#6b7280",
                            marginBottom: "2px",
                        }}
                    >
                        Mirror lag
                    </div>
                    <div
                        style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: lagColor,
                            fontFamily: "monospace",
                            lineHeight: 1,
                        }}
                    >
                        {lag}
                    </div>
                    <div
                        style={{
                            fontSize: "10px",
                            color: inSync ? SYNC_COLOR : "#9ca3af",
                            marginTop: "2px",
                        }}
                    >
                        {inSync ? "caught up" : "messages behind"}
                    </div>
                </div>
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

export function MirrorDRAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <MirrorDRAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
