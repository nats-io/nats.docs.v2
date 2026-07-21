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

// Auth callout is a genuine request/reply: the server (acting as the system
// account requestor) publishes a signed auth request, the external auth-svc
// replies with a signed user JWT, and only then is the client admitted.
const CLIENT_COLOR = "#3b82f6"; // client <-> server (connect / admit)
const REQUEST_COLOR = "#f59e0b"; // server -> auth-svc (signed request)
const REPLY_COLOR = "#10b981"; // auth-svc -> server (signed user JWT)

// How long each step's animation plays before the sequence auto-advances.
// AnimatedEdge traverses a bubble in 1500ms, so 2600ms lets one bubble land
// with a short beat before the next step lights up.
const STEP_DURATION_MS = 2600;

interface Step {
    id: number;
    // Which edge is animating during this step.
    edge: "connect" | "request" | "receive" | "reply" | "admit";
    caption: string;
}

const STEPS: Step[] = [
    {
        id: 0,
        edge: "connect",
        caption:
            "The client opens a connection to the NATS server with its credentials.",
    },
    {
        id: 1,
        edge: "request",
        caption:
            "The server publishes a SIGNED auth request to $SYS.REQ.USER.AUTH.",
    },
    {
        id: 2,
        edge: "receive",
        caption:
            "auth-svc — a service in its own account — receives the request.",
    },
    {
        id: 3,
        edge: "reply",
        caption:
            "auth-svc validates and replies with a SIGNED user JWT for the order-svc user.",
    },
    {
        id: 4,
        edge: "admit",
        caption:
            "The server verifies the JWT and admits the client into the ORDERS account.",
    },
];

function AuthCalloutAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [step, setStep] = useState<number>(0);

    // Auto-advance through the request/reply sequence, looping back to the
    // start. Re-running on every `step` change keeps the timer in lockstep
    // with manual step-button presses (each press resets the dwell).
    useEffect(() => {
        const timer = setTimeout(() => {
            setStep((prev) => (prev + 1) % STEPS.length);
        }, STEP_DURATION_MS);
        return () => clearTimeout(timer);
    }, [step]);

    const active = STEPS[step].edge;

    const nodes = [
        {
            id: "client",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: { label: "Client (order-svc)" },
            style: {
                opacity: active === "admit" ? 1 : 0.85,
            },
        },
        {
            id: "server",
            type: "server",
            position: { x: 348, y: 150 },
            data: { label: "NATS (operator ACME)" },
        },
        {
            id: "auth-svc",
            type: "service",
            position: { x: 696, y: 150 },
            data: { label: "auth-svc" },
        },
    ];

    // Each step lights exactly one edge. Keying the edge id on the active step
    // forces AnimatedEdge to remount, so its bubble restarts cleanly from the
    // source every time the step changes.
    const edges: any[] = [];

    if (active === "connect" || active === "admit") {
        const isAdmit = active === "admit";
        edges.push({
            id: `e-client-server-${active}`,
            source: "client",
            target: "server",
            // Admit flows server -> client; connect flows client -> server.
            ...(isAdmit
                ? { source: "server", target: "client" }
                : { source: "client", target: "server" }),
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: CLIENT_COLOR,
                animated: true,
                label: isAdmit ? "admitted → ORDERS" : "connect",
                labelColor: CLIENT_COLOR,
            },
        });
    } else {
        // While the callout is in flight, keep a dim static link between the
        // client and server so the topology stays readable.
        edges.push({
            id: "e-client-server-idle",
            source: "client",
            target: "server",
            type: "animated",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#cbd5e1",
                animated: false,
            },
        });
    }

    if (active === "request" || active === "receive") {
        edges.push({
            id: `e-server-auth-${active}`,
            source: "server",
            target: "auth-svc",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: REQUEST_COLOR,
                animated: true,
                label: "$SYS.REQ.USER.AUTH",
                labelColor: REQUEST_COLOR,
            },
        });
    } else if (active === "reply") {
        edges.push({
            id: "e-auth-server-reply",
            source: "auth-svc",
            target: "server",
            sourceHandle: "reply-out",
            targetHandle: "reply-in",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: REPLY_COLOR,
                animated: true,
                label: "signed user JWT",
                labelColor: REPLY_COLOR,
            },
        });
    } else {
        // Dim static link between server and auth-svc when the callout edge
        // isn't the focus of the current step.
        edges.push({
            id: "e-server-auth-idle",
            source: "server",
            target: "auth-svc",
            type: "animated",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#cbd5e1",
                animated: false,
            },
        });
    }

    const stepButtonStyle = (isActive: boolean): React.CSSProperties => ({
        width: "26px",
        height: "26px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "50%",
        backgroundColor: isActive ? "#375c93" : "#ffffff",
        color: isActive ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 600,
        lineHeight: 1,
        padding: 0,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Step controls */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                }}
            >
                <span
                    style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginRight: "4px",
                    }}
                >
                    Step:
                </span>
                {STEPS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setStep(s.id)}
                        style={stepButtonStyle(s.id === step)}
                        aria-label={`Go to step ${s.id + 1}`}
                    >
                        {s.id + 1}
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
                    fitViewOptions={{ padding: 0.25 }}
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
            </div>

            {/* Caption / status */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#374151",
                    minHeight: "34px",
                }}
            >
                <strong style={{ color: "#375c93" }}>
                    {step + 1}/{STEPS.length}
                </strong>{" "}
                {STEPS[step].caption}
            </div>
        </div>
    );
}

export function AuthCalloutAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <AuthCalloutAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
