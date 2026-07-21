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

const ACCEPT_COLOR = "#10b981"; // green
const REJECT_COLOR = "#ef4444"; // red
const PENDING_COLOR = "#3b82f6"; // blue (connecting)

// Time (after a connect attempt starts) when the credential bubble reaches the
// server and the verdict is revealed. The AnimatedEdge spawns a circle at T=0
// with a 1500ms traversal; we resolve slightly before it fully lands so the
// caption flip feels synced with the bubble merging into the server.
const VERDICT_DELAY_MS = 1300;
// How long the verdict stays on screen before the next connect attempt begins.
const VERDICT_HOLD_MS = 2200;

type Credential = "valid" | "invalid";
type Phase = "connecting" | "admitted" | "rejected";

// The in-config user list the server checks credentials against. Kept
// consistent with the Security chapter (operator ACME, account ORDERS, the
// order-svc user, plus the analytics + auth service users).
const USER_LIST = [
    { user: "order-svc", account: "ORDERS" },
    { user: "analytics-svc", account: "ANALYTICS" },
    { user: "auth-svc", account: "ACME" },
];

function CentralizedAuthAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [credential, setCredential] = useState<Credential>("valid");
    const [phase, setPhase] = useState<Phase>("connecting");

    // Drive the connect → verdict → hold → reconnect cycle. The effect re-runs
    // on every phase change: from "connecting" it schedules the verdict; from a
    // verdict it schedules the loop back to "connecting". Toggling the
    // credential resets to "connecting", so the new outcome plays immediately.
    useEffect(() => {
        if (phase === "connecting") {
            const verdictTimer = setTimeout(() => {
                setPhase(credential === "valid" ? "admitted" : "rejected");
            }, VERDICT_DELAY_MS);
            return () => clearTimeout(verdictTimer);
        }

        // Holding a verdict (admitted / rejected): after a pause, start another
        // connect attempt so the animation keeps looping for the current
        // credential selection.
        const loopTimer = setTimeout(() => {
            setPhase("connecting");
        }, VERDICT_HOLD_MS);
        return () => clearTimeout(loopTimer);
    }, [credential, phase]);

    const isValid = credential === "valid";

    // Edge color tracks the phase: blue while the credential is in flight, then
    // green (admitted) or red (rejected) once the server returns its verdict.
    const edgeColor = phase === "connecting"
        ? PENDING_COLOR
        : phase === "admitted"
        ? ACCEPT_COLOR
        : REJECT_COLOR;

    const edgeLabel = phase === "connecting"
        ? "connecting…"
        : phase === "admitted"
        ? "ADMITTED"
        : "REJECTED";

    const nodes = [
        {
            id: "client",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: {
                label: isValid ? "order-svc" : "intruder",
            },
        },
        {
            id: "server",
            type: "server",
            position: { x: 360, y: 150 },
            data: { label: "NATS" },
        },
    ];

    // Re-key the edge per phase + credential so the AnimatedEdge remounts and
    // spawns a fresh credential bubble on every connect attempt.
    const edges: any[] = [
        {
            id: `e-client-server-${credential}-${phase}`,
            source: "client",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: edgeColor,
                // Only stream the bubble while connecting; freeze the line on
                // the colored verdict once the server has decided.
                animated: phase === "connecting",
                label: edgeLabel,
                labelColor: edgeColor,
                interval: 99999, // single bubble per connect attempt
            },
        },
    ];

    const caption = (() => {
        if (phase === "connecting") {
            return isValid
                ? "order-svc presents its credentials to the server…"
                : "An unknown client presents bad credentials to the server…";
        }
        if (phase === "admitted") {
            return "Credentials match a user in the server config. Connection ADMITTED — order-svc is now in the ORDERS account.";
        }
        return "No matching user in the server config. Connection REJECTED — the client never reaches an account.";
    })();

    const captionColor = phase === "connecting"
        ? "#6b7280"
        : phase === "admitted"
        ? "#065f46"
        : "#991b1b";

    const handleToggle = (next: Credential) => {
        if (next === credential) return;
        setCredential(next);
        setPhase("connecting");
    };

    const buttonStyle = (active: boolean, color: string): React.CSSProperties => ({
        padding: "6px 14px",
        fontSize: "13px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? color : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Credential toggle */}
            <div
                style={{
                    marginBottom: "10px",
                    display: "flex",
                    gap: "8px",
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
                    Credentials:
                </span>
                <button
                    onClick={() => handleToggle("valid")}
                    style={buttonStyle(isValid, ACCEPT_COLOR)}
                >
                    Valid
                </button>
                <button
                    onClick={() => handleToggle("invalid")}
                    style={buttonStyle(!isValid, REJECT_COLOR)}
                >
                    Invalid
                </button>
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

                {/* In-config user list anchored under the server node */}
                <div
                    style={{
                        position: "absolute",
                        left: "16px",
                        bottom: "14px",
                        width: "160px",
                        padding: "8px 10px",
                        background: "#f9fafb",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#374151",
                        fontFamily: "monospace",
                    }}
                >
                    <div
                        style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            color: "#6b7280",
                            fontWeight: 600,
                            marginBottom: "4px",
                            fontFamily: "sans-serif",
                        }}
                    >
                        Server user list
                    </div>
                    {USER_LIST.map((u) => {
                        const match = isValid && u.user === "order-svc";
                        return (
                            <div
                                key={u.user}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "6px",
                                    padding: "1px 0",
                                    color: match && phase === "admitted"
                                        ? ACCEPT_COLOR
                                        : "#374151",
                                    fontWeight: match && phase === "admitted"
                                        ? 700
                                        : 400,
                                }}
                            >
                                <span>{u.user}</span>
                                <span style={{ color: "#9ca3af" }}>
                                    {u.account}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Status caption */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: captionColor,
                    fontWeight: phase === "connecting" ? 400 : 500,
                }}
            >
                {caption}
            </div>
        </div>
    );
}

export function CentralizedAuthAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <CentralizedAuthAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
