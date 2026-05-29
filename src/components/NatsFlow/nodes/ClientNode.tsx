import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NatsNodeData } from '../types';

export function ClientNode({ data, selected }: NodeProps) {
  const nodeData = data as NatsNodeData;
  return (
    <div
      style={{
        border: `2px solid ${selected ? '#3b82f6' : '#9ca3af'}`,
        backgroundColor: 'white',
        padding: '8px 20px',
        fontWeight: 500,
        color: '#6b7280',
      }}
    >
      {nodeData.label}
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

ClientNode.displayName = 'ClientNode';
