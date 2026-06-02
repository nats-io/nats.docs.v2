import { MarkerType } from '@xyflow/react';
import type { NatsFlowScenario } from '../types';

const NAVY = '#375C93';
const BLUE = '#27AAE1';
const GRAY = '#9ca3af';

export const superClusterScenario: NatsFlowScenario = {
  description: 'Super-cluster topology — two clusters connected by gateways',
  nodes: [
    // Region labels
    {
      id: 'label-a',
      type: 'label',
      position: { x: 145, y: 0 },
      data: { label: 'Region A', color: NAVY },
    },
    {
      id: 'label-b',
      type: 'label',
      position: { x: 500, y: 0 },
      data: { label: 'Region B', color: BLUE },
    },
    // Region A servers (green triangle)
    {
      id: 'a-top',
      type: 'server',
      position: { x: 180, y: 30 },
      data: { label: 'NATS', circular: true, borderColor: NAVY },
    },
    {
      id: 'a-mid',
      type: 'server',
      position: { x: 60, y: 160 },
      data: { label: 'NATS', circular: true, borderColor: NAVY },
    },
    {
      id: 'a-bot',
      type: 'server',
      position: { x: 180, y: 290 },
      data: { label: 'NATS', circular: true, borderColor: NAVY },
    },
    // Region B servers (blue triangle)
    {
      id: 'b-top',
      type: 'server',
      position: { x: 480, y: 30 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    {
      id: 'b-mid',
      type: 'server',
      position: { x: 600, y: 160 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    {
      id: 'b-bot',
      type: 'server',
      position: { x: 480, y: 290 },
      data: { label: 'NATS', circular: true, borderColor: BLUE },
    },
    // Clients
    {
      id: 'client-left',
      type: 'client',
      position: { x: 0, y: 70 },
      data: { label: 'Client' },
    },
    {
      id: 'client-right',
      type: 'client',
      position: { x: 720, y: 310 },
      data: { label: 'Client' },
    },
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
    // Gateway connections (dashed gray)
    { id: 'gw-top', source: 'a-top', target: 'b-top', type: 'floating', data: { color: GRAY, dashed: true } },
    { id: 'gw-mid', source: 'a-mid', target: 'b-mid', type: 'floating', data: { color: GRAY, dashed: true } },
    { id: 'gw-bot', source: 'a-bot', target: 'b-bot', type: 'floating', data: { color: GRAY, dashed: true } },
    // Client connections
    {
      id: 'client-left-to-a',
      source: 'client-left',
      target: 'a-mid',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: GRAY },
    },
    {
      id: 'client-right-to-b',
      source: 'b-bot',
      target: 'client-right',
      type: 'floating',
      markerStart: { type: MarkerType.ArrowClosed },
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { color: GRAY },
    },
  ],
};
