import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const fanInScenario: NatsFlowScenario = {
  description: 'Fan-in pattern where many publishers send messages to a single subscriber for aggregation',
  nodes: [
    {
      id: 'pub-a',
      type: 'publisher',
      position: { x: 50, y: 50 },
      data: { label: 'Publisher A' },
    },
    {
      id: 'pub-b',
      type: 'publisher',
      position: { x: 50, y: 150 },
      data: { label: 'Publisher B' },
    },
    {
      id: 'pub-c',
      type: 'publisher',
      position: { x: 50, y: 250 },
      data: { label: 'Publisher C' },
    },
    {
      id: 'pub-d',
      type: 'publisher',
      position: { x: 50, y: 350 },
      data: { label: 'Publisher D' },
    },
    {
      id: 'aggregator',
      type: 'subscriber',
      position: { x: 350, y: 200 },
      data: { label: 'Aggregator' },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'pub-a',
      target: 'aggregator',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#06b6d4', animated: true, label: 'metrics.*' },
    },
    {
      id: 'e2',
      source: 'pub-b',
      target: 'aggregator',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#06b6d4', animated: true },
    },
    {
      id: 'e3',
      source: 'pub-c',
      target: 'aggregator',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#06b6d4', animated: true },
    },
    {
      id: 'e4',
      source: 'pub-d',
      target: 'aggregator',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#06b6d4', animated: true },
    },
  ],
};
