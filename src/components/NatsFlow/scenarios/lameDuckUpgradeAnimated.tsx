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
const IDLE_COLOR = "#94a3b8"; // gray — quiet route / link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — the active signal
const SUCCESS_COLOR = "#34A574"; // NATS green — leadership / reconnect landed
const NAVY = "#375C93"; // accent navy — Raft leadership transfer
const LIME = "#8DC63F"; // lime — JetStream rebalance

// One mechanism per stage, in the order a graceful rolling upgrade happens.
type Stage =
    | "signal"
    | "ldm"
    | "raft"
    | "rebalance"
    | "reconnect"
    | "rejoin";

const STAGE_ORDER: Stage[] = [
    "signal",
    "ldm",
    "raft",
    "rebalance",
    "reconnect",
    "rejoin",
];

const STAGE_DURATION_MS: Record<Stage, number> = {
    signal: 3000,
    ldm: 3500,
    raft: 4000,
    rebalance: 4000,
    reconnect: 4000,
    rejoin: 5000,
};

const CAPTION: Record<Stage, string> = {
    signal:
        "The operator sends SIGUSR2 to nats-0, telling it to enter lame-duck mode — start draining, but don't drop anyone yet.",
    ldm:
        "nats-0 broadcasts an updated INFO with ldm:true. Connected clients learn this server is leaving and prepare to move.",
    raft:
        "nats-0 hands its Raft leadership to nats-1 first, so no metadata or stream group is led by a server about to restart.",
    rebalance:
        "JetStream rebalances the ORDERS stream replicas off nats-0 onto nats-1 and nats-2, keeping all groups at full replication.",
    reconnect:
        "Now drained, nats-0 closes connections gracefully. The warehouse client reconnects to nats-1 without losing a message.",
    rejoin:
        "nats-0 restarts on the new version and rejoins the cluster as a non-leader. Upgrade the followers first, the meta-leader last.",
};

function LameDuckUpgradeAnimatedInner({
    width = 640,
    height = 420,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("signal");

    // Advance through the stages on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const idx = STAGE_ORDER.indexOf(stage);

    // nats-0 is the node being upgraded. It dims while draining, and is fully
    // "restarting" during rejoin before snapping back as a healthy follower.
    const nats0Draining = idx >= STAGE_ORDER.indexOf("ldm") &&
        stage !== "rejoin";
    const nats0Restarting = stage === "rejoin";

    // The warehouse client is attached to nats-0 until it reconnects to nats-1.
    const reconnected = stage === "reconnect" || stage === "rejoin";

    // nats-1 becomes the new Raft leader from the raft stage onward.
    const nats1IsLeader = idx >= STAGE_ORDER.indexOf("raft");

    const nodes: any[] = [
        // --- Kubernetes / operator drives the upgrade ---
        {
            id: "operator",
            type: "publisher",
            position: { x: -40, y: 40 },
            data: { label: "operator" },
        },
        // --- The three servers (nats-0 is being upgraded) ---
        {
            id: "nats0",
            type: "server",
            position: { x: 200, y: 30 },
            data: {
                label: nats0Restarting ? "nats-0 (v2)" : "nats-0",
            },
            style: {
                opacity: nats0Restarting ? 0.4 : nats0Draining ? 0.55 : 1,
                filter: nats0Draining || nats0Restarting
                    ? "grayscale(0.7)"
                    : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "nats1",
            type: "server",
            position: { x: 200, y: 220 },
            data: {
                label: nats1IsLeader ? "nats-1 (leader)" : "nats-1",
            },
        },
        {
            id: "nats2",
            type: "server",
            position: { x: 440, y: 220 },
            data: { label: "nats-2" },
        },
        // --- Application client ---
        {
            id: "warehouse",
            type: "subscriber",
            position: { x: 560, y: 30 },
            data: { label: "warehouse" },
        },
    ];

    const edges: any[] = [];

    // --- Operator -> nats-0: SIGUSR2 signal (signal stage) ---
    edges.push({
        id: `op-nats0-${stage}`,
        source: "operator",
        target: "nats0",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "signal" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "signal" ? "SIGUSR2" : undefined,
            labelColor: MSG_COLOR,
            animated: stage === "signal",
            interval: 1500,
        },
    });

    // --- nats-0 -> warehouse: INFO ldm:true broadcast (ldm stage) ---
    // This link also represents the warehouse's current connection to nats-0.
    if (!reconnected) {
        edges.push({
            id: `nats0-wh-${stage}`,
            source: "nats0",
            target: "warehouse",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: nats0Draining ? 0.6 : 1 },
            data: {
                color: stage === "ldm" ? MSG_COLOR : IDLE_COLOR,
                label: stage === "ldm" ? "INFO ldm:true" : undefined,
                labelColor: MSG_COLOR,
                animated: stage === "ldm",
                interval: 1500,
            },
        });
    }

    // --- nats-0 -> nats-1: Raft leadership transfer (raft stage) ---
    edges.push({
        id: `nats0-nats1-${stage}`,
        source: "nats0",
        target: "nats1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: nats0Restarting ? 0.3 : 1 },
        data: {
            color: stage === "raft" ? NAVY : IDLE_COLOR,
            label: stage === "raft" ? "step down → leader" : undefined,
            labelColor: NAVY,
            animated: stage === "raft",
            interval: 1500,
        },
    });

    // --- nats-0 -> nats-2: JetStream replica rebalance (rebalance stage) ---
    edges.push({
        id: `nats0-nats2-${stage}`,
        source: "nats0",
        target: "nats2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: nats0Restarting ? 0.3 : 1 },
        data: {
            color: stage === "rebalance" ? LIME : IDLE_COLOR,
            label: stage === "rebalance" ? "ORDERS replica" : undefined,
            labelColor: "#5a8a1f",
            animated: stage === "rebalance",
            interval: 1500,
        },
    });

    // --- nats-0 -> nats-1: ORDERS replica also moves to the new leader ---
    if (stage === "rebalance") {
        edges.push({
            id: "nats0-nats1-rebalance-handoff",
            source: "nats0",
            target: "nats1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: LIME,
                label: "ORDERS replica",
                labelColor: "#5a8a1f",
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- nats-1 <-> nats-2: healthy intra-cluster route (always present) ---
    edges.push({
        id: `nats1-nats2-${stage}`,
        source: "nats1",
        target: "nats2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: IDLE_COLOR,
            animated: false,
            interval: 1500,
        },
    });

    // --- warehouse reconnects to nats-1 (reconnect + rejoin stages) ---
    if (reconnected) {
        edges.push({
            id: `wh-nats1-${stage}`,
            source: "warehouse",
            target: "nats1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                label: stage === "reconnect" ? "reconnect" : undefined,
                labelColor: SUCCESS_COLOR,
                animated: stage === "reconnect",
                interval: 1500,
            },
        });
    }

    // --- nats-0 rejoins as a follower of nats-1 (rejoin stage) ---
    if (stage === "rejoin") {
        edges.push({
            id: "nats0-rejoin",
            source: "nats1",
            target: "nats0",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                label: "rejoin (follower)",
                labelColor: SUCCESS_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    const stageNum = idx + 1;

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

export function LameDuckUpgradeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <LameDuckUpgradeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
