import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BoxNode, PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge } from "../edges";

// Consumed by scripts/rehype-nats-flow.mjs, which picks up the FIRST
// description-keyed string in this file for the markdown fallback text.
export const mqttRetainedAnimatedMeta = {
    description:
        "A retained message is the last-value cache for a topic, and it lives inside the server. The cold-1 sensor publishes a reading with the RETAIN flag and the server writes it into the retained store, which holds exactly one value per topic. A second retained publish replaces that value rather than queueing behind it — there is no history. Later a dashboard subscribes for the first time and the stored value is served straight out of the retained store, without waiting for the sensor to publish again. Publishing an empty payload with RETAIN deletes the stored value, so subscribers after that point receive nothing until a new value is retained.",
};

// The server boundary the retained store lives inside. Drawn as a node rather
// than an overlay so it scales and stays aligned with what it encloses.
// Same pattern as kvWatchAnimated.
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
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
    box: BoxNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

const STORE_COLOR = "#27AAE1"; // primary blue — a retained publish
const REPLACE_COLOR = "#f59e0b"; // amber — the stored value being overwritten
const SERVE_COLOR = "#34A574"; // green — retained value served on subscribe
const CLEAR_COLOR = "#94a3b8"; // gray — the empty payload that deletes it
const IDLE_COLOR = "#94a3b8";
const ACCENT_NAVY = "#375C93";

// Four beats: retain a value, replace it, serve it to a late subscriber, and
// delete it with an empty payload.
type Stage = "retain" | "replace" | "late" | "clear";

const STAGE_ORDER: Stage[] = ["retain", "replace", "late", "clear"];

// Paced for reading, not for watching. Each caption runs 150-200 characters,
// which needs roughly 8 seconds at normal reading speed, so the stage has to
// outlast the sentence rather than the animation.
const STAGE_DURATION_MS: Record<Stage, number> = {
    retain: 8000,
    replace: 8500,
    late: 9000,
    clear: 8500,
};

const CAPTION: Record<Stage, string> = {
    retain:
        "The cold-1 sensor publishes 4.2 with the RETAIN flag. The server writes it into the retained store, which holds one value for sensors/warehouse/cold-1/temp.",
    replace:
        "A second retained publish of 4.5 replaces the stored value. Only one message is retained per topic — the previous reading is gone, not queued behind it.",
    late:
        "A dashboard subscribes for the first time. The stored 4.5 is served straight out of the retained store, without waiting for the sensor's next reading.",
    clear:
        "Publishing an empty payload with RETAIN deletes the stored value. It is delivered to current subscribers as a normal message, then the store is empty.",
};

// What the store is holding at each beat.
const STORED_VALUE: Record<Stage, string> = {
    retain: "4.2",
    replace: "4.5",
    late: "4.5",
    clear: "(empty)",
};

function MqttRetainedAnimatedInner({
    width = 680,
    height = 340,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("retain");

    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // Something is being written to the store on every stage except `late`.
    const writing = stage === "retain" || stage === "replace" ||
        stage === "clear";
    const serving = stage === "late";
    const storeEmpty = stage === "clear";
    // The dashboard enters the picture once it subscribes (late) and stays
    // connected through the delete (clear), which it receives as a normal
    // message.
    const dashboardConnected = stage === "late" || stage === "clear";
    const dashboardLive = dashboardConnected ? 1 : 0.3;

    // The retained store lives inside the server boundary — it is server-side
    // state (a JetStream stream), not a peer of the server. The sensor and the
    // dashboard sit outside it.
    const nodes: any[] = [
        {
            id: "server-boundary",
            type: "boundary",
            position: { x: 210, y: 20 },
            data: { label: "NATS server", width: 240, height: 285 },
            zIndex: 0,
            selectable: false,
            draggable: false,
        },
        {
            id: "sensor",
            type: "publisher",
            position: { x: 10, y: 70 },
            data: { label: "cold-1 sensor" },
            zIndex: 1,
        },
        {
            id: "server",
            type: "server",
            position: { x: 250, y: 60 },
            data: { label: "nats-server", subtitle: "" },
            zIndex: 1,
        },
        {
            id: "store",
            type: "box",
            position: { x: 238, y: 200 },
            data: {
                label: STORED_VALUE[stage],
                subtitle: "retained · 1 per topic",
            },
            zIndex: 1,
            style: {
                opacity: storeEmpty ? 0.45 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "dashboard",
            type: "subscriber",
            position: { x: 530, y: 195 },
            data: { label: "dashboard" },
            zIndex: 1,
            style: {
                opacity: dashboardLive,
                filter: dashboardConnected ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- sensor -> server : a retained publish (store, replace, or delete) ---
    edges.push({
        id: `publish-${stage}`,
        source: "sensor",
        target: "server",
        targetHandle: "request-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: writing ? 1 : 0.2 },
        data: {
            color: stage === "retain"
                ? STORE_COLOR
                : stage === "replace"
                ? REPLACE_COLOR
                : stage === "clear"
                ? CLEAR_COLOR
                : IDLE_COLOR,
            label: stage === "retain"
                ? "PUBLISH 4.2 retain"
                : stage === "replace"
                ? "PUBLISH 4.5 retain"
                : stage === "clear"
                ? 'PUBLISH "" retain'
                : undefined,
            labelOffset: -16,
            labelColor: ACCENT_NAVY,
            animated: writing,
            interval: 1500,
        },
    });

    // --- server -> store : writing the single slot. Hidden entirely while
    // serving, since nothing is being written then. ---
    if (writing) {
        edges.push({
            id: `store-${stage}`,
            source: "server",
            target: "store",
            sourceHandle: "bottom-out",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: stage === "retain"
                    ? STORE_COLOR
                    : stage === "replace"
                    ? REPLACE_COLOR
                    : CLEAR_COLOR,
                label: stage === "retain"
                    ? "stores"
                    : stage === "replace"
                    ? "replaces"
                    : "deletes",
                labelColor: ACCENT_NAVY,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- store -> dashboard : the retained value served on subscribe. It
    // leaves the store, which is what makes the store the visible source. ---
    if (serving) {
        edges.push({
            id: `serve-${stage}`,
            source: "store",
            target: "dashboard",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SERVE_COLOR,
                label: "4.5 on subscribe",
                labelOffset: -16,
                labelColor: SERVE_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- server -> dashboard : the delete itself is delivered to current
    // subscribers as a normal (empty) message. ---
    if (stage === "clear") {
        edges.push({
            id: `deliver-${stage}`,
            source: "server",
            target: "dashboard",
            sourceHandle: "request-out",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: CLEAR_COLOR,
                label: '"" as a normal message',
                labelOffset: -16,
                labelColor: ACCENT_NAVY,
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
        backgroundColor: active ? STORE_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
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
                    fitViewOptions={{ padding: 0.12 }}
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

export function MqttRetainedAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MqttRetainedAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
