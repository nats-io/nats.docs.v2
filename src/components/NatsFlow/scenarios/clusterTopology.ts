import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const CLIENT_COLOR = '#3b82f6';

export const clusterTopologyScenario: NatsFlowScenario = {
  description: 'A NATS cluster: multiple servers form a full mesh of routes, and clients can connect to any server.',
  nodes: [
    {
      id: 's2',
      type: 'server',
      position: { x: 200, y: 40 },
      data: { label: 'NATS' },
    },
    {
      id: 's3',
      type: 'server',
      position: { x: 560, y: 40 },
      data: { label: 'NATS' },
    },
    {
      id: 's1',
      type: 'server',
      position: { x: 380, y: 260 },
      data: { label: 'NATS' },
    },
    {
      id: 'client-1',
      type: 'publisher',
      position: { x: 100, y: 240 },
      data: { label: 'Client' },
    },
    {
      id: 'client-2',
      type: 'subscriber',
      position: { x: 700, y: 140 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 's2-s3',
      source: 's2',
      target: 's3',
      type: 'animated',
      style: { strokeDasharray: '5, 5' },
      data: { color: ROUTE_COLOR, animated: false, straight: true, label: 'route' },
    },
    {
      id: 's2-s1',
      source: 's2',
      target: 's1',
      type: 'animated',
      style: { strokeDasharray: '5, 5' },
      data: { color: ROUTE_COLOR, animated: false, straight: true, label: 'route' },
    },
    {
      id: 's1-s3',
      source: 's1',
      target: 's3',
      type: 'animated',
      style: { strokeDasharray: '5, 5' },
      data: { color: ROUTE_COLOR, animated: false, straight: true, label: 'route' },
    },
    {
      id: 'c1-s1',
      source: 'client-1',
      target: 's1',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed, color: CLIENT_COLOR },
      markerStart: { type: MarkerType.ArrowClosed, color: CLIENT_COLOR },
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
    {
      id: 's3-c2',
      source: 's3',
      target: 'client-2',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed, color: CLIENT_COLOR },
      markerStart: { type: MarkerType.ArrowClosed, color: CLIENT_COLOR },
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
  ],
};
