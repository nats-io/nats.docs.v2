import React, { useEffect, useState } from "react";
import {
    Background,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode, ServiceNode, BoxNode } from "../nodes";
import { AnimatedEdge } from "../edges";

const nodeTypes = {
    box: BoxNode,
    server: ServerNode,
    service: ServiceNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

// Brand palette.
const IDLE_COLOR = "#94a3b8"; // gray — wire at rest
const MSG_COLOR = "#27AAE1"; // NATS primary blue — active flow
const SUCCESS_COLOR = "#34A574"; // NATS green — healthy / store
const FAIL_COLOR = "#ef4444"; // red — CRIT alert
const NAVY = "#375C93"; // accent navy
const LIME = "#8DC63F"; // lime accent

// One mechanism per stage: scrape -> store -> chart -> alert.
type Stage = "expose" | "transform" | "scrape" | "chart" | "alert";

const STAGE_ORDER: Stage[] = [
    "expose",
    "transform",
    "scrape",
    "chart",
    "alert",
];

const STAGE_DURATION_MS: Record<Stage, number> = {
    expose: 3000,
    transform: 3500,
    scrape: 3500,
    chart: 3500,
    alert: 4500,
};

const CAPTION: Record<Stage, string> = {
    expose:
        "The exporter calls GET /jsz on the cluster server's monitoring port :8222, pulling raw JetStream JSON.",
    transform:
        "It maps num_pending out of the JSON into the metric nats_consumer_num_pending, served as text on :7777/metrics.",
    scrape:
        "Prometheus scrapes :7777 on its interval and appends each value to a rising consumer-lag time series.",
    chart:
        "Grafana queries Prometheus; the lag panel line climbs as the backlog of pending messages grows.",
    alert:
        "The series crosses the alert threshold and the check fires CRIT — the operator is paged before consumers fall over.",
};

// Deterministic rising-lag samples per stage (no Date.now / Math.random).
// The chart fills left-to-right as the story progresses.
const LAG_SAMPLES: Record<Stage, number[]> = {
    expose: [12, 14, 13],
    transform: [12, 14, 13, 18],
    scrape: [12, 14, 13, 18, 27, 41],
    chart: [12, 14, 13, 18, 27, 41, 58, 76],
    alert: [12, 14, 13, 18, 27, 41, 58, 76, 92, 100],
};

const LAG_THRESHOLD = 80; // CRIT fires above this.
const LAG_MAX = 110;

function MetricsScrapeAnimatedInner({
    width = 640,
    height = 400,
}: {
    width?: number;
    height?: number;
}) {
    const [stage, setStage] = useState<Stage>("expose");

    // Drive the stage machine on a per-stage timer, looping forever.
    useEffect(() => {
        const timer = setTimeout(() => {
            const idx = STAGE_ORDER.indexOf(stage);
            const next = STAGE_ORDER[(idx + 1) % STAGE_ORDER.length];
            setStage(next);
        }, STAGE_DURATION_MS[stage]);
        return () => clearTimeout(timer);
    }, [stage]);

    const isAlert = stage === "alert";
    const promActive = stage === "scrape" || stage === "chart" ||
        stage === "alert";
    const grafanaActive = stage === "chart" || stage === "alert";

    // Pipeline laid out left -> right: server -> exporter -> prometheus ->
    // grafana, with the alerting check hanging below prometheus.
    const nodes: any[] = [
        {
            id: "server",
            type: "server",
            position: { x: 0, y: 90 },
            data: { label: "cluster :8222" },
        },
        {
            id: "exporter",
            type: "box",
            position: { x: 286, y: 100 },
            data: { label: "exporter :7777" },
        },
        {
            id: "prometheus",
            type: "box",
            position: { x: 559, y: 100 },
            data: { label: "Prometheus" },
            style: {
                opacity: promActive ? 1 : 0.55,
                filter: promActive ? "none" : "grayscale(0.6)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "grafana",
            type: "box",
            position: { x: 832, y: 100 },
            data: { label: "Grafana" },
            style: {
                opacity: grafanaActive ? 1 : 0.5,
                filter: grafanaActive ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
        {
            id: "check",
            type: "box",
            position: { x: 559, y: 280 },
            data: { label: isAlert ? "check: CRIT" : "alert check" },
            style: {
                opacity: isAlert ? 1 : 0.5,
                filter: isAlert ? "none" : "grayscale(0.7)",
                transition: "opacity 0.4s ease, filter 0.4s ease",
            },
        },
    ];

    const edges: any[] = [];

    // server -> exporter : GET /jsz (active during expose).
    edges.push({
        id: `srv-exp-${stage}`,
        source: "server",
        target: "exporter",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
            color: stage === "expose" ? MSG_COLOR : IDLE_COLOR,
            label: "GET /jsz",
            labelColor: stage === "expose" ? NAVY : "#64748b",
            animated: stage === "expose",
            interval: 1500,
        },
    });

    // exporter self-transform marker: shown as the /metrics label on the
    // exporter -> prometheus edge during transform (JSON -> metric text).
    edges.push({
        id: `exp-prom-${stage}`,
        source: "exporter",
        target: "prometheus",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: promActive || stage === "transform" ? 1 : 0.9 },
        data: {
            color: stage === "transform"
                ? LIME
                : stage === "scrape"
                ? MSG_COLOR
                : IDLE_COLOR,
            label: stage === "transform"
                ? "num_pending metric"
                : stage === "scrape"
                ? "scrape /metrics"
                : "/metrics",
            labelColor: stage === "transform"
                ? "#5a8a1f"
                : stage === "scrape"
                ? NAVY
                : "#64748b",
            animated: stage === "transform" || stage === "scrape",
            interval: 1500,
        },
    });

    // prometheus -> grafana : query (active during chart/alert).
    edges.push({
        id: `prom-graf-${stage}`,
        source: "prometheus",
        target: "grafana",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: grafanaActive ? 1 : 0.6 },
        data: {
            color: grafanaActive ? MSG_COLOR : IDLE_COLOR,
            label: "query",
            labelColor: grafanaActive ? NAVY : "#64748b",
            animated: stage === "chart",
            interval: 1500,
        },
    });

    // prometheus -> check : threshold evaluation (fires during alert).
    edges.push({
        id: `prom-chk-${stage}`,
        source: "prometheus",
        target: "check",
        type: "animated",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: isAlert ? 1 : 0.55 },
        data: {
            color: isAlert ? FAIL_COLOR : IDLE_COLOR,
            label: isAlert ? "threshold crossed" : "eval rule",
            labelColor: isAlert ? FAIL_COLOR : "#64748b",
            animated: isAlert,
            interval: 1200,
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

    // --- Mini lag time-series chart, overlaid bottom-right of the diagram. ---
    const samples = LAG_SAMPLES[stage];
    const chartW = 200;
    const chartH = 84;
    const padX = 8;
    const padY = 8;
    const innerW = chartW - padX * 2;
    const innerH = chartH - padY * 2;
    const thresholdY = padY + innerH - (LAG_THRESHOLD / LAG_MAX) * innerH;
    const points = samples
        .map((v, i) => {
            const x = padX +
                (samples.length === 1
                    ? 0
                    : (i / (samples.length - 1)) * innerW);
            const y = padY + innerH - (v / LAG_MAX) * innerH;
            return `${x},${y}`;
        })
        .join(" ");
    const lastVal = samples[samples.length - 1];
    const lineColor = isAlert ? FAIL_COLOR : SUCCESS_COLOR;

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

                {/* Lag time-series overlay (the "panel" Grafana shows). */}
                <div
                    style={{
                        position: "absolute",
                        right: 12,
                        bottom: 12,
                        width: chartW,
                        background: "#ffffff",
                        border: `1px solid ${isAlert ? FAIL_COLOR : "#e5e7eb"}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: NAVY,
                            marginBottom: 2,
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <span>consumer lag</span>
                        <span style={{ color: lineColor }}>
                            {lastVal}{isAlert ? " CRIT" : ""}
                        </span>
                    </div>
                    <svg
                        width={chartW}
                        height={chartH}
                        style={{ display: "block" }}
                    >
                        {/* threshold line */}
                        <line
                            x1={padX}
                            y1={thresholdY}
                            x2={chartW - padX}
                            y2={thresholdY}
                            stroke={FAIL_COLOR}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            opacity={0.7}
                        />
                        {/* rising series */}
                        <polyline
                            points={points}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={2}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        {/* latest sample dot */}
                        {samples.length > 0 && (
                            <circle
                                cx={padX +
                                    (samples.length === 1
                                        ? 0
                                        : ((samples.length - 1) /
                                            (samples.length - 1)) * innerW)}
                                cy={padY + innerH -
                                    (lastVal / LAG_MAX) * innerH}
                                r={3}
                                fill={lineColor}
                            />
                        )}
                    </svg>
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

export function MetricsScrapeAnimated(
    props: { width?: number; height?: number },
) {
    return (
        <ReactFlowProvider>
            <MetricsScrapeAnimatedInner {...props} />
        </ReactFlowProvider>
    );
}
