import React, { useEffect, useState } from "react";

// mirrorCopyAnimated
// ORDERS starts with 5 messages and a publisher keeps adding more. A mirror is
// then created behind the stream; it copies about three times as fast as the
// publisher writes, so its Lag falls to 0. Each copied message drops as a block
// from ORDERS into ORDERS-ARCHIVE. Once caught up it keeps pace, mirroring each
// new message the moment it lands.

const TICK_MS = 80;
const BLUE = "#27AAE1";
const GREEN = "#34A574";
const AMBER = "#d97706";
const NAVY = "#375C93";

const START = 5;
const PUB_PERIOD = 1100; // publisher adds one message this often
const COPY_PERIOD = 360; // mirror copies one this often (~3x faster than publish)
const CREATE_T = 3 * PUB_PERIOD; // mirror created after 3 more orders (ORDERS = 8)
const KEEPUP_DUR = 3 * PUB_PERIOD;
const HOLD = 1300;

function publishedAt(t: number) {
    return START + Math.floor(t / PUB_PERIOD);
}
function copyCountAt(t: number) {
    if (t < CREATE_T) return 0;
    return Math.floor((t - CREATE_T) / COPY_PERIOD);
}

// When does the mirror first catch up (lag hits 0)? Compute once, deterministically.
let CAUGHT_UP_T = CREATE_T;
for (let t = CREATE_T; t < CREATE_T + 60000; t += COPY_PERIOD) {
    if (copyCountAt(t) >= publishedAt(t)) {
        CAUGHT_UP_T = t;
        break;
    }
}
const CYCLE = CAUGHT_UP_T + KEEPUP_DUR + HOLD;
const MAX_MSGS = publishedAt(CYCLE) + 1;

const TRACK_X = 168;
const TRACK_W = 372;
const ROW1_Y = 34;
const ROW2_Y = 118;
const TRACK_H = 26;
const SEG_W = TRACK_W / MAX_MSGS;

function fillW(count: number) {
    return Math.min(TRACK_W, count * SEG_W);
}

function MirrorCopyInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE;
    const published = publishedAt(t);
    const mirrorExists = t >= CREATE_T;
    const copied = mirrorExists ? Math.min(published, copyCountAt(t)) : 0;
    const lag = published - copied;

    const stage = t < CREATE_T ? "pre" : t < CAUGHT_UP_T ? "catchup" : "keepup";

    const sincePub = t % PUB_PERIOD;
    const publishPulse = sincePub < 240;
    const sinceCopy = mirrorExists ? (t - CREATE_T) % COPY_PERIOD : 1e9;

    // The message block currently dropping from ORDERS into the mirror.
    let block: { slot: number; prog: number; n: number } | null = null;
    if (mirrorExists && copied < published) {
        block = { slot: copied, prog: Math.min(1, sinceCopy / COPY_PERIOD), n: copied + 1 };
    } else if (stage === "keepup" && sincePub < 340) {
        block = { slot: published - 1, prog: Math.min(1, sincePub / 340), n: published };
    }

    const oFront = TRACK_X + fillW(published);
    const mFront = TRACK_X + fillW(copied);

    const status =
        stage === "pre"
            ? "ORDERS already holds 5 orders, and a publisher keeps adding more."
            : stage === "catchup"
              ? "The mirror copies about 3× as fast as the publisher writes, so its lag falls."
              : "Caught up. Each new order is mirrored the moment it lands — lag stays at 0.";

    const lagColor = lag === 0 ? GREEN : AMBER;

    const blockTop = ROW1_Y + TRACK_H - 3;
    const blockBottom = ROW2_Y - 3;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 10, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                A <strong>mirror</strong> copies one stream into another, then keeps pace with it.
            </div>

            <div style={{ position: "relative", width: 640, height: 168, margin: "0 auto" }}>
                {/* publisher */}
                <div
                    style={{
                        position: "absolute",
                        left: 4,
                        top: ROW1_Y - 4,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: publishPulse ? BLUE : "#9ca3af",
                        border: `1px solid ${publishPulse ? BLUE : "#d1d5db"}`,
                        borderRadius: 4,
                        padding: "2px 6px",
                        background: publishPulse ? `${BLUE}14` : "transparent",
                        transition: "color 0.15s, border-color 0.15s, background 0.15s",
                    }}
                >
                    ✎ publish
                </div>
                {publishPulse && (
                    <span style={{ position: "absolute", left: 80, top: ROW1_Y - 7, fontSize: 11, fontWeight: 700, color: BLUE, opacity: 1 - sincePub / 240 }}>+1</span>
                )}

                {/* ORDERS row */}
                <span style={{ position: "absolute", left: 100, top: ROW1_Y + 4, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>ORDERS</span>
                <div style={{ position: "absolute", left: TRACK_X, top: ROW1_Y, width: TRACK_W, height: TRACK_H, borderRadius: 5, background: "#f1f5f9", border: "1px solid #e5e7eb" }} />
                <div style={{ position: "absolute", left: TRACK_X, top: ROW1_Y, width: fillW(published), height: TRACK_H, borderRadius: 5, background: BLUE, transition: "width 0.25s linear" }} />
                <span style={{ position: "absolute", left: TRACK_X + TRACK_W + 10, top: ROW1_Y + 5, fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>{published}</span>

                {/* message block dropping from ORDERS into the mirror */}
                {block && (
                    <div
                        style={{
                            position: "absolute",
                            left: TRACK_X + block.slot * SEG_W + SEG_W / 2 - 9,
                            top: blockTop + block.prog * (blockBottom - blockTop),
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: BLUE,
                            border: "1.5px solid #fff",
                            boxShadow: "0 1px 5px rgba(39,170,225,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 8,
                            fontWeight: 700,
                            fontFamily: "monospace",
                        }}
                    >
                        {block.n}
                    </div>
                )}

                {/* ORDERS-ARCHIVE row */}
                {mirrorExists ? (
                    <>
                        <span style={{ position: "absolute", left: 8, top: ROW2_Y + 4, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: BLUE }}>ORDERS-ARCHIVE</span>
                        <div style={{ position: "absolute", left: TRACK_X, top: ROW2_Y, width: TRACK_W, height: TRACK_H, borderRadius: 5, background: "#f1f5f9", border: "1px solid #e5e7eb" }} />
                        {/* lag region — the gap the mirror still has to cover */}
                        {lag > 0 && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: mFront,
                                    top: ROW2_Y,
                                    width: oFront - mFront,
                                    height: TRACK_H,
                                    background: `${AMBER}26`,
                                    borderTop: `1px dashed ${AMBER}`,
                                    borderBottom: `1px dashed ${AMBER}`,
                                    transition: "left 0.25s linear, width 0.25s linear",
                                }}
                            />
                        )}
                        {/* copied fill */}
                        <div style={{ position: "absolute", left: TRACK_X, top: ROW2_Y, width: fillW(copied), height: TRACK_H, borderRadius: 5, background: BLUE, transition: "width 0.25s linear" }} />
                        <span style={{ position: "absolute", left: TRACK_X + TRACK_W + 10, top: ROW2_Y + 5, fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: NAVY }}>{copied}</span>
                        {/* lag pill */}
                        <span
                            style={{
                                position: "absolute",
                                left: 8,
                                top: ROW2_Y + TRACK_H + 7,
                                fontSize: 10,
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: lagColor,
                                border: `1px solid ${lagColor}`,
                                borderRadius: 4,
                                padding: "1px 6px",
                                background: `${lagColor}12`,
                            }}
                        >
                            Lag {lag}
                        </span>
                    </>
                ) : (
                    <span style={{ position: "absolute", left: 8, top: ROW2_Y + 5, fontSize: 12, fontStyle: "italic", color: "#9ca3af" }}>no mirror yet</span>
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
