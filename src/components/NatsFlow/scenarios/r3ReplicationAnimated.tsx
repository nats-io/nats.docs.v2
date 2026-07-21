import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message / RPC in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet replication link
const COMMIT_COLOR = "#34A574"; // NATS green — quorum reached / commit
const NAVY = "#375C93"; // accent navy — apply to store
const LIME = "#8DC63F"; // lime — the WAL write on the leader

// One mechanism per stage. An R3 stream survives a node loss because every
// write is committed only after a RAFT quorum acks it, then applied on the
// followers. The cycle loops forever.
type Stage = "publish" | "append" | "ack" | "commit" | "apply";

const STAGE_ORDER: Stage[] = ["publish", "append", "ack", "commit", "apply"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 3000,
    append: 4000,
    ack: 3500,
    commit: 3000,
    apply: 4500,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "order-svc publishes orders.created to n1-east, the stream leader.",
    append:
        "n1-east writes the message to its own RAFT WAL, then sends an AppendEntry to followers n2-east and n3-east.",
    ack:
        "n2-east acks first. With itself plus one follower, n1-east now has a quorum of 2 out of 3.",
    commit:
        "Quorum reached: n1-east advances its commit index. The write is durable — it will survive losing any single node.",
    apply:
        "The new commit index rides the next heartbeat, so n2-east and n3-east apply the entry to their own stream store.",
};

function R3ReplicationAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("publish");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // n1-east holds the committed entry once we've reached quorum.
    const leaderCommitted = stage === "commit" || stage === "apply";
    // Followers hold the entry once it's been applied from the heartbeat.
    const followersApplied = stage === "apply";

    const nodes: any[] = [
        // --- Publisher ---
        {
            id: "orderSvc",
            type: "publisher",
            position: { x: -70, y: 130 },
            data: { label: "order-svc" },
        },
        // --- RAFT group: n1-east leader + two followers ---
        {
            id: "n1",
            type: "server",
            position: { x: 180, y: 130 },
            data: { label: "n1-east (leader)" },
            style: {
                outline: leaderCommitted
                    ? `2px solid ${COMMIT_COLOR}`
                    : "none",
                borderRadius: "10px",
                transition: "outline 0.4s ease",
            },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 460, y: 30 },
            data: { label: "n2-east" },
            style: {
                outline: followersApplied ? `2px solid ${NAVY}` : "none",
                borderRadius: "10px",
                transition: "outline 0.4s ease",
            },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 460, y: 230 },
            data: { label: "n3-east" },
            style: {
                outline: followersApplied ? `2px solid ${NAVY}` : "none",
                borderRadius: "10px",
                transition: "outline 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> n1-east: publish orders.created ---
    edges.push({
        id: `pub-${stage}`,
        source: "orderSvc",
        target: "n1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "publish" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "publish" ? "publish orders.created" : "publish",
            labelColor: stage === "publish" ? MSG_COLOR : "#94a3b8",
            animated: stage === "publish",
            interval: 1500,
        },
    });

    // --- n1-east self-loop: WAL write (shown during append) ---
    edges.push({
        id: `wal-${stage}`,
        source: "n1",
        target: "n1",
        // Both default handles sit at the node's mid-height on opposite sides,
        // so the path ran back through the node. Loop over the top instead.
        sourceHandle: "top-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "append" ? 1 : 0.25 },
        data: {
            bow: -50,
            color: stage === "append" ? LIME : IDLE_COLOR,
            label: "write WAL",
            labelColor: stage === "append" ? LIME : "#94a3b8",
            animated: stage === "append",
            interval: 1500,
        },
    });

    // --- n1-east -> n2-east: AppendEntry, then n2 acks ---
    const n2IsAppend = stage === "append";
    const n2IsAck = stage === "ack";
    edges.push({
        id: `ae-n2-${stage}`,
        source: "n1",
        target: "n2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: n2IsAppend ? MSG_COLOR : n2IsAck ? COMMIT_COLOR : IDLE_COLOR,
            label: n2IsAck ? "ack" : "AppendEntry",
            labelColor: n2IsAppend
                ? MSG_COLOR
                : n2IsAck
                ? COMMIT_COLOR
                : "#94a3b8",
            animated: n2IsAppend || n2IsAck,
            interval: 1500,
        },
    });

    // --- n1-east -> n3-east: AppendEntry (n3 is slower to ack here) ---
    edges.push({
        id: `ae-n3-${stage}`,
        source: "n1",
        target: "n3",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: n2IsAppend ? 1 : 0.35 },
        data: {
            color: n2IsAppend ? MSG_COLOR : IDLE_COLOR,
            label: "AppendEntry",
            labelColor: n2IsAppend ? MSG_COLOR : "#94a3b8",
            animated: n2IsAppend,
            interval: 1500,
        },
    });

    // --- commit / apply: commit index rides the heartbeat to both followers ---
    const showApply = stage === "commit" || stage === "apply";
    for (const target of ["n2", "n3"]) {
        edges.push({
            id: `commit-${target}-${stage}`,
            source: "n1",
            target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
                opacity: showApply ? 1 : 0,
                strokeDasharray: "4 4",
            },
            data: {
                bow: 55,
                color: stage === "commit" ? COMMIT_COLOR : NAVY,
                label: stage === "commit"
                    ? "commit (quorum 2/3)"
                    : "apply",
                labelColor: stage === "commit" ? COMMIT_COLOR : NAVY,
                animated: stage === "apply",
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

export function R3ReplicationAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <R3ReplicationAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
