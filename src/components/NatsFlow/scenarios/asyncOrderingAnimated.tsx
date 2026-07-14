import React, { useEffect, useState } from "react";

// asyncOrderingAnimated
// The cost of async publish. order-svc fires six orders back-to-back without
// waiting for each PubAck, so the round trips overlap and throughput is high.
// The server stores messages in ARRIVAL order and numbers them as they land:
// orders 1,2,4,5,6 are stored and acked, but order 3's ack fails. Orders 4,5,6
// already hold sequences 4,5,6. When the client re-publishes order 3, it arrives
// now — after 4,5,6 — and the stream stores it last, at sequence 7. The stream's
// stored order no longer matches the order you sent in.

const TICK_MS = 80;
const SLOT_W = 46;
const SLOT_GAP = 9;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";
const AMBER = "#d97706";

// seq -> the order that lands there. seq 3 is order 3's failed attempt; the
// re-published order 3 lands at seq 7.
const FAILED_SEQ = 3;
const RETRY_SEQ = 7;

const PHASES = [
    { key: "fire", dur: 1700 },
    { key: "acks", dur: 1800 },
    { key: "mark", dur: 1600 },
    { key: "retry", dur: 1500 },
    { key: "reorder", dur: 2400 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "reorder", p: 1 };
}

function AsyncOrderingAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);
    const firing = key === "fire";
    const acksShown = key === "acks" || key === "mark" || key === "retry" || key === "reorder";
    const failShown = acksShown;
    const retrying = key === "retry";
    const reordered = key === "reorder";

    const status =
        firing
            ? "order-svc fires all six orders without waiting for each PubAck — the round trips overlap."
            : key === "acks"
              ? "The server numbers each order as it lands. Five acks come back; order 3's ack fails."
              : key === "mark"
                ? "Nothing is resent on its own. Order 3 is just missing — until your code re-publishes it."
                : retrying
                  ? "Your retry (automatic or manual) re-publishes order 3 — it arrives after 4, 5, 6 are already stored."
                  : "Only now is the order wrong: the late retry, not the stream, put order 3 last at sequence 7.";

    // which seq slots are visible / filled
    const seqs = [1, 2, 3, 4, 5, 6];

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>Async is fast — but re-publishing a failed order reorders the stream.</strong>{" "}
                Nothing is resent on its own. When your code retries order 3, it lands{" "}
                <span style={{ color: RED, fontWeight: 600 }}>after</span> the orders you sent next.
            </div>

            {/* publisher firing pill */}
            <div style={{ height: 26, marginBottom: 6 }}>
                <span
                    style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: firing ? BLUE : retrying ? AMBER : "#e5e7eb",
                        color: firing || retrying ? "white" : "#9ca3af",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        transition: "background 0.2s",
                    }}
                >
                    {retrying ? "order-svc: re-publish order 3" : "order-svc: PublishAsync × 6"}
                </span>
            </div>

            {/* what you sent */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
                    Initial sent order
                </div>
                <div style={{ display: "flex", gap: SLOT_GAP }}>
                    {[1, 2, 3, 4, 5, 6].map((o) => {
                        const isFail = o === 3 && failShown;
                        return (
                            <div
                                key={o}
                                style={{
                                    width: SLOT_W,
                                    height: 30,
                                    borderRadius: 6,
                                    border: `2px solid ${isFail ? RED : "#cbd5e1"}`,
                                    background: isFail ? "#fef2f2" : "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: firing ? 0.4 + 0.6 * p : 1,
                                    transition: "border-color 0.2s, background 0.2s",
                                }}
                            >
                                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isFail ? RED : "#475569" }}>
                                    #{o}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* what the stream stored */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    padding: "16px 20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                <div>
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
                        Stored in ORDERS
                    </div>
                    <div style={{ display: "flex", gap: SLOT_GAP, alignItems: "flex-end" }}>
                        {seqs.map((seq) => {
                            const isFailed = seq === FAILED_SEQ && failShown;
                            const order = seq; // before failure, seq n holds order n
                            const pending = firing;
                            const color = isFailed ? RED : BLUE;
                            return (
                                <div key={seq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                    {/* ack badge */}
                                    <span style={{ fontSize: 11, fontWeight: 800, height: 14, color: !acksShown ? "transparent" : isFailed ? RED : GREEN }}>
                                        {!acksShown ? "·" : isFailed ? "✗" : "✓"}
                                    </span>
                                    <div
                                        style={{
                                            width: SLOT_W,
                                            height: 36,
                                            borderRadius: 6,
                                            border: `2px ${isFailed ? "dashed" : "solid"} ${pending ? "#cbd5e1" : color}`,
                                            background: isFailed ? "#fef2f2" : pending ? "white" : "#eff8fd",
                                            opacity: firing ? 0.3 + 0.7 * p : 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "border-color 0.2s, background 0.2s",
                                        }}
                                    >
                                        <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isFailed ? RED : pending ? "#94a3b8" : color }}>
                                            {isFailed ? "—" : `#${order}`}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 9, fontFamily: "monospace", color: isFailed ? RED : "#9ca3af" }}>seq {seq}</span>
                                </div>
                            );
                        })}

                        {/* the retried order 3, landing at seq 7 */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                                opacity: retrying ? 0.2 + 0.8 * p : reordered ? 1 : 0,
                                transition: "opacity 0.2s",
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 800, height: 14, color: reordered ? GREEN : AMBER }}>
                                {reordered ? "✓" : "·"}
                            </span>
                            <div
                                style={{
                                    width: SLOT_W,
                                    height: 36,
                                    borderRadius: 6,
                                    border: `2px solid ${GREEN}`,
                                    background: "#ecfdf5",
                                    boxShadow: reordered ? `0 0 0 3px ${GREEN}22` : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: GREEN }}>#3</span>
                            </div>
                            <span style={{ fontSize: 9, fontFamily: "monospace", color: GREEN, fontWeight: 700 }}>seq {RETRY_SEQ}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reserve this row's height so it doesn't shove the page down when
                it appears only in the reorder phase. */}
            <div style={{ marginTop: 10, minHeight: 36, fontSize: 12, color: "#374151" }}>
                {reordered && (
                    <>
                        Stored order: <span style={{ fontFamily: "monospace" }}>#1 #2 #4 #5 #6 #3</span>. Fix it by failing the
                        retry fast with{" "}
                        <span style={{ fontFamily: "monospace", color: BLUE, fontWeight: 600 }}>Nats-Expected-Last-Subject-Sequence</span>.
                    </>
                )}
            </div>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
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

export function AsyncOrderingAnimated(_props: { width?: number; height?: number } = {}) {
    return <AsyncOrderingAnimatedInner />;
}
