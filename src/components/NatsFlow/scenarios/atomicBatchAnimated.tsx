import React, { useEffect, useState } from "react";

// atomicBatchAnimated
// Atomic batch publish stores a group all-or-nothing. The client opens a batch
// (Nats-Batch-Id), adds messages, and the server HOLDS them in a staging buffer —
// nothing is in ORDERS yet. On Nats-Batch-Commit the whole batch lands at once.
// The second run shows the other half of "all-or-nothing": a sequence gap
// abandons the batch, the staged messages are discarded, and ORDERS is unchanged.

const TICK_MS = 80;
const SLOT_W = 50;
const SLOT_GAP = 10;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";
const NAVY = "#375C93";

const PHASES = [
    { key: "open", dur: 1300 },     // batch 1 opens, msg 1 staged
    { key: "add", dur: 1500 },      // msg 2, 3 staged
    { key: "commit", dur: 1500 },   // commit -> all 3 land
    { key: "stored", dur: 1500 },   // show ORDERS holds 3
    { key: "open2", dur: 1400 },    // batch 2 opens, msg 4,5 staged
    { key: "gap", dur: 1500 },      // gap detected
    { key: "abandon", dur: 2100 },  // staged discarded, ORDERS unchanged
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "abandon", p: 1 };
}

function Slot({ label, color, dashed, faded }: { label: string; color: string; dashed?: boolean; faded?: number }) {
    return (
        <div
            style={{
                width: SLOT_W,
                height: 36,
                borderRadius: 6,
                border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
                background: dashed ? "transparent" : `${color}14`,
                opacity: faded ?? 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.2s, border-color 0.2s",
            }}
        >
            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color }}>{label}</span>
        </div>
    );
}

function AtomicBatchAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);

    // batch 1
    const b1Open = key === "open";
    const b1Add = key === "add";
    const committing = key === "commit";
    const afterCommit = key === "stored" || key === "open2" || key === "gap" || key === "abandon";
    // batch 2
    const b2Open = key === "open2";
    const gap = key === "gap";
    const abandoning = key === "abandon";

    // staged contents
    let staged: { label: string; bad?: boolean }[] = [];
    if (b1Open) staged = [{ label: "#1" }];
    else if (b1Add) staged = [{ label: "#1" }, { label: "#2" }, { label: "#3" }];
    else if (committing) staged = [{ label: "#1" }, { label: "#2" }, { label: "#3" }];
    else if (b2Open) staged = [{ label: "#4" }, { label: "#5" }];
    else if (gap) staged = [{ label: "#4" }, { label: "#5" }, { label: "—", bad: true }];
    else if (abandoning) staged = [{ label: "#4" }, { label: "#5" }, { label: "—", bad: true }];

    // stored contents (ORDERS)
    const storedCount = afterCommit ? 3 : 0;
    const storedSeqs = [1, 2, 3].slice(0, storedCount);
    const landing = committing;

    const batchLabel = b2Open || gap || abandoning ? "Nats-Batch-Id: ord-b2" : "Nats-Batch-Id: ord-b1";
    const batchColor = gap || abandoning ? RED : NAVY;

    const commandPill = committing
        ? { text: "Nats-Batch-Commit", color: GREEN }
        : gap
          ? { text: "sequence gap — seq 6 missing", color: RED }
          : abandoning
            ? { text: "advisory: stream_batch_abandoned", color: RED }
            : null;

    const status =
        b1Open
            ? "Open a batch. The server stages each message — nothing is in ORDERS yet."
            : b1Add
              ? "Add #2 and #3. All three sit in the staging buffer, still uncommitted."
              : committing
                ? "Commit. The whole batch lands in ORDERS at once — sequences 1, 2, 3."
                : key === "stored"
                  ? "ORDERS holds all three. They became visible together, never half-written."
                  : b2Open
                    ? "A second batch stages #4 and #5…"
                    : gap
                      ? "…but #6 never arrives. A sequence gap means the batch is incomplete."
                      : "The server abandons the batch. #4 and #5 are discarded — ORDERS is unchanged.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Atomic batch: all-or-nothing.</strong> Staged messages land together on{" "}
                <span style={{ color: GREEN, fontWeight: 600 }}>commit</span>, or the whole batch is{" "}
                <span style={{ color: RED, fontWeight: 600 }}>discarded</span>.
            </div>

            {/* batch id + command pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, height: 26, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: batchColor, border: `1px solid ${batchColor}`, borderRadius: 4, padding: "2px 7px", background: `${batchColor}10`, transition: "color 0.2s, border-color 0.2s" }}>
                    {batchLabel}
                </span>
                {commandPill && (
                    <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "white", background: commandPill.color, borderRadius: 4, padding: "3px 9px" }}>
                        {commandPill.text}
                    </span>
                )}
            </div>

            <div style={{ display: "flex", gap: 26, alignItems: "stretch" }}>
                {/* staging buffer */}
                <div
                    style={{
                        padding: "14px 18px",
                        border: `2px dashed ${abandoning ? RED : "#cbd5e1"}`,
                        borderRadius: 10,
                        background: abandoning ? "#fef2f2" : "#f8fafc",
                        minWidth: 210,
                        transition: "border-color 0.2s, background 0.2s",
                    }}
                >
                    <div style={{ fontSize: 10, color: abandoning ? RED : "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
                        Staging buffer{abandoning ? " — discarded" : ""}
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP, minHeight: 54 }}>
                        {staged.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>empty</span>}
                        {staged.map((m, i) => (
                            <Slot
                                key={i}
                                label={m.label}
                                color={m.bad ? RED : committing ? "#94a3b8" : BLUE}
                                dashed={m.bad}
                                faded={abandoning ? 1 - p : committing ? 1 - p : 1}
                            />
                        ))}
                    </div>
                </div>

                {/* arrow */}
                <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 700, color: committing ? GREEN : abandoning ? RED : "#d1d5db", transition: "color 0.2s" }}>
                    {abandoning ? "✕" : "⇒"}
                </div>

                {/* ORDERS */}
                <div
                    style={{
                        padding: "14px 18px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#fafafa",
                        minWidth: 210,
                    }}
                >
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace" }}>{storedCount} msgs</span>
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP, minHeight: 54 }}>
                        {storedCount === 0 && <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>empty</span>}
                        {storedSeqs.map((seq) => (
                            <div key={seq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <Slot label={`#${seq}`} color={GREEN} faded={landing ? 0.2 + 0.8 * p : 1} />
                                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#9ca3af" }}>seq {seq}</span>
                            </div>
                        ))}
                    </div>
                </div>
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

export function AtomicBatchAnimated(_props: { width?: number; height?: number } = {}) {
    return <AtomicBatchAnimatedInner />;
}
