import React, { useEffect, useState } from "react";

// ackResponsesAnimated
// The four responses shown as consequences on a real stream of deliveries, in
// the order they happen:
//   ack  (#1)      → consumer delivers the next message (#2)
//   nak  (#2)      → the SAME message is redelivered immediately
//   ack  (#2 again)→ on to #3
//   term (#3)      → the message is dropped (turns red); next message delivered at once
//   in-progress(#4)→ the Ack Wait wheel fills, the window is extended, #4 stays in flight
//   ack  (#4)      → on to #5
// Reuses the card + ack-chip + filling-wheel vocabulary from
// redeliveryOrderAnimated.

const TICK_MS = 70;

// Overall pacing. Higher = slower, so there's more time to read each step.
// Card times and the caption thresholds below are all expressed at SCALE = 1
// and stretched through this one knob.
const SCALE = 1.6;
const sc = (n: number) => Math.round(n * SCALE);

type Resp = "ack" | "nak" | "term" | "inprogress";

interface Card {
    seq: number;
    resp: Resp;
    deliver: number; // when the consumer hands it over
    respondAt: number; // when the client answers (or, for in-progress, when the wheel starts)
    wheelEnd?: number; // in-progress only: when the extended window elapses and it finally acks
    tag?: string; // small note above the card
}

// Timeline uses two fixed beats so no step is rushed: a ~650 "processing" beat
// (deliver → answer) and a ~1050 "read" beat (answer → next delivery, how long
// the action caption holds). The read beat is deliberately long so nak/term
// don't flash by.
const CARDS: Card[] = [
    { seq: 1, resp: "ack", deliver: sc(0), respondAt: sc(650) },
    { seq: 2, resp: "nak", deliver: sc(1700), respondAt: sc(2350) },
    { seq: 2, resp: "ack", deliver: sc(3400), respondAt: sc(4050), tag: "redelivered" },
    { seq: 3, resp: "term", deliver: sc(5100), respondAt: sc(5750) },
    { seq: 4, resp: "inprogress", deliver: sc(6800), respondAt: sc(7450), wheelEnd: sc(9250) },
    { seq: 5, resp: "ack", deliver: sc(10300), respondAt: sc(10950), tag: "next" },
];
const CYCLE = sc(12000);

const GREEN = "#34A574";
const AMBER = "#f59e0b";
const RED = "#dc2626";
const BLUE = "#27AAE1";
const GREY = "#9ca3af";

function MsgBox({
    seq,
    termed,
    redelivered,
    inflight,
}: {
    seq: number;
    termed: boolean;
    redelivered: boolean;
    inflight: boolean;
}) {
    const border = termed
        ? RED
        : redelivered
        ? GREEN
        : inflight
        ? BLUE
        : "#d1d5db";
    return (
        <div
            style={{
                width: 72,
                borderRadius: 8,
                border: `1.5px ${redelivered ? "dashed" : "solid"} ${border}`,
                background: termed ? "#fef2f2" : "white",
                padding: "7px 4px",
                textAlign: "center",
                opacity: termed ? 0.85 : 1,
            }}
        >
            <div style={{ fontSize: 9.5, color: "#6b7280", fontFamily: "monospace" }}>
                stream
            </div>
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: termed ? RED : "#111827",
                    lineHeight: 1.1,
                    textDecoration: termed ? "line-through" : "none",
                }}
            >
                #{seq}
            </div>
        </div>
    );
}

function Chip({ resp }: { resp: Resp }) {
    const map: Record<
        Exclude<Resp, "inprogress">,
        { bg: string; fg: string; border: string; text: string; dashed?: boolean }
    > = {
        ack: { bg: GREEN, fg: "white", border: GREEN, text: "ack ✓" },
        nak: { bg: "white", fg: AMBER, border: AMBER, text: "nak ↺", dashed: true },
        term: { bg: RED, fg: "white", border: RED, text: "term ✗" },
    };
    const s = map[resp as Exclude<Resp, "inprogress">];
    return (
        <div
            style={{
                width: 72,
                borderRadius: 7,
                padding: "4px 2px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                background: s.bg,
                color: s.fg,
                border: `1.5px ${s.dashed ? "dashed" : "solid"} ${s.border}`,
            }}
        >
            {s.text}
        </div>
    );
}

function Processing() {
    return (
        <div
            style={{
                width: 72,
                borderRadius: 7,
                padding: "4px 2px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "#cbd5e1",
                border: "1.5px dashed #e5e7eb",
            }}
        >
            …
        </div>
    );
}

