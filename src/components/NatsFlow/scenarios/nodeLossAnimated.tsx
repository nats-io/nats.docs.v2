import React, { useEffect, useState } from "react";

// nodeLossAnimated
// R=1 vs R=3 under a single server failure. Two panels side by side hold the
// same ORDERS stream: the left at R=1 (one copy on one server), the right at
// R=3 (three copies across three servers). One server fails in each. R=1 loses
// its only copy — the stream is gone. R=3 still has two of three, a majority,
// so ORDERS keeps serving with no data lost. The cycle loops.

const TICK_MS = 80;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";
const NAVY = "#375C93";

const PHASES = [
    { key: "healthy", dur: 2200 },
    { key: "fail", dur: 1700 },
    { key: "outcome", dur: 2900 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "outcome", p: 1 };
}

function Server({
    name,
    dies,
    phase,
}: {
    name: string;
    dies: boolean;
    phase: string;
}) {
    const dying = dies && phase === "fail";
    const dead = dies && phase === "outcome";
    const hasCopy = !dead;
    const border = dead ? RED : dying ? RED : NAVY;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
                style={{
                    width: 92,
                    height: 60,
                    borderRadius: 8,
                    border: `2px ${dead ? "dashed" : "solid"} ${border}`,
                    background: dead ? "#fef2f2" : "white",
                    opacity: dead ? 0.6 : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    transition: "border-color 0.2s, background 0.2s",
                }}
            >
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: dead ? RED : "#374151" }}>{name}</span>
                {hasCopy ? (
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: GREEN, marginTop: 3 }}>ORDERS ✓</span>
                ) : (
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: RED, marginTop: 3 }}>lost</span>
                )}
                {(dying || dead) && (
                    <span style={{ position: "absolute", top: 2, right: 5, fontSize: 13, color: RED, fontWeight: 800 }}>✕</span>
                )}
            </div>
        </div>
    );
}

function Panel({
    title,
    servers,
    phase,
    survives,
}: {
    title: string;
    servers: { name: string; dies: boolean }[];
    phase: string;
    survives: boolean;
}) {
    const outcome = phase === "outcome";
    const banner = !outcome
        ? null
        : survives
          ? { text: "majority 2 / 3 — ORDERS keeps serving", color: GREEN }
          : { text: "ORDERS lost — no other copy", color: RED };
    return (
        <div
            style={{
                flex: 1,
                padding: "14px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fafafa",
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: survives ? GREEN : "#6b7280" }}>{title}</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {servers.map((s) => (
                    <Server key={s.name} name={s.name} dies={s.dies} phase={phase} />
                ))}
            </div>
            <div style={{ minHeight: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {banner && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: banner.color, background: `${banner.color}14`, border: `1px solid ${banner.color}`, borderRadius: 6, padding: "3px 10px" }}>
                        {banner.text}
                    </span>
                )}
            </div>
        </div>
    );
}

function NodeLossAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key } = phaseAt(elapsed % CYCLE);

    const status =
        key === "healthy"
            ? "R=1 keeps one copy on one server. R=3 keeps three, across three servers."
            : key === "fail"
              ? "A server fails in each."
              : "R=1 had no second copy, so the stream is gone. R=3 still has a majority, so it survives.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Surviving a server loss.</strong> The same{" "}
                <span style={{ color: BLUE, fontWeight: 600 }}>ORDERS</span> stream at R=1 and at
                R=3. One server fails in each.
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
                <Panel title="R=1 · one copy" servers={[{ name: "n1", dies: true }]} phase={key} survives={false} />
                <Panel
                    title="R=3 · three copies"
                    servers={[
                        { name: "n1", dies: false },
                        { name: "n2", dies: false },
                        { name: "n3", dies: true },
                    ]}
                    phase={key}
                    survives={true}
                />
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
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

export function NodeLossAnimated(_props: { width?: number; height?: number } = {}) {
    return <NodeLossAnimatedInner />;
}
