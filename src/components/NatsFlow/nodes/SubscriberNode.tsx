import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, nodeLabel, nodeStack } from './BaseNode';
import { NatsIcon } from '../icons/NatsIcon';
import type { NatsNodeData } from '../types';

export function SubscriberNode({ data, selected }: NodeProps) {
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
        className="!h-3 !w-3 !bg-blue-500"
      />
      {/* A subscriber also talks back — an ack, a fetch, a SlowConsumer error.
          Without a source handle React Flow silently drops any edge that starts
          here. Right is the default; `out-left` is for a target that sits to the
          left, so the edge runs between the nodes instead of looping around. */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={{ opacity: 0 }}
      />
      {/* Vertical + reverse handles, for a peer stacked above or below (or to
          the left of) this node. Declared last so unnamed edges keep using the
          handles above. */}
      <Handle type="target" position={Position.Top} id="top-in" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top-out" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ opacity: 0 }} />
    </BaseNode>
  );
}

SubscriberNode.displayName = 'SubscriberNode';
