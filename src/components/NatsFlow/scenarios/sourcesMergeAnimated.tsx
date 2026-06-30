import React, { useEffect, useState } from "react";

// sourcesMergeAnimated
// A sourced stream pulls from three upstreams (ORDERS-US, -EU, -APAC) and merges
// them into ALL-ORDERS, interleaved in arrival order. Each arrived message keeps
// its origin colour, so the interleaving is visible.

const TICK_MS = 80;
const GREEN = "#34A574";
const AMBER = "#d97706";
const NAVY = "#375C93";

const PHASES = [
    { key: "us", dur: 950 },
    { key: "eu", dur: 950 },
    { key: "apac", dur: 950 },
    { key: "us2", dur: 950 },
    { key: "done", dur: 2100 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "done", p: 1 };
}

const OUT_X = 168;
const IN_X = 470;
const MERGE_Y = 96;

const SOURCES: Record<string, { color: string; y: number }> = {
    US: { color: GREEN, y: 40 },
    EU: { color: AMBER, y: 96 },
    APAC: { color: NAVY, y: 152 },
};
const ARRIVALS = ["US", "EU", "APAC", "US"]; // interleaved order into ALL-ORDERS

function Mini({ color, label }: { color: string; label: string }) {
    return (
        <span
            style={{
                display: "inline-flex",
                width: 24,
                height: 24,
                borderRadius: 5,
                background: `${color}1c`,
                border: `1.5px solid ${color}`,
                color,
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "monospace",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 5,
                marginBottom: 4,
            }}
        >
            {label}
        </span>
    );
}

function SourcesMergeInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);

    let arrived = 0;
    let fly: string | null = null;
    if (key === "us") { arrived = 0; fly = "US"; }
    else if (key === "eu") { arrived = 1; fly = "EU"; }
    else if (key === "apac") { arrived = 2; fly = "APAC"; }
    else if (key === "us2") { arrived = 3; fly = "US"; }
    else if (key === "done") arrived = 4;

    const merged = ARRIVALS.slice(0, arrived);

    const status =
        key === "done"
            ? "ALL-ORDERS merges all three. Each upstream keeps its own order; across them they interleave by arrival."
            : "A sourced stream pulls from many upstreams at once — here US, EU, and APAC — into one.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Sources</strong> merge many streams into one.
            </div>

            <div style={{ position: "relative", width: 640, height: 192, margin: "0 auto" }}>
                {/* converging rails */}
                {Object.values(SOURCES).map((s, i) => (
                    <div key={i} style={{ position: "absolute", left: OUT_X, top: s.y, width: IN_X - OUT_X, height: 2, background: "#eef0f2", transform: `rotate(${((MERGE_Y - s.y) / (IN_X - OUT_X)) * 57}deg)`, transformOrigin: "left center" }} />
                ))}

                {/* source streams */}
                {Object.entries(SOURCES).map(([name, s]) => (
                    <div key={name} style={{ position: "absolute", left: 12, top: s.y - 19, width: 156, height: 38, border: `1px solid ${s.color}66`, borderRadius: 8, background: "#fff", padding: "5px 8px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: s.color }}>ORDERS-{name}</span>
                        <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: 4, background: `${s.color}1c`, border: `1.5px solid ${s.color}` }} />
                    </div>
                ))}

                {/* ALL-ORDERS */}
                <div style={{ position: "absolute", left: 470, top: 50, width: 166, height: 92, border: `1px solid ${NAVY}66`, borderRadius: 8, background: "#fff", padding: "6px 8px", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>ALL-ORDERS</span>
                        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 4, padding: "1px 5px", background: `${NAVY}12` }}>{merged.length} msgs</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {merged.map((name, i) => <Mini key={i} color={SOURCES[name].color} label={name} />)}
                        {merged.length === 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>empty</span>}
                    </div>
                </div>

                {/* in-flight message */}
                {fly !== null && (
                    <div style={{ position: "absolute", left: OUT_X + (IN_X - OUT_X) * p - 13, top: SOURCES[fly].y + (MERGE_Y - SOURCES[fly].y) * p - 13, width: 26, height: 26, borderRadius: "50%", background: SOURCES[fly].color, color: "white", fontSize: 9, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.25)" }}>
                        {fly}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                    onClick={() => setElapsed(0)}
                    style={{ flex: "none", padding: "5px 12px", borderRadius: 6, border: `1px solid ${NAVY}`, background: "white", color: NAVY, fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}
                >
                    ↺ Restart
                </button>
                <span style={{ fontSize: 13, color: "#374151" }}>{status}</span>
            </div>
        </div>
    );
}

export function SourcesMergeAnimated(_props: { width?: number; height?: number } = {}) {
    return <SourcesMergeInner />;
}
