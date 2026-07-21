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

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — idle link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active flow
const DOWN_COLOR = "#ef4444"; // red — failed site
const PROMOTE_COLOR = "#34A574"; // NATS green — promoted / writable
const ACCENT_NAVY = "#375C93"; // navy accent — replication catch-up

// Disaster-recovery failover, one mechanism per stage, looping.
type Stage = "healthy" | "outage" | "lagcheck" | "promote" | "redirect";

const STAGE_ORDER: Stage[] = [
    "healthy",
    "outage",
    "lagcheck",
    "promote",
    "redirect",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    healthy: 3500,
    outage: 3000,
    lagcheck: 4000,
    promote: 4000,
    redirect: 5000,
};

const CAPTION: Record<Stage, string> = {
    healthy:
        "site1 owns the writable ORDERS stream. order-svc publishes there, and ORDERS_DR on site2 mirrors every message across the WAN.",
    outage:
        "site1 goes dark. The primary ORDERS stream — and everyone connected to it — is gone. Only the ORDERS_DR mirror on site2 survives.",
    lagcheck:
        "Before failing over, check the mirror's lag. Wait until ORDERS_DR has drained its backlog and reports 0 messages behind — only then is it safe to promote.",
    promote:
        "The mirror is promoted: ORDERS_DR is reconfigured into a standalone, writable ORDERS stream on site2. It can now accept new publishes.",
    redirect:
        "order-svc and the consumers reconnect to site2 and resume against the promoted ORDERS. Operations continue from where the mirror left off.",
};

function MirrorFailoverAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("healthy");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const site1Down = stage !== "healthy";
    const promoted = stage === "promote" || stage === "redirect";
    const redirected = stage === "redirect";

    // Lag readout on site2's mirror: counts down to 0 during the lag check.
    const lagLabel = stage === "healthy"
        ? "ORDERS_DR (lag 0)"
        : stage === "outage"
        ? "ORDERS_DR (lag ?)"
        : stage === "lagcheck"
        ? "ORDERS_DR (lag 0)"
        : "ORDERS (writable)";

    const nodes: any[] = [
        // --- site1: primary, fails after the first stage ---
        {
            id: "site1",
            type: "server",
            position: { x: 120, y: 60 },
            data: { label: site1Down ? "site1 (down)" : "site1 ORDERS" },
            style: {
                opacity: site1Down ? 0.25 : 1,
                filter: site1Down ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        // --- site2: DR mirror, becomes the new writable primary ---
        {
            id: "site2",
            type: "server",
            position: { x: 120, y: 300 },
            data: { label: lagLabel },
            style: {
                opacity: 1,
                filter: promoted ? "drop-shadow(0 0 6px #34A574)" : "none",
                transition: "filter 0.4s ease",
            },
        },
        // --- order-svc: the publisher ---
        {
            id: "orderSvc",
            type: "publisher",
            position: { x: -110, y: redirected ? 300 : 60 },
            data: { label: "order-svc" },
            style: {
                transition: "all 0.5s ease",
            },
        },
        // --- consumers: the readers ---
        {
            id: "consumers",
            type: "subscriber",
            position: { x: 360, y: redirected ? 300 : 60 },
            data: { label: "consumers" },
            style: {
                transition: "all 0.5s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> site1 (publishing while healthy) ---
    if (!redirected) {
        edges.push({
            id: `svc-site1-${stage}`,
            source: "orderSvc",
            target: "site1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: site1Down ? 0.2 : 1 },
            data: {
                color: site1Down
                    ? DOWN_COLOR
                    : stage === "healthy"
                    ? MSG_COLOR
                    : IDLE_COLOR,
                label: "publish",
                labelColor: site1Down ? DOWN_COLOR : "#64748b",
                animated: stage === "healthy",
                interval: 1500,
            },
        });
    }

    // --- site1 -> consumers (delivery while healthy) ---
    if (!redirected) {
        edges.push({
            id: `site1-cons-${stage}`,
            source: "site1",
            target: "consumers",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: site1Down ? 0.2 : 1 },
            data: {
                color: site1Down
                    ? DOWN_COLOR
                    : stage === "healthy"
                    ? MSG_COLOR
                    : IDLE_COLOR,
                label: "deliver",
                labelColor: site1Down ? DOWN_COLOR : "#64748b",
                animated: stage === "healthy",
                interval: 1500,
            },
        });
    }

    // --- site1 -> site2 mirror replication (WAN) ---
    edges.push({
        id: `mirror-${stage}`,
        source: "site1",
        target: "site2",
        sourceHandle: "bottom-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: site1Down ? 0.2 : 1 },
        data: {
            color: site1Down
                ? DOWN_COLOR
                : stage === "healthy"
                ? ACCENT_NAVY
                : IDLE_COLOR,
            label: "mirror",
            labelColor: site1Down ? DOWN_COLOR : "#64748b",
            // Replication catch-up visibly streams during the lag check.
            animated: stage === "healthy" || stage === "lagcheck",
            interval: 1500,
        },
    });

    // --- order-svc -> site2 (redirected publishing after promotion) ---
    if (redirected) {
        edges.push({
            id: "svc-site2-redirect",
            source: "orderSvc",
            target: "site2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PROMOTE_COLOR,
                label: "publish",
                labelColor: PROMOTE_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- site2 -> consumers (redirected delivery after promotion) ---
    if (redirected) {
        edges.push({
            id: "site2-cons-redirect",
            source: "site2",
            target: "consumers",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PROMOTE_COLOR,
                label: "deliver",
                labelColor: PROMOTE_COLOR,
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

export function MirrorFailoverAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MirrorFailoverAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
