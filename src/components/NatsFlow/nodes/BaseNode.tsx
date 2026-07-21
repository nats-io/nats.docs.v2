import React from 'react';
import { cn } from '../lib/utils';

interface BaseNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}

// Shared inner layout for the icon-over-label content each node renders.
export const nodeStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
};

export const nodeLabel: React.CSSProperties = {
  fontWeight: 600,
  color: '#1f2937',
};

export const nodeSubLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 400,
  color: '#6b7280',
};

// The box every non-circular node draws itself in. Styled inline rather than
// with utility classes: this project has no Tailwind, so class names like
// `rounded-lg border-2 bg-white` resolve to nothing and the node renders as bare
// text over the edges behind it. The circular ServerNode variant is inline-styled
// for the same reason.
export const BaseNode = React.forwardRef<HTMLDivElement, BaseNodeProps>(
  ({ className, selected, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          background: '#ffffff',
          border: `2px solid ${selected ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: selected
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.12)'
            : '0 1px 3px rgba(0, 0, 0, 0.12)',
          textAlign: 'center',
          fontSize: '13px',
          lineHeight: 1.3,
          color: '#374151',
          whiteSpace: 'nowrap',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BaseNode.displayName = 'BaseNode';
