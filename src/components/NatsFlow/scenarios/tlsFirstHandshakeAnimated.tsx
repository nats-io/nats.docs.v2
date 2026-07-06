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

// tlsFirstHandshakeAnimated
// Two-lane contrast: the default NATS connection handshake (plaintext INFO
// first, then the TLS upgrade) on the top lane vs a handshake_first server
// (TLS before any protocol byte) on the bottom lane. Both lanes animate in
// every stage so the timing difference reads side by side.

// Scenario metadata picked up by scripts/rehype-nats-flow.mjs — the plugin
// reads the first description key it finds in this file, so keep this object
// first and don't add that key anywhere else.
export const tlsFirstHandshakeMeta = {
    description:
        "Two connection timelines side by side. In the default handshake the server's INFO line — version and connect URLs — crosses the wire in plaintext, and only then does the link upgrade to TLS before credentials flow. With handshake_first, TLS runs before any protocol byte, so the INFO arrives already encrypted, the way an HTTPS server behaves. Credentials are encrypted in both modes; the plaintext INFO in the first lane is exactly what TLS-first removes.",
};

const nodeTypes = {
    publisher: PublisherNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Colors keyed to what's on the wire.
const PLAINTEXT_COLOR = "#ef4444"; // red — the plaintext byte TLS-first removes
const TLS_COLOR = "#375C93"; // navy — the TLS handshake itself
const ENCRYPTED_COLOR = "#10b981"; // green — traffic inside the TLS session
const IDLE_COLOR = "#cbd5e1"; // idle link

type Stage = "firstByte" | "upgrade" | "auth" | "compare";

const STAGE_ORDER: Stage[] = ["firstByte", "upgrade", "auth", "compare"];

const STAGE_DURATION_MS: Record<Stage, number> = {
    firstByte: 3500,
    upgrade: 3000,
    auth: 3000,
    compare: 4500,
};

const CAPTION: Record<Stage, string> = {
    firstByte:
        "First byte on the wire. Default: the server sends its INFO line — version, connect URLs — in plaintext. TLS-first: the TLS handshake runs before any protocol byte, the way an HTTPS server behaves.",
    upgrade:
        "Default: both sides now upgrade the link to TLS. TLS-first: the INFO arrives inside the encrypted session — it was never exposed.",
    auth:
        "Credentials flow encrypted in both modes — the upgrade always happens before authentication. The difference is only what crossed the wire before it.",
    compare:
        "The one plaintext INFO line is exactly what handshake_first removes. A client that still expects a plaintext INFO hangs against a TLS-first server — the CLI opts in with --tlsfirst.",
};

const STEP_LABELS: Record<Stage, string> = {
    firstByte: "1. First byte",
    upgrade: "2. Upgrade",
    auth: "3. Auth",
    compare: "4. Compare",
};

// What each lane's edge does per stage. `null` = idle dim link.
type ActiveEdge = { color: string; label: string } | null;

// Lane A (default handshake), client-a → server-a.
const LANE_A_FWD: Record<Stage, ActiveEdge> = {
    firstByte: null,
    upgrade: { color: TLS_COLOR, label: "TLS upgrade" },
    auth: {
        color: ENCRYPTED_COLOR,
        label: "CONNECT + credentials (encrypted)",
    },
    compare: null,
};

// Lane A, server-a → client-a.
const LANE_A_BACK: Record<Stage, ActiveEdge> = {
    firstByte: { color: PLAINTEXT_COLOR, label: "INFO — plaintext" },
    upgrade: null,
    auth: null,
    compare: null,
};

// Lane B (handshake_first), client-b → server-b.
const LANE_B_FWD: Record<Stage, ActiveEdge> = {
    firstByte: { color: TLS_COLOR, label: "TLS handshake" },
    upgrade: null,
    auth: {
        color: ENCRYPTED_COLOR,
        label: "CONNECT + credentials (encrypted)",
    },
    compare: null,
};

// Lane B, server-b → client-b.
const LANE_B_BACK: Record<Stage, ActiveEdge> = {
    firstByte: null,
    upgrade: { color: ENCRYPTED_COLOR, label: "INFO — encrypted" },
    auth: null,
    compare: null,
};

function TlsFirstHandshakeAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [stageIndex, setStageIndex] = useState<number>(0);

    // Auto-advance through the stages, looping forever. The step buttons set
    // stageIndex directly and the timer picks up from there.
    useEffect(() => {
        const stage = STAGE_ORDER[stageIndex];
        const timer = setTimeout(() => {
            setStageIndex((i) => (i + 1) % STAGE_ORDER.length);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stageIndex]);

    const stage = STAGE_ORDER[stageIndex];
    const isCompare = stage === "compare";

    // Two horizontal lanes: client on the left, server on the right.
    const nodes: any[] = [
        {
            id: "client-a",
            type: "publisher",
            position: { x: 20, y: 50 },
            data: { label: "client" },
            style: {
                opacity: isCompare ? 0.6 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "server-a",
            type: "server",
            position: { x: 400, y: 50 },
            data: { label: "NATS (default)" },
            style: {
                opacity: isCompare ? 0.6 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "client-b",
            type: "publisher",
            position: { x: 20, y: 250 },
            data: { label: "client (--tlsfirst)" },
            style: {
                opacity: isCompare ? 0.6 : 1,
                transition: "opacity 0.4s ease",
            },
        },
        {
            id: "server-b",
            type: "server",
            position: { x: 400, y: 250 },
            data: { label: "NATS (handshake_first)" },
            style: {
                opacity: isCompare ? 0.6 : 1,
                transition: "opacity 0.4s ease",
            },
        },
    ];

    // Each lane always shows both directions of its link: the direction the
    // stage animates plus a dim static edge on the inactive direction. The
    // server → client direction pins the request-reply handles so the edge
    // runs between the facing sides of the pair instead of looping around.
    const laneEdges: Array<{
        key: string;
        source: string;
        target: string;
        back: boolean;
        active: ActiveEdge;
    }> = [
        {
            key: "a-fwd",
            source: "client-a",
            target: "server-a",
            back: false,
            active: LANE_A_FWD[stage],
        },
        {
            key: "a-back",
            source: "server-a",
            target: "client-a",
            back: true,
            active: LANE_A_BACK[stage],
        },
        {
            key: "b-fwd",
            source: "client-b",
            target: "server-b",
            back: false,
            active: LANE_B_FWD[stage],
        },
        {
            key: "b-back",
            source: "server-b",
            target: "client-b",
            back: true,
            active: LANE_B_BACK[stage],
        },
    ];

    const edges: any[] = laneEdges.map((e) => ({
        // Re-key per stage so the AnimatedEdge remounts and spawns a fresh
        // bubble at every stage change.
        id: `${e.key}-${stage}`,
        source: e.source,
        target: e.target,
        ...(e.back ? { sourceHandle: "reply-out", targetHandle: "reply" } : {}),
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: e.active ? 1 : isCompare ? 0.3 : 0.45 },
        data: {
            color: e.active ? e.active.color : IDLE_COLOR,
            ...(e.active
                ? { label: e.active.label, labelColor: e.active.color }
                : {}),
            animated: e.active !== null,
            interval: 1500,
        },
    }));

    const handleStep = (i: number) => {
        if (i === stageIndex) return;
        setStageIndex(i);
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "4px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? "#27AAE1" : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    const laneTagStyle: React.CSSProperties = {
        position: "absolute",
        left: "12px",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "1px",
        color: "#6b7280",
        fontWeight: 600,
        whiteSpace: "nowrap",
    };

    const badgeStyle = (
        variant: "red" | "green",
    ): React.CSSProperties => ({
        position: "absolute",
        right: "12px",
        padding: "4px 10px",
        background: variant === "red" ? "#fef2f2" : "#ecfdf5",
        border: `1px solid ${variant === "red" ? "#f87171" : "#34d399"}`,
        borderRadius: "999px",
        fontSize: "11px",
        color: variant === "red" ? "#b91c1c" : "#065f46",
        fontWeight: 600,
        whiteSpace: "nowrap",
    });

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
                {STAGE_ORDER.map((s, i) => (
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
                    minZoom={0.4}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background />
                </ReactFlow>

                {/* Lane tags */}
                <div style={{ ...laneTagStyle, top: "10px" }}>DEFAULT</div>
                <div style={{ ...laneTagStyle, top: "52%" }}>
                    HANDSHAKE_FIRST: TRUE
                </div>

                {/* Verdict badges — only during the compare stage */}
                {isCompare && (
                    <>
                        <div style={{ ...badgeStyle("red"), top: "12px" }}>
                            INFO crossed in plaintext
                        </div>
                        <div style={{ ...badgeStyle("green"), bottom: "12px" }}>
                            no plaintext byte ever
                        </div>
                    </>
                )}
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
                    {stageIndex + 1}/{STAGE_ORDER.length}
                </strong>{" "}
                {CAPTION[stage]}
            </div>
        </div>
    );
}

export function TlsFirstHandshakeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <TlsFirstHandshakeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
