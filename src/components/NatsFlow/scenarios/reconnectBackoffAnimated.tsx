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
const MSG_COLOR = "#27AAE1"; // NATS primary blue — message / dial in flight
const IDLE_COLOR = "#94a3b8"; // gray — inactive link
const SUCCESS_COLOR = "#34A574"; // NATS green — successful reconnect (+OK)
const FAIL_COLOR = "#ef4444"; // red — failed dial
const ACCENT_NAVY = "#375C93"; // navy accent — backoff wait
const LIME_COLOR = "#8DC63F"; // lime — buffered-publish flush

// Sequenced stages. Each advances on a timer; the cycle loops.
type Stage = "dial-n1" | "backoff" | "dial-n2" | "ok" | "flush";

const STAGE_ORDER: Stage[] = [
    "dial-n1",
    "backoff",
    "dial-n2",
    "ok",
    "flush",
];

// How long each stage holds before advancing to the next.
const STAGE_DURATION_MS: Record<Stage, number> = {
    "dial-n1": 3000,
    backoff: 3500,
    "dial-n2": 3000,
    ok: 3000,
    flush: 4500,
};

const CAPTION: Record<Stage, string> = {
    "dial-n1":
        "The connection dropped. The client tries the first server in its pool — n1 — but the dial is refused.",
    backoff:
        "Instead of hammering n1, the client waits a randomized backoff (base delay + jitter) so a whole fleet never reconnects in lockstep.",
    "dial-n2":
        "After the pause it cycles to the next server in the pool and dials n2.",
    ok:
        "n2 answers with +OK. The connection is restored — the client is online again without any app code re-running.",
    flush:
        "Publishes that piled up in the reconnect buffer while offline now flush to n2 in order — no data lost during the gap.",
};

function ReconnectBackoffAnimatedInner({
    width = 600,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("dial-n1");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // n1 is the server that refused the dial; it stays dimmed once we've
    // moved on to n2.
    const n1Failed = stage !== "dial-n1";
    // n2 becomes the live connection from the +OK stage onward.
    const n2Live = stage === "ok" || stage === "flush";

    const nodes: any[] = [
        // --- Reconnecting publisher client ---
        {
            id: "client",
            type: "publisher",
            position: { x: -40, y: 150 },
            data: {
                label: n2Live
                    ? "client · CONNECTED"
                    : stage === "backoff"
                    ? "client · WAITING"
                    : "client · RECONNECTING",
            },
        },
        // --- Server pool n1 / n2 / n3 ---
        {
            id: "n1",
            type: "server",
            position: { x: 320, y: 30 },
            data: { label: "n1" },
            style: {
                opacity: n1Failed ? 0.3 : 1,
                filter: n1Failed ? "grayscale(1)" : "none",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "n2",
            type: "server",
            position: { x: 320, y: 150 },
            data: { label: "n2" },
            style: {
                opacity: n2Live ? 1 : 0.8,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "n3",
            type: "server",
            position: { x: 320, y: 270 },
            data: { label: "n3" },
            style: {
                opacity: 0.6,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client -> n1: the failed dial (only meaningful in dial-n1) ---
    if (stage === "dial-n1") {
        edges.push({
            id: "dial-n1-edge",
            source: "client",
            target: "n1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAIL_COLOR,
                label: "connection refused",
                labelColor: FAIL_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    } else {
        // Dead link to n1 stays as a faint reminder of the server it left.
        edges.push({
            id: "dead-n1-edge",
            source: "client",
            target: "n1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 0.2 },
            data: {
                color: IDLE_COLOR,
                animated: false,
            },
        });
    }

    // --- client -> n2: the backoff wait, the dial, the +OK, and the flush ---
    let n2Color = IDLE_COLOR;
    let n2Label: string | undefined;
    let n2LabelColor = "#64748b";
    let n2Animated = false;
    let n2Opacity = 0.3;

    if (stage === "backoff") {
        n2Color = ACCENT_NAVY;
        n2Label = "backoff + jitter…";
        n2LabelColor = ACCENT_NAVY;
        n2Animated = false;
        n2Opacity = 0.55;
    } else if (stage === "dial-n2") {
        n2Color = MSG_COLOR;
        n2Label = "dialing n2";
        n2LabelColor = MSG_COLOR;
        n2Animated = true;
        n2Opacity = 1;
    } else if (stage === "ok") {
        n2Color = SUCCESS_COLOR;
        n2Label = "+OK";
        n2LabelColor = SUCCESS_COLOR;
        n2Animated = true;
        n2Opacity = 1;
    } else if (stage === "flush") {
        n2Color = LIME_COLOR;
        n2Label = "flushing buffer";
        n2LabelColor = "#5a8c1f";
        n2Animated = true;
        n2Opacity = 1;
    }

    edges.push({
        id: `client-n2-${stage}`,
        source: "client",
        target: "n2",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: n2Opacity },
        data: {
            color: n2Color,
            label: n2Label,
            labelColor: n2LabelColor,
            animated: n2Animated,
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
            {/* Reconnect buffer indicator */}
            <div
                style={{
                    marginBottom: "8px",
                    fontSize: "12px",
                    color: stage === "flush" ? "#5a8c1f" : "#6b7280",
                    fontStyle: "italic",
                }}
            >
                Reconnect buffer:{" "}
                <strong>
                    {stage === "flush"
                        ? "draining → n2"
                        : n2Live
                        ? "empty"
                        : "holding queued publishes"}
                </strong>
            </div>

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

export function ReconnectBackoffAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ReconnectBackoffAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
