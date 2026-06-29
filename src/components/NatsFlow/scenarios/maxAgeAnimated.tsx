import React, { useEffect, useState } from "react";

// maxAgeAnimated
// MaxAge limit. Messages enter ORDERS on the right at age 0 and drift left as
// they get older. The stream keeps the last 7 days (the shaded window). When a
// message reaches MaxAge it crosses the line, flashes, and is discarded — no
// publish pressure needed, the clock alone evicts it.

const TICK_MS = 80;
const DAY_MS = 620; // wall-clock ms per simulated day
const DAY_PX = 40; // pixels per day on the track
const MAX_AGE = 7; // days
const BIRTH_GAP = 1.6; // a new order every 1.6 days
const TRACK_W = 380;
const TRACK_H = 64;
const NOW_X = TRACK_W - 14; // x of a just-published message (age 0)
const LINE_X = NOW_X - MAX_AGE * DAY_PX; // x of the MaxAge boundary

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const RED = "#ef4444";

function MaxAgeAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const dayNow = elapsed / DAY_MS;

    // Births are at multiples of BIRTH_GAP. Show those within the window plus a
    // little past it (the discard flash), then drop them.
    const firstK = Math.ceil((dayNow - (MAX_AGE + 1.1)) / BIRTH_GAP);
    const lastK = Math.floor(dayNow / BIRTH_GAP);
    const msgs = [];
    for (let k = firstK; k <= lastK; k++) {
        if (k < 0) continue;
        const age = dayNow - k * BIRTH_GAP;
        msgs.push({ k, age, x: NOW_X - age * DAY_PX, discarding: age >= MAX_AGE });
    }

    const anyDiscarding = msgs.some((m) => m.discarding);
    const status = anyDiscarding
        ? "A message reached 7d → discarded. The clock evicts it, with or without new traffic."
        : "Messages age as they sit. The stream keeps only the last 7 days.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>MaxAge.</strong>{" "}
                <span style={{ color: STREAM_BLUE, fontWeight: 600 }}>ORDERS</span> keeps the
                last <strong>7 days</strong>. Each message drifts left as it ages; at 7d it is discarded.
            </div>

            <div
                style={{
                    position: "relative",
                    width: TRACK_W,
                    height: TRACK_H + 26,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    padding: "10px 0 0 0",
                    overflow: "hidden",
                }}
            >
                {/* kept window (within MaxAge) */}
                <div
                    style={{
                        position: "absolute",
                        left: LINE_X,
                        width: NOW_X - LINE_X,
                        top: 8,
                        height: TRACK_H,
                        background: `${STREAM_BLUE}12`,
                        borderLeft: `2px dashed #9ca3af`,
                    }}
                />
                {/* discard zone label */}
                <div style={{ position: "absolute", left: 8, top: 8, fontSize: 10, color: RED, fontWeight: 600 }}>
                    discarded
                </div>
                {/* MaxAge marker label */}
                <div style={{ position: "absolute", left: LINE_X - 2, top: TRACK_H + 12, fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>
                    MaxAge 7d
                </div>
                {/* publish marker */}
                <div style={{ position: "absolute", left: NOW_X - 30, top: TRACK_H + 12, fontSize: 10, color: CONSUMER_GREEN, fontFamily: "monospace" }}>
                    publish
                </div>

                {/* messages */}
                {msgs.map((m) => {
                    const color = m.discarding ? RED : STREAM_BLUE;
                    const fade = m.discarding ? Math.max(0, 1 - (m.age - MAX_AGE) / 1.1) : 1;
                    return (
                        <div
                            key={m.k}
                            style={{
                                position: "absolute",
                                left: m.x - 13,
                                top: 8 + (TRACK_H - 34) / 2,
                                width: 26,
                                height: 34,
                                borderRadius: 6,
                                border: `2px solid ${color}`,
                                background: m.discarding ? `${RED}18` : "white",
                                opacity: fade,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "border-color 0.2s, background 0.2s",
                            }}
                        >
                            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color }}>
                                {Math.min(MAX_AGE, Math.floor(m.age))}d
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 18, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function MaxAgeAnimated(_props: { width?: number; height?: number } = {}) {
    return <MaxAgeAnimatedInner />;
}
