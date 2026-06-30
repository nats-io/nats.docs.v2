import React, { useEffect, useState } from "react";

// maxAgeAnimated
// MaxAge limit. A publisher stores 1-2 orders a day (an irregular schedule).
// Each order enters ORDERS on the right at age 0 and drifts left as it ages.
// The stream keeps the last 7 days (the shaded window); when an order reaches
// MaxAge it crosses the 7d line on the left, flashes, and is discarded.

const TICK_MS = 80;
const DAY_MS = 720; // wall-clock ms per simulated day
const DAY_PX = 58; // pixels per day on the track
const MAX_AGE = 7; // days
const SCHEDULE = [2, 1, 2, 1, 2, 2, 1, 2, 1, 2]; // orders published per day (cyclic)

const TRACK_W = 460;
const TRACK_H = 56;
const NOW_X = TRACK_W - 14; // x of a just-published order (age 0)
const LINE_X = NOW_X - MAX_AGE * DAY_PX; // x of the MaxAge boundary

const STREAM_BLUE = "#27AAE1";
const CONSUMER_GREEN = "#34A574";
const WORKER_NAVY = "#375C93";
const RED = "#ef4444";

function birthsForDay(d: number): number[] {
    const c = SCHEDULE[((d % SCHEDULE.length) + SCHEDULE.length) % SCHEDULE.length];
    if (c <= 0) return [];
    if (c === 1) return [d + 0.5];
    return [d + 0.25, d + 0.75];
}

function MaxAgeAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const dayNow = elapsed / DAY_MS;

    const msgs: { key: number; age: number; x: number; discarding: boolean }[] = [];
    const dStart = Math.floor(dayNow - (MAX_AGE + 1.2));
    const dEnd = Math.floor(dayNow);
    for (let d = dStart; d <= dEnd; d++) {
        if (d < 0) continue;
        for (const birth of birthsForDay(d)) {
            if (birth > dayNow) continue; // not published yet
            const age = dayNow - birth;
            if (age > MAX_AGE + 1.1) continue;
            msgs.push({ key: birth, age, x: NOW_X - age * DAY_PX, discarding: age >= MAX_AGE });
        }
    }

    const emitting = msgs.some((m) => m.age < 0.22);
    const stored = msgs.filter((m) => !m.discarding).length;
    const anyDiscarding = msgs.some((m) => m.discarding);
    const status = anyDiscarding
        ? `An order reached 7d → discarded. ${stored} still within the window.`
        : `Publishing 1-2 orders a day. ${stored} within the last 7 days.`;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>MaxAge.</strong> The publisher stores 1-2 orders a day. Each drifts
                left as it ages; at <strong>7d</strong> it crosses the line and is discarded.
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* the track */}
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
                        flex: "none",
                    }}
                >
                    {/* discard zone (left of the line) */}
                    <div style={{ position: "absolute", left: 0, width: LINE_X, top: 8, height: TRACK_H, background: `${RED}0c` }} />
                    {/* kept window (within MaxAge) */}
                    <div
                        style={{
                            position: "absolute",
                            left: LINE_X,
                            width: NOW_X - LINE_X,
                            top: 8,
                            height: TRACK_H,
                            background: `${STREAM_BLUE}12`,
                            borderLeft: `2px dashed ${RED}`,
                        }}
                    />
                    {/* discard zone label */}
                    <div style={{ position: "absolute", left: 8, top: 8, fontSize: 10, color: RED, fontWeight: 600 }}>discarded</div>
                    {/* MaxAge marker label */}
                    <div style={{ position: "absolute", left: LINE_X - 2, top: TRACK_H + 12, fontSize: 10, color: RED, fontFamily: "monospace", fontWeight: 600 }}>7d</div>

                    {/* messages */}
                    {msgs.map((m) => {
                        const color = m.discarding ? RED : STREAM_BLUE;
                        const fade = m.discarding ? Math.max(0, 1 - (m.age - MAX_AGE) / 1.1) : 1;
                        const justBorn = m.age < 0.22;
                        return (
                            <div
                                key={m.key}
                                style={{
                                    position: "absolute",
                                    left: m.x - 11,
                                    top: 8 + (TRACK_H - 32) / 2,
                                    width: 22,
                                    height: 32,
                                    borderRadius: 5,
                                    border: `2px solid ${justBorn ? CONSUMER_GREEN : color}`,
                                    background: m.discarding ? `${RED}18` : justBorn ? "#ecfdf5" : "white",
                                    opacity: fade,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "border-color 0.2s, background 0.2s",
                                }}
                            >
                                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: justBorn ? CONSUMER_GREEN : color }}>
                                    {Math.min(MAX_AGE, Math.floor(m.age))}d
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* emit arrow (points left, into the track) */}
                <svg width={26} height={TRACK_H} style={{ flex: "none", overflow: "visible" }}>
                    <line x1={26} y1={TRACK_H / 2} x2={4} y2={TRACK_H / 2} stroke={emitting ? CONSUMER_GREEN : "#cbd5e1"} strokeWidth={2} style={{ transition: "stroke 0.2s" }} />
                    <path d={`M4 ${TRACK_H / 2} l8 -5 l0 10 z`} fill={emitting ? CONSUMER_GREEN : "#cbd5e1"} style={{ transition: "fill 0.2s" }} />
                </svg>

                {/* publisher */}
                <div
                    style={{
                        flex: "none",
                        width: 78,
                        height: 46,
                        borderRadius: 8,
                        border: `2px solid ${emitting ? CONSUMER_GREEN : WORKER_NAVY}`,
                        background: emitting ? "#ecfdf5" : "white",
                        boxShadow: emitting ? `0 0 0 4px ${CONSUMER_GREEN}22` : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: emitting ? CONSUMER_GREEN : WORKER_NAVY,
                        transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
                    }}
                >
                    publisher
                </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>{status}</div>
        </div>
    );
}

export function MaxAgeAnimated(_props: { width?: number; height?: number } = {}) {
    return <MaxAgeAnimatedInner />;
}
