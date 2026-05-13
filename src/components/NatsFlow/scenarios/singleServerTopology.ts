import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const singleServerTopologyScenario: NatsFlowScenario = {
  description: 'A single NATS server process with several clients connected directly to it.',
  nodes: [
    {
      id: 'pub-1',
      type: 'publisher',
      position: { x: 40, y: 60 },
      data: { label: 'Publisher' },
    },
    {
      id: 'pub-2',
      type: 'publisher',
      position: { x: 40, y: 240 },
      data: { label: 'Publisher' },
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 280, y: 150 },
      data: { label: 'NATS' },
    },
    {
      id: 'sub-1',
      type: 'subscriber',
      position: { x: 520, y: 60 },
      data: { label: 'Subscriber' },
    },
    {
      id: 'sub-2',
      type: 'subscriber',
      position: { x: 520, y: 240 },
      data: { label: 'Subscriber' },
    },
  ],
  edges: [
    {
      id: 'pub1-server',
      source: 'pub-1',
      target: 'server',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: false },
    },
    {
      id: 'pub2-server',
      source: 'pub-2',
      target: 'server',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: false },
    },
    {
      id: 'server-sub1',
      source: 'server',
      target: 'sub-1',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: false },
    },
    {
      id: 'server-sub2',
      source: 'server',
      target: 'sub-2',
      type: 'animated',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: false },
    },
  ],
};
