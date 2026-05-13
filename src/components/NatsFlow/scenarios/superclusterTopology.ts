import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const GATEWAY_COLOR = '#10b981';
const CLIENT_COLOR = '#3b82f6';

export const superclusterTopologyScenario: NatsFlowScenario = {
  description: 'A super-cluster: multiple clusters in different regions connected by gateways.',
  nodes: [
    {
      id: 'w1',
      type: 'server',
      position: { x: 80, y: 100 },
      data: { label: 'us-west-1' },
    },
    {
      id: 'w2',
      type: 'server',
      position: { x: 280, y: 100 },
      data: { label: 'us-west-2' },
    },
    {
      id: 'e1',
      type: 'server',
      position: { x: 540, y: 100 },
      data: { label: 'eu-west-1' },
    },
    {
      id: 'e2',
      type: 'server',
      position: { x: 740, y: 100 },
      data: { label: 'eu-west-2' },
    },
    {
      id: 'client-w',
      type: 'publisher',
      position: { x: 80, y: 280 },
      data: { label: 'Client' },
    },
    {
      id: 'client-e',
      type: 'subscriber',
      position: { x: 740, y: 280 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 'w1-w2',
      source: 'w1',
      target: 'w2',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, label: 'route' },
    },
    {
      id: 'e1-e2',
      source: 'e1',
      target: 'e2',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, label: 'route' },
    },
    {
      id: 'w2-e1',
      source: 'w2',
      target: 'e1',
      type: 'animated',
      data: { color: GATEWAY_COLOR, animated: false, label: 'gateway' },
    },
    {
      id: 'cw-w1',
      source: 'client-w',
      target: 'w1',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
    {
      id: 'e2-ce',
      source: 'e2',
      target: 'client-e',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: CLIENT_COLOR, animated: false },
    },
  ],
};
