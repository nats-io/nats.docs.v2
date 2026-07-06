import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

// Topologies deep dive, page 1 (single-server): Acme's dev server `n1` with
// two named clients — `order-svc` publishes orders, `warehouse` subscribes.
// Kept separate from the generic `singleServerScenario` (concept page), which
// uses unnamed "Client" nodes.
export const topologiesSingleServerScenario: NatsFlowScenario = {
  description: 'Single server topology — Acme dev server n1 with order-svc and warehouse clients',
  nodes: [
    {
      id: 'order-svc',
      type: 'client',
      position: { x: 50, y: 130 },
      data: { label: 'order-svc' },
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 250, y: 120 },
      data: { label: 'n1', circular: true },
    },
    {
      id: 'warehouse',
      type: 'client',
      position: { x: 450, y: 130 },
      data: { label: 'warehouse' },
    },
  ],
  edges: [
    {
      id: 'e-order-svc-server',
      source: 'order-svc',
      target: 'server',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
    {
      id: 'e-server-warehouse',
      source: 'server',
      target: 'warehouse',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
  ],
};
