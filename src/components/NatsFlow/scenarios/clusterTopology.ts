import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const CLIENT_COLOR = '#3b82f6';

export const clusterTopologyScenario: NatsFlowScenario = {
  description: 'A NATS cluster: multiple servers form a full mesh of routes, and clients can connect to any server.',
  nodes: [
    {
      id: 'client-1',
      type: 'publisher',
      position: { x: 60, y: 80 },
      data: { label: 'Client' },
    },
    {
      id: 's1',
      type: 'server',
      position: { x: 380, y: 80 },
      data: { label: 'NATS' },
    },
    {
      id: 's2',
      type: 'server',
      position: { x: 240, y: 300 },
      data: { label: 'NATS' },
    },
    {
      id: 's3',
      type: 'server',
      position: { x: 520, y: 300 },
      data: { label: 'NATS' },
    },
    {
      id: 'client-2',
      type: 'subscriber',
      position: { x: 780, y: 300 },
      data: { label: 'Client' },
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
      id: 'c1-s1',
      source: 'client-1',
      target: 's1',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
    {
      id: 's3-c2',
      source: 's3',
      target: 'client-2',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
  ],
};
