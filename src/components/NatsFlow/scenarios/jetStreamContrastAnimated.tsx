import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PublisherNode, ServerNode, SubscriberNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

const OFFLINE_DURATION_MS = 6000;
const ONLINE_DURATION_MS = 6000;
const STREAM_CAPACITY = 3;
// Times (after a phase starts) when the three bubbles visually land on the
// destination node. AnimatedEdge spawns at T=0/2000/4000ms with a 1500ms
// traversal — but the bubble visually "merges" with the destination node
// before its progress reaches 1.0, and React's render-commit adds a frame of
// lag, so we fire the count change at ~80% of the traversal to feel synced.
const BUBBLE_ARRIVAL_TIMES_MS = [1200, 3200, 5200];
const CORE_COLOR = "#3b82f6";
const JETSTREAM_COLOR = "#10b981";

type Mode = "core" | "jetstream";

function JetStreamContrastAnimatedInner({
    width = 600,
    height = 380,
}: {
    width?: number;
    height?: number;
}) {
    const [mode, setMode] = useState<Mode>("core");
    const [subscriberOnline, setSubscriberOnline] = useState<boolean>(false);
    const [storedCount, setStoredCount] = useState<number>(0);

    // Auto-cycle the subscriber online/offline within the current mode.
    // Each phase has its own duration: offline is sized to fill the stream,
    // online is sized to let all three replay bubbles reach the subscriber.
    // Resetting on mode change guarantees a full offline phase first.
    useEffect(() => {
        const duration = subscriberOnline
            ? ONLINE_DURATION_MS
            : OFFLINE_DURATION_MS;
        const timer = setTimeout(() => {
            setSubscriberOnline((prev) => !prev);
        }, duration);
        return () => clearTimeout(timer);
    }, [mode, subscriberOnline]);

    // Stream counter: only meaningful in JetStream mode.
    useEffect(() => {
        if (mode !== "jetstream") {
            setStoredCount(0);
            return;
        }
        if (!subscriberOnline) {
            // Tick up as each publisher → server bubble lands on the server.
            const timeouts = BUBBLE_ARRIVAL_TIMES_MS.map((t) =>
                setTimeout(() => {
                    setStoredCount((c) => Math.min(c + 1, STREAM_CAPACITY));
                }, t)
            );
            return () => timeouts.forEach(clearTimeout);
        }
        // Replay: tick down as each server → subscriber bubble lands on the
        // subscriber. Matches the offline cadence so 3 in always equals 3 out.
        const timeouts = BUBBLE_ARRIVAL_TIMES_MS.map((t) =>
            setTimeout(() => {
                setStoredCount((c) => Math.max(c - 1, 0));
            }, t)
        );
        return () => timeouts.forEach(clearTimeout);
    }, [mode, subscriberOnline]);

    const isJetStream = mode === "jetstream";
    const modeColor = isJetStream ? JETSTREAM_COLOR : CORE_COLOR;

    const nodes = [
        {
            id: "publisher",
            type: "publisher",
            position: { x: 0, y: 150 },
            data: { label: "Publisher" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 220, y: 150 },
            data: { label: "NATS" },
        },
        {
            id: "subscriber",
            type: "subscriber",
            position: { x: 440, y: 150 },
            data: { label: "Client" },
            style: {
                opacity: subscriberOnline ? 1 : 0.3,
            },
        },
    ];

    // In JetStream replay (subscriber just came back online), pause the
    // publisher flow so the eye lands on the stream draining out.
    const publisherActive = !(isJetStream && subscriberOnline);

    const edges: any[] = [
        {
            id: `e-pub-server-${mode}-${publisherActive}`,
            source: "publisher",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: modeColor,
                animated: publisherActive,
            },
        },
    ];

    if (subscriberOnline) {
        edges.push({
            id: `e-server-sub-${mode}-${subscriberOnline}`,
            source: "server",
            target: "subscriber",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: modeColor,
                animated: true,
            },
        });
    }

    const description = (() => {
        if (mode === "core") {
            return subscriberOnline
                ? "Client is online. New messages flow through, but anything published while it was offline is gone."
                : "Client is offline. Messages reach the server but go nowhere.";
        }
        return subscriberOnline
            ? "Client is online. The stream replays everything it missed."
            : "Client is offline. Messages accumulate in the stream.";
    })();

    const streamDots = storedCount > 0
        ? "●  ".repeat(storedCount).trim()
        : "empty";

    const handleModeChange = (newMode: Mode) => {
        if (newMode === mode) return;
        setMode(newMode);
        setStoredCount(0);
        setSubscriberOnline(false); // Restart at "offline" so the contrast lands immediately.
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "6px 14px",
        fontSize: "13px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active
            ? (isJetStream ? JETSTREAM_COLOR : CORE_COLOR)
            : "#ffffff",
        color: active ? "#ffffff" : "#374151",
        cursor: "pointer",
        fontWeight: 500,
    });

    return (
        <div style={{ position: "relative" }}>
            {/* Mode toggle */}
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
                    Mode:
                </span>
                <button
                    onClick={() => handleModeChange("core")}
                    style={buttonStyle(mode === "core")}
                >
                    Core NATS
                </button>
                <button
                    onClick={() => handleModeChange("jetstream")}
                    style={buttonStyle(mode === "jetstream")}
                >
                    JetStream
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

                {isJetStream && (
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "75%",
                            transform: "translateX(-50%)",
                            padding: "4px 12px",
                            background: "#ecfdf5",
                            border: `1px solid ${JETSTREAM_COLOR}`,
                            borderRadius: "999px",
                            fontSize: "12px",
                            color: "#065f46",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            letterSpacing: "2px",
                        }}
                    >
                        Pending: {streamDots}
                    </div>
                )}
            </div>

            {/* Status */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                }}
            >
                {description}
            </div>
        </div>
    );
}

export function JetStreamContrastAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <JetStreamContrastAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