// Filling wheel: the Ack Wait window, extended by in-progress.
function Wheel({ progress }: { progress: number }) {
    const r = 13;
    const c = 2 * Math.PI * r;
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: 4,
            }}
        >
            <svg width={34} height={34} viewBox="0 0 34 34">
                <circle cx={17} cy={17} r={r} fill="none" stroke="#cfe9f7" strokeWidth={4} />
                <circle
                    cx={17}
                    cy={17}
                    r={r}
                    fill="none"
                    stroke={BLUE}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - progress)}
                    transform="rotate(-90 17 17)"
                />
            </svg>
            <div style={{ fontSize: 8.5, color: BLUE, fontWeight: 700, marginTop: 1 }}>
                in-progress
            </div>
        </div>
    );
}

function caption(t: number): { text: string; color: string } {
    if (t < 650) return { text: "Delivered #1 — the client processes it…", color: GREY };
    if (t < 1700)
        return { text: "ack #1 → the consumer hands you the next message, #2", color: GREEN };
    if (t < 2350) return { text: "Delivered #2 — processing…", color: GREY };
    if (t < 3400)
        return { text: "nak #2 → the same message is redelivered right away", color: AMBER };
    if (t < 4050) return { text: "#2 came back — processing the retry…", color: GREY };
    if (t < 5100) return { text: "ack #2 → on to #3", color: GREEN };
    if (t < 5750) return { text: "Delivered #3 — processing…", color: GREY };
    if (t < 6800)
        return {
            text: "term #3 → dropped (it goes red); the next message, #4, is delivered at once",
            color: RED,
        };
    if (t < 7450) return { text: "Delivered #4 — processing…", color: GREY };
    if (t < 9250)
        return {
            text: "in-progress #4 → the Ack Wait window keeps extending, #4 stays in flight",
            color: BLUE,
        };
    if (t < 10300) return { text: "ack #4 → the long job finished; on to #5", color: GREEN };
    if (t < 10950) return { text: "Delivered #5 — processing…", color: GREY };
    return { text: "ack #5 → done", color: GREEN };
}

function AckResponsesAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((x) => x + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);
    const t = elapsed % CYCLE;
    const cycleIndex = Math.floor(elapsed / CYCLE);
    // caption thresholds are written at SCALE = 1, so compare against the
    // un-stretched time.
    const cap = caption(t / SCALE);

    const shown = CARDS.filter((c) => t >= c.deliver);

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", width: "fit-content" }}>
            <div
                style={{
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#6b7280",
                    fontStyle: "italic",
                    maxWidth: 660,
                }}
            >
                One consumer, one client, answered four ways. <strong>ack</strong>{" "}
                advances to the next message; <strong>nak</strong> brings the same
                one straight back; <strong>term</strong> drops it (it turns red)
                and the next is delivered at once; <strong>in-progress</strong>{" "}
                isn't an answer — it fills the Ack Wait window again to keep a slow
                message in flight.
            </div>

            <div
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    padding: "14px 16px",
                }}
            >
                <div
                    style={{
                        fontSize: 9,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        fontWeight: 600,
                        marginBottom: 8,
                    }}
                >
                    Delivered, in the order received →
                </div>

                <div
                    key={cycleIndex}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", minHeight: 165 }}
                >
                    {shown.map((c, i) => {
                        const isInprogress = c.resp === "inprogress";
                        const wheelActive =
                            isInprogress && t >= c.respondAt && t < (c.wheelEnd ?? 0);
                        const wheelDone = isInprogress && t >= (c.wheelEnd ?? 0);
                        const answered = t >= c.respondAt;
                        const termed = c.resp === "term" && answered;
                        const redelivered = c.tag === "redelivered";

                        const wheelProgress = wheelActive
                            ? (t - c.respondAt) / ((c.wheelEnd ?? 1) - c.respondAt)
                            : 0;

                        return (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                {c.tag ? (
                                    <div
                                        style={{
                                            fontSize: 8.5,
                                            fontWeight: 700,
                                            color: redelivered ? AMBER : GREY,
                                            height: 11,
                                        }}
                                    >
                                        {redelivered ? "↺ redelivered" : "next →"}
                                    </div>
                                ) : (
                                    <div style={{ height: 11 }} />
                                )}

                                <MsgBox
                                    seq={c.seq}
                                    termed={termed}
                                    redelivered={redelivered && answered}
                                    inflight={wheelActive}
                                />

                                <div
                                    style={{
                                        fontSize: 11,
                                        color: answered ? "#9ca3af" : "#e5e7eb",
                                        lineHeight: 1,
                                    }}
                                >
                                    ↓
                                </div>

                                {!answered ? (
                                    <Processing />
                                ) : isInprogress && wheelActive ? (
                                    <Wheel progress={wheelProgress} />
                                ) : isInprogress && wheelDone ? (
                                    <Chip resp="ack" />
                                ) : (
                                    <Chip resp={c.resp} />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: cap.color,
                        fontFamily: "monospace",
                        minHeight: 16,
                    }}
                >
                    {cap.text}
                </div>
            </div>
        </div>
    );
}

// width / height accepted for API parity with the loader; the diagram
// self-sizes from its content.
export function AckResponsesAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <AckResponsesAnimatedInner />;
}
