import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const GREEN = '#34A574';
const BLUE = '#27AAE1';
const GRAY = '#9ca3af';

export const leafNodeScenario: NatsFlowScenario = {
  description: 'Leaf node topology — a leaf server bridging to a cluster',
  nodes: [
    // Cluster servers (green triangle)
    {
      id: 'cluster-top',
      type: 'server',
      position: { x: 350, y: 10 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    {
      id: 'cluster-bl',
      type: 'server',
      position: { x: 250, y: 180 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    {
      id: 'cluster-br',
      type: 'server',
      position: { x: 450, y: 180 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    // Leaf node (blue)
    {
      id: 'leaf',
      type: 'server',
      position: { x: 80, y: 20 },
      data: { label: 'NATS', subtitle: 'Leaf', circular: true, borderColor: GREEN, icon: 'leaf', iconColor: GREEN },
    },
    // Clients
    {
      id: 'client-leaf',
      type: 'client',
      position: { x: 0, y: 190 },
      data: { label: 'Client' },
    },
    {
      id: 'client-cluster',
      type: 'client',
      position: { x: 530, y: 30 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    // Cluster mesh (green)
    { id: 'c-top-bl', source: 'cluster-top', target: 'cluster-bl', type: 'floating', data: { color: BLUE } },
    { id: 'c-top-br', source: 'cluster-top', target: 'cluster-br', type: 'floating', data: { color: BLUE } },
    { id: 'c-bl-br', source: 'cluster-bl', target: 'cluster-br', type: 'floating', data: { color: BLUE } },
    // Leaf connection to cluster (blue)
    { id: 'leaf-to-cluster', source: 'leaf', target: 'cluster-bl', type: 'floating', data: { color: GREEN } },
    // Client connections
    {
      id: 'client-leaf-conn',
      source: 'client-leaf',
      target: 'leaf',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: GRAY },
    },
    {
      id: 'client-cluster-conn',
      source: 'cluster-top',
      target: 'client-cluster',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: GRAY },
    },
  ],
};
