import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const LEAF_COLOR = '#9333ea';
const CLIENT_COLOR = '#3b82f6';

export const leafnodeTopologyScenario: NatsFlowScenario = {
  description: 'Leaf nodes: lightweight edge servers that connect outward to a central hub cluster.',
  nodes: [
    {
      id: 'cloud',
      type: 'region',
      position: { x: 40, y: 40 },
      data: { label: 'Cloud', width: 400, height: 420 },
      draggable: false,
      selectable: false,
    },
    {
      id: 's1',
      type: 'server',
      position: { x: 180, y: 90 },
      data: { label: 'NATS' },
    },
    {
      id: 's2',
      type: 'server',
      position: { x: 80, y: 320 },
      data: { label: 'NATS' },
    },
    {
      id: 's3',
      type: 'server',
      position: { x: 280, y: 320 },
      data: { label: 'NATS' },
    },
    {
      id: 'leaf',
      type: 'server',
      position: { x: 620, y: 200 },
      data: { label: 'Leaf Node' },
    },
    {
      id: 'edge-app',
      type: 'subscriber',
      position: { x: 800, y: 200 },
      data: { label: 'Edge App' },
    },
  ],
  edges: [
    {
      id: 's2-s1',
      source: 's2',
      target: 's1',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 's1-s3',
      source: 's1',
      target: 's3',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 's2-s3',
      source: 's2',
      target: 's3',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 's3-leaf',
      source: 's3',
      target: 'leaf',
      type: 'animated',
      data: { color: LEAF_COLOR, animated: false, straight: true, label: 'leaf' },
    },
    {
      id: 'leaf-edge',
      source: 'leaf',
      target: 'edge-app',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
  ],
};
