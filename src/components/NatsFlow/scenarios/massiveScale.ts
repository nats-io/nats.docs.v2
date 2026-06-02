import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const GREEN = '#34A574';
const NAVY = '#375C93';
const BLUE = '#27AAE1';
const GRAY = '#9ca3af';

export const massiveScaleScenario: NatsFlowScenario = {
  description: 'Massive scale topology — super-cluster with leaf nodes',
  nodes: [
    // Region labels
    { id: 'label-a', type: 'label', position: { x: 165, y: 0 }, data: { label: 'Region A', color: NAVY } },
    { id: 'label-b', type: 'label', position: { x: 520, y: 0 }, data: { label: 'Region B', color: BLUE } },
    // Region A servers (green)
    { id: 'a-top', type: 'server', position: { x: 230, y: 25 }, data: { label: 'NATS', circular: true, borderColor: NAVY } },
    { id: 'a-mid', type: 'server', position: { x: 110, y: 140 }, data: { label: 'NATS', circular: true, borderColor: NAVY } },
    { id: 'a-bot', type: 'server', position: { x: 250, y: 260 }, data: { label: 'NATS', circular: true, borderColor: NAVY } },
    // Region B servers (blue)
    { id: 'b-top', type: 'server', position: { x: 530, y: 25 }, data: { label: 'NATS', circular: true, borderColor: BLUE } },
    { id: 'b-mid', type: 'server', position: { x: 650, y: 140 }, data: { label: 'NATS', circular: true, borderColor: BLUE } },
    { id: 'b-bot', type: 'server', position: { x: 530, y: 260 }, data: { label: 'NATS', circular: true, borderColor: BLUE } },
    // Leaf nodes
    { id: 'leaf-left', type: 'server', position: { x: 190, y: 430 }, data: { label: 'NATS', subtitle: 'Leaf', circular: true, borderColor: GREEN, icon: 'leaf', iconColor: GREEN } },
    { id: 'leaf-right', type: 'server', position: { x: 440, y: 500 }, data: { label: 'NATS', subtitle: 'Leaf', circular: true, borderColor: GREEN, icon: 'leaf', iconColor: GREEN } },
    // Clients
    { id: 'client-a', type: 'client', position: { x: 0, y: 55 }, data: { label: 'Client' } },
    { id: 'client-b', type: 'client', position: { x: 770, y: 270 }, data: { label: 'Client' } },
    { id: 'client-leaf-l', type: 'client', position: { x: 0, y: 450 }, data: { label: 'Client' } },
    { id: 'client-leaf-r', type: 'client', position: { x: 620, y: 510 }, data: { label: 'Client' } },
  ],
  edges: [
    // Region A mesh (green)
    { id: 'a-top-mid', source: 'a-top', target: 'a-mid', type: 'floating', data: { color: NAVY } },
    { id: 'a-top-bot', source: 'a-top', target: 'a-bot', type: 'floating', data: { color: NAVY } },
    { id: 'a-mid-bot', source: 'a-mid', target: 'a-bot', type: 'floating', data: { color: NAVY } },
    // Region B mesh (blue)
    { id: 'b-top-mid', source: 'b-top', target: 'b-mid', type: 'floating', data: { color: BLUE } },
    { id: 'b-top-bot', source: 'b-top', target: 'b-bot', type: 'floating', data: { color: BLUE } },
    { id: 'b-mid-bot', source: 'b-mid', target: 'b-bot', type: 'floating', data: { color: BLUE } },
    // Gateways (dashed gray)
    { id: 'gw-top', source: 'a-top', target: 'b-top', type: 'floating', data: { color: GRAY, dashed: true } },
    { id: 'gw-mid', source: 'a-mid', target: 'b-mid', type: 'floating', data: { color: GRAY, dashed: true } },
    { id: 'gw-bot', source: 'a-bot', target: 'b-bot', type: 'floating', data: { color: GRAY, dashed: true } },
    // Leaf connections to cluster
    { id: 'leaf-l-to-cluster', source: 'a-bot', target: 'leaf-left', type: 'floating', data: { color: GREEN } },
    { id: 'leaf-r-to-cluster', source: 'leaf-left', target: 'leaf-right', type: 'floating', data: { color: GREEN } },
    // Client connections
    { id: 'c-a', source: 'client-a', target: 'a-mid', type: 'floating', markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed }, data: { color: GRAY } },
    { id: 'c-b', source: 'b-bot', target: 'client-b', type: 'floating', markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed }, data: { color: GRAY } },
    { id: 'c-leaf-l', source: 'client-leaf-l', target: 'leaf-left', type: 'floating', markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed }, data: { color: GRAY } },
    { id: 'c-leaf-r', source: 'leaf-right', target: 'client-leaf-r', type: 'floating', markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed }, data: { color: GRAY } },
  ],
};
