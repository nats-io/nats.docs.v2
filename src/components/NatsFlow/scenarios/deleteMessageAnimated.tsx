import React, { useEffect, useState } from "react";

// deleteMessageAnimated
// Delete one message by sequence. ORDERS holds #1..#5. `nats stream rmm ORDERS 3`
// targets sequence 3, the server overwrites it, and it's gone. The neighbours #2
// and #4 do NOT move and do NOT renumber — slot 3 becomes a permanent gap. Then
// new orders keep arriving: #6, #7, #8 land to the right and climb straight past
// the gap, which the server never fills back in. Restart replays from full.

const TICK_MS = 80;
const SLOT_W = 50;
const SLOT_GAP = 10;
const OLD = [1, 2, 3, 4, 5];
const NEW = [6, 7, 8];
const TARGET = 3;

const STREAM_BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";

const PHASES = [
    { key: "full", dur: 1500 },
    { key: "target", dur: 1400 },
    { key: "erase", dur: 1100 },
    { key: "rest", dur: 1400 },
    { key: "append1", dur: 1100 },
    { key: "append2", dur: 1100 },
    { key: "append3", dur: 1700 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "append3", p: 1 };
}

function DeleteMessageAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);
    const targeting = key === "target";
    const erasing = key === "erase";
    const gapShown = erasing || key === "rest" || key.startsWith("append");
    const appendStage = key === "append1" ? 1 : key === "append2" ? 2 : key === "append3" ? 3 : 0;
    const publishing = appendStage > 0;

    const status =
        key === "full"
            ? "ORDERS holds five messages, #1 through #5."
            : key === "target"
              ? "nats stream rmm ORDERS 3 — the command names sequence 3."
              : key === "erase"
                ? "The server overwrites sequence 3. Its bytes can't be read back."
                : key === "rest"
                  ? "#2 and #4 didn't move or renumber. The gap stays at 3."
                  : key === "append1"
                    ? "New orders keep arriving — this one lands at #6, not at 3."
                    : key === "append2"
                      ? "#7 lands next, to the right, past the gap."
                      : "#6, #7, #8 all climbed past the gap. Sequence 3 stays empty for good.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Delete one message.</strong>{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>rmm ORDERS 3</span> removes
                sequence 3 and leaves a hole. New orders climb past it — they never reuse 3.
            </div>

            {/* command / publish pill */}
            <div style={{ height: 28, marginBottom: 8 }}>
                {(targeting || erasing) && (
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: erasing ? RED : "#1f2937", color: "white", fontSize: 11, fontWeight: 700, fontFamily: "monospace", transition: "background 0.2s" }}>
                        nats stream rmm ORDERS 3
                    </span>
                )}
                {publishing && (
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: GREEN, color: "white", fontSize: 11, fontWeight: 700, fontFamily: "monospace", opacity: 0.6 + 0.4 * p }}>
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
                        {gapShown && <span style={{ fontFamily: "monospace", color: RED }}>seq 3 empty</span>}
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {[...OLD, ...NEW].map((seq) => {
                            const isOld = seq <= 5;
                            const isTarget = seq === TARGET;
                            const isGap = isTarget && gapShown;
                            const flashing = isTarget && targeting;
                            const isNew = !isOld;
                            const newIndex = seq - 5;
                            const present = isOld ? !isGap : appendStage >= newIndex;
                            const landing = isNew && appendStage === newIndex;
                            const color = isNew ? GREEN : STREAM_BLUE;
                            let opacity = 1;
                            if (isTarget && erasing) opacity = 1 - p;
                            else if (landing) opacity = 0.25 + 0.75 * p;
                            else if (isNew && !present) opacity = 0;
                            return (
                                <div key={seq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                    <div
                                        style={{
                                            width: SLOT_W,
                                            height: 38,
                                            borderRadius: 6,
                                            border: isGap
                                                ? "2px dashed #d1d5db"
                                                : present
                                                  ? `2px solid ${flashing ? RED : color}`
                                                  : "2px dashed #e5e7eb",
                                            background: isGap ? "#f3f4f6" : present ? (isNew ? "#ecfdf5" : flashing ? "#fef2f2" : "white") : "transparent",
                                            opacity,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "border-color 0.2s, background 0.2s",
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: isGap ? "#9ca3af" : present ? (flashing ? RED : color) : "transparent" }}>
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

export function DeleteMessageAnimated(_props: { width?: number; height?: number } = {}) {
    return <DeleteMessageAnimatedInner />;
}
