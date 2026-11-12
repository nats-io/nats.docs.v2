import React from 'react';
import type {ComponentProps} from 'react';

// Thin strokes to match the header's other icons.
export default function IconDarkMode(props: ComponentProps<'svg'>): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}
