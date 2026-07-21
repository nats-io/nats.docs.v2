import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, nodeLabel, nodeStack } from './BaseNode';
import { NatsIcon } from '../icons/NatsIcon';
import type { NatsNodeData } from '../types';

export function PublisherNode({ data, selected }: NodeProps) {
  const nodeData = data as NatsNodeData;
  return (
    <BaseNode selected={selected}>
      <div style={nodeStack}>
        <NatsIcon width={24} height={24} />
        <div style={nodeLabel}>{nodeData.label}</div>
      </div>
      {/* Default handle for publish scenarios */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-blue-500"
      />
      {/* Request handle for request-reply scenarios (top) - hidden but functional */}
      <Handle
        type="source"
        position={Position.Right}
        id="request"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ top: '30%', opacity: 0 }}
      />
      {/* Reply handle for request-reply scenarios (bottom) - hidden but functional */}
      <Handle
        type="target"
        position={Position.Right}
        id="reply"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ top: '70%', opacity: 0 }}
      />
      {/* Upward handle for edges to something stacked above the client
          (a trust anchor, say) - hidden but functional. Keep it last so the
          unnamed right-side handle stays the default for plain edges. */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-out"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ opacity: 0 }}
      />
      {/* Vertical + reverse handles, for a peer stacked above or below (or to
          the left of) this node. Declared last so unnamed edges keep using the
          handles above. */}
      <Handle type="target" position={Position.Top} id="top-in" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} id="top-out" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="out-left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="in-left" style={{ opacity: 0 }} />
    </BaseNode>
  );
}

PublisherNode.displayName = 'PublisherNode';
