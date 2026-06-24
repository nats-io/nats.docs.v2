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
const ACK_COLOR = "#34A574"; // NATS green — the PubAck coming back, and the store
const NAVY = "#375C93";

// A small database-cylinder glyph for the stream's store.
function DbCylinder({ color }: { color: string }) {
    return (
        <svg
            width="22"
            height="26"
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

// The server boundary. Just a labelled box; the listener and store nodes sit
// inside it as children, so the message dot can flow between them.
function ServerBoxNode() {
    return (
        <div
            style={{
                width: 206,
                height: 200,
                border: `2px solid ${NAVY}`,
                borderRadius: 10,
                background: "#ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingTop: 8,
                }}
            >
                <NatsIcon width={16} height={16} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                    nats-server
                </span>
            </div>
        </div>
    );
}

// The subject listener that matches the published subject.
function ListenerNode({ data }: NodeProps) {
    const matching = !!(data as { matching?: boolean }).matching;
    return (
        <div
            style={{
                width: 168,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                border: `1px solid ${matching ? PUBLISH_COLOR : "#e5e7eb"}`,
                background: matching ? "#eff8fd" : "#f9fafb",
                borderRadius: 6,
                padding: "6px 8px",
                transition: "background 0.3s ease, border-color 0.3s ease",
            }}
        >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Stream listener
            </span>
            <code style={{ fontSize: 12, color: NAVY }}>orders.&gt;</code>
            <Handle type="target" id="in" position={Position.Left} style={{ opacity: 0 }} />
            <Handle type="source" id="down" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
    );
}

// The stream's store. Turns green as it keeps the message.
function StoreNode({ data }: NodeProps) {
    const d = data as { storing?: boolean; seq?: number };
    const storing = !!d.storing;
    return (
        <div
            style={{
                width: 168,
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${storing ? ACK_COLOR : "#e5e7eb"}`,
                background: storing ? "#ecfdf5" : "#f9fafb",
                borderRadius: 6,
                padding: "6px 8px",
                transition: "background 0.3s ease, border-color 0.3s ease",
            }}
        >
            <DbCylinder color={storing ? ACK_COLOR : NAVY} />
            <div style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                    Stream storage
                </div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                    ORDERS · seq: {d.seq ?? 0}
                </div>
            </div>
            <Handle type="target" id="up" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" id="out" position={Position.Left} style={{ opacity: 0 }} />
        </div>
    );
}

const nodeTypes = {
    publisher: PublisherNode,
    serverBox: ServerBoxNode,
    listener: ListenerNode,
    store: StoreNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

type Stage = "publish" | "store" | "ack";

const STAGE_ORDER: Stage[] = ["publish", "store", "ack"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 3000,
    store: 2600,
    ack: 3400,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "The publisher sends a message to a subject — orders.created. The server's listener for orders.> matches it.",
    store:
        "The listener hands the message to the matching stream, which stores it on disk and assigns the next sequence number.",
    ack:
        "The server replies with a PubAck — the stream name and the sequence it gave the message — so the publisher knows the write landed.",
};

function PublishAckAnimatedInner({
    width = 640,
    height = 360,
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

    // The store assigns the next sequence number as the message lands.
    useEffect(() => {
        if (stage === "store") setSeq((s) => s + 1);
    }, [stage]);

    const matching = stage === "publish" || stage === "store";
    const storing = stage === "store" || stage === "ack";

    const nodes: any[] = [
        {
            id: "client",
            type: "publisher",
            position: { x: 30, y: 130 },
            data: { label: "Publisher" },
        },
        {
            id: "server",
            type: "serverBox",
            position: { x: 300, y: 80 },
            data: {},
            draggable: false,
            selectable: false,
            style: { width: 206, height: 200 },
        },
        {
            id: "listener",
            type: "listener",
            parentId: "server",
            extent: "parent",
            position: { x: 19, y: 44 },
            data: { matching },
            draggable: false,
            selectable: false,
        },
        {
            id: "store",
            type: "store",
            parentId: "server",
            extent: "parent",
            position: { x: 19, y: 128 },
            data: { storing, seq },
            draggable: false,
            selectable: false,
        },
    ];

    const edges: any[] = [];

    // Hop 1: publisher -> listener (the message arriving and matching).
    if (stage === "publish") {
        edges.push({
            id: "pub-listener",
            source: "client",
            target: "listener",
            targetHandle: "in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PUBLISH_COLOR,
                label: "orders.created",
                labelColor: PUBLISH_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // Hop 2: listener -> store (the matched message handed to the stream).
    if (stage === "store") {
        edges.push({
            id: "listener-store",
            source: "listener",
            sourceHandle: "down",
            target: "store",
            targetHandle: "up",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PUBLISH_COLOR,
                animated: true,
                interval: 1100,
            },
        });
    }

    // Hop 3: store -> publisher (the PubAck returning).
    if (stage === "ack") {
        edges.push({
            id: "store-ack",
            source: "store",
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
                interval: 1500,
            },
        });
    }

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "5px 12px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? PUBLISH_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
        textTransform: "capitalize",
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
                }}
            >
                <span
                    style={{ fontSize: "13px", color: "#6b7280", marginRight: "4px" }}
                >
                    Step:
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

export function PublishAckAnimated(props: { width?: number; height?: number }) {
    return (
        <ReactFlowProvider>
            <PublishAckAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
