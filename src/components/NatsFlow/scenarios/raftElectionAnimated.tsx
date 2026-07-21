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

// Brand-ish palette.
const IDLE_COLOR = "#94a3b8"; // gray — quiet RAFT peer link
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const FAIL_COLOR = "#ef4444"; // red — heartbeat lost
const COMMIT_COLOR = "#34A574"; // NATS green — vote granted / leadership won
const NAVY = "#375C93"; // navy — candidate accent

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage =
    | "steady"
    | "lost"
    | "candidate"
    | "request"
    | "vote"
    | "leader";

const STAGE_ORDER: Stage[] = [
    "steady",
    "lost",
    "candidate",
    "request",
    "vote",
    "leader",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    steady: 3500,
    lost: 3000,
    candidate: 3000,
    request: 3500,
    vote: 3500,
    leader: 4500,
};

const CAPTION: Record<Stage, string> = {
    steady:
        "Term 4: n1-east is leader and sends heartbeats to its followers n2-east and n3-east. As long as heartbeats arrive, everyone stays a Follower.",
    lost:
        "n1-east goes silent — its heartbeats stop. The other peers start counting down their randomized election timers.",
    candidate:
        "n2-east's election timer fires first. It becomes a Candidate, bumps the term to 5, and votes for itself.",
    request:
        "n2-east broadcasts a VoteRequest for term 5 to n1-east and n3-east, asking the cluster to elect it.",
    vote:
        "n3-east grants its Vote for term 5. With its own vote plus n3-east's, n2-east now holds 2 of 3 — a quorum.",
    leader:
        "Quorum reached: n2-east becomes the term-5 Leader and starts sending its own heartbeats. The cluster has a leader again.",
};

// Per-stage role + term shown on each server label.
function roleFor(
    id: "n1" | "n2" | "n3",
    stage: Stage,
): { role: string; term: number; color: string } {
    const candidatePhase = stage === "candidate" || stage === "request" ||
        stage === "vote";

    if (id === "n2") {
        if (stage === "leader") return { role: "Leader", term: 5, color: COMMIT_COLOR };
        if (candidatePhase) return { role: "Candidate", term: 5, color: NAVY };
        return { role: "Follower", term: 4, color: IDLE_COLOR };
    }

    if (id === "n1") {
        // Old leader in the steady term, then down/silent for the rest.
        if (stage === "steady") return { role: "Leader", term: 4, color: COMMIT_COLOR };
        return { role: "Follower", term: stage === "leader" ? 5 : 4, color: IDLE_COLOR };
    }

    // n3 — a follower throughout, advancing to term 5 once it votes.
    const n3Term = stage === "vote" || stage === "leader" ? 5 : 4;
    return { role: "Follower", term: n3Term, color: IDLE_COLOR };
}

function RaftElectionAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("steady");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // n1-east is the old leader; it goes silent once heartbeats stop.
    const n1Silent = stage !== "steady";

    const makeServer = (
        id: "n1" | "n2" | "n3",
        name: string,
        position: { x: number; y: number },
        dim: boolean,
    ) => {
        const { role, term, color } = roleFor(id, stage);
        return {
            id,
            type: "server",
            position,
            data: { label: `${name} · ${role} · T${term}`, roleColor: color },
            style: {
                opacity: dim ? 0.3 : 1,
                filter: dim ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        };
    };

    // Triangle of three RAFT peers.
    const nodes: any[] = [
        makeServer("n1", "n1-east", { x: 230, y: 40 }, n1Silent),
        makeServer("n2", "n2-east", { x: 60, y: 280 }, false),
        makeServer("n3", "n3-east", { x: 400, y: 280 }, false),
    ];

    const edges: any[] = [];

    // --- Term-4 heartbeats from n1 (leader) to its followers ---
    // Healthy + animated only during "steady"; turn red/idle once silent.
    // n1 sits above both followers, so these leave from its bottom edge —
    // the default left/right handles would loop the n2 hop around the node.
    const heartbeatTargets: Array<{ id: string; target: "n2" | "n3" }> = [
        { id: "hb-n1-n2", target: "n2" },
        { id: "hb-n1-n3", target: "n3" },
    ];
    for (const hb of heartbeatTargets) {
        const beating = stage === "steady";
        const lostNow = stage === "lost";
        edges.push({
            id: `${hb.id}-${stage}`,
            source: "n1",
            target: hb.target,
            sourceHandle: "bottom-out",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: n1Silent ? 0.25 : 1 },
            data: {
                color: beating ? MSG_COLOR : lostNow ? FAIL_COLOR : IDLE_COLOR,
                label: beating ? "heartbeat" : lostNow ? "no heartbeat" : undefined,
                labelColor: lostNow ? FAIL_COLOR : "#64748b",
                animated: beating,
                interval: 1500,
            },
        });
    }

    // --- VoteRequest: n2 (candidate) -> n1 and n3 during "request" ---
    const voteReqTargets: Array<{ id: string; target: "n1" | "n3" }> = [
        { id: "vr-n2-n1", target: "n1" },
        { id: "vr-n2-n3", target: "n3" },
    ];
    for (const vr of voteReqTargets) {
        const asking = stage === "request";
        // Keep these links faint outside the request stage so the layout
        // stays stable.
        if (stage === "candidate" || stage === "request" || stage === "vote") {
            edges.push({
                id: `${vr.id}-${stage}`,
                source: "n2",
                target: vr.target,
                type: "animated",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { opacity: asking ? 1 : 0.3 },
                data: {
                    color: asking ? MSG_COLOR : IDLE_COLOR,
                    label: asking ? "VoteRequest T5" : undefined,
                    labelColor: "#64748b",
                    animated: asking,
                    interval: 1500,
                },
            });
        }
    }

    // --- Vote: n3 -> n2 during "vote" (granting term-5 vote) ---
    if (stage === "vote") {
        edges.push({
            id: "vote-n3-n2",
            source: "n3",
            target: "n2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: COMMIT_COLOR,
                label: "Vote T5",
                labelColor: COMMIT_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- Term-5 heartbeats from the new leader n2 during "leader" ---
    if (stage === "leader") {
        const leaderTargets: Array<{ id: string; target: "n1" | "n3" }> = [
            { id: "hb5-n2-n1", target: "n1" },
            { id: "hb5-n2-n3", target: "n3" },
        ];
        for (const hb of leaderTargets) {
            edges.push({
                id: hb.id,
                source: "n2",
                target: hb.target,
                type: "animated",
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed },
                data: {
                    color: MSG_COLOR,
                    label: "heartbeat T5",
                    labelColor: "#64748b",
                    animated: true,
                    interval: 1500,
                },
            });
        }
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

export function RaftElectionAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <RaftElectionAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
