import React from "react";

import ReloadIcon from "./Icons/ReloadIcon";

export default function Reloadable() {
  return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ReloadIcon width={18} height={18} />
        <span>Hot Reloadable</span>
      </span>
  );
}
