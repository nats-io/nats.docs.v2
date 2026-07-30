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

// Consumed by scripts/rehype-nats-flow.mjs, which picks up the FIRST
// description-keyed string in this file for the markdown fallback text.
export const mqttBridgeAnimatedMeta = {
    description:
        "One nats-server serving MQTT devices and NATS clients at once. The cold-1 sensor publishes the MQTT topic sensors/warehouse/cold-1/temp; the server converts it to the NATS subject sensors.warehouse.cold-1.temp, where an ordinary nats sub receives it with nothing MQTT-aware on that side. The bridge runs both ways: a NATS client publishes fleet.truck-17.telemetry and the server delivers it to the MQTT truck as fleet/truck-17/telemetry, always at QoS 0 because a NATS publish carries no QoS. The conversion happens at the server, so each side sees only its own protocol.",
};

const nodeTypes = {
    publisher: PublisherNode,
    subscriber: SubscriberNode,
    server: ServerNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Two wires, two colors: lime is the MQTT side, blue is the NATS side. The
// color changes at the server, which is where the conversion happens.
const MQTT_COLOR = "#8DC63F"; // lime — MQTT topic on the wire
const NATS_COLOR = "#27AAE1"; // NATS primary blue — NATS subject on the wire
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const ACCENT_NAVY = "#375C93"; // navy accent for edge labels

// The bridge in three beats: a device publishes, the server converts and hands
// the message to a plain NATS subscriber, and the same path runs in reverse for
// traffic originating on the NATS side.
type Stage = "publish" | "convert" | "reverse";

const STAGE_ORDER: Stage[] = ["publish", "convert", "reverse"];

// Paced for reading, not for watching. Each caption runs 150-200 characters,
// which needs roughly 8 seconds at normal reading speed, so the stage has to
// outlast the sentence rather than the animation.
const STAGE_DURATION_MS: Record<Stage, number> = {
    publish: 8000,
    convert: 9000,
    reverse: 9500,
};

const CAPTION: Record<Stage, string> = {
    publish:
        "The cold-1 sensor publishes to the MQTT topic sensors/warehouse/cold-1/temp on port 1883. It is speaking plain MQTT to what it believes is an ordinary broker.",
    convert:
        "The server converts the topic to the NATS subject sensors.warehouse.cold-1.temp — each / becomes a . — and delivers it to a plain nats sub on sensors.>. Nothing on the NATS side is MQTT-aware.",
    reverse:
        "The bridge runs both ways. A NATS client publishes fleet.truck-17.telemetry and the truck receives it as fleet/truck-17/telemetry — always QoS 0, because a NATS publish carries no QoS to promote it with.",
};

function MqttBridgeAnimatedInner({
    width = 640,
    height = 460,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("publish");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    // MQTT devices sit on the left, NATS clients on the right, and the single
    // server that speaks both protocols sits between them.
    const nodes: any[] = [
        {
            id: "sensor",
            type: "publisher",
            position: { x: 10, y: 40 },
            data: { label: "cold-1 sensor" },
        },
        {
            id: "truck",
            type: "subscriber",
            position: { x: 10, y: 320 },
            data: { label: "truck-17" },
        },
        {
            id: "server",
            type: "server",
            position: { x: 250, y: 175 },
            data: { label: "nats-server", subtitle: "MQTT 1883 · NATS 4222" },
        },
        {
            id: "nats-sub",
            type: "subscriber",
            position: { x: 500, y: 40 },
            data: { label: "nats sub sensors.>" },
        },
        {
            id: "dispatch",
            type: "publisher",
            position: { x: 500, y: 320 },
            data: { label: "dispatch (NATS)" },
        },
    ];

    const edges: any[] = [];

    // --- sensor -> server : the MQTT publish, still an MQTT topic ---
    const publishActive = stage === "publish";
    edges.push({
        id: `sensor-server-${stage}`,
        source: "sensor",
        target: "server",
        targetHandle: "request-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: publishActive ? 1 : 0.25 },
        data: {
            color: publishActive ? MQTT_COLOR : IDLE_COLOR,
            label: publishActive ? "sensors/warehouse/cold-1/temp" : undefined,
            labelOffset: -16,
            labelColor: ACCENT_NAVY,
            animated: publishActive,
            interval: 1500,
        },
    });

    // --- server -> nats-sub : the same message, now a NATS subject ---
    const convertActive = stage === "convert";
    edges.push({
        id: `server-natssub-${stage}`,
        source: "server",
        target: "nats-sub",
        sourceHandle: "request-out",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: convertActive ? 1 : 0.25 },
        data: {
            color: convertActive ? NATS_COLOR : IDLE_COLOR,
            label: convertActive ? "sensors.warehouse.cold-1.temp" : undefined,
            labelOffset: -16,
            labelColor: ACCENT_NAVY,
            animated: convertActive,
            interval: 1500,
        },
    });

    // --- dispatch -> server : a plain NATS publish heading for a device ---
    const reverseActive = stage === "reverse";
    edges.push({
        id: `dispatch-server-${stage}`,
        source: "dispatch",
        target: "server",
        sourceHandle: "out-left",
        targetHandle: "reply-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: reverseActive ? 1 : 0.25 },
        data: {
            bow: -40,
            color: reverseActive ? NATS_COLOR : IDLE_COLOR,
            label: reverseActive ? "fleet.truck-17.telemetry" : undefined,
            labelOffset: 18,
            labelColor: ACCENT_NAVY,
            animated: reverseActive,
            interval: 1500,
        },
    });

    // --- server -> truck : delivered as an MQTT topic, always QoS 0 ---
    edges.push({
        id: `server-truck-${stage}`,
        source: "server",
        target: "truck",
        sourceHandle: "reply-out",
        targetHandle: "top-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: reverseActive ? 1 : 0.25 },
        data: {
            bow: -40,
            color: reverseActive ? MQTT_COLOR : IDLE_COLOR,
            label: reverseActive ? "fleet/truck-17/telemetry · QoS 0" : undefined,
            labelOffset: 18,
            labelColor: ACCENT_NAVY,
            animated: reverseActive,
            interval: 1500,
        },
    });

    const stageNum = STAGE_ORDER.indexOf(stage) + 1;

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        padding: "5px 10px",
        fontSize: "12px",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        backgroundColor: active ? NATS_COLOR : "#ffffff",
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

export function MqttBridgeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MqttBridgeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
