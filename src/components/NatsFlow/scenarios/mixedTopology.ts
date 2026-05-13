import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const LEAF_COLOR = '#9333ea';
const CLIENT_COLOR = '#3b82f6';

export const mixedTopologyScenario: NatsFlowScenario = {
  description: 'A real deployment mixes topologies: a cluster in the cloud with leaf nodes at the edge.',
  nodes: [
    {
      id: 'cloud-client',
      type: 'publisher',
      position: { x: 40, y: 80 },
      data: { label: 'Cloud Service' },
    },
    {
      id: 's1',
      type: 'server',
      position: { x: 220, y: 80 },
      data: { label: 'NATS' },
    },
    {
      id: 's2',
      type: 'server',
      position: { x: 420, y: 80 },
      data: { label: 'NATS' },
    },
    {
      id: 'leaf',
      type: 'server',
      position: { x: 420, y: 280 },
      data: { label: 'Leaf Node' },
    },
    {
      id: 'edge-app',
      type: 'subscriber',
      position: { x: 600, y: 280 },
      data: { label: 'Edge App' },
    },
  ],
  edges: [
    {
      id: 's1-s2',
      source: 's1',
      target: 's2',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, label: 'route' },
    },
    {
      id: 'cloud-s1',
      source: 'cloud-client',
      target: 's1',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
    {
      id: 'leaf-s2',
      source: 'leaf',
      target: 's2',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: LEAF_COLOR, animated: false, label: 'leaf' },
    },
    {
      id: 'leaf-edge',
      source: 'leaf',
      target: 'edge-app',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
  ],
};
