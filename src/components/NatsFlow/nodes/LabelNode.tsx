import React from 'react';
import { type NodeProps } from '@xyflow/react';

export function LabelNode({ data }: NodeProps) {
  return (
    <div
      style={{
        fontSize: (data as any).fontSize || 14,
        fontWeight: 600,
        fontStyle: 'italic',
        color: (data as any).color || '#6b7280',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {(data as any).label}
    </div>
  );
}

LabelNode.displayName = 'LabelNode';
