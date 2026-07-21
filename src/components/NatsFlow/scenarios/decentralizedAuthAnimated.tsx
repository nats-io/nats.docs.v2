import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, ServiceNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Colors keyed to the trust roles.
const SIGN_COLOR = "#375C93"; // navy — the downward "signs" chain at rest
const PRESENT_COLOR = "#27AAE1"; // primary blue — client presents its JWT
const VERIFY_COLOR = "#8DC63F"; // lime — server walks the chain UP, verifying
const ADMIT_COLOR = "#34A574"; // green — admitted

// The animation is a single looping story told in discrete stages. Each stage
// has its own dwell time; when the last stage ends we loop back to stage 0.
type Stage =
    | "chain" // 0: operator signs account signs user (the trust chain at rest)
    | "present" // 1: client presents the user JWT to the server
    | "verify" // 2: server verifies the signature chain, walking UP
    | "admit"; // 3: chain validates against the trusted operator key → admit

const STAGES: Stage[] = ["chain", "present", "verify", "admit"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    chain: 4000,
    present: 3000,
    verify: 5000,
    admit: 3500,
};

const CAPTION: Record<Stage, string> = {
    chain:
        "Trust chain: operator ACME signs account ORDERS, which signs user order-svc. Each link is a cryptographic signature.",
    present:
        "A client connects and presents its user JWT for order-svc. The JWT carries the whole signed chain — nothing is stored on the server.",
    verify:
        "The server verifies the signatures, walking UP the chain: user → account → operator. No user list is consulted.",
    admit:
        "The chain resolves to the single operator public key the server trusts. Signature valid → client admitted.",
};

function DecentralizedAuthAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [stageIndex, setStageIndex] = useState<number>(0);

    // Auto-advance through the stages, looping forever. Resetting via the step
    // buttons just sets stageIndex directly (see handleStep below).
    useEffect(() => {
        const stage = STAGES[stageIndex];
        const timer = setTimeout(() => {
            setStageIndex((i) => (i + 1) % STAGES.length);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stageIndex]);

    const stage = STAGES[stageIndex];
    const isChain = stage === "chain";
    const isPresent = stage === "present";
    const isVerify = stage === "verify";
    const isAdmit = stage === "admit";

    // The trust chain is stacked vertically on the left; the server + client
    // sit on the right. Handles on the node components live on the Left/Right
    // edges, so the bezier edges curve between columns — matching the exemplar
    // scenarios, which never pin sourceHandle/targetHandle.
    const nodes = [
        {
            id: "operator",
            type: "service",
            position: { x: 40, y: 20 },
            data: { label: "operator ACME" },
            style: {
                // Highlight the operator key once verification reaches the top.
                opacity: 1,
                outline: isAdmit ? `2px solid ${ADMIT_COLOR}` : "none",
                borderRadius: "10px",
            },
        },
        {
            id: "account",
            type: "service",
            position: { x: 40, y: 150 },
            data: { label: "account ORDERS" },
        },
        {
            id: "user",
            type: "publisher",
            position: { x: 40, y: 280 },
            data: { label: "user order-svc" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 380, y: 150 },
            data: { label: "NATS" },
        },
        {
            id: "client",
            type: "publisher",
            position: { x: 380, y: 290 },
            data: { label: "client" },
            style: {
                opacity: isAdmit ? 1 : 0.5,
                outline: isAdmit ? `2px solid ${ADMIT_COLOR}` : "none",
                borderRadius: "10px",
            },
        },
    ];

    const edges: any[] = [];

    // --- The signing chain (downward): operator → account → user. ---
    // Always visible. Pulses only during the "chain" stage so the resting
    // trust structure reads clearly before the request arrives.
    edges.push({
        id: `e-op-acc-${stage}`,
        source: "operator",
        target: "account",
        sourceHandle: "out-bottom",
        targetHandle: "in-top",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            bow: -45,
            color: SIGN_COLOR,
            label: "signs",
            labelColor: SIGN_COLOR,
            animated: isChain,
            delay: 0,
            interval: 2000,
        },
    });
    edges.push({
        id: `e-acc-user-${stage}`,
        source: "account",
        target: "user",
        sourceHandle: "out-bottom",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            bow: -45,
            color: SIGN_COLOR,
            label: "signs",
            labelColor: SIGN_COLOR,
            animated: isChain,
            delay: 800,
            interval: 2000,
        },
    });

    // --- The client presents its user JWT to the server. ---
    if (isPresent) {
        edges.push({
            id: `e-client-server-present`,
            source: "client",
            target: "server",
            sourceHandle: "top-out",
            targetHandle: "in-bottom",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                bow: 45,
                color: PRESENT_COLOR,
                label: "presents user JWT",
                labelColor: PRESENT_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    // --- The server verifies, walking the chain UP: user → account → operator.
    // Staggered delays make the verification visibly climb the chain.
    if (isVerify) {
        edges.push({
            id: `e-user-acc-verify`,
            source: "user",
            target: "account",
            sourceHandle: "top-out",
            targetHandle: "in-bottom",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                bow: 45,
                color: VERIFY_COLOR,
                label: "verify ↑",
                labelColor: VERIFY_COLOR,
                animated: true,
                delay: 0,
                interval: 2200,
            },
        });
        edges.push({
            id: `e-acc-op-verify`,
            source: "account",
            target: "operator",
            sourceHandle: "out-top",
            targetHandle: "in-bottom",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                bow: 45,
                color: VERIFY_COLOR,
                label: "verify ↑",
                labelColor: VERIFY_COLOR,
                animated: true,
                delay: 1100,
                interval: 2200,
            },
        });
    }

    // --- Admit: the verified chain lets the client through. ---
    if (isAdmit) {
        edges.push({
            id: `e-server-client-admit`,
            source: "server",
            target: "client",
            sourceHandle: "out-bottom",
            targetHandle: "top-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                bow: -45,
                color: ADMIT_COLOR,
                label: "admitted",
                labelColor: ADMIT_COLOR,
                animated: true,
                interval: 1500,
            },
        });
    }

    const handleStep = (i: number) => {
        if (i === stageIndex) return;
        setStageIndex(i);
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "4px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? PRESENT_COLOR : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    const STEP_LABELS: Record<Stage, string> = {
        chain: "1. Chain",
        present: "2. Present",
        verify: "3. Verify",
        admit: "4. Admit",
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Step buttons */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                {STAGES.map((s, i) => (
                    <button
                        key={s}
                        onClick={() => handleStep(i)}
                        style={buttonStyle(stage === s)}
                    >
                        {STEP_LABELS[s]}
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
                    minZoom={0.5}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* "No user list" emphasis badge on the server side. */}
                <div
                    style={{
                        position: "absolute",
                        right: "12px",
                        top: "12px",
                        padding: "4px 10px",
                        background: "#fef2f2",
                        border: "1px solid #f87171",
                        borderRadius: "999px",
                        fontSize: "11px",
                        color: "#b91c1c",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    No user list on the server
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
                {CAPTION[stage]}
            </div>
        </div>
    );
}

export function DecentralizedAuthAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <DecentralizedAuthAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
