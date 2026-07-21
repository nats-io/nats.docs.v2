import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, nodeLabel, nodeStack } from './BaseNode';
import { NatsIcon } from '../icons/NatsIcon';
import type { NatsNodeData } from '../types';

export function ServiceNode({ data, selected }: NodeProps) {
  const nodeData = data as NatsNodeData;
  return (
    <BaseNode selected={selected}>
      <div style={nodeStack}>
        <NatsIcon width={24} height={24} />
        <div style={nodeLabel}>{nodeData.label}</div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="request"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ top: '30%', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="reply"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ top: '70%', opacity: 0 }}
      />
      {/* Both handles above face left, which suits a responder answering back
          the way the request came. A service chained to something on its right,
          or stacked above or below it, needs these instead — pin them on the
          edge. They are declared after `reply` so it stays the fallback for
          edges that don't name a handle. */}
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="out-top"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="in-top"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="in-bottom"
        style={{ opacity: 0 }}
      />
    </BaseNode>
  );
}

ServiceNode.displayName = 'ServiceNode';
