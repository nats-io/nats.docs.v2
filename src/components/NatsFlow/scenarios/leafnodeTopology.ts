import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const LEAF_COLOR = '#9333ea';
const CLIENT_COLOR = '#3b82f6';

export const leafnodeTopologyScenario: NatsFlowScenario = {
  description: 'Leaf nodes: lightweight edge servers that connect outward to a central hub cluster.',
  nodes: [
    {
      id: 'edge-1',
      type: 'publisher',
      position: { x: 40, y: 80 },
      data: { label: 'Edge App' },
    },
    {
      id: 'leaf-1',
      type: 'server',
      position: { x: 220, y: 80 },
      data: { label: 'Leaf Node' },
    },
    {
      id: 'edge-2',
      type: 'subscriber',
      position: { x: 40, y: 320 },
      data: { label: 'Edge App' },
    },
    {
      id: 'leaf-2',
      type: 'server',
      position: { x: 220, y: 320 },
      data: { label: 'Leaf Node' },
    },
    {
      id: 'hub',
      type: 'server',
      position: { x: 480, y: 200 },
      data: { label: 'Hub' },
    },
  ],
  edges: [
    {
      id: 'edge1-leaf1',
      source: 'edge-1',
      target: 'leaf-1',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
    {
      id: 'edge2-leaf2',
      source: 'edge-2',
      target: 'leaf-2',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
    {
      id: 'leaf1-hub',
      source: 'leaf-1',
      target: 'hub',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: LEAF_COLOR, animated: false, label: 'leaf' },
    },
    {
      id: 'leaf2-hub',
      source: 'leaf-2',
      target: 'hub',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: LEAF_COLOR, animated: false, label: 'leaf' },
    },
  ],
};
