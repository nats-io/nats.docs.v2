import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode, ServiceNode, SubscriberNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    service: ServiceNode,
    server: ServerNode,
    subscriber: SubscriberNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — value in flight
const IDLE_COLOR = "#94a3b8"; // idle gray
const SUCCESS_COLOR = "#34A574"; // NATS green — value live
const FAILURE_COLOR = "#ef4444"; // red — expired / purged
const ACCENT_NAVY = "#375C93"; // accent

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "create" | "tick" | "marker" | "watch";

const STAGE_ORDER: Stage[] = ["create", "tick", "marker", "watch"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    create: 3500,
    tick: 4000,
    marker: 4000,
    watch: 4500,
};

const CAPTION: Record<Stage, string> = {
    create:
        "The inventory service writes flash-sale=99 to KV_INVENTORY with a per-key TTL of 30m.",
    tick:
        "The clock advances past 30m. The flash-sale key is now older than its TTL — it is due to expire.",
    marker:
        "The server places a delete marker for flash-sale with reason MaxAge. The value is gone from the bucket.",
    watch:
        "warehouse-dashboard, watching the bucket, receives the marker as a PURGE/DELETE operation and learns the value disappeared.",
};

function KvTtlExpiryAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("create");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const expired = stage === "marker" || stage === "watch";
    const ttlElapsed = stage === "tick" || expired;

    // The KV bucket's stored value, folded into the label since ServerNode
    // only renders `label`. Flips to "(expired)" once the marker is placed.
    const valueLabel = expired
        ? "KV_INVENTORY · (expired)"
        : "KV_INVENTORY · flash-sale=99";

    const nodes: any[] = [
        // --- The KV bucket, backed by a stream on the server ---
        {
            id: "server",
            type: "box",
            position: { x: 362, y: 120 },
            data: {
                label: valueLabel,
                subtitle: "KV bucket",
            },
            style: {
                filter: expired ? "grayscale(0.4)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // --- The writer: inventory service ---
        {
            id: "inventory",
            type: "service",
            position: { x: 29, y: 120 },
            data: { label: "inventory" },
        },
        // --- The watcher: warehouse dashboard ---
        {
            id: "dashboard",
            type: "subscriber",
            position: { x: 710, y: 120 },
            data: { label: "warehouse-dashboard" },
        },
        // --- TTL clock indicator above the bucket ---
        {
            id: "clock",
            type: "box",
            position: { x: 377, y: -30 },
            data: {
                label: ttlElapsed ? "clock: 30m+ elapsed" : "ttl: 30m",
            },
            style: {
                opacity: ttlElapsed ? 1 : 0.45,
                filter: ttlElapsed ? "none" : "grayscale(0.6)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- inventory -> server: the create/put (active in "create") ---
    edges.push({
        id: `put-${stage}`,
        source: "inventory",
        target: "server",
        sourceHandle: "out-right",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "create" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "create" ? "put flash-sale=99 ttl=30m" : undefined,
            labelColor: ACCENT_NAVY,
            animated: stage === "create",
            interval: 1500,
        },
    });

    // --- clock -> server: TTL crossing triggers the marker ---
    edges.push({
        id: `ttl-${stage}`,
        source: "clock",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: ttlElapsed ? 1 : 0.25 },
        data: {
            color: stage === "tick"
                ? FAILURE_COLOR
                : ttlElapsed
                ? FAILURE_COLOR
                : IDLE_COLOR,
            label: stage === "tick" ? "TTL elapsed" : undefined,
            labelColor: FAILURE_COLOR,
            animated: stage === "tick",
            interval: 1500,
        },
    });

    // --- server self/marker: in "marker" stage, the server purges the key ---
    // Represented as the server->server delete by reusing the watch edge color,
    // but the visible mechanic is the value flipping to (expired) above.

    // --- server -> dashboard: the watcher feed ---
    // Carries the delete/purge marker during "watch"; otherwise idle.
    edges.push({
        id: `watch-${stage}`,
        source: "server",
        target: "dashboard",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "watch"
                ? FAILURE_COLOR
                : stage === "marker"
                ? IDLE_COLOR
                : SUCCESS_COLOR,
            label: stage === "watch"
                ? "PURGE flash-sale (MaxAge)"
                : stage === "marker"
                ? "marker placed"
                : "watch",
            labelColor: stage === "watch" ? FAILURE_COLOR : "#64748b",
            animated: stage === "watch",
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
                    fitViewOptions={{ padding: 0.25 }}
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

export function KvTtlExpiryAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <KvTtlExpiryAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
