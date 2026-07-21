import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — metadata publish in flight
const IDLE_COLOR = "#94a3b8"; // idle gray
const COMMIT_COLOR = "#34A574"; // NATS green — the surviving current ObjectInfo
const PURGE_COLOR = "#ef4444"; // red — the prior metadata being purged
const NAVY = "#375C93";

// The story: a client PUTs the same object name twice into an Object Store
// backed by the OBJ_INVOICES stream. Each metadata publish carries a
// Nats-Rollup header, so the stream keeps only the latest ObjectInfo and
// purges the prior one. A re-put leaves ONE current record, not a history.
type Stage =
    | "put-first"
    | "store-first"
    | "put-second"
    | "rollup"
    | "current";

const STAGE_ORDER: Stage[] = [
    "put-first",
    "store-first",
    "put-second",
    "rollup",
    "current",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    "put-first": 3000,
    "store-first": 3000,
    "put-second": 3500,
    "rollup": 4000,
    "current": 4500,
};

const CAPTION: Record<Stage, string> = {
    "put-first":
        "The client puts invoice.pdf. The chunks plus a metadata message (carrying the Nats-Rollup header) are published to OBJ_INVOICES.",
    "store-first":
        "OBJ_INVOICES now holds one ObjectInfo for invoice.pdf at seq #1 — the current metadata for that object name.",
    "put-second":
        "The client puts invoice.pdf again with new content. A fresh metadata message — also carrying Nats-Rollup — lands at seq #2.",
    "rollup":
        "The stream applies the rollup: the prior metadata (seq #1) is purged, leaving only the latest message for that subject.",
    "current":
        "Only the newest ObjectInfo (seq #2) survives. A re-put overwrites in place — the Object Store keeps one current record per name, not a version history.",
};

function ObjectRollupAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("put-first");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // First metadata exists once it has been stored, and is purged at rollup.
    const firstStored = stage === "store-first" || stage === "put-second" ||
        stage === "rollup";
    const firstPurged = stage === "rollup"; // visibly fading out
    const firstGone = stage === "current"; // already removed

    // Second metadata exists from the moment it is published.
    const secondPublished = stage === "put-second" || stage === "rollup" ||
        stage === "current";
    const secondCurrent = stage === "current";

    // The client is actively putting during the two put stages.
    const puttingFirst = stage === "put-first";
    const puttingSecond = stage === "put-second";

    const nodes: any[] = [
        // The client doing the puts.
        {
            id: "client",
            type: "publisher",
            position: { x: -40, y: 130 },
            data: { label: "client" },
        },
        // The server backing the object store.
        {
            id: "server",
            type: "box",
            position: { x: 230, y: 130 },
            data: { label: "OBJ_INVOICES", subtitle: "object store" },
        },
        // First metadata message (seq #1).
        {
            id: "meta1",
            type: "box",
            position: { x: 470, y: 40 },
            data: {
                label: firstPurged
                    ? "#1 purged"
                    : firstStored
                    ? "#1 invoice.pdf"
                    : "#1 …",
                subtitle: "stream message",
            },
            style: {
                opacity: firstGone ? 0 : firstPurged ? 0.2 : firstStored ? 1 : 0.15,
                filter: firstPurged ? "grayscale(1)" : "none",
                transition: "opacity 0.6s ease, filter 0.6s ease",
            },
        },
        // Second metadata message (seq #2) — the survivor.
        {
            id: "meta2",
            type: "box",
            position: { x: 470, y: 220 },
            data: {
                label: secondCurrent ? "#2 current" : "#2 invoice.pdf",
                subtitle: "stream message",
            },
            style: {
                opacity: secondPublished ? 1 : 0.12,
                transition: "opacity 0.6s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client -> server: the PUT, carrying the Nats-Rollup header ---
    edges.push({
        id: `put-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: puttingFirst || puttingSecond ? MSG_COLOR : IDLE_COLOR,
            label: puttingFirst || puttingSecond ? "Nats-Rollup" : undefined,
            labelColor: NAVY,
            animated: puttingFirst || puttingSecond,
            interval: 1500,
        },
    });

    // --- server -> meta1: metadata appended at seq #1 ---
    edges.push({
        id: `store1-${stage}`,
        source: "server",
        target: "meta1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
            opacity: firstGone ? 0 : firstPurged ? 0.25 : 1,
            transition: "opacity 0.5s ease",
        },
        data: {
            color: stage === "store-first"
                ? MSG_COLOR
                : firstPurged
                ? PURGE_COLOR
                : IDLE_COLOR,
            label: firstPurged ? "purge" : undefined,
            labelColor: PURGE_COLOR,
            animated: stage === "store-first",
            interval: 1500,
        },
    });

    // --- server -> meta2: latest metadata appended at seq #2, becomes current ---
    edges.push({
        id: `store2-${stage}`,
        source: "server",
        target: "meta2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
            opacity: secondPublished ? 1 : 0.15,
            transition: "opacity 0.5s ease",
        },
        data: {
            color: stage === "put-second"
                ? MSG_COLOR
                : secondCurrent
                ? COMMIT_COLOR
                : IDLE_COLOR,
            label: secondCurrent ? "current" : undefined,
            labelColor: COMMIT_COLOR,
            animated: stage === "put-second",
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

export function ObjectRollupAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ObjectRollupAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
