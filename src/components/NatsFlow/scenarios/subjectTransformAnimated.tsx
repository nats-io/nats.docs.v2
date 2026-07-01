import React, { useEffect, useState } from "react";

// subjectTransformAnimated
// A stream's subject transform rewrites the subject a message is stored under.
// Messages arrive on ingest.<customer>. As each passes through the transform
// orders.{{partition(3,1)}}.{{wildcard(1)}}, its subject is rewritten: the
// customer token is hashed into one of three buckets and carried into the new
// subject. The same customer always hashes to the same bucket, so acme and
// globex both land in bucket 1 while hooli and wayne go to 0 and 2 — reads can
// then split the load by bucket.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const NAVY = "#375C93";

// Each message: the customer token and the bucket it hashes to. Buckets are the
// real partition(3,1) hashes, verified against the server. acme and globex share
// bucket 1; on the loop each customer returns to the same bucket.
const MSGS = [
    { customer: "acme", bucket: 1 },
    { customer: "hooli", bucket: 0 },
    { customer: "wayne", bucket: 2 },
    { customer: "globex", bucket: 1 },
];

const SEND_MS = 620; // publisher → transform gate
const MORPH_MS = 660; // subject rewrite holds at the gate
const DROP_MS = 620; // gate → bucket
const GAP_MS = 320;
const MSG_MS = SEND_MS + MORPH_MS + DROP_MS + GAP_MS;
const RUN_MS = MSGS.length * MSG_MS;
const HOLD_MS = 1700;
const CYCLE = RUN_MS + HOLD_MS;

// Geometry within a 640-wide stage.
const PUB_X = 16;
const PUB_W = 116;
const PUB_CX = PUB_X + PUB_W; // right edge, 132
const PUB_Y = 118;
const GATE_X = 250;
const GATE_W = 150;
const GATE_CX = GATE_X + GATE_W / 2; // 325
const GATE_R = GATE_X + GATE_W; // right edge, 400
const GATE_Y = 92;
const GATE_H = 52; // center y = 118
const PILL_Y = 70; // subject label floats above the gate, clear of everything
const BUCKET_X = 476;
const BUCKET_W = 150;
const BUCKET_Y = [26, 101, 176];
const BUCKET_H = 56;

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}

function SubjectTransformInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE;
    const done = t >= RUN_MS;

    // Which message is active, and where in its emit/transform/store cycle.
    const mi = done ? MSGS.length : Math.floor(t / MSG_MS);
    const local = done ? 0 : t % MSG_MS;
    const emitEnd = SEND_MS;
    const morphEnd = SEND_MS + MORPH_MS;
    const storeEnd = SEND_MS + MORPH_MS + DROP_MS;
    const phase = done
        ? "hold"
        : local < emitEnd
          ? "emit"
          : local < morphEnd
            ? "transform"
            : local < storeEnd
              ? "store"
              : "gap";

    const cur = done ? null : MSGS[mi];
    const bucket = cur ? cur.bucket : -1;
    const bucketMidY = bucket >= 0 ? BUCKET_Y[bucket] + BUCKET_H / 2 : PUB_Y;

    // The subject is rewritten halfway through the transform phase.
    const morphed = phase === "store" || (phase === "transform" && local - emitEnd > MORPH_MS / 2);
    const subject = cur ? (morphed ? `orders.${cur.bucket}.${cur.customer}` : `ingest.${cur.customer}`) : "";
    const pillColor = morphed ? GREEN : BLUE;

    // How many messages each bucket has stored (a store lands at the start of gap).
    const completed = done ? MSGS.length : mi + (phase === "gap" ? 1 : 0);
    const counts = [0, 0, 0];
    for (let j = 0; j < Math.min(completed, MSGS.length); j++) counts[MSGS[j].bucket]++;

    // The travelling message token. It stops at the gate's left edge, vanishes
    // "into" the transform while the gate glows, then emerges from the right
    // edge already rewritten — so it never overlaps the template text.
    let tx = GATE_CX;
    let ty = PUB_Y;
    let showToken = false;
    if (phase === "emit") {
        tx = lerp(PUB_CX + 6, GATE_X - 12, local / SEND_MS);
        ty = PUB_Y;
        showToken = true;
    } else if (phase === "store") {
        const p = (local - morphEnd) / DROP_MS;
        tx = lerp(GATE_R + 12, BUCKET_X - 14, p);
        ty = lerp(PUB_Y, bucketMidY, p);
        showToken = true;
    }
    const tokenColor = phase === "store" ? GREEN : BLUE;

    // The subject label floats above the gate while the message is emitted and
    // rewritten, then hands off to the bucket highlight during the store.
    let showPill = false;
    let pillX = GATE_CX;
    if (phase === "emit") {
        showPill = true;
        pillX = lerp(PUB_CX + 6, GATE_X - 12, local / SEND_MS);
    } else if (phase === "transform") {
        showPill = true;
        pillX = GATE_CX;
    }

    // The gate glows while a message is being rewritten inside it.
    const gateLit = phase === "transform";
    // The destination bucket lights once the subject is rewritten, through the store.
    const bucketLit = (phase === "transform" && morphed) || phase === "store";

    const status = done
        ? "Each customer hashes to a fixed bucket — same input, same bucket, every time."
        : phase === "emit"
          ? `Published on ingest.${cur!.customer}.`
          : phase === "transform"
            ? morphed
                ? `ingest.${cur!.customer} → orders.${cur!.bucket}.${cur!.customer} · partition hashes "${cur!.customer}" to bucket ${cur!.bucket}.`
                : `Transform rewrites the stored subject…`
            : phase === "store"
              ? `Stored under orders.${cur!.bucket}.${cur!.customer}.`
              : `Stored under orders.${cur!.bucket}.${cur!.customer}.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                A <strong>subject transform</strong> rewrites the subject a message is stored under — here it hashes each
                customer into a fixed bucket.
            </div>

            <div style={{ position: "relative", width: 640, height: 240, margin: "0 auto" }}>
                {/* publisher */}
                <div
                    style={{
                        position: "absolute",
                        left: PUB_X,
                        top: PUB_Y - 27,
                        width: PUB_W,
                        height: 54,
                        borderRadius: 8,
                        border: `2px solid ${BLUE}`,
                        background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Publisher</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: BLUE, minHeight: 13 }}>
                        {cur ? `ingest.${cur.customer}` : "4 stored"}
                    </span>
                </div>

                {/* transform gate */}
                <div
                    style={{
                        position: "absolute",
                        left: GATE_X,
                        top: GATE_Y,
                        width: GATE_W,
                        height: GATE_H,
                        borderRadius: 8,
                        border: `2px dashed ${gateLit ? GREEN : "#9ca3af"}`,
                        background: gateLit ? "#effaf4" : "#f9fafb",
                        boxShadow: gateLit ? `0 1px 8px ${GREEN}44` : "none",
                        transition: "all 0.18s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        padding: "0 6px",
                    }}
                >
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#9ca3af" }}>
                        transform
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: NAVY, textAlign: "center", lineHeight: 1.25 }}>
                        orders.
                        <br />
                        {"{{partition(3,1)}}.{{wildcard(1)}}"}
                    </span>
                </div>

                {/* stream with three buckets */}
                <div
                    style={{
                        position: "absolute",
                        left: BUCKET_X - 10,
                        top: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: NAVY,
                    }}
                >
                    ORDERS-SHARDED
                </div>
                {BUCKET_Y.map((by, i) => {
                    const lit = bucketLit && bucket === i;
                    return (
                        <div
                            key={i}
                            style={{
                                position: "absolute",
                                left: BUCKET_X,
                                top: by,
                                width: BUCKET_W,
                                height: BUCKET_H,
                                borderRadius: 8,
                                border: `2px solid ${lit ? GREEN : "#d1d5db"}`,
                                background: lit ? "#effaf4" : "#fff",
                                boxShadow: lit ? `0 1px 7px ${GREEN}55` : "none",
                                transition: "all 0.18s",
                                padding: "7px 10px",
                                boxSizing: "border-box",
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>
                                orders.{i}.&gt;
                            </div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>
                                bucket {i} · stored{" "}
                                <strong style={{ color: counts[i] > 0 ? GREEN : "#9ca3af" }}>{counts[i]}</strong>
                            </div>
                        </div>
                    );
                })}

                {/* the travelling message token (into the gate, out to a bucket) */}
                {showToken && cur && (
                    <div
                        style={{
                            position: "absolute",
                            left: tx - 11,
                            top: ty - 11,
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: tokenColor,
                            border: "1.5px solid #fff",
                            boxShadow: `0 1px 6px ${tokenColor}66`,
                            transition: "background 0.15s",
                        }}
                    />
                )}

                {/* the subject label, floating above the gate as it is rewritten */}
                {showPill && cur && (
                    <span
                        style={{
                            position: "absolute",
                            left: pillX - 66,
                            top: PILL_Y - 7,
                            width: 132,
                            textAlign: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: pillColor,
                            whiteSpace: "nowrap",
                            transition: "color 0.15s",
                        }}
                    >
                        {subject}
                    </span>
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

export function SubjectTransformAnimated(_props: { width?: number; height?: number } = {}) {
    return <SubjectTransformInner />;
}
