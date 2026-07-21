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

// The server boundary the bucket and its consumer live inside. Drawn as a node
// rather than an overlay so it scales and stays aligned with what it encloses.
function BoundaryNode({ data }: { data: any }) {
    return (
        <div
            style={{
                width: data.width,
                height: data.height,
                border: "1px dashed #94a3b8",
                borderRadius: "10px",
                background: "rgba(148, 163, 184, 0.05)",
                position: "relative",
                pointerEvents: "none",
            }}
        >
            <span
                style={{
                    position: "absolute",
                    top: "-9px",
                    left: "12px",
                    background: "#ffffff",
                    padding: "0 6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "#6b7280",
                }}
            >
                {data.label}
            </span>
        </div>
    );
}

const nodeTypes = {
    boundary: BoundaryNode,
    box: BoxNode,
    subscriber: SubscriberNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — value in flight
const COMMIT_COLOR = "#34A574"; // NATS green — end-of-initial-data / live put
const ACCENT_NAVY = "#375C93"; // navy accent for the ordered consumer
const LIME = "#8DC63F"; // lime — the live update marker

// A KV watch is snapshot-then-live: the client opens a watch, an ephemeral
// ordered consumer (last-per-subject) is created, the current value of every
// key replays as the initial snapshot, a nil end-of-initial-data marker
// signals "you are caught up", and from then on fresh puts stream live.
type Stage = "open" | "snapshot" | "eoi" | "live";

const STAGE_ORDER: Stage[] = ["open", "snapshot", "eoi", "live"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    open: 3000,
    snapshot: 4000,
    eoi: 3000,
    live: 4500,
};

const CAPTION: Record<Stage, string> = {
    open:
        "warehouse-dashboard opens a watch on KV_INVENTORY. Under the hood JetStream creates an ephemeral ordered consumer with deliver-last-per-subject.",
    snapshot:
        "The consumer replays the current value of every key — the initial snapshot. The watcher sees each key's latest revision exactly once.",
    eoi:
        "A nil end-of-initial-data marker flows back. It tells the watcher the snapshot is complete and it is now caught up to the head of the stream.",
    live:
        "A fresh put widget-blue 41 lands on KV_INVENTORY and streams live to the watcher — same callback, no gap between history and now.",
};

function KvWatchAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("open");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // The ordered consumer only exists once the watch is open.
    const consumerLive = stage !== "open" ? 1 : 0.35;

    // The bucket and the consumer both live on the server — the consumer is a
    // cursor over the bucket's backing stream, not a hop on the wire between
    // the server and the client. Only one link crosses the boundary.
    const nodes: any[] = [
        {
            id: "server-boundary",
            type: "boundary",
            position: { x: 20, y: 40 },
            data: { label: "NATS server", width: 300, height: 330 },
            zIndex: 0,
            selectable: false,
            draggable: false,
        },
        // The backing KV store (a JetStream stream under the hood).
        {
            id: "kv",
            type: "box",
            position: { x: 70, y: 90 },
            data: { label: "KV_INVENTORY", subtitle: "KV bucket" },
            zIndex: 1,
        },
        // The ephemeral ordered consumer this watch creates, inside the server.
        {
            id: "consumer",
            type: "service",
            position: { x: 70, y: 265 },
            data: { label: "ordered consumer" },
            zIndex: 1,
            style: {
                opacity: consumerLive,
                filter: stage === "open" ? "grayscale(0.6)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // The client watching for changes, outside the server.
        {
            id: "watcher",
            type: "subscriber",
            position: { x: 560, y: 180 },
            data: { label: "warehouse-dashboard" },
            zIndex: 1,
        },
    ];

    const edges: any[] = [];

    // --- watcher -> kv : the watch request that opens the stream ---
    edges.push({
        id: `open-${stage}`,
        source: "watcher",
        target: "kv",
        sourceHandle: "out-left",
        targetHandle: "reply-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "open" ? 1 : 0.3 },
        data: {
            bow: -60,
            color: stage === "open" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "open" ? "watch()" : undefined,
            labelOffset: -18,
            labelColor: ACCENT_NAVY,
            animated: stage === "open",
            interval: 1500,
        },
    });

    // --- kv -> consumer : stream feeds the ordered consumer ---
    // Carries the snapshot replay, then the EOI marker, then live puts.
    const kvToConsumerActive = stage === "snapshot" || stage === "eoi" ||
        stage === "live";
    edges.push({
        id: `kv-consumer-${stage}`,
        source: "kv",
        target: "consumer",
        sourceHandle: "bottom-out",
        targetHandle: "in-top",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: consumerLive },
        data: {
            color: stage === "snapshot"
                ? MSG_COLOR
                : stage === "eoi"
                ? COMMIT_COLOR
                : stage === "live"
                ? LIME
                : IDLE_COLOR,
            label: stage === "snapshot"
                ? "last-per-subject"
                : undefined,
            labelColor: ACCENT_NAVY,
            animated: kvToConsumerActive,
            interval: 1500,
        },
    });

    // --- consumer -> watcher : delivery back to the watch callback ---
    const consumerToWatcherActive = stage === "snapshot" || stage === "eoi" ||
        stage === "live";
    edges.push({
        id: `consumer-watcher-${stage}`,
        source: "consumer",
        target: "watcher",
        sourceHandle: "out-right",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: consumerLive },
        data: {
            color: stage === "snapshot"
                ? MSG_COLOR
                : stage === "eoi"
                ? COMMIT_COLOR
                : stage === "live"
                ? LIME
                : IDLE_COLOR,
            label: stage === "snapshot"
                ? "snapshot"
                : stage === "eoi"
                ? "nil (EOI)"
                : stage === "live"
                ? "widget-blue=41"
                : undefined,
            labelColor: stage === "eoi"
                ? COMMIT_COLOR
                : stage === "live"
                ? "#5a8a1f"
                : ACCENT_NAVY,
            animated: consumerToWatcherActive,
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

export function KvWatchAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <KvWatchAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
