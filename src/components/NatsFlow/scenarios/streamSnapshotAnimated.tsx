import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — the active flow
const IDLE_COLOR = "#94a3b8"; // gray — links not active this stage
const COMMIT_COLOR = "#34A574"; // NATS green — files safely landed
const ACK_COLOR = "#8DC63F"; // lime — flow-control ack
const NAVY_COLOR = "#375C93"; // navy — accent for control plane

// Backing up the ORDERS stream with `nats stream backup`: a request opens
// an ephemeral inbox, the server streams the stream as S2-compressed tar
// chunks, the client acks each chunk for flow control, and the result is
// two files in an off-site store.
type Stage =
    | "request"
    | "config"
    | "chunk"
    | "ack"
    | "land";

const STAGE_ORDER: Stage[] = [
    "request",
    "config",
    "chunk",
    "ack",
    "land",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    request: 3000,
    config: 3000,
    chunk: 3500,
    ack: 3000,
    land: 5000,
};

const CAPTION: Record<Stage, string> = {
    request:
        "The backup client sends a snapshot request to the ORDERS stream and opens an ephemeral deliver_subject inbox to receive the data on.",
    config:
        "The server answers with the stream's config and state, then begins draining its store as an S2-compressed tar archive.",
    chunk:
        "The server streams stream.tar.s2 to the inbox one chunk at a time — a chunked pull, never a single huge payload.",
    ack:
        "After each chunk the client returns a flow-control ack. The server waits for it before sending the next chunk — backpressure keeps the client from drowning.",
    land:
        "When the last chunk is acked, backup.json (config + state) and stream.tar.s2 (the messages) land in the off-site backup store.",
};

function StreamSnapshotAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("request");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const landed = stage === "land";

    const nodes: any[] = [
        // --- The ORDERS stream, living on the server ---
        {
            id: "stream",
            type: "box",
            position: { x: 78, y: 150 },
            data: { label: "ORDERS stream", subtitle: "stream" },
        },
        // --- The backup client driving the snapshot ---
        {
            id: "client",
            type: "publisher",
            position: { x: 416, y: 30 },
            data: { label: "backup client" },
        },
        // --- The ephemeral deliver_subject inbox ---
        {
            id: "inbox",
            type: "subscriber",
            position: { x: 416, y: 250 },
            data: { label: "_INBOX deliver" },
        },
        // --- The off-site backup store ---
        {
            id: "store",
            type: "subscriber",
            position: { x: 754, y: 150 },
            data: {
                label: landed ? "store ✓" : "backup store",
            },
            style: {
                opacity: landed ? 1 : 0.55,
                filter: landed ? "none" : "grayscale(0.6)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client -> stream : the snapshot request (stage "request") ---
    edges.push({
        id: `req-${stage}`,
        source: "client",
        target: "stream",
        sourceHandle: "out-left",
        targetHandle: "reply-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "request" ? MSG_COLOR : IDLE_COLOR,
            label: "snapshot request",
            labelColor: stage === "request" ? NAVY_COLOR : "#94a3b8",
            animated: stage === "request",
            interval: 1500,
        },
    });

    // --- stream -> client : config + state response (stage "config") ---
    edges.push({
        id: `cfg-${stage}`,
        source: "stream",
        target: "client",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "config" ? 1 : 0.5 },
        data: {
            color: stage === "config" ? MSG_COLOR : IDLE_COLOR,
            label: "config + state",
            labelColor: stage === "config" ? NAVY_COLOR : "#94a3b8",
            animated: stage === "config",
            interval: 1500,
        },
    });

    // --- stream -> inbox : S2-tar chunk streaming (stage "chunk") ---
    const chunkActive = stage === "chunk";
    edges.push({
        id: `chunk-${stage}`,
        source: "stream",
        target: "inbox",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: chunkActive || stage === "ack" ? 1 : 0.5 },
        data: {
            color: chunkActive ? MSG_COLOR : IDLE_COLOR,
            label: "stream.tar.s2 chunk",
            labelColor: chunkActive ? NAVY_COLOR : "#94a3b8",
            animated: chunkActive,
            interval: 1200,
        },
    });

    // --- inbox -> stream : flow-control ack per chunk (stage "ack") ---
    const ackActive = stage === "ack";
    edges.push({
        id: `ack-${stage}`,
        source: "inbox",
        target: "stream",
        // The stream sits up and to the left of the inbox, so leave from the
        // inbox's left and arrive on the stream's right-hand reply handle.
        sourceHandle: "out-left",
        targetHandle: "reply-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: ackActive ? 1 : 0.4 },
        data: {
            color: ackActive ? ACK_COLOR : IDLE_COLOR,
            label: "flow-control ack",
            labelOffset: 26,
            labelColor: ackActive ? "#5a8a1f" : "#94a3b8",
            animated: ackActive,
            interval: 1500,
        },
    });

    // --- inbox -> store : files land off-site (stage "land") ---
    edges.push({
        id: `land-${stage}`,
        source: "inbox",
        target: "store",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: landed ? 1 : 0.35 },
        data: {
            color: landed ? COMMIT_COLOR : IDLE_COLOR,
            label: landed ? "backup.json + tar.s2" : "to store",
            labelColor: landed ? COMMIT_COLOR : "#94a3b8",
            animated: landed,
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

export function StreamSnapshotAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <StreamSnapshotAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
