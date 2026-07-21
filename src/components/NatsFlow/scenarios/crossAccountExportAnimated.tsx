import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Canonical scenario description. scripts/rehype-nats-flow.mjs extracts the
// FIRST description key it finds in this file for the markdown fallback text,
// so the key below must stay the only one of its kind in the source.
export const crossAccountExportMeta = {
    description:
        "The two accounts from the previous page, now with one deliberate opening: ORDERS exports orders.shipped and ANALYTICS imports it. A publish on orders.shipped is delivered twice — to the subscriber inside ORDERS and, across the account boundary, to analytics-reader. A second publish on orders.created, a subject that was never exported, is delivered inside ORDERS only. One named subject crosses; everything else stays isolated.",
};

// Colors keyed to the roles in the story.
const MSG_COLOR = "#27AAE1"; // primary blue — message in flight
const DELIVER_COLOR = "#10b981"; // green — delivery, local and imported
const BLOCK_COLOR = "#ef4444"; // red — blocked / not exported
const WIRE_COLOR = "#375C93"; // navy — export/import declarations
const IDLE_COLOR = "#94a3b8"; // idle links

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "wire" | "publish" | "fanout" | "created" | "walled";

const STAGE_ORDER: Stage[] = [
    "wire",
    "publish",
    "fanout",
    "created",
    "walled",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    wire: 3500,
    publish: 2600,
    fanout: 4000,
    created: 2600,
    walled: 4000,
};

const CAPTION: Record<Stage, string> = {
    wire:
        "ORDERS exports orders.shipped and ANALYTICS imports it from ORDERS. Both halves must agree — an export nobody imports shares nothing.",
    publish:
        "order-svc publishes orders.shipped, exactly as it always has. The publisher doesn't know an importer exists.",
    fanout:
        "One publish, two deliveries: the subscriber inside ORDERS, and — through the export/import pair — analytics-reader across the account boundary.",
    created:
        "A second publish, on orders.created. That subject was never exported.",
    walled:
        "orders.created stays inside ORDERS. The boundary opens one named subject at a time — read the exports array and you know the complete list of what leaves the account.",
};

const STEP_LABELS: Record<Stage, string> = {
    wire: "1. Export/import",
    publish: "2. Publish",
    fanout: "3. Cross",
    created: "4. Publish",
    walled: "5. Walled",
};

function CrossAccountExportAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("wire");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const isWire = stage === "wire";
    const isPublish = stage === "publish";
    const isFanout = stage === "fanout";
    const isCreated = stage === "created";
    const isWalled = stage === "walled";

    // Same layout as accountIsolationAnimated — the same wall, now with one
    // gate. ORDERS occupies the top band, ANALYTICS the bottom-right corner,
    // and the NATS server sits between the two account boxes.
    const nodes: any[] = [
        {
            id: "order-svc",
            type: "publisher",
            position: { x: 20, y: 60 },
            data: { label: "order-svc" },
        },
        {
            id: "orders-sub",
            type: "subscriber",
            position: { x: 460, y: 60 },
            data: { label: "orders-sub" },
        },
        {
            id: "nats",
            type: "server",
            position: { x: 240, y: 150 },
            data: { label: "NATS" },
        },
        {
            id: "analytics-reader",
            type: "subscriber",
            position: { x: 460, y: 270 },
            data: { label: "analytics-reader" },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> NATS: carries each publish. ---
    edges.push({
        id: `e-pub-nats-${stage}`,
        source: "order-svc",
        target: "nats",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isPublish || isCreated ? MSG_COLOR : IDLE_COLOR,
            label: isPublish
                ? "PUB orders.shipped"
                : isCreated
                ? "PUB orders.created"
                : undefined,
            labelColor: MSG_COLOR,
            animated: isPublish || isCreated,
            interval: 1500,
        },
    });

    // --- NATS -> orders-sub: the same-account delivery. ---
    edges.push({
        id: `e-nats-sub-${stage}`,
        source: "nats",
        target: "orders-sub",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isFanout || isWalled ? DELIVER_COLOR : IDLE_COLOR,
            label: isFanout
                ? "orders.shipped"
                : isWalled
                ? "orders.created"
                : undefined,
            labelColor: DELIVER_COLOR,
            animated: isFanout || isWalled,
            delay: 0,
            interval: 1500,
        },
    });

    // --- NATS -> analytics-reader: the imported delivery — or the wall. ---
    // During "fanout" it lights up green with a 600ms delay so the boundary
    // crossing reads as the second beat; during "walled" it freezes red.
    edges.push({
        id: `e-nats-reader-${stage}`,
        source: "nats",
        target: "analytics-reader",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isFanout
                ? DELIVER_COLOR
                : isWalled
                ? BLOCK_COLOR
                : IDLE_COLOR,
            label: isFanout
                ? "orders.shipped (imported)"
                : isWalled
                ? "✕ not exported"
                : undefined,
            labelColor: isWalled ? BLOCK_COLOR : DELIVER_COLOR,
            animated: isFanout,
            delay: 600,
            interval: 1500,
        },
    });

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

    // The export/import badges pulse navy while the declarations are the
    // story ("wire") and highlight green while the share carries traffic
    // ("fanout"). During "walled" they stay neutral — the gate exists but
    // orders.created doesn't match it.
    const badgeStyle = (): React.CSSProperties => {
        const accent = isWire ? WIRE_COLOR : isFanout ? DELIVER_COLOR : null;
        return {
            padding: "3px 8px",
            background: "#f9fafb",
            border: `1px solid ${accent ?? "#d1d5db"}`,
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: accent ?? "#374151",
            fontWeight: accent ? 600 : 400,
            whiteSpace: "nowrap",
            boxShadow: accent ? `0 0 0 3px ${accent}33` : "none",
            transition:
                "color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
        };
    };

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
                {STAGE_ORDER.map((s) => (
                    <button
                        key={s}
                        onClick={() => setStage(s)}
                        style={buttonStyle(stage === s)}
                    >
                        {STEP_LABELS[s]}
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

                {/* account ORDERS box — top band enclosing order-svc + orders-sub */}
                <div
                    style={{
                        position: "absolute",
                        top: "4%",
                        left: "2%",
                        right: "2%",
                        height: "36%",
                        border: `1px dashed ${WIRE_COLOR}`,
                        borderRadius: "8px",
                        pointerEvents: "none",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "4px",
                            left: "8px",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: WIRE_COLOR,
                            fontWeight: 600,
                        }}
                    >
                        account ORDERS
                    </div>
                    {/* exports badge, pinned to the box's bottom edge */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "10px",
                            left: "10px",
                            ...badgeStyle(),
                        }}
                    >
                        exports: [ orders.shipped ]
                    </div>
                </div>

                {/* account ANALYTICS box — bottom-right, enclosing analytics-reader */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "4%",
                        right: "2%",
                        width: "38%",
                        height: "32%",
                        border: isWalled
                            ? `1px solid ${BLOCK_COLOR}`
                            : "1px dashed #6b7280",
                        borderRadius: "8px",
                        pointerEvents: "none",
                        transition: "border-color 0.4s ease",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "4px",
                            left: "8px",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: isWalled ? BLOCK_COLOR : "#6b7280",
                            fontWeight: 600,
                            transition: "color 0.4s ease",
                        }}
                    >
                        account ANALYTICS
                    </div>
                    {/* imports badge, pinned to the box's top edge */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "10px",
                            right: "10px",
                            ...badgeStyle(),
                        }}
                    >
                        imports: [ orders.shipped ← ORDERS ]
                    </div>
                </div>
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

export function CrossAccountExportAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <CrossAccountExportAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
