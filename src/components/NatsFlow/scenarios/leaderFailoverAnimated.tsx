import React, { useEffect, useState } from "react";

// leaderFailoverAnimated
// The write path on an R=3 stream, then a leader failover. order-svc publishes
// to n1, the stream leader. The leader copies the write to followers n2 and n3.
// Once a majority (two of three) holds it, the PubAck returns — the order is
// durable. Then n1's server dies; because the order already reached a majority,
// no acked write is lost. The remaining replicas elect n2, and writes resume.

const TICK_MS = 80;

const BLUE = "#27AAE1";
const GREEN = "#34A574";
const RED = "#ef4444";
const NAVY = "#375C93";
const AMBER = "#d97706";

const PHASES = [
    { key: "publish", dur: 1700 },
    { key: "replicate", dur: 1800 },
    { key: "ack", dur: 1900 },
    { key: "leaderdies", dur: 1800 },
    { key: "elect", dur: 2300 },
];
const CYCLE = PHASES.reduce((s, p) => s + p.dur, 0);

function phaseAt(t: number) {
    let acc = 0;
    for (const ph of PHASES) {
        if (t < acc + ph.dur) return { key: ph.key, p: (t - acc) / ph.dur };
        acc += ph.dur;
    }
    return { key: "elect", p: 1 };
}

function ServerBox({
    name,
    role,
    hasWrite,
    landing,
    p,
}: {
    name: string;
    role: "leader" | "follower" | "dead";
    hasWrite: boolean;
    landing: boolean;
    p: number;
}) {
    const dead = role === "dead";
    const leader = role === "leader";
    const border = dead ? RED : leader ? BLUE : NAVY;
    return (
        <div
            style={{
                width: 104,
                height: 66,
                borderRadius: 8,
                border: `2px ${dead ? "dashed" : "solid"} ${border}`,
                background: dead ? "#fef2f2" : leader ? "#eef8fd" : "white",
                opacity: dead ? 0.6 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                transition: "border-color 0.25s, background 0.25s",
            }}
        >
            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: dead ? RED : "#374151" }}>{name}</span>
            <span
                style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: dead ? RED : leader ? BLUE : "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {dead ? "down" : role}
            </span>
            {/* the replicated write */}
            <span
                style={{
                    marginTop: 5,
                    fontSize: 9,
                    fontFamily: "monospace",
                    padding: "1px 6px",
                    borderRadius: 4,
                    border: `1px ${hasWrite ? "solid" : "dashed"} ${hasWrite ? GREEN : "#d1d5db"}`,
                    background: hasWrite ? "#ecfdf5" : "transparent",
                    color: hasWrite ? GREEN : "#cbd0d6",
                    opacity: dead ? 0.5 : landing ? 0.3 + 0.7 * p : 1,
                }}
            >
                {hasWrite ? "order #7" : "—"}
            </span>
            {dead && <span style={{ position: "absolute", top: 2, right: 5, fontSize: 13, color: RED, fontWeight: 800 }}>✕</span>}
        </div>
    );
}

function Arrow({ active, color }: { active: boolean; color: string }) {
    return (
        <span
            style={{
                fontSize: 20,
                fontWeight: 700,
                color: active ? color : "#d1d5db",
                opacity: active ? 1 : 0.5,
                transition: "color 0.2s",
            }}
        >
            ⇒
        </span>
    );
}

function LeaderFailoverAnimatedInner() {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const { key, p } = phaseAt(elapsed % CYCLE);
    const isPublish = key === "publish";
    const isReplicate = key === "replicate";
    const isAck = key === "ack";
    const isDead = key === "leaderdies";
    const isElect = key === "elect";
    const down = isDead || isElect;

    const n1Role: "leader" | "follower" | "dead" = down ? "dead" : "leader";
    const n2Role: "leader" | "follower" | "dead" = isElect ? "leader" : "follower";
    const n3Role: "leader" | "follower" | "dead" = "follower";

    const n1Has = !down; // n1 holds it until its server dies
    const n2Has = isReplicate || isAck || down;
    const n3Has = isAck || down;

    const ackSafe = isAck || down; // PubAck has returned by the ack stage
    const pubAck = ackSafe
        ? { text: "PubAck: stored 2/3 ✓", color: GREEN }
        : { text: "PubAck: waiting…", color: AMBER };

    const status =
        isPublish
            ? "order-svc publishes orders.created to n1, the stream leader."
            : isReplicate
              ? "The leader copies the write to its followers, n2 and n3."
              : isAck
                ? "Two of three have it — a majority. The PubAck returns: the order is safe."
                : isDead
                  ? "n1's server dies. Its copy is gone, but the order reached a majority first."
                  : "The followers elect n2 as the new leader. Writes resume; no acked order is lost.";

    return (
        <div style={{ fontFamily: "system-ui, sans-serif" }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                <strong>The leader, and what happens when it dies.</strong> Every write goes
                through the leader and is acked only once a{" "}
                <span style={{ color: GREEN, fontWeight: 600 }}>majority</span> holds it.
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "18px 20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#fafafa",
                    width: "fit-content",
                }}
            >
                {/* publisher + PubAck chip */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                        style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: `2px solid ${BLUE}`,
                            background: "white",
                            fontSize: 11,
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#374151",
                        }}
                    >
                        order-svc
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: pubAck.color, background: `${pubAck.color}14`, border: `1px solid ${pubAck.color}`, borderRadius: 4, padding: "2px 5px", textAlign: "center" }}>
                        {pubAck.text}
                    </span>
                </div>

                <Arrow active={isPublish} color={BLUE} />

                {/* leader n1 */}
                <ServerBox name="n1" role={n1Role} hasWrite={n1Has} landing={isPublish} p={p} />

                {/* replication arrows to the two followers */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <Arrow active={isReplicate || isAck} color={BLUE} />
                    <Arrow active={isReplicate || isAck} color={BLUE} />
                </div>

                {/* followers n2 / n3 stacked */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ServerBox name="n2" role={n2Role} hasWrite={n2Has} landing={isReplicate} p={p} />
                    <ServerBox name="n3" role={n3Role} hasWrite={n3Has} landing={isAck} p={p} />
                </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
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

export function LeaderFailoverAnimated(_props: { width?: number; height?: number } = {}) {
    return <LeaderFailoverAnimatedInner />;
}
