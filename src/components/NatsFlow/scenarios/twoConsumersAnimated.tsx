import React, { useEffect, useState } from "react";

// twoConsumersAnimated
// Two consumers read one ORDERS stream from independent positions. `billing`
// has no filter and delivers every message; `analytics` filters to
// orders.shipped and delivers only those. Their cursors advance separately —
// reading from one never moves the other — so they come to rest at different
// positions. billing reaches #6 while analytics, having delivered only the two
// shipped messages, sits back at #5.

const MSGS: { seq: number; kind: "created" | "shipped" }[] = [
    { seq: 1, kind: "created" },
    { seq: 2, kind: "created" },
    { seq: 3, kind: "shipped" },
    { seq: 4, kind: "created" },
    { seq: 5, kind: "shipped" },
    { seq: 6, kind: "created" },
];

const SHIPPED = MSGS.reduce<number[]>(
    (acc, m, i) => (m.kind === "shipped" ? [...acc, i] : acc),
    [],
);

const SLOT_W = 60;
const SLOT_GAP = 8;
const TICK_MS = 90;
const STEP_MS = 1100; // billing advances one slot per step
const PAUSE_MS = 2400; // hold the final split, then restart
const CYCLE_MS = MSGS.length * STEP_MS + PAUSE_MS;

const NAVY = "#375C93"; // billing
const GREEN = "#34A574"; // analytics
const BLUE = "#27AAE1";
const GREY = "#9ca3af";

function slotCenter(i: number) {
    return i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
}

function Cursor({
    left,
    color,
    label,
    top,
}: {
    left: number;
    color: string;
    label: string;
    top: number;
}) {
    return (
        <div
            style={{
                position: "absolute",
                left,
                top,
                transform: "translateX(-50%)",
                transition: "left .45s cubic-bezier(.4,0,.2,1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2,
            }}
        >
            <div style={{ color, fontSize: 12, lineHeight: 1 }}>▲</div>
            <div
                style={{
                    marginTop: 2,
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: "white",
                    background: color,
                    borderRadius: 5,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </div>
        </div>
    );
}

function TwoConsumersAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const t = elapsed % CYCLE_MS;
    const step = Math.floor(t / STEP_MS);

    // billing reads every slot, one per step.
    const billingPos = Math.min(step, MSGS.length - 1);
    const billingCount = Math.min(step + 1, MSGS.length);

    // analytics delivers only shipped slots billing has already reached.
    const analyticsSlots = SHIPPED.filter((i) => i <= billingPos);
    const analyticsCount = analyticsSlots.length;
    const analyticsPos =
        analyticsCount > 0 ? analyticsSlots[analyticsCount - 1] : -1;

    const split = analyticsPos >= 0 && billingPos !== analyticsPos;
    const rowWidth = MSGS.length * SLOT_W + (MSGS.length - 1) * SLOT_GAP;

    return (
        <div style={{ fontFamily: "system-ui, sans-serif", width: "fit-content" }}>
            <div
                style={{
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#6b7280",
                    fontStyle: "italic",
                    maxWidth: rowWidth + 40,
                }}
            >
                One stream, two readers. <strong>billing</strong> has no filter,
                so it delivers every order. <strong>analytics</strong> filters to{" "}
                <code>orders.shipped</code>, so it skips the{" "}
                <code>orders.created</code> messages. Each keeps its own cursor —
                reading from one never moves the other — so they end up at
                different positions.
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
                        fontSize: 11,
                        color: BLUE,
                        fontWeight: 700,
                        marginBottom: 8,
                    }}
                >
                    Stream · ORDERS
                </div>

                {/* slot row */}
                <div style={{ display: "flex", gap: SLOT_GAP }}>
                    {MSGS.map((m, i) => {
                        const readByBilling = billingCount > 0 && i <= billingPos;
                        const isShipped = m.kind === "shipped";
                        const deliveredToAnalytics =
                            isShipped && analyticsSlots.includes(i);
                        return (
                            <div
                                key={i}
                                style={{
                                    width: SLOT_W,
                                    borderRadius: 6,
                                    border: `1px solid ${
                                        deliveredToAnalytics ? GREEN : "#d1d5db"
                                    }`,
                                    background: readByBilling ? "#eef2f7" : "white",
                                    padding: "5px 3px 6px",
                                    textAlign: "center",
                                    boxShadow: deliveredToAnalytics
                                        ? `inset 0 0 0 1px ${GREEN}`
                                        : "none",
                                    transition: "background .3s, border-color .3s",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: "#111827",
                                        lineHeight: 1.1,
                                    }}
                                >
                                    #{m.seq}
                                </div>
                                <div
                                    style={{
                                        marginTop: 3,
                                        fontSize: 8.5,
                                        fontWeight: 700,
                                        fontFamily: "monospace",
                                        color: isShipped ? GREEN : "#94a3b8",
                                    }}
                                >
                                    {m.kind}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* cursor lanes */}
                <div style={{ position: "relative", height: 56, marginTop: 4 }}>
                    {billingCount > 0 && (
                        <Cursor
                            left={slotCenter(billingPos)}
                            color={NAVY}
                            label={`billing → #${MSGS[billingPos].seq}`}
                            top={0}
                        />
                    )}
                    {analyticsPos >= 0 ? (
                        <Cursor
                            left={slotCenter(analyticsPos)}
                            color={GREEN}
                            label={`analytics → #${MSGS[analyticsPos].seq}`}
                            top={28}
                        />
                    ) : (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                top: 32,
                                fontSize: 10.5,
                                fontFamily: "monospace",
                                color: GREEN,
                            }}
                        >
                            analytics → waiting for a shipped order
                        </div>
                    )}
                </div>

                {/* tallies */}
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <Tally
                        color={NAVY}
                        name="billing"
                        filter="no filter"
                        delivered={billingCount}
                        total={MSGS.length}
                    />
                    <Tally
                        color={GREEN}
                        name="analytics"
                        filter="orders.shipped"
                        delivered={analyticsCount}
                        total={SHIPPED.length}
                    />
                </div>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "monospace",
                        color: split ? NAVY : GREY,
                        minHeight: 15,
                    }}
                >
                    {split
                        ? `Separate positions: billing at #${
                              MSGS[billingPos].seq
                          }, analytics at #${MSGS[analyticsPos].seq}`
                        : " "}
                </div>
            </div>
        </div>
    );
}

function Tally({
    color,
    name,
    filter,
    delivered,
    total,
}: {
    color: string;
    name: string;
    filter: string;
    delivered: number;
    total: number;
}) {
    return (
        <div
            style={{
                flex: 1,
                border: `1px solid ${color}`,
                borderRadius: 8,
                background: "white",
                padding: "6px 9px",
            }}
        >
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color,
                    fontFamily: "monospace",
                }}
            >
                {name}
            </div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
                filter: {filter}
            </div>
            <div
                style={{
                    fontSize: 11,
                    color: "#374151",
                    fontFamily: "monospace",
                    marginTop: 3,
                }}
            >
                delivered: {delivered}/{total}
            </div>
        </div>
    );
}

// width / height accepted for API parity with the loader; the diagram
// self-sizes from its content.
export function TwoConsumersAnimated(
    _props: { width?: number; height?: number } = {},
) {
    return <TwoConsumersAnimatedInner />;
}
