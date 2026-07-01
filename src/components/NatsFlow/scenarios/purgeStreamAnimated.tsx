import React, { useEffect, useState } from "react";

// purgeStreamAnimated
// Purge the whole stream. ORDERS holds #1..#5. `nats stream purge ORDERS` drops
// every message at once; the stream stays (same config, same consumers) but is
// empty, and its first sequence is set to one past the last. New orders then
// arrive and pick up at #6, #7, #8 — to the right, where slots 1..5 stay empty.
// Numbering never resets to #1. Restart replays it.

const TICK_MS = 80;
const SLOT_W = 50;
const SLOT_GAP = 10;
const OLD = [1, 2, 3, 4, 5];
const NEW = [6, 7, 8];

const STREAM_BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";

const PHASES = [
    { key: "full", dur: 1500 },
    { key: "purge", dur: 1300 },
    { key: "empty", dur: 1400 },
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

function PurgeStreamAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);
    const full = key === "full";
    const purging = key === "purge";
    const appendStage = key === "append1" ? 1 : key === "append2" ? 2 : key === "append3" ? 3 : 0;
    const publishing = appendStage > 0;

    const count = full || purging ? 5 : appendStage;
    const firstSeq = full || purging ? 1 : 6;

    const status =
        full
            ? "ORDERS holds five messages. First sequence is 1."
            : purging
              ? "nats stream purge ORDERS — every message dropped at once."
              : key === "empty"
                ? "Purged 5 messages. The stream stays; first sequence is now 6."
                : key === "append1"
                  ? "The next publish is #6, not #1. Purge never rewinds the counter."
                  : key === "append2"
                    ? "#7 follows, climbing from where the stream left off."
                    : "#6, #7, #8 fill in on the right. Slots 1–5 stay empty for good.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Purge the stream.</strong> Every message goes at once, but the stream
                stays. New orders pick up at{" "}
                <span style={{ color: GREEN, fontWeight: 600 }}>#6</span>, never back at #1.
            </div>

            {/* command / publish pill */}
            <div style={{ height: 28, marginBottom: 8 }}>
                {purging && (
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, background: RED, color: "white", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                        nats stream purge ORDERS
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
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 24 }}>
                        <span>ORDERS</span>
                        <span style={{ fontFamily: "monospace", color: purging ? RED : STREAM_BLUE }}>{count} msgs · first seq {firstSeq}</span>
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP }}>
                        {[...OLD, ...NEW].map((seq) => {
                            const isOld = seq <= 5;
                            const isNew = !isOld;
                            const newIndex = seq - 5;
                            // old messages present only before/while purging; new ones land on append
                            const present = isOld ? full || purging : appendStage >= newIndex;
                            const landing = isNew && appendStage === newIndex;
                            const color = isNew ? GREEN : STREAM_BLUE;
                            let opacity = 1;
                            if (isOld && purging) opacity = 1 - p;
                            else if (landing) opacity = 0.25 + 0.75 * p;
                            else if (!present) opacity = isOld ? 1 : 0; // empty old slots render as dashed placeholders
                            const renderEmpty = !present;
                            return (
                                <div key={seq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                    <div
                                        style={{
                                            width: SLOT_W,
                                            height: 38,
                                            borderRadius: 6,
                                            border: renderEmpty ? "2px dashed #e5e7eb" : `2px solid ${purging ? RED : color}`,
                                            background: renderEmpty ? "#f7f8f9" : isNew ? "#ecfdf5" : purging ? "#fef2f2" : "white",
                                            opacity: renderEmpty ? 1 : opacity,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "border-color 0.2s, background 0.2s",
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: renderEmpty ? "#cbd0d6" : purging ? RED : color }}>
                                            {renderEmpty ? "·" : `#${seq}`}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#9ca3af" }}>seq {seq}</span>
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

export function PurgeStreamAnimated(_props: { width?: number; height?: number } = {}) {
    return <PurgeStreamAnimatedInner />;
}
