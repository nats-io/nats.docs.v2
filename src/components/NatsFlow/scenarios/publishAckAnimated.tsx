import React, { useEffect, useState } from "react";
import {
    Background,
    Handle,
    MarkerType,
    type NodeProps,
    Position,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode } from "../nodes";
import { NatsIcon } from "../icons/NatsIcon";
import { AnimatedEdge } from "../edges";

// Brand palette.
const PUBLISH_COLOR = "#27AAE1"; // NATS primary blue — message on the way in
const ACK_COLOR = "#34A574"; // NATS green — stored, and the PubAck coming back
const NAVY = "#375C93";

// A small database-cylinder glyph for the stream's storage.
function DbCylinder({ color }: { color: string }) {
    return (
        <svg
            width="20"
            height="24"
            viewBox="0 0 24 28"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="5" rx="9" ry="3.5" />
            <path d="M3 5 v18 c0 1.9 4 3.5 9 3.5 s9 -1.6 9 -3.5 V5" />
            <path d="M3 14 c0 1.9 4 3.5 9 3.5 s9 -1.6 9 -3.5" opacity="0.55" />
        </svg>
    );
}

// One stream. It accepts messages on its subjects, stores them, and returns a
// PubAck. Not a listener plus a separate store — a single thing that does all
// three. (The internal leader/follower mechanics only appear once a stream is
// replicated; that belongs on the durability pages, not here.)
function StreamNode({ data }: NodeProps) {
    const d = data as { accepting?: boolean; storing?: boolean; seq?: number };
    const accepting = !!d.accepting;
    const storing = !!d.storing;
    const borderColor = storing
        ? ACK_COLOR
        : accepting
        ? PUBLISH_COLOR
        : "#d1d5db";
    return (
        <div
            style={{
                width: 196,
                border: `2px solid ${borderColor}`,
                borderRadius: 10,
                background: storing ? "#ecfdf5" : "#ffffff",
                padding: "10px 12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                transition: "background 0.3s ease, border-color 0.3s ease",
            }}
        >
            {/* Header: it's a stream, running on the server. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <NatsIcon width={16} height={16} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                    Stream ORDERS
                </span>
            </div>

            {/* What it accepts. */}
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 7 }}>
                accepts <code style={{ fontSize: 12, color: NAVY }}>orders.&gt;</code>
            </div>

            {/* What it holds. */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 6,
                }}
            >
                <DbCylinder color={storing ? ACK_COLOR : NAVY} />
                <span style={{ fontSize: 12, color: "#374151" }}>
                    stored · last seq{" "}
                    <strong>{d.seq ?? 0}</strong>
                </span>
            </div>

            {/* Messages arrive on the left; the PubAck leaves on the left too. */}
            <Handle
                type="target"
                id="in"
                position={Position.Left}
                style={{ top: "38%", opacity: 0 }}
            />
            <Handle
                type="source"
                id="out"
                position={Position.Left}
                style={{ top: "62%", opacity: 0 }}
            />
        </div>
    );
}

const nodeTypes = {
    publisher: PublisherNode,
    stream: StreamNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

type Stage = "publish" | "store" | "ack";

const STAGE_ORDER: Stage[] = ["publish", "store", "ack"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 3000,
    store: 2400,
    ack: 3400,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "The publisher sends a message to a subject — orders.created. The ORDERS stream accepts it, because it listens on orders.>.",
    store:
        "The stream stores the message on disk and assigns it the next sequence number.",
    ack:
        "The stream returns a PubAck — its name and the sequence it gave the message — so the publisher knows the write landed.",
};

function PublishAckAnimatedInner({
    width = 600,
    height = 320,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("publish");
    const [seq, setSeq] = useState<number>(0);

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            setStage(STAGE_ORDER[(idx + 1) % STAGE_ORDER.length]);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // The stream assigns the next sequence number as the message lands.
    useEffect(() => {
        if (stage === "store") setSeq((s) => s + 1);
    }, [stage]);

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 30, y: 120 },
            data: { label: "Publisher" },
        },
        {
            id: "stream",
            type: "stream",
            position: { x: 340, y: 110 },
            data: {
                accepting: stage === "publish",
                storing: stage === "store" || stage === "ack",
                seq,
            },
        },
    ];

    const edges: any[] = [];

    // Publisher -> stream (the message arriving on its subject).
    if (stage === "publish") {
        edges.push({
            id: "pub",
            source: "client",
            target: "stream",
            targetHandle: "in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PUBLISH_COLOR,
                label: "orders.created",
                labelColor: PUBLISH_COLOR,
                animated: true,
                interval: 4000,
            },
        });
    }

    // Stream -> publisher (the PubAck returning).
    if (stage === "ack") {
        edges.push({
            id: "ack",
            source: "stream",
            sourceHandle: "out",
            target: "client",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: ACK_COLOR,
                label: `PubAck · seq ${seq}`,
                labelColor: ACK_COLOR,
                animated: true,
                interval: 4000,
            },
        });
    }

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

    // Read-only stage indicator — the loop drives itself, clicking a stage
    // out of order would break the one-dot-one-message reading.
    const stepStyle = (active: boolean): React.CSSProperties => ({
        padding: "5px 12px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? PUBLISH_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        fontWeight: 500,
        textTransform: "capitalize",
        transition: "background-color 0.3s ease, color 0.3s ease",
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Stage indicator */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                }}
            >
                <span
                    style={{ fontSize: "13px", color: "#6b7280", marginRight: "4px" }}
                >
                    Step:
                </span>
                {STAGE_ORDER.map((s) => (
                    <span key={s} style={stepStyle(stage === s)}>
                        {s}
                    </span>
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

export function PublishAckAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <PublishAckAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
