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
const IDLE_COLOR = "#94a3b8"; // dormant link (gray)
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active reconciliation step
const SUCCESS_COLOR = "#34A574"; // NATS green — committed / status written
const FAIL_COLOR = "#ef4444"; // red — drift detected (stream deleted)
const NAVY_COLOR = "#375C93"; // accent navy — declarative watch

// The NACK control loop, told one mechanism per stage, looping forever.
// Beat 1 (apply -> watch -> reconcile -> created -> status) is the
// declarative create. Beat 2 (drift -> recreate) is the self-heal.
type Stage =
    | "apply"
    | "watch"
    | "reconcile"
    | "created"
    | "status"
    | "drift"
    | "recreate";

const STAGE_ORDER: Stage[] = [
    "apply",
    "watch",
    "reconcile",
    "created",
    "status",
    "drift",
    "recreate",
];

// How long each stage holds before advancing.
const STAGE_DURATION_MS: Record<Stage, number> = {
    apply: 3000,
    watch: 3000,
    reconcile: 3500,
    created: 3500,
    status: 3000,
    drift: 4000,
    recreate: 4500,
};

const CAPTION: Record<Stage, string> = {
    apply:
        "An admin runs kubectl apply on a Stream CRD describing ORDERS with 3 replicas. The desired state is stored in the Kubernetes API / etcd.",
    watch:
        "The NACK controller watches the Kubernetes API and sees the new ORDERS Stream resource — the declared desired state.",
    reconcile:
        "The controller reconciles: it calls the JetStream API on the NATS cluster to make reality match the CRD.",
    created:
        "The cluster creates the R3 ORDERS stream, replicated across nats-0, nats-1 and nats-2. Reality now matches the desired state.",
    status:
        "The controller writes the result back to the CRD's .status field, so kubectl shows ORDERS as Ready.",
    drift:
        "Someone deletes the ORDERS stream by hand. Reality drifts away from the desired state still declared in the CRD.",
    recreate:
        "The controller detects the drift on its next reconcile and recreates the R3 stream automatically — declarative, self-healing lifecycle.",
};

function CrdReconcileAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("apply");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // The stream exists once it's created, until it drifts (gets deleted),
    // then is recreated.
    const streamUp = stage === "created" || stage === "status" ||
        stage === "recreate";
    const drifted = stage === "drift";

    const nodes: any[] = [
        // --- admin / kubectl client ---
        {
            id: "admin",
            type: "box",
            position: { x: -40, y: 40 },
            data: { label: "kubectl" },
        },
        // --- Kubernetes API / etcd (holds the CRD desired state) ---
        {
            id: "k8s",
            type: "box",
            position: { x: 200, y: 40 },
            data: { label: "K8s API / etcd", subtitle: "Kubernetes" },
        },
        // --- NACK controller (the reconciler) ---
        {
            id: "nack",
            type: "box",
            position: { x: 200, y: 240 },
            data: { label: "NACK controller", subtitle: "controller" },
        },
        // --- nats cluster (R3) ---
        {
            id: "nats0",
            type: "server",
            position: { x: 500, y: 20 },
            data: { label: "nats-0" },
            style: {
                opacity: streamUp ? 1 : 0.45,
                filter: streamUp ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "nats1",
            type: "server",
            position: { x: 500, y: 170 },
            data: { label: "nats-1" },
            style: {
                opacity: streamUp ? 1 : 0.45,
                filter: streamUp ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "nats2",
            type: "server",
            position: { x: 500, y: 320 },
            data: { label: "nats-2" },
            style: {
                opacity: streamUp ? 1 : 0.45,
                filter: streamUp ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- kubectl apply -> K8s API (active during "apply") ---
    edges.push({
        id: `admin-k8s-${stage}`,
        source: "admin",
        target: "k8s",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "apply" ? MSG_COLOR : IDLE_COLOR,
            label: stage === "apply" ? "apply Stream CRD" : undefined,
            labelColor: stage === "apply" ? MSG_COLOR : "#64748b",
            animated: stage === "apply",
            interval: 1500,
        },
    });

    // --- NACK watches K8s API (active during "watch") ---
    edges.push({
        id: `nack-watch-${stage}`,
        source: "k8s",
        target: "nack",
        sourceHandle: "bottom-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            bow: -40,
            color: stage === "watch" ? NAVY_COLOR : IDLE_COLOR,
            label: stage === "watch" ? "watch CRD" : undefined,
            labelColor: stage === "watch" ? NAVY_COLOR : "#64748b",
            animated: stage === "watch",
            interval: 1500,
        },
    });

    // --- NACK -> cluster: JetStream API call (reconcile / recreate) ---
    const isReconcileStep = stage === "reconcile" || stage === "recreate";
    edges.push({
        id: `nack-nats1-${stage}`,
        source: "nack",
        target: "nats1",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "recreate"
                ? SUCCESS_COLOR
                : isReconcileStep
                ? MSG_COLOR
                : IDLE_COLOR,
            label: isReconcileStep
                ? stage === "recreate"
                    ? "recreate ORDERS R3"
                    : "create ORDERS R3"
                : undefined,
            labelColor: stage === "recreate" ? SUCCESS_COLOR : MSG_COLOR,
            animated: isReconcileStep,
            interval: 1500,
        },
    });

    // --- Replication edges across the cluster (active during "created") ---
    const replicating = stage === "created" || stage === "recreate";
    for (const [id, target] of [["rep-1-0", "nats0"], ["rep-1-2", "nats2"]] as
        Array<[string, string]>) {
        edges.push({
            id: `${id}-${stage}`,
            source: "nats1",
            target,
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { opacity: streamUp ? 1 : 0.3 },
            data: {
                color: replicating
                    ? SUCCESS_COLOR
                    : streamUp
                    ? IDLE_COLOR
                    : IDLE_COLOR,
                label: replicating ? "replicate" : undefined,
                labelColor: SUCCESS_COLOR,
                animated: replicating,
                interval: 1500,
            },
        });
    }

    // --- NACK writes .status back to the CRD (active during "status") ---
    edges.push({
        id: `nack-status-${stage}`,
        source: "nack",
        target: "k8s",
        sourceHandle: "out-top",
        targetHandle: "bottom-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: stage === "status" ? 1 : 0.35 },
        data: {
            bow: 40,
            color: stage === "status" ? SUCCESS_COLOR : IDLE_COLOR,
            label: stage === "status" ? "write .status: Ready" : undefined,
            labelColor: SUCCESS_COLOR,
            animated: stage === "status",
            interval: 1500,
        },
    });

    // --- Drift marker: stream deleted by hand on the cluster ---
    if (drifted) {
        edges.push({
            id: "drift-marker",
            source: "nack",
            target: "nats1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: FAIL_COLOR,
                label: "stream deleted — drift!",
                labelColor: FAIL_COLOR,
                animated: false,
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

export function CrdReconcileAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <CrdReconcileAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
