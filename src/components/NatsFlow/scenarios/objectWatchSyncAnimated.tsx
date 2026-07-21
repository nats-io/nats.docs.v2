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
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message / metadata in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const SUCCESS_COLOR = "#34A574"; // NATS green — successful data fetch
const ACCENT_NAVY = "#375C93"; // navy — labels / put writes

// One Object Store object per "put" stage, then the watcher receives the
// metadata update, then it fetches the actual bytes with a separate get.
type Stage =
    | "put-invoice"
    | "watch-invoice"
    | "put-label"
    | "put-slip"
    | "fetch-bytes";

const STAGE_ORDER: Stage[] = [
    "put-invoice",
    "watch-invoice",
    "put-label",
    "put-slip",
    "fetch-bytes",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    "put-invoice": 3000,
    "watch-invoice": 3500,
    "put-label": 2800,
    "put-slip": 2800,
    "fetch-bytes": 4500,
};

const CAPTION: Record<Stage, string> = {
    "put-invoice":
        "order-svc puts invoice-7841 into the INVOICES object store. The bytes plus a metadata entry are written to the server.",
    "watch-invoice":
        "analytics is watching INVOICES. The server pushes the new object's metadata — name, size, digest — but not the bytes themselves.",
    "put-label":
        "order-svc puts label-7841. The watcher receives this metadata update next, in the exact order objects were written.",
    "put-slip":
        "order-svc puts packing-slip-7841. analytics sees a steady real-time stream of metadata-only updates as each object lands.",
    "fetch-bytes":
        "Metadata told analytics what changed. To read the actual content it issues a SEPARATE get for the object's bytes.",
};

// Which object's metadata the watcher is receiving during each watch-y stage.
const WATCH_OBJECT: Partial<Record<Stage, string>> = {
    "watch-invoice": "invoice-7841",
    "put-label": "label-7841",
    "put-slip": "packing-slip-7841",
};

// Which object is being written during each put stage.
const PUT_OBJECT: Partial<Record<Stage, string>> = {
    "put-invoice": "invoice-7841",
    "put-label": "label-7841",
    "put-slip": "packing-slip-7841",
};

function ObjectWatchSyncAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("put-invoice");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const isPutStage = stage in PUT_OBJECT;
    const isWatchStage = stage in WATCH_OBJECT;
    const isFetchStage = stage === "fetch-bytes";

    const nodes: any[] = [
        {
            id: "writer",
            type: "publisher",
            position: { x: -40, y: 130 },
            data: { label: "order-svc" },
        },
        {
            id: "server",
            type: "box",
            position: { x: 230, y: 130 },
            data: { label: "INVOICES", subtitle: "object store" },
        },
        {
            id: "watcher",
            type: "subscriber",
            position: { x: 500, y: 130 },
            data: { label: "analytics" },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> server: a "put" writes object bytes + metadata ---
    const putObject = PUT_OBJECT[stage];
    edges.push({
        id: `put-${stage}`,
        source: "writer",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isPutStage ? MSG_COLOR : IDLE_COLOR,
            label: isPutStage ? `put ${putObject}` : "put",
            labelColor: isPutStage ? ACCENT_NAVY : "#64748b",
            animated: isPutStage,
            interval: 1500,
        },
    });

    // --- server -> analytics: the watch pushes metadata-only updates ---
    const watchObject = WATCH_OBJECT[stage];
    edges.push({
        id: `watch-${stage}`,
        source: "server",
        target: "watcher",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isWatchStage ? MSG_COLOR : IDLE_COLOR,
            label: isWatchStage ? `meta: ${watchObject}` : "watch",
            labelColor: isWatchStage ? MSG_COLOR : "#64748b",
            animated: isWatchStage,
            interval: 1500,
        },
    });

    // --- analytics -> server: the SEPARATE get for the actual bytes ---
    // Only drawn during the fetch stage; it points back at the store.
    if (isFetchStage) {
        edges.push({
            id: "fetch-req",
            source: "watcher",
            target: "server",
            // Points back at the store, so it runs right to left in its own
            // lane under the watch updates coming the other way.
            sourceHandle: "out-left",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 1 },
            data: {
                bow: 55,
                color: SUCCESS_COLOR,
                label: "get invoice-7841 bytes",
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

export function ObjectWatchSyncAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ObjectWatchSyncAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
