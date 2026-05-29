import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const clusterScenario: NatsFlowScenario = {
  description: 'Cluster topology — three NATS servers in a full mesh with two clients',
  nodes: [
    {
      id: 'server-top',
      type: 'server',
      position: { x: 250, y: 0 },
      data: { label: 'NATS', circular: true },
    },
    {
      id: 'server-bl',
      type: 'server',
      position: { x: 100, y: 180 },
      data: { label: 'NATS', circular: true },
    },
    {
      id: 'server-br',
      type: 'server',
      position: { x: 400, y: 180 },
      data: { label: 'NATS', circular: true },
    },
    {
      id: 'client-left',
      type: 'client',
      position: { x: 0, y: 10 },
      data: { label: 'Client' },
    },
    {
      id: 'client-right',
      type: 'client',
      position: { x: 500, y: 10 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 'route-top-bl',
      source: 'server-top',
      target: 'server-bl',
      type: 'floating',
      data: { color: '#375C93' },
    },
    {
      id: 'route-top-br',
      source: 'server-top',
      target: 'server-br',
      type: 'floating',
      data: { color: '#375C93' },
    },
    {
      id: 'route-bl-br',
      source: 'server-bl',
      target: 'server-br',
      type: 'floating',
      data: { color: '#375C93' },
    },
    {
      id: 'client-right-to-server',
      source: 'client-right',
      target: 'server-top',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
    {
      id: 'server-to-client-left',
      source: 'server-bl',
      target: 'client-left',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#9ca3af' },
    },
  ],
};
