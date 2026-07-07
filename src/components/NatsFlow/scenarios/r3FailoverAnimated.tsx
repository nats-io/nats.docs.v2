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

// Canonical description for the rehype plugin (scripts/rehype-nats-flow.mjs
// picks up the FIRST description-keyed string literal in this source and uses
// it as the markdown fallback text for the embed — keep this the first one).
export const r3FailoverAnimatedMeta = {
    description:
        "order-svc publishes to the R3 ORDERS stream while the leader n1-east is killed. The send in flight gets no PubAck and is lost; the next publish returns 'no responders'; the survivors elect n2-east within the 4-9s window; the retry stores against the new leader. Every acked write survives, the un-acked one doesn't.",
};

// Brand palette (matches r3ReplicationAnimated on the same page).
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const COMMIT_COLOR = "#34A574"; // NATS green — PubAck / new leader
const FAIL_COLOR = "#ef4444"; // red — crash, lost send, no responders
const WAIT_COLOR = "#d97706"; // amber — the election window

// One beat per stage; the cycle loops.
type Stage = "flowing" | "crash" | "window" | "elect" | "resume";

const STAGE_ORDER: Stage[] = ["flowing", "crash", "window", "elect", "resume"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    flowing: 3500,
    crash: 4000,
    window: 4500,
    elect: 3500,
    resume: 5000,
};

const STAGE_BUTTON: Record<Stage, string> = {
    flowing: "1. Flowing",
    crash: "2. Crash",
    window: "3. Window",
    elect: "4. Elect",
    resume: "5. Resume",
};

const CAPTION: Record<Stage, string> = {
    flowing:
        "order-svc publishes in a loop. The leader n1-east commits each write by quorum and answers with a PubAck.",
    crash:
        "kill -9 takes the leader. The send in flight was published but never acked — without a PubAck there's no guarantee it was stored.",
    window:
        "With the leader dead no server subscribes for the stream, so the next publish returns 'no responders' immediately. The survivors' election timer runs (4-9s after a crash).",
    elect:
        "n2-east collects the survivors' votes — 2 of 3 is still a quorum — and becomes the new leader. 5.3s in our run.",
    resume:
        "The retry stores against n2-east. Count the stream: every write that got a PubAck is there; the one send that didn't isn't.",
};

function R3FailoverAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("flowing");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const leaderDown = stage !== "flowing";
    const n2Leads = stage === "elect" || stage === "resume";

    const nodes: any[] = [
        {
            id: "orderSvc",
            type: "publisher",
            position: { x: -70, y: 130 },
            data: { label: "order-svc" },
        },
        {
            id: "n1",
            type: "server",
            position: { x: 180, y: 130 },
            data: { label: leaderDown ? "n1-east ✕" : "n1-east (leader)" },
            style: {
                opacity: leaderDown ? 0.35 : 1,
                outline: stage === "crash" ? `2px solid ${FAIL_COLOR}` : "none",
                borderRadius: "10px",
                transition: "opacity 0.4s ease, outline 0.4s ease",
            },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 430, y: 30 },
            data: { label: n2Leads ? "n2-east (new leader)" : "n2-east" },
            style: {
                outline: n2Leads ? `2px solid ${COMMIT_COLOR}` : "none",
                borderRadius: "10px",
                transition: "outline 0.4s ease",
            },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 430, y: 230 },
            data: { label: "n3-east" },
        },
    ];

    const edges: any[] = [];

    // --- order-svc -> n1-east: the publish loop, then the un-acked send ---
    edges.push({
        id: `pub-n1-${stage}`,
        source: "orderSvc",
        target: "n1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "flowing" || stage === "crash" ? 1 : 0.2 },
        data: {
            color: stage === "flowing"
                ? MSG_COLOR
                : stage === "crash"
                ? FAIL_COLOR
                : IDLE_COLOR,
            label: stage === "flowing"
                ? "PUB orders.created"
                : stage === "crash"
                ? "sent — no PubAck"
                : undefined,
            labelColor: stage === "flowing" ? MSG_COLOR : FAIL_COLOR,
            animated: stage === "flowing",
            interval: 1200,
        },
    });

    // --- n1-east -> order-svc: PubAck while the leader lives ---
    if (stage === "flowing") {
        edges.push({
            id: "ack-n1",
            source: "n1",
            target: "orderSvc",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: COMMIT_COLOR,
                label: "PubAck",
                labelColor: COMMIT_COLOR,
                animated: true,
                interval: 1200,
            },
        });
    }

    // --- window: the publish that comes straight back with no responders ---
    if (stage === "window") {
        edges.push({
            id: "pub-noresp",
            source: "orderSvc",
            target: "n3",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAIL_COLOR,
                label: "no responders available",
                labelColor: FAIL_COLOR,
                animated: true,
                interval: 1500,
            },
        });
        // The survivors run their election timers between themselves.
        edges.push({
            id: "timer-n2-n3",
            source: "n2",
            target: "n3",
            type: "animated",
            animated: true,
            data: {
                color: WAIT_COLOR,
                label: "election timer 4-9s",
                labelColor: WAIT_COLOR,
                animated: false,
                interval: 1500,
            },
        });
    }

    // --- elect: n3 votes for n2, quorum of the survivors ---
    if (stage === "elect") {
        edges.push({
            id: "vote-n3-n2",
            source: "n3",
            target: "n2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: MSG_COLOR,
                label: "vote — quorum 2/3",
                labelColor: MSG_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- resume: the retry lands on the new leader and is acked ---
    if (stage === "resume") {
        edges.push({
            id: "pub-n2",
            source: "orderSvc",
            target: "n2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: MSG_COLOR,
                label: "PUB (retry)",
                labelColor: MSG_COLOR,
                animated: true,
                interval: 1200,
            },
        });
        edges.push({
            id: "ack-n2",
            source: "n2",
            target: "orderSvc",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: COMMIT_COLOR,
                label: "PubAck · Seq 15",
                labelColor: COMMIT_COLOR,
                animated: true,
                interval: 1200,
            },
        });
        // Replication to the surviving follower carries on underneath.
        edges.push({
            id: "repl-n2-n3",
            source: "n2",
            target: "n3",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: IDLE_COLOR,
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

export function R3FailoverAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <R3FailoverAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
