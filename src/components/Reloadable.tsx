import React from "react";

import ReloadIcon from "./Icons/ReloadIcon";
import PowerIcon from "./Icons/PowerIcon";
import BanIcon from "./Icons/BanIcon";
import styles from "./PropertyMeta.module.css";

/**
 * A property's hot-reload verdict. The vocabulary matches the generator's
 * `Reload` type and the `reloadable-audit.tsv` columns it was backfilled from.
 * Left undefined when no verdict has been established, in which case no badge
 * is shown — only the note, if there is one. Absence of a badge means
 * "unverified", never "yes".
 */
type State = "reloadable" | "not-reloadable" | "noop";

type Props = {
  state?: State;
  /** Caveat shown beneath the badge, e.g. which changes are rejected. */
  note?: string;
};

// Distinct glyphs, not just a label swap: these are scanned far more often
// than they are read. Circular arrows read as "re-read the config in place", a
// power symbol as "cycle the process", a slashed circle as "this went nowhere".
//
// Only "Requires Restart" is dimmed. A silent no-op is the most dangerous of
// the three — the reload succeeds and nothing tells the operator the change was
// discarded — so it keeps full contrast rather than reading as a quiet aside.
const BADGES: Record<State, { Icon: typeof ReloadIcon; label: string; muted: boolean }> = {
  "reloadable": { Icon: ReloadIcon, label: "Hot Reloadable", muted: false },
  "not-reloadable": { Icon: PowerIcon, label: "Requires Restart", muted: true },
  "noop": { Icon: BanIcon, label: "Ignored Until Restart", muted: false },
};

// The note arrives as a plain string attribute, so markdown in it is not
// processed. Backticks are the only markup the notes use, and rendering them as
// code rather than literal backticks is worth the few lines.
function renderInlineCode(text: string) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? <code key={i}>{part}</code> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

export default function Reloadable({ state, note }: Props) {
  const badge = state ? BADGES[state] : undefined;

  return (
    <div className={styles.meta}>
      {badge && (
        <span
          className={`${styles.badge} ${badge.muted ? styles.badgeMuted : ""}`}
        >
          <badge.Icon width={18} height={18} />
          <span>{badge.label}</span>
        </span>
      )}
      {note && <div className={styles.note}>{renderInlineCode(note)}</div>}
    </div>
  );
}
