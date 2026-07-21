import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode, ServiceNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const COMMIT_COLOR = "#34A574"; // NATS green — accepted write
const FAIL_COLOR = "#ef4444"; // red — rejected on revision mismatch
const NAVY = "#375C93"; // accent navy — the concurrent writer
const LIME = "#8DC63F"; // lime accent (reserved for retry highlight)

// Optimistic-concurrency story for the KV bucket KV_INVENTORY.
type Stage = "get" | "update" | "concurrent" | "reject" | "retry";

const STAGE_ORDER: Stage[] = [
    "get",
    "update",
    "concurrent",
    "reject",
    "retry",
];

// How long each stage holds before advancing; the cycle loops.
const STAGE_DURATION_MS: Record<Stage, number> = {
    get: 3000,
    update: 3000,
    concurrent: 3000,
    reject: 3500,
    retry: 4500,
};

const CAPTION: Record<Stage, string> = {
    get:
        "inventory reads widget-blue from KV_INVENTORY and gets back revision 7. It remembers that revision.",
    update:
        "inventory sends an update for widget-blue with expected_revision=7 — a compare-and-set: only apply if the key is still at 7.",
    concurrent:
        "Meanwhile another writer commits to widget-blue first, bumping the key to revision 8. inventory does not know yet.",
    reject:
        "The compare-and-set fails: KV_INVENTORY sees revision 8, not the expected 7, and rejects the write with a revision-mismatch error.",
    retry:
        "inventory re-gets widget-blue (now revision 8), reapplies its change with expected_revision=8, and the compare-and-set is accepted.",
};

function KvCasRetryAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("get");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // The key's current revision, as seen on the server.
    const revision = stage === "get" || stage === "update" ? 7 : 8;

    // The concurrent writer is only relevant once it appears.
    const writerActive = stage === "concurrent";
    const writerVisible = stage === "concurrent" || stage === "reject" ||
        stage === "retry";

    const nodes: any[] = [
        // --- The service performing optimistic-concurrency updates ---
        {
            id: "inventory",
            type: "service",
            position: { x: 40, y: 150 },
            data: { label: "inventory" },
        },
        // --- The KV bucket, backed by a stream on the server ---
        {
            id: "kv",
            type: "box",
            position: { x: 360, y: 150 },
            data: {
                label: "KV_INVENTORY",
                // Was `subline`, which no node type has ever rendered.
                subtitle: `widget-blue · rev ${revision}`,
            },
        },
        // --- The concurrent writer that races the service ---
        {
            id: "writer",
            type: "service",
            position: { x: 360, y: -20 },
            data: { label: "other writer" },
            style: {
                opacity: writerVisible ? 1 : 0.25,
                filter: writerVisible ? "none" : "grayscale(1)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- inventory -> KV: the get / update / retry request line ---
    // One edge that changes color & label as the story moves through stages.
    let invColor = IDLE_COLOR;
    let invLabel: string | undefined;
    let invLabelColor = "#64748b";
    let invAnimated = false;

    if (stage === "get") {
        invColor = MSG_COLOR;
        invLabel = "get widget-blue";
        invLabelColor = MSG_COLOR;
        invAnimated = true;
    } else if (stage === "update") {
        invColor = MSG_COLOR;
        invLabel = "update (expect rev 7)";
        invLabelColor = MSG_COLOR;
        invAnimated = true;
    } else if (stage === "reject") {
        invColor = FAIL_COLOR;
        invLabel = "rejected: rev mismatch";
        invLabelColor = FAIL_COLOR;
        invAnimated = true;
    } else if (stage === "retry") {
        invColor = COMMIT_COLOR;
        invLabel = "re-get + update (expect rev 8) ✓";
        invLabelColor = COMMIT_COLOR;
        invAnimated = true;
    }

    edges.push({
        id: `inv-kv-${stage}`,
        source: "inventory",
        target: "kv",
        sourceHandle: "out-right",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: invColor,
            label: invLabel,
            labelColor: invLabelColor,
            animated: invAnimated,
            interval: 1500,
        },
    });

    // --- other writer -> KV: the concurrent commit that bumps to rev 8 ---
    edges.push({
        id: `writer-kv-${stage}`,
        source: "writer",
        target: "kv",
        sourceHandle: "out-bottom",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: writerVisible ? 1 : 0.2 },
        data: {
            color: writerActive ? NAVY : IDLE_COLOR,
            label: writerActive ? "commit → rev 8" : undefined,
            labelColor: NAVY,
            animated: writerActive,
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

export function KvCasRetryAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <KvCasRetryAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
