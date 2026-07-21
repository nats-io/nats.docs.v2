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
    server: ServerNode,
    service: ServiceNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const MSG_COLOR = "#27AAE1"; // NATS primary blue — request in flight
const IDLE_COLOR = "#94a3b8"; // gray — quiet link
const SUCCESS_COLOR = "#34A574"; // NATS green — successful reply
const FAILURE_COLOR = "#ef4444"; // red — the request that errors
const STATS_COLOR = "#375C93"; // navy — the $SRV stats read-back

// One mechanism per stage. The service is the Acme `OrderInventory` micro
// service; the framework keeps a live stats counter (num_requests,
// num_errors) that ticks up as requests are handled, then is read back over
// the $SRV.STATS subject.
type Stage = "req1" | "req2" | "error" | "req3" | "stats";

const STAGE_ORDER: Stage[] = ["req1", "req2", "error", "req3", "stats"];

// How long each stage holds before advancing. The cycle loops forever.
const STAGE_DURATION_MS: Record<Stage, number> = {
    req1: 2800,
    req2: 2800,
    error: 3200,
    req3: 2800,
    stats: 4500,
};

const CAPTION: Record<Stage, string> = {
    req1:
        "A client sends a request on `acme.inventory.lookup`. The service handles it and the framework increments num_requests to 1.",
    req2:
        "Another request is handled successfully. num_requests climbs to 2 — every call is counted automatically, no instrumentation code needed.",
    error:
        "A request fails inside the handler. The service responds with an error, so num_requests becomes 3 and num_errors ticks up to 1.",
    req3:
        "A fourth request succeeds. The counters keep accumulating live: 4 requests handled, 1 of them an error.",
    stats:
        "A monitoring client requests `$SRV.STATS.OrderInventory`. The service replies with the accumulated stats — 4 requests, 1 error — read straight off the running endpoint.",
};

// Cumulative counters at the END of each stage.
const NUM_REQUESTS: Record<Stage, number> = {
    req1: 1,
    req2: 2,
    error: 3,
    req3: 4,
    stats: 4,
};
const NUM_ERRORS: Record<Stage, number> = {
    req1: 0,
    req2: 0,
    error: 1,
    req3: 1,
    stats: 1,
};

function ServiceStatsAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("req1");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const isRequestStage = stage === "req1" || stage === "req2" ||
        stage === "error" || stage === "req3";
    const isError = stage === "error";
    const isStats = stage === "stats";

    const numRequests = NUM_REQUESTS[stage];
    const numErrors = NUM_ERRORS[stage];

    const nodes: any[] = [
        // --- Client (publisher of requests) ---
        {
            id: "client",
            type: "publisher",
            position: { x: -52, y: 150 },
            data: { label: isStats ? "monitor" : "client" },
        },
        // --- Server ---
        {
            id: "server",
            type: "server",
            position: { x: 299, y: 150 },
            data: { label: "server" },
        },
        // --- Service endpoint with live stats counter in its label ---
        {
            id: "svc",
            type: "service",
            position: { x: 676, y: 150 },
            data: {
                label: "OrderInventory",
            },
            style: {
                transition: "filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // --- client -> server (request leg) ---
    edges.push({
        id: `client-server-${stage}`,
        source: "client",
        target: "server",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isStats
                ? STATS_COLOR
                : isRequestStage
                ? MSG_COLOR
                : IDLE_COLOR,
            label: isStats ? "$SRV.STATS.OrderInventory" : "acme.inventory.lookup",
            labelColor: isStats ? STATS_COLOR : "#64748b",
            animated: true,
            interval: 1500,
        },
    });

    // --- server -> service (delivered request) ---
    edges.push({
        id: `server-svc-${stage}`,
        source: "server",
        target: "svc",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: isStats
                ? STATS_COLOR
                : isError
                ? FAILURE_COLOR
                : isRequestStage
                ? MSG_COLOR
                : IDLE_COLOR,
            label: isError ? "handler error" : undefined,
            labelColor: FAILURE_COLOR,
            animated: true,
            interval: 1500,
        },
    });

    // --- service -> server (reply leg) ---
    // On request stages this is the handler's response (green, or red on the
    // error stage). On the stats stage it carries the accumulated counters.
    edges.push({
        id: `svc-server-reply-${stage}`,
        source: "svc",
        target: "server",
        targetHandle: "reply-in",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: 0.95 },
        data: {
            color: isStats
                ? STATS_COLOR
                : isError
                ? FAILURE_COLOR
                : SUCCESS_COLOR,
            label: isStats ? "stats reply" : isError ? "error reply" : "reply",
                labelOffset: 20,
            labelColor: isStats
                ? STATS_COLOR
                : isError
                ? FAILURE_COLOR
                : SUCCESS_COLOR,
            animated: true,
            interval: 1500,
        },
    });

    // --- server -> client (reply delivered back) ---
    edges.push({
        id: `server-client-reply-${stage}`,
        source: "server",
        target: "client",
        // The client sits to the left, so leave from the server's left-hand
        // reply handle and take a lane under the outbound request.
        sourceHandle: "reply-out",
        targetHandle: "reply",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: 0.95 },
        data: {
            bow: 55,
            color: isStats
                ? STATS_COLOR
                : isError
                ? FAILURE_COLOR
                : SUCCESS_COLOR,
            animated: true,
            interval: 1500,
        },
    });

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
                    fitViewOptions={{ padding: 0.25 }}
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

                {/* Live stats panel — accumulates as requests are handled */}
                <div
                    style={{
                        position: "absolute",
                        right: "12px",
                        bottom: "12px",
                        background: "#ffffff",
                        border: `1px solid ${
                            isStats ? STATS_COLOR : "#e5e7eb"
                        }`,
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        minWidth: "150px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            color: isStats ? STATS_COLOR : "#9ca3af",
                            fontWeight: 700,
                            marginBottom: "4px",
                        }}
                    >
                        OrderInventory stats
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#374151",
                        }}
                    >
                        <span>num_requests</span>
                        <strong style={{ color: MSG_COLOR }}>
                            {numRequests}
                        </strong>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            color: "#374151",
                        }}
                    >
                        <span>num_errors</span>
                        <strong
                            style={{
                                color: numErrors > 0
                                    ? FAILURE_COLOR
                                    : "#9ca3af",
                            }}
                        >
                            {numErrors}
                        </strong>
                    </div>
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
                <strong style={{ color: "#374151" }}>
                    {stageNum}/{STAGE_ORDER.length}
                </strong>{" "}
                {CAPTION[stage]}
            </div>
        </div>
    );
}

export function ServiceStatsAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <ServiceStatsAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
