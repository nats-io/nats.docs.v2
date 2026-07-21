import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, nodeLabel, nodeSubLabel } from './BaseNode';

// A plain labelled box for the things in a diagram that are not NATS servers or
// clients: a stream, a KV bucket, a subject, a Prometheus instance, a config
// file. ServerNode would give these the NATS logo and a literal "Server"
// subtitle, which reads as a claim that they are servers.
//
// Handles mirror ServerNode's non-circular set, so switching a node from
// "server" to "box" keeps every edge that pins a handle working.
export function BoxNode({ data, selected }: NodeProps) {
  const nodeData = data as {
    label: string;
    subtitle?: string;
    accent?: string;
  };

  return (
    <BaseNode
      selected={selected}
      style={nodeData.accent ? { borderColor: nodeData.accent } : undefined}
    >
      <div style={nodeData.accent ? { ...nodeLabel, color: nodeData.accent } : nodeLabel}>
        {nodeData.label}
      </div>
      {nodeData.subtitle && (
        <div style={nodeSubLabel}>{nodeData.subtitle}</div>
      )}

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle
        type="target"
        position={Position.Left}
        id="request-in"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="request-out"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="reply-in"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="reply-out"
        style={{ opacity: 0 }}
      />
      {/* Aliases for ServiceNode's and SubscriberNode's handle ids, so a node
          can be switched to this type without re-pinning its edges. */}
      <Handle
        type="target"
        position={Position.Left}
        id="request"
        style={{ top: '30%', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="reply"
        style={{ top: '70%', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-out"
        style={{ opacity: 0 }}
      />
      <Handle type="source" position={Position.Top} id="top-out" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ opacity: 0 }} />
    </BaseNode>
  );
}

BoxNode.displayName = 'BoxNode';
