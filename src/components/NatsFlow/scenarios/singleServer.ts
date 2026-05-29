import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const singleServerScenario: NatsFlowScenario = {
  description: 'Single server topology — one NATS server with two clients',
  nodes: [
    {
      id: 'client-left',
      type: 'client',
      position: { x: 50, y: 130 },
      data: { label: 'Client' },
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 250, y: 120 },
      data: { label: 'NATS', circular: true },
    },
    {
      id: 'client-right',
      type: 'client',
      position: { x: 450, y: 130 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 'e-left-server',
      source: 'client-left',
      target: 'server',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
    {
      id: 'e-server-right',
      source: 'server',
      target: 'client-right',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
  ],
};
