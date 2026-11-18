import React from 'react';
import type {ComponentProps} from 'react';

// Thin strokes to match the header's other icons.
export default function IconSystemColorMode(props: ComponentProps<'svg'>): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
