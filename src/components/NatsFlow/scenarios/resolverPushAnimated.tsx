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

// Consumed by scripts/rehype-nats-flow.mjs, which picks up the FIRST
// description-keyed string in this file for the markdown fallback text.
export const resolverPushAnimatedMeta = {
    description:
        "Operator mode in two beats. First, nats auth account push sends the ORDERS account JWT — signed by operator ACME — to the server over the SYSTEM account, and acme-1 stores it in its resolver directory next to the preloaded SYSTEM JWT. Then order-svc connects with a creds file: it presents its user JWT and signs the server's challenge, the server verifies the user JWT against the stored ORDERS JWT and ORDERS against the one trusted operator key, and the client is admitted. Account JWTs live on the server; user JWTs never do.",
};

const nodeTypes = {
    publisher: PublisherNode,
    service: ServiceNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Colors keyed to the two beats of operator mode.
const PUSH_COLOR = "#f59e0b"; // amber — signed account JWT over SYSTEM
const STORE_COLOR = "#34A574"; // green — JWT written to the resolver dir
const CONNECT_COLOR = "#27AAE1"; // primary blue — creds presentation
const VERIFY_COLOR = "#8DC63F"; // lime — chain verification
const ADMIT_COLOR = "#34A574"; // green — admitted
const IDLE_COLOR = "#cbd5e1"; // dim static links
const NAVY = "#375C93";

// How long each step holds before the sequence auto-advances (looping).
const STEP_DURATION_MS = 2800;

interface Step {
    id: "push" | "store" | "connect" | "verify" | "admit";
    caption: string;
}

const STEPS: Step[] = [
    {
        id: "push",
        caption:
            "nats auth account push connects with SYSTEM credentials and sends the ORDERS account JWT — a public claim signed by operator ACME.",
    },
    {
        id: "store",
        caption:
            "acme-1 checks the operator signature and writes the JWT into its resolver directory. Accounts live on the server; user JWTs are never pushed.",
    },
    {
        id: "connect",
        caption:
            "order-svc connects with its creds file: it presents the user JWT and signs the server's challenge with the private nkey seed.",
    },
    {
        id: "verify",
        caption:
            "The server verifies the chain: the user JWT was signed by ORDERS — the stored account JWT — and ORDERS was signed by ACME, the one operator it trusts.",
    },
    {
        id: "admit",
        caption:
            "The whole chain checks out and the client is admitted into ORDERS — no user list, no password, one trusted key.",
    },
];

function ResolverPushAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [step, setStep] = useState<number>(0);

    // Auto-advance through the two-beat story, looping back to the start.
    // Re-running on every `step` change keeps the timer in lockstep with
    // manual step-button presses (each press resets the dwell).
    useEffect(() => {
        const timer = setTimeout(() => {
            setStep((prev) => (prev + 1) % STEPS.length);
        }, STEP_DURATION_MS);
        return () => clearTimeout(timer);
    }, [step]);

    const active = STEPS[step].id;
    const isVerify = active === "verify";
    const isAdmit = active === "admit";
    // The pushed JWTs live in the resolver dir from the "store" step onward;
    // looping back to "push" resets the directory to just the preloaded
    // SYSTEM JWT.
    const jwtStored = step >= 1;

    const nodes = [
        {
            id: "workstation",
            type: "service",
            position: { x: 28, y: 40 },
            data: { label: "workstation (nats auth)" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 420, y: 150 },
            data: { label: "acme-1" },
        },
        {
            id: "order-svc",
            type: "publisher",
            position: { x: 28, y: 260 },
            data: { label: "order-svc" },
            style: {
                opacity: active === "push" || active === "store" ? 0.6 : 1,
                outline: isAdmit ? `2px solid ${ADMIT_COLOR}` : "none",
                borderRadius: "10px",
                transition: "opacity 0.4s ease",
            },
        },
    ];

    // Each step lights at most one edge. Keying edge ids on the active step
    // forces AnimatedEdge to remount, so its bubble restarts cleanly from the
    // source every time the step changes.
    const edges: any[] = [];

    // --- workstation -> server: the account push, animated only during
    // "push"; frozen dim afterwards so the topology stays readable. ---
    if (active === "push") {
        edges.push({
            id: "e-ws-server-push",
            source: "workstation",
            target: "server",
            sourceHandle: "out-right",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: PUSH_COLOR,
                animated: true,
                label: "account push — ORDERS JWT (signed by ACME), over SYSTEM",
                labelColor: PUSH_COLOR,
                interval: 1500,
            },
        });
    } else {
        edges.push({
            id: `e-ws-server-idle-${active}`,
            source: "workstation",
            target: "server",
            sourceHandle: "out-right",
            type: "animated",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: IDLE_COLOR,
                animated: false,
            },
        });
    }

    // --- order-svc <-> server: connect (client -> server), then frozen
    // during "verify", then admit (server -> client). ---
    if (active === "connect" || isVerify) {
        edges.push({
            id: `e-client-server-${active}`,
            source: "order-svc",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: CONNECT_COLOR,
                // Freeze the connect edge during verify: the line stays
                // blue, only the bubble stops while the overlays pulse.
                animated: active === "connect",
                label: "user JWT + signed challenge",
                labelColor: CONNECT_COLOR,
                interval: 1500,
            },
        });
    } else if (isAdmit) {
        edges.push({
            id: "e-server-client-admit",
            source: "server",
            target: "order-svc",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: ADMIT_COLOR,
                animated: true,
                label: "admitted → ORDERS",
                labelColor: ADMIT_COLOR,
                interval: 1500,
            },
        });
    } else {
        edges.push({
            id: `e-client-server-idle-${active}`,
            source: "order-svc",
            target: "server",
            type: "animated",
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: IDLE_COLOR,
                animated: false,
            },
        });
    }

    // Badge highlight: lime while the chain is being verified (delayed 600ms
    // so the ORDERS.jwt row pulses first), green once the client is admitted.
    const badgeAccent = isVerify ? VERIFY_COLOR : isAdmit ? ADMIT_COLOR : null;

    // Resolver-dir row styling for ORDERS.jwt: bold green for the beat it
    // lands ("store"), lime while the server checks it ("verify").
    const ordersRowColor = isVerify
        ? VERIFY_COLOR
        : active === "store"
        ? STORE_COLOR
        : "#374151";
    const ordersRowWeight = active === "store" || isVerify ? 700 : 400;

    const stepButtonStyle = (isActive: boolean): React.CSSProperties => ({
        width: "26px",
        height: "26px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "50%",
        backgroundColor: isActive ? NAVY : "#ffffff",
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
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        onClick={() => setStep(i)}
                        style={stepButtonStyle(i === step)}
                        aria-label={`Go to step ${i + 1}`}
                    >
                        {i + 1}
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

                {/* The one thing the server is configured with: the operator
                    key it trusts. Pulses lime while the chain is verified
                    (after the ORDERS.jwt row), green on admit. */}
                <div
                    style={{
                        position: "absolute",
                        right: "12px",
                        top: "12px",
                        padding: "4px 10px",
                        background: "#eef2f8",
                        border: `1px solid ${badgeAccent ?? NAVY}`,
                        boxShadow: badgeAccent
                            ? `0 0 0 2px ${badgeAccent}`
                            : "none",
                        borderRadius: "999px",
                        fontSize: "11px",
                        color: NAVY,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        transition:
                            "border-color 0.4s ease, box-shadow 0.4s ease",
                        transitionDelay: isVerify ? "600ms" : "0ms",
                    }}
                >
                    trusts: operator ACME
                </div>

                {/* The server's resolver directory: SYSTEM preloaded, the
                    pushed account JWTs appear at the "store" step. */}
                <div
                    style={{
                        position: "absolute",
                        right: "12px",
                        top: "52px",
                        width: "150px",
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
                        resolver dir
                    </div>
                    <div style={{ padding: "1px 0" }}>SYSTEM.jwt</div>
                    <div
                        style={{
                            padding: "1px 0",
                            opacity: jwtStored ? 1 : 0,
                            color: ordersRowColor,
                            fontWeight: ordersRowWeight,
                            transition: "opacity 0.4s ease, color 0.4s ease",
                        }}
                    >
                        ORDERS.jwt
                    </div>
                    <div
                        style={{
                            padding: "1px 0",
                            opacity: jwtStored ? 1 : 0,
                            transition: "opacity 0.4s ease",
                        }}
                    >
                        ANALYTICS.jwt
                    </div>
                </div>
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
                <strong style={{ color: NAVY }}>
                    {step + 1}/{STEPS.length}
                </strong>{" "}
                {STEPS[step].caption}
            </div>
        </div>
    );
}

export function ResolverPushAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ResolverPushAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
