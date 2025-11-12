import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const requestReplyScenario: NatsFlowScenario = {
  description: 'Request-reply pattern where a client sends a request and waits for a response from a service',
  nodes: [
    {
      id: 'client',
      type: 'publisher',
      position: { x: 50, y: 150 },
      data: { label: 'Client' },
    },
    {
      id: 'service',
      type: 'service',
      position: { x: 350, y: 150 },
      data: { label: 'Service' },
    },
  ],
  edges: [
    {
      id: 'request',
      source: 'client',
      target: 'service',
      sourceHandle: undefined,
      targetHandle: 'request',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#f97316', animated: true, label: 'request' },
    },
    {
      id: 'reply',
      source: 'service',
      target: 'client',
      sourceHandle: 'reply',
      targetHandle: undefined,
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#10b981', animated: true, label: 'reply' },
      style: { strokeDasharray: '5,5' },
    },
  ],
};
