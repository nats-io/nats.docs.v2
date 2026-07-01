import React, { useEffect, useState } from "react";

// sequenceGapAnimated
// Sequence numbers never backfill. ORDERS already has a hole: sequence 2 was
// deleted earlier, so the stream holds #1, [gap], #3, #4, #5. New orders then
// arrive — and they land at #6, #7, #8 on the right, each the next number up.
// None drops into the empty slot 2. The gap stays; sequence 2 is gone for good
// and is never handed out again. Numbers only ever climb. Restart replays it.

const TICK_MS = 80;
const SLOT_W = 50;
const SLOT_GAP = 10;
// sequence positions on display; 2 is a permanent gap from an earlier delete
const SEQS = [1, 2, 3, 4, 5, 6, 7, 8];
const GAP = 2;

const STREAM_BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";

const PHASES = [
    { key: "state", dur: 1700 },
    { key: "publish", dur: 1100 },
    { key: "land1", dur: 1100 },
    { key: "land2", dur: 1100 },
    { key: "land3", dur: 1200 },
    { key: "rest", dur: 1800 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "rest", p: 1 };
}

function SequenceGapAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);
    const publishing = key === "publish";
    // how many of #6,#7,#8 are present
    const landStage = key === "land1" ? 1 : key === "land2" ? 2 : key === "land3" ? 3 : key === "rest" ? 3 : 0;
    const settled = key === "rest";

    const status =
        key === "state"
            ? "Sequence 2 was deleted earlier. ORDERS holds 1, 3, 4, 5 — the hole stays."
            : publishing
              ? "New orders arrive. Where do they land?"
              : key === "land1"
                ? "The first lands at #6 — the next number up, on the right."
                : key === "land2"
                  ? "#7 follows. Still climbing, still past the gap."
                  : key === "land3"
                    ? "#8 lands. None of them dropped into the empty slot 2."
                    : "#6, #7, #8 all climbed past the gap. Sequence 2 is gone for good.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Sequence numbers never backfill.</strong> A deleted slot stays empty. New
                messages climb to{" "}
                <span style={{ color: GREEN, fontWeight: 600 }}>#6, #7, #8</span> — they never
                drop back into the gap.
            </div>

            {/* publish pill above the stream */}
            <div style={{ height: 28, marginBottom: 8 }}>
                {(publishing || landStage > 0) && !settled && (
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: GREEN, color: "white", fontSize: 11, fontWeight: 700, fontFamily: "monospace", opacity: publishing ? 0.55 + 0.45 * p : 1 }}>
                        nats pub --jetstream orders.created …
                    </span>
                )}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "18px 22px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                <div>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: RED }}>seq 2 empty</span>
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {SEQS.map((seq) => {
                            const isGap = seq === GAP;
                            const isNew = seq >= 6;
                            const newIndex = seq - 5; // 1,2,3 for 6,7,8
                            const present = isGap ? false : isNew ? landStage >= newIndex : true;
                            const landing = isNew && landStage === newIndex && !settled;
                            const color = isNew ? GREEN : STREAM_BLUE;
                            const highlightGap = isGap && settled;
                            let opacity = 1;
                            if (landing) opacity = 0.25 + 0.75 * p;
                            else if (isNew && !present) opacity = 0;
                            return (
                                <div key={seq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                    <div
                                        style={{
                                            width: SLOT_W,
                                            height: 38,
                                            borderRadius: 6,
                                            border: isGap
                                                ? `2px dashed ${highlightGap ? RED : "#d1d5db"}`
                                                : present
                                                  ? `2px solid ${color}`
                                                  : "2px dashed #e5e7eb",
                                            background: isGap ? "#f3f4f6" : present ? (isNew ? "#ecfdf5" : "white") : "transparent",
                                            opacity,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "border-color 0.2s, background 0.2s",
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: isGap ? (highlightGap ? RED : "#9ca3af") : present ? color : "transparent" }}>
                                            {isGap ? "—" : `#${seq}`}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 9, fontFamily: "monospace", color: isGap ? RED : "#9ca3af" }}>
                                        {isGap ? "gap" : `seq ${seq}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <button
                    onClick={() => setElapsed(0)}
                    style={{ flex: "none", padding: "5px 12px", borderRadius: 6, border: `1px solid ${STREAM_BLUE}`, background: "white", color: STREAM_BLUE, fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif", cursor: "pointer" }}
                >
                    ↺ Restart
                </button>
                <span style={{ fontSize: 13, color: "#374151" }}>{status}</span>
            </div>
        </div>
    );
}

export function SequenceGapAnimated(_props: { width?: number; height?: number } = {}) {
    return <SequenceGapAnimatedInner />;
}
