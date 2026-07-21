import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BaseNode, nodeLabel, nodeStack, nodeSubLabel } from './BaseNode';
import { NatsIcon } from '../icons/NatsIcon';
import LeafIcon from '../../Icons/LeafIcon';
import type { NatsNodeData } from '../types';

export function ServerNode({ data, selected }: NodeProps) {
  const nodeData = data as NatsNodeData;
  const circular = (data as any).circular;

  if (circular) {
    return (
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          border: `3px solid ${(data as any).borderColor || '#375C93'}`,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {(data as any).icon === 'leaf'
          ? <span style={{ color: (data as any).iconColor }}><LeafIcon width={24} height={24} /></span>
          : <NatsIcon width={28} height={28} />}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>
          {nodeData.label}
          {(data as any).subtitle && <div style={{ fontWeight: 400, fontSize: 11, color: '#6b7280' }}>{(data as any).subtitle}</div>}
        </div>
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        <Handle type="target" position={Position.Top} id="top-in" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Top} id="top-out" style={{ opacity: 0 }} />
        <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ opacity: 0 }} />
      </div>
    );
  }

  return (
    <BaseNode selected={selected}>
      <div style={nodeStack}>
        <NatsIcon width={32} height={32} />
        <div style={nodeLabel}>{nodeData.label}</div>
        {/* Defaults to "Server"; pass data.subtitle to say something more useful,
            or an empty string to drop the line. Anything that isn't a NATS
            server should use BoxNode instead of overriding this. */}
        {(data as any).subtitle !== "" && (
          <div style={nodeSubLabel}>{(data as any).subtitle ?? 'Server'}</div>
        )}
      </div>
      {/* Default handles for pub-sub */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-blue-500"
      />
      {/* Request-reply handles - hidden but functional */}
      <Handle
        type="target"
        position={Position.Left}
        id="request-in"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="request-out"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="reply-in"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="reply-out"
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
    </BaseNode>
  );
}

ServerNode.displayName = 'ServerNode';
