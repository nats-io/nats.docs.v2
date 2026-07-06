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

// Canonical description for the rehype plugin (scripts/rehype-nats-flow.mjs
// picks up the FIRST description-keyed string literal in this source and uses
// it as the markdown fallback text for the embed — keep this the first one).
export const accountIsolationAnimatedMeta = {
    description:
        "Two accounts on one server, ORDERS and ANALYTICS. order-svc publishes orders.shipped inside ORDERS: the subscriber in the same account receives it, while analytics-reader — subscribed to the identical subject string inside ANALYTICS — receives nothing. An account is an isolated subject space; the same subject name in two accounts is two different subjects.",
};

// Colors keyed to the story beats.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const DELIVER_COLOR = "#10b981"; // green — same-account delivery (matches ACCEPT)
const BLOCK_COLOR = "#ef4444"; // red — the account wall
const IDLE_COLOR = "#94a3b8"; // idle links
const IDLE_LABEL_COLOR = "#64748b"; // idle edge labels
const ORDERS_BOX_COLOR = "#375C93"; // navy — ORDERS account band
const ANALYTICS_BOX_COLOR = "#6b7280"; // gray — ANALYTICS account band at rest

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "subscribe" | "publish" | "deliver" | "wall";

const STAGE_ORDER: Stage[] = ["subscribe", "publish", "deliver", "wall"];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    subscribe: 3000,
    publish: 3000,
    deliver: 3000,
    wall: 4000,
};

const STAGE_BUTTON: Record<Stage, string> = {
    subscribe: "1. Subscribe",
    publish: "2. Publish",
    deliver: "3. Deliver",
    wall: "4. Wall",
};

const CAPTION: Record<Stage, string> = {
    subscribe:
        "Two subscriptions on the identical subject string, orders.shipped — one inside ORDERS, one inside ANALYTICS.",
    publish:
        "order-svc publishes orders.shipped. The publish happens inside the ORDERS account.",
    deliver: "The subscriber in the same account receives it.",
    wall:
        "analytics-reader receives nothing. The account boundary is absolute: orders.shipped in ORDERS and orders.shipped in ANALYTICS are two different subjects that share a name.",
};

function AccountIsolationAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("subscribe");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const walled = stage === "wall";

    // One server, two clients up top (account ORDERS), one client below
    // (account ANALYTICS). The dashed account bands are drawn as overlays.
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
            position: { x: 460, y: 330 },
            data: { label: "analytics-reader" },
            style: {
                opacity: walled ? 0.5 : 1,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    // Re-key every edge per stage so the AnimatedEdge remounts and its bubble
    // stream restarts cleanly on each stage change.
    const edges: any[] = [
        // --- order-svc -> NATS (publishes during "publish") ---
        {
            id: `e-pub-${stage}`,
            source: "order-svc",
            target: "nats",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: stage === "publish" ? MSG_COLOR : IDLE_COLOR,
                animated: stage === "publish",
                label: stage === "publish" ? "PUB orders.shipped" : undefined,
                labelColor: MSG_COLOR,
                interval: 1500,
            },
        },
        // --- NATS -> orders-sub (same-account delivery during "deliver") ---
        {
            id: `e-orders-${stage}`,
            source: "nats",
            target: "orders-sub",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: stage === "deliver" ? DELIVER_COLOR : IDLE_COLOR,
                animated: stage === "deliver",
                label: stage === "deliver"
                    ? "orders.shipped"
                    : stage === "subscribe"
                    ? "SUB orders.shipped"
                    : undefined,
                labelColor: stage === "deliver"
                    ? DELIVER_COLOR
                    : IDLE_LABEL_COLOR,
                interval: 1500,
            },
        },
        // --- NATS -> analytics-reader (never delivers; goes red at the wall) ---
        {
            id: `e-analytics-${stage}`,
            source: "nats",
            target: "analytics-reader",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: walled ? BLOCK_COLOR : IDLE_COLOR,
                animated: false,
                label: walled
                    ? "✕ no delivery"
                    : stage === "subscribe"
                    ? "SUB orders.shipped"
                    : undefined,
                labelColor: walled ? BLOCK_COLOR : IDLE_LABEL_COLOR,
                interval: 1500,
            },
        },
    ];

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

    const accountBoxBase: React.CSSProperties = {
        position: "absolute",
        borderRadius: "8px",
        pointerEvents: "none",
    };

    const accountTagBase: React.CSSProperties = {
        position: "absolute",
        top: "-9px",
        left: "10px",
        padding: "0 6px",
        fontSize: "10px",
        fontWeight: 600,
        fontFamily: "monospace",
        background: "#ffffff",
        transition: "color 0.4s ease",
    };

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
                        {STAGE_BUTTON[s]}
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

                {/* Account ORDERS band: encloses order-svc + orders-sub. The
                    NATS server node deliberately sits between the two bands —
                    accounts live inside one server. */}
                <div
                    style={{
                        ...accountBoxBase,
                        left: "4%",
                        top: "6%",
                        width: "88%",
                        height: "24%",
                        border: `1px dashed ${ORDERS_BOX_COLOR}`,
                    }}
                >
                    <span
                        style={{
                            ...accountTagBase,
                            color: ORDERS_BOX_COLOR,
                        }}
                    >
                        account ORDERS
                    </span>
                </div>

                {/* Account ANALYTICS band: encloses analytics-reader. Its
                    border hardens to solid red while the wall stage plays. */}
                <div
                    style={{
                        ...accountBoxBase,
                        left: "60%",
                        top: "70%",
                        width: "36%",
                        height: "24%",
                        borderWidth: "1px",
                        borderStyle: walled ? "solid" : "dashed",
                        borderColor: walled ? BLOCK_COLOR : ANALYTICS_BOX_COLOR,
                        transition: "border-color 0.4s ease",
                    }}
                >
                    <span
                        style={{
                            ...accountTagBase,
                            color: walled ? BLOCK_COLOR : ANALYTICS_BOX_COLOR,
                        }}
                    >
                        account ANALYTICS
                    </span>
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

export function AccountIsolationAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <AccountIsolationAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
