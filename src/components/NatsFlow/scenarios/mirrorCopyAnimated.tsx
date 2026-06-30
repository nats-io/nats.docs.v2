import React, { useEffect, useState } from "react";

// mirrorCopyAnimated
// A mirror copies every message from ORDERS into ORDERS-ARCHIVE, keeping the
// same sequence numbers — an exact, read-only copy. Its Lag counts down to 0
// as it catches up.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const AMBER = "#d97706";

const PHASES = [
    { key: "m1", dur: 950 },
    { key: "m2", dur: 950 },
    { key: "m3", dur: 950 },
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
const RAIL_Y = 52;

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
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 5,
            }}
        >
            {label}
        </span>
    );
}

function MirrorCopyInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);

    let arrived = 3;
    let fly: number | null = null;
    if (key === "m1") { arrived = 0; fly = 1; }
    else if (key === "m2") { arrived = 1; fly = 2; }
    else if (key === "m3") { arrived = 2; fly = 3; }
    const lag = key === "done" ? 0 : 3 - arrived;

    const status =
        key === "done"
            ? "ORDERS-ARCHIVE is an exact, read-only copy. Lag 0 means fully caught up."
            : "Every message in ORDERS is copied to ORDERS-ARCHIVE — same sequence number, in order.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                A <strong>mirror</strong> copies one stream into another, exactly.
            </div>

            <div style={{ position: "relative", width: 640, height: 96, margin: "0 auto" }}>
                <div style={{ position: "absolute", left: OUT_X, top: RAIL_Y, width: IN_X - OUT_X, height: 2, background: "#e5e7eb" }} />

                {/* ORDERS */}
                <div style={{ position: "absolute", left: 12, top: 18, width: 156, height: 64, border: `1px solid ${BLUE}66`, borderRadius: 8, background: "#fff", padding: "6px 8px", boxSizing: "border-box" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: BLUE, marginBottom: 6 }}>ORDERS</div>
                    <div>{[1, 2, 3].map((n) => <Mini key={n} color={BLUE} label={`#${n}`} />)}</div>
                </div>

                {/* ORDERS-ARCHIVE */}
                <div style={{ position: "absolute", left: 470, top: 18, width: 166, height: 64, border: `1px solid ${BLUE}66`, borderRadius: 8, background: "#fff", padding: "6px 8px", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: BLUE }}>ORDERS-ARCHIVE</span>
                        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: lag === 0 ? GREEN : AMBER, border: `1px solid ${lag === 0 ? GREEN : AMBER}`, borderRadius: 4, padding: "1px 5px", background: `${lag === 0 ? GREEN : AMBER}12` }}>
                            Lag {lag}
                        </span>
                    </div>
                    <div>
                        {[1, 2, 3].slice(0, arrived).map((n) => <Mini key={n} color={BLUE} label={`#${n}`} />)}
                        {arrived === 0 && <span style={{ fontSize: 11, color: "#9ca3af" }}>catching up…</span>}
                    </div>
                </div>

                {/* in-flight copy */}
                {fly !== null && (
                    <div style={{ position: "absolute", left: OUT_X + (IN_X - OUT_X) * p - 13, top: RAIL_Y - 13, width: 26, height: 26, borderRadius: "50%", background: BLUE, color: "white", fontSize: 10, fontWeight: 700, fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.25)" }}>
                        #{fly}
                    </div>
                )}
            </div>

            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                    onClick={() => setElapsed(0)}
                    style={{ flex: "none", padding: "5px 12px", borderRadius: 6, border: `1px solid ${BLUE}`, background: "white", color: BLUE, fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}
                >
                    ↺ Restart
                </button>
                <span style={{ fontSize: 13, color: "#374151" }}>{status}</span>
            </div>
        </div>
    );
}

export function MirrorCopyAnimated(_props: { width?: number; height?: number } = {}) {
    return <MirrorCopyInner />;
}
