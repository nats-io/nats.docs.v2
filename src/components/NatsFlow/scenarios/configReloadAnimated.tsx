import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, ServiceNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    publisher: PublisherNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // idle / quiet link (gray)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active signal in flight
const COMMIT_COLOR = "#34A574"; // NATS green — the connection that survives
const NAVY = "#375C93"; // accent for control-plane links
const LIME = "#8DC63F"; // accent for the freshly-applied config

// One mechanism per stage. The cycle loops forever off the stage timer.
type Stage =
    | "change"
    | "detect"
    | "sighup"
    | "reload"
    | "stayopen"
    | "gossip";

const STAGE_ORDER: Stage[] = [
    "change",
    "detect",
    "sighup",
    "reload",
    "stayopen",
    "gossip",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    change: 3000,
    detect: 3000,
    sighup: 3000,
    reload: 3500,
    stayopen: 4500,
    gossip: 3500,
};

const CAPTION: Record<Stage, string> = {
    change:
        "A new nats.conf is written — a ConfigMap update or an edit on disk changes the server's config file.",
    detect:
        "The reloader sidecar is watching the file with inotify. It sees the change the moment the write lands.",
    sighup:
        "The reloader sends SIGHUP to the nats-server process — the signal that tells NATS to re-read its config.",
    reload:
        "nats-server reloads in place: it parses the new config and applies the changes to the running process. No restart.",
    stayopen:
        "The order-svc client connection stays open the whole time — green, never dropped. Zero downtime, no reconnect storm.",
    gossip:
        "The server gossips its updated INFO to cluster peers, so the rest of the cluster learns about the new settings.",
};

function ConfigReloadAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("change");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // Once the file has changed, light it up with the "applied" lime tint.
    const fileChanged = stage !== "change";
    // The server is mid-reload only during the reload stage.
    const reloading = stage === "reload";
    // The client link is shown as healthy/green from the moment the reload
    // happens onward — the whole point is it never dropped.
    const connectionHighlighted = stage === "stayopen" || stage === "gossip" ||
        stage === "reload";

    const nodes: any[] = [
        // --- Config file (left, drawn as a publisher-style source node) ---
        {
            id: "config",
            type: "box",
            position: { x: -70, y: 60 },
            data: { label: "nats.conf", subtitle: "file on disk" },
            style: {
                opacity: 1,
                filter: fileChanged ? "none" : "grayscale(0.2)",
                transition: "filter 0.4s ease",
            },
        },
        // --- Reloader sidecar ---
        {
            id: "reloader",
            type: "box",
            position: { x: 150, y: 60 },
            data: { label: "reloader", subtitle: "sidecar" },
        },
        // --- nats-server process ---
        {
            id: "server",
            type: "server",
            position: { x: 360, y: 150 },
            data: { label: "nats-server" },
            style: {
                opacity: 1,
                filter: reloading ? "saturate(1.6)" : "none",
                transition: "filter 0.4s ease",
            },
        },
        // --- Connected client ---
        {
            id: "client",
            type: "publisher",
            position: { x: 360, y: 350 },
            data: { label: "order-svc" },
        },
        // --- Cluster peers ---
        {
            id: "peer1",
            type: "server",
            position: { x: 640, y: 60 },
            data: { label: "peer n2" },
        },
        {
            id: "peer2",
            type: "server",
            position: { x: 640, y: 250 },
            data: { label: "peer n3" },
        },
    ];

    const edges: any[] = [];

    // --- config file -> reloader (the change is "written") ---
    edges.push({
        id: `cfg-rl-${stage}`,
        source: "config",
        target: "reloader",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "change"
                ? MSG_COLOR
                : stage === "detect"
                ? LIME
                : IDLE_COLOR,
            label: stage === "change"
                ? "write"
                : stage === "detect"
                ? "inotify"
                : undefined,
            labelColor: stage === "detect" ? "#5a7f1f" : "#64748b",
            animated: stage === "change" || stage === "detect",
            interval: 1500,
        },
    });

    // --- reloader -> server (SIGHUP) ---
    edges.push({
        id: `rl-srv-${stage}`,
        source: "reloader",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "sighup" ? NAVY : IDLE_COLOR,
            label: stage === "sighup" ? "SIGHUP" : undefined,
            labelColor: stage === "sighup" ? NAVY : "#64748b",
            animated: stage === "sighup",
            interval: 1500,
        },
    });

    // --- server self-loop during reload (apply config in place) ---
    if (reloading) {
        edges.push({
            id: "srv-reload",
            // Genuinely a self-loop: the server re-reads its own config. It
            // sourced from `config` before, which both contradicted the id and
            // stacked a second label on the config -> server edge.
            source: "server",
            target: "server",
            sourceHandle: "top-out",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: 0.9 },
            data: {
                bow: -45,
                color: LIME,
                label: "reload in place",
                labelColor: "#5a7f1f",
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- server <-> client (the connection that STAYS OPEN) ---
    edges.push({
        id: `srv-cli-${stage}`,
        source: "server",
        target: "client",
        sourceHandle: "bottom-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: connectionHighlighted ? COMMIT_COLOR : IDLE_COLOR,
            label: connectionHighlighted ? "stays open" : "connected",
            labelColor: connectionHighlighted ? COMMIT_COLOR : "#64748b",
            animated: stage === "stayopen",
            interval: 1500,
        },
    });

    // --- server -> peers (gossip updated INFO) ---
    const peerEdges: Array<{ id: string; target: string }> = [
        { id: "srv-peer1", target: "peer1" },
        { id: "srv-peer2", target: "peer2" },
    ];
    for (const p of peerEdges) {
        edges.push({
            id: `${p.id}-${stage}`,
            source: "server",
            target: p.target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: stage === "gossip" ? MSG_COLOR : IDLE_COLOR,
                label: stage === "gossip" ? "INFO" : "route",
                labelColor: stage === "gossip" ? MSG_COLOR : "#64748b",
                animated: stage === "gossip",
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

export function ConfigReloadAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ConfigReloadAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
