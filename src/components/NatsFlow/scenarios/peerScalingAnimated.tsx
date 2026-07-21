import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // idle RAFT links (gray)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active proposal / catchup
const SUCCESS_COLOR = "#34A574"; // NATS green — committed / caught up
const FAIL_COLOR = "#ef4444"; // RemovePeer / dropped subscriptions
const NAVY = "#375C93"; // leader accent

// Sequenced stages. Each advances on a timer; the cycle loops.
// Beat one grows the cluster (AddPeer -> catchup -> lag->0).
// Beat two shrinks it (RemovePeer -> dropped).
type Stage =
    | "propose"
    | "catchup"
    | "caughtup"
    | "remove"
    | "dropped";

const STAGE_ORDER: Stage[] = [
    "propose",
    "catchup",
    "caughtup",
    "remove",
    "dropped",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    propose: 4000,
    catchup: 4500,
    caughtup: 3000,
    remove: 4000,
    dropped: 3500,
};

const CAPTION: Record<Stage, string> = {
    propose:
        "The leader n1-east proposes AddPeer for the new server n4-east, replicates the entry to a quorum of the existing peers, and commits the new peer set.",
    catchup:
        "n4-east opens a CATCHUP stream to the leader and pulls the log entries it is missing — its lag shrinks as entries arrive.",
    caughtup:
        "n4-east's lag reaches zero. It is now a full voting peer, fully in sync with n1/n2/n3-east.",
    remove:
        "Scaling back down: the leader proposes RemovePeer for n4-east and commits the smaller peer set to the quorum.",
    dropped:
        "Removed from the group, n4-east drops its RAFT subscriptions and stops receiving replication — the cluster is back to three peers.",
};

function PeerScalingAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("propose");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // n4-east is "joining" (empty / dim) until it has caught up.
    const n4Joining = stage === "propose" || stage === "catchup";
    // After RemovePeer commits, n4-east is no longer part of the group.
    const n4Removed = stage === "dropped";
    const n4InGroup = !n4Joining && !n4Removed; // a full peer (caughtup, remove)

    const n4Opacity = n4Removed ? 0.2 : n4Joining ? 0.45 : 1;
    const n4Filter = n4Removed
        ? "grayscale(1)"
        : n4Joining
        ? "grayscale(0.5)"
        : "none";

    const nodes: any[] = [
        // --- Existing three peers (triangle) ---
        {
            id: "n1",
            type: "server",
            position: { x: 108, y: 60 },
            data: { label: "n1-east (leader)" },
            style: {
                outline: `2px solid ${NAVY}`,
                outlineOffset: "2px",
                borderRadius: "8px",
            },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 456, y: 50 },
            data: { label: "n2-east" },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 180, y: 280 },
            data: { label: "n3-east" },
        },
        // --- New peer joining / leaving ---
        {
            id: "n4",
            type: "server",
            position: { x: 564, y: 270 },
            data: {
                label: n4InGroup ? "n4-east" : "n4-east (new)",
            },
            style: {
                opacity: n4Opacity,
                filter: n4Filter,
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- Existing RAFT mesh among the three established peers ---
    const meshMeta: Array<
        {
            id: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
        }
    > = [
        { id: "m-n1-n2", source: "n1", target: "n2" },
        // n3 sits to n2's left, so this hop leaves from n2's left edge.
        {
            id: "m-n2-n3",
            source: "n2",
            target: "n3",
            sourceHandle: "reply-out",
            targetHandle: "reply-in",
        },
        { id: "m-n1-n3", source: "n1", target: "n3" },
    ];

    for (const m of meshMeta) {
        // During propose, the leader replicates the AddPeer entry across the
        // existing quorum, so the established mesh carries the proposal.
        const carriesProposal = stage === "propose";
        edges.push({
            id: `${m.id}-${stage}`,
            source: m.source,
            target: m.target,
            ...(m.sourceHandle
                ? { sourceHandle: m.sourceHandle, targetHandle: m.targetHandle }
                : {}),
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: carriesProposal ? MSG_COLOR : IDLE_COLOR,
                label: "RAFT",
                labelOffset: 26,
                labelColor: carriesProposal ? MSG_COLOR : "#64748b",
                animated: carriesProposal,
                interval: 1500,
            },
        });
    }

    // --- Leader -> n4-east: the lifecycle of the new peer ---
    if (stage === "propose") {
        // Leader announces the new peer set to n4-east.
        edges.push({
            id: "n1-n4-propose",
            source: "n1",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 0.6 },
            data: {
                color: MSG_COLOR,
                label: "AddPeer",
                labelColor: MSG_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    } else if (stage === "catchup") {
        // n4-east pulls missing entries from the leader over a CATCHUP stream.
        edges.push({
            id: "n1-n4-catchup",
            source: "n1",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: MSG_COLOR,
                label: "catchup",
                labelColor: MSG_COLOR,
                animated: true,
                interval: 1200,
            },
        });
    } else if (stage === "caughtup") {
        // Lag hits zero — n4-east is fully in sync.
        edges.push({
            id: "n1-n4-caughtup",
            source: "n1",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                label: "lag->0",
                labelColor: SUCCESS_COLOR,
                animated: true,
                interval: 1500,
            },
        });
        // Now a full peer, n4-east also meshes with n2 and n3.
        edges.push({
            id: "n2-n4-caughtup",
            source: "n2",
            target: "n4",
            sourceHandle: "bottom-out",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                animated: false,
            },
        });
        edges.push({
            id: "n3-n4-caughtup",
            source: "n3",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: SUCCESS_COLOR,
                animated: false,
            },
        });
    } else if (stage === "remove") {
        // Leader proposes & commits RemovePeer for n4-east.
        edges.push({
            id: "n1-n4-remove",
            source: "n1",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAIL_COLOR,
                label: "RemovePeer",
                labelColor: FAIL_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    } else if (stage === "dropped") {
        // n4-east has dropped its RAFT subscriptions — link is dead.
        edges.push({
            id: "n1-n4-dropped",
            source: "n1",
            target: "n4",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 0.2 },
            data: {
                color: FAIL_COLOR,
                label: "dropped",
                labelColor: FAIL_COLOR,
                animated: false,
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

export function PeerScalingAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <PeerScalingAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
