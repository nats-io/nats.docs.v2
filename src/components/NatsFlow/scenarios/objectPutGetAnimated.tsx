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
const MSG_COLOR = "#27AAE1"; // NATS primary blue — bytes in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const SUCCESS_COLOR = "#34A574"; // NATS green — verified digest
const NAVY = "#375C93"; // accent — metadata message
const LIME = "#8DC63F"; // accent — chunk highlight

// The object store is "chunks-then-meta" on the way in,
// "meta-then-chunks-then-verify" on the way out.
type Stage =
    | "put-chunks"
    | "put-meta"
    | "get-meta"
    | "get-chunks"
    | "verify";

const STAGE_ORDER: Stage[] = [
    "put-chunks",
    "put-meta",
    "get-meta",
    "get-chunks",
    "verify",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    "put-chunks": 4000,
    "put-meta": 3000,
    "get-meta": 3000,
    "get-chunks": 4000,
    "verify": 4500,
};

const CAPTION: Record<Stage, string> = {
    "put-chunks":
        "order-svc PUTs invoice.pdf: the bytes are split into fixed-size chunks, each published as its own message on a chunk subject inside the INVOICES bucket.",
    "put-meta":
        "After the last chunk lands, order-svc writes one metadata message — name, size, chunk count and the SHA-256 digest of the whole object — sealing the PUT.",
    "get-meta":
        "warehouse GETs invoice.pdf by reading the metadata message first. It learns how many chunks to expect and which digest the reassembled bytes must match.",
    "get-chunks":
        "warehouse streams the chunk messages back in sequence order and reassembles them into the original byte stream.",
    "verify":
        "warehouse hashes the reassembled bytes and compares against the digest from the metadata. The SHA-256 matches — the object is intact, end to end.",
};

// The four chunks of the object, laid out as slots beside the bucket.
const CHUNK_COUNT = 4;

function ObjectPutGetAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("put-chunks");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const putting = stage === "put-chunks" || stage === "put-meta";
    const getting = stage === "get-meta" || stage === "get-chunks" ||
        stage === "verify";
    const verified = stage === "verify";

    // Chunks light up (lime) while being written, and again while being read
    // back; they turn green when the digest verifies.
    const chunksActive = stage === "put-chunks" || stage === "get-chunks";

    const nodes: any[] = [
        // --- Publisher: order-svc on the left ---
        {
            id: "order-svc",
            type: "publisher",
            position: { x: -40, y: 150 },
            data: { label: "order-svc" },
            style: {
                opacity: putting ? 1 : 0.45,
                transition: "opacity 0.4s ease",
            },
        },
        // --- The INVOICES bucket (server) in the middle ---
        {
            id: "invoices",
            type: "box",
            position: { x: 250, y: 150 },
            data: { label: "INVOICES", subtitle: "object store" },
        },
        // --- Subscriber: warehouse on the right ---
        {
            id: "warehouse",
            type: "subscriber",
            position: { x: 540, y: 150 },
            data: { label: "warehouse" },
            style: {
                opacity: getting ? 1 : 0.45,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> INVOICES: chunk messages, then metadata ---
    edges.push({
        id: `put-chunks-edge-${stage}`,
        source: "order-svc",
        target: "invoices",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "put-chunks" ? 1 : 0.25 },
        data: {
            color: stage === "put-chunks" ? LIME : IDLE_COLOR,
            label: stage === "put-chunks"
                ? `${CHUNK_COUNT} chunks`
                : "chunk subj",
            labelColor: stage === "put-chunks" ? "#5a8a1f" : "#94a3b8",
            animated: stage === "put-chunks",
            interval: 1200,
        },
    });

    edges.push({
        id: `put-meta-edge-${stage}`,
        source: "order-svc",
        target: "invoices",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
            opacity: stage === "put-meta" ? 1 : 0.18,
            // Bowed so it reads as a separate metadata write.
        },
        data: {
            bow: 55,
            color: stage === "put-meta" ? NAVY : IDLE_COLOR,
            label: stage === "put-meta" ? "metadata + SHA-256" : "meta subj",
            labelColor: stage === "put-meta" ? NAVY : "#94a3b8",
            animated: stage === "put-meta",
            interval: 1500,
        },
    });

    // --- INVOICES -> warehouse: metadata first, then chunks ---
    edges.push({
        id: `get-meta-edge-${stage}`,
        source: "invoices",
        target: "warehouse",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "get-meta" ? 1 : 0.18 },
        data: {
            color: stage === "get-meta" ? NAVY : IDLE_COLOR,
            label: stage === "get-meta" ? "read metadata" : "",
            labelColor: stage === "get-meta" ? NAVY : "#94a3b8",
            animated: stage === "get-meta",
            interval: 1500,
        },
    });

    edges.push({
        id: `get-chunks-edge-${stage}`,
        source: "invoices",
        target: "warehouse",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "get-chunks" ? 1 : 0.25 },
        data: {
            bow: 55,
            color: verified
                ? SUCCESS_COLOR
                : stage === "get-chunks"
                ? LIME
                : IDLE_COLOR,
            label: verified
                ? "reassembled"
                : stage === "get-chunks"
                ? `${CHUNK_COUNT} chunks in order`
                : "chunk subj",
            labelColor: verified
                ? SUCCESS_COLOR
                : stage === "get-chunks"
                ? "#5a8a1f"
                : "#94a3b8",
            animated: stage === "get-chunks",
            interval: 1200,
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

    // A little chunk-slot strip under the bucket so the "split into chunks"
    // and "reassemble in order" ideas are visible, not just labelled.
    const chunkSlots = (
        <div
            style={{
                position: "absolute",
                left: "50%",
                bottom: "10px",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "4px",
                alignItems: "center",
            }}
        >
            <span
                style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    fontFamily: "monospace",
                    marginRight: "2px",
                }}
            >
                invoice.pdf
            </span>
            {Array.from({ length: CHUNK_COUNT }, (_, i) => i).map((i) => {
                const filled = true;
                const lit = chunksActive && filled;
                const ok = verified && filled;
                return (
                    <div
                        key={i}
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: 3,
                            border: `1px solid ${
                                ok ? SUCCESS_COLOR : lit ? "#5a8a1f" : "#d1d5db"
                            }`,
                            background: ok
                                ? SUCCESS_COLOR
                                : lit
                                ? LIME
                                : filled
                                ? "#eef2f6"
                                : "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 600,
                            color: ok ? "#ffffff" : "#475569",
                            fontFamily: "monospace",
                            transition: "all 0.35s ease",
                        }}
                    >
                        {i + 1}
                    </div>
                );
            })}
            {verified && (
                <span
                    style={{
                        marginLeft: 4,
                        color: SUCCESS_COLOR,
                        fontSize: 14,
                        fontWeight: 700,
                    }}
                >
                    ✓
                </span>
            )}
        </div>
    );

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
                {chunkSlots}
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

export function ObjectPutGetAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ObjectPutGetAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
