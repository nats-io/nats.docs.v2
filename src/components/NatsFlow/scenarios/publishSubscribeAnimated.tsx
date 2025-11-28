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

/**
 * Publish-Subscribe animated scenario showing progressive subscriber addition.
 * Cycles through: no subscribers → 1 subscriber → 3 subscribers
 * Demonstrates how messages fan out to all active subscribers.
 */
function PublishSubscribeAnimatedInner({
    width = 600,
    height = 350,
}: {
    width?: number;
    height?: number;
}) {
    const [autoMode, setAutoMode] = useState<boolean>(true);
    const [phase, setPhase] = useState<number>(0); // 0 = no subs, 1 = 1 sub, 2 = 3 subs

    // Manual mode state
    const [subscriber1Active, setSubscriber1Active] = useState(false);
    const [subscriber2Active, setSubscriber2Active] = useState(false);
    const [subscriber3Active, setSubscriber3Active] = useState(false);

    // Cycle through phases: 0 → 1 → 2 → 0 (only when in auto mode)
    useEffect(() => {
        if (!autoMode) return;

        const interval = setInterval(() => {
            setPhase((prev) => (prev + 1) % 3);
        }, 4000); // 4 seconds per phase

        return () => clearInterval(interval);
    }, [autoMode]);

    // Update manual states when in auto mode
    useEffect(() => {
        if (!autoMode) return;

        if (phase === 0) {
            setSubscriber1Active(false);
            setSubscriber2Active(false);
            setSubscriber3Active(false);
        } else if (phase === 1) {
            setSubscriber1Active(true);
            setSubscriber2Active(false);
            setSubscriber3Active(false);
        } else if (phase === 2) {
            setSubscriber1Active(true);
            setSubscriber2Active(true);
            setSubscriber3Active(true);
        }
    }, [phase, autoMode]);

    const activeSubscribers =
        [subscriber1Active, subscriber2Active, subscriber3Active].filter(
            Boolean,
        ).length;

    // All nodes are always visible
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
            position: { x: 200, y: 150 },
            data: { label: "NATS" },
        },
        {
            id: "subscriber-1",
            type: "subscriber",
            position: { x: 400, y: 150 },
            data: { label: "Subscriber 1" },
            style: {
                opacity: subscriber1Active ? 1 : 0.3,
            },
        },
        {
            id: "subscriber-2",
            type: "subscriber",
            position: { x: 400, y: 50 },
            data: { label: "Subscriber 2" },
            style: {
                opacity: subscriber2Active ? 1 : 0.3,
            },
        },
        {
            id: "subscriber-3",
            type: "subscriber",
            position: { x: 400, y: 250 },
            data: { label: "Subscriber 3" },
            style: {
                opacity: subscriber3Active ? 1 : 0.3,
            },
        },
    ];

    // Base edge: publisher → server (always animated)
    const edges: any[] = [
        {
            id: "e-publisher-server",
            source: "publisher",
            target: "server",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#3b82f6",
                animated: true,
                label: "updates",
            },
        },
    ];

    // Add edges to active subscribers
    if (subscriber1Active) {
        edges.push({
            id: "e-server-sub1",
            source: "server",
            target: "subscriber-1",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#3b82f6",
                animated: true,
                delay: 1500, // Sequential animation
                label: "updates",
            },
        });
    }

    if (subscriber2Active) {
        edges.push({
            id: "e-server-sub2",
            source: "server",
            target: "subscriber-2",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#3b82f6",
                animated: true,
                delay: 1500,
                label: "updates",
            },
        });
    }

    if (subscriber3Active) {
        edges.push({
            id: "e-server-sub3",
            source: "server",
            target: "subscriber-3",
            type: "animated",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            data: {
                color: "#3b82f6",
                animated: true,
                delay: 1500,
                label: "updates",
            },
        });
    }

    const getDescription = () => {
        if (activeSubscribers === 0) {
            return "No subscribers - message reaches server but goes nowhere";
        }
        if (activeSubscribers === 1) {
            return "One subscriber - message flows to the single listener";
        }
        return `${activeSubscribers} subscribers - message fans out to all of them simultaneously`;
    };

    const handleManualToggle = (subscriberNum: number) => {
        setAutoMode(false); // Switch to manual mode
        if (subscriberNum === 1) setSubscriber1Active(!subscriber1Active);
        if (subscriberNum === 2) setSubscriber2Active(!subscriber2Active);
        if (subscriberNum === 3) setSubscriber3Active(!subscriber3Active);
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Info text */}
            <div
                style={{
                    marginBottom: "12px",
                    fontSize: "13px",
                    color: "#6b7280",
                    fontStyle: "italic",
                }}
            >
                {autoMode
                    ? "Watch how messages flow as subscribers join. With no subscribers, messages reach the server but aren't delivered."
                    : "Manual mode: Use buttons below to control subscribers."}
            </div>

            {/* Flow diagram */}
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
            </div>

            {/* Status indicator */}
            <div
                style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    color: "#6b7280",
                }}
            >
                <strong>Active subscribers: {activeSubscribers}</strong> -{" "}
                {getDescription()}
            </div>

            {/* Control buttons */}
            <div
                style={{
                    marginTop: "12px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <button
                    onClick={() => handleManualToggle(1)}
                    style={{
                        padding: "6px 12px",
                        fontSize: "13px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: subscriber1Active
                            ? "#3b82f6"
                            : "#ffffff",
                        color: subscriber1Active ? "#ffffff" : "#374151",
                        cursor: "pointer",
                        fontWeight: 500,
                    }}
                >
                    {subscriber1Active ? "Unsubscribe 1" : "Subscribe 1"}
                </button>
                <button
                    onClick={() => handleManualToggle(2)}
                    style={{
                        padding: "6px 12px",
                        fontSize: "13px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: subscriber2Active
                            ? "#3b82f6"
                            : "#ffffff",
                        color: subscriber2Active ? "#ffffff" : "#374151",
                        cursor: "pointer",
                        fontWeight: 500,
                    }}
                >
                    {subscriber2Active ? "Unsubscribe 2" : "Subscribe 2"}
                </button>
                <button
                    onClick={() => handleManualToggle(3)}
                    style={{
                        padding: "6px 12px",
                        fontSize: "13px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        backgroundColor: subscriber3Active
                            ? "#3b82f6"
                            : "#ffffff",
                        color: subscriber3Active ? "#ffffff" : "#374151",
                        cursor: "pointer",
                        fontWeight: 500,
                    }}
                >
                    {subscriber3Active ? "Unsubscribe 3" : "Subscribe 3"}
                </button>

                {!autoMode && (
                    <button
                        onClick={() => {
                            setAutoMode(true);
                            setPhase(0);
                        }}
                        style={{
                            padding: "6px 12px",
                            fontSize: "13px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            cursor: "pointer",
                            fontWeight: 500,
                            marginLeft: "8px",
                        }}
                    >
                        Resume Auto
                    </button>
                )}
            </div>
        </div>
    );
}

// Wrapper component that provides ReactFlow context
export function PublishSubscribeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <PublishSubscribeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
