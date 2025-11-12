import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

export const publishSubscribeScenario: NatsFlowScenario = {
  description: 'Basic publish-subscribe pattern where one publisher sends messages to multiple subscribers',
  nodes: [
    {
      id: 'publisher',
      type: 'publisher',
      position: { x: 50, y: 150 },
      data: { label: 'Publisher' },
    },
    {
      id: 'subscriber-1',
      type: 'subscriber',
      position: { x: 350, y: 50 },
      data: { label: 'Subscriber 1' },
    },
    {
      id: 'subscriber-2',
      type: 'subscriber',
      position: { x: 350, y: 150 },
      data: { label: 'Subscriber 2' },
    },
    {
      id: 'subscriber-3',
      type: 'subscriber',
      position: { x: 350, y: 250 },
      data: { label: 'Subscriber 3' },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'publisher',
      target: 'subscriber-1',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: true, label: 'subject.topic' },
    },
    {
      id: 'e2',
      source: 'publisher',
      target: 'subscriber-2',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: true },
    },
    {
      id: 'e3',
      source: 'publisher',
      target: 'subscriber-3',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: '#3b82f6', animated: true },
    },
  ],
};
