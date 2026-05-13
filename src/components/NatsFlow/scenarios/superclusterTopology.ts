import type { NatsFlowScenario } from '../types';

const ROUTE_COLOR = '#1e40af';
const GATEWAY_COLOR = '#10b981';
const CLIENT_COLOR = '#3b82f6';

export const superclusterTopologyScenario: NatsFlowScenario = {
  description: 'A super-cluster: multiple clusters connected by gateways.',
  nodes: [
    {
      id: 'client-1',
      type: 'publisher',
      position: { x: 40, y: 380 },
      data: { label: 'Client' },
    },
    {
      id: 'l-top',
      type: 'server',
      position: { x: 240, y: 100 },
      data: { label: 'NATS' },
    },
    {
      id: 'l-apex',
      type: 'server',
      position: { x: 440, y: 240 },
      data: { label: 'NATS' },
    },
    {
      id: 'l-bot',
      type: 'server',
      position: { x: 240, y: 380 },
      data: { label: 'NATS' },
    },
    {
      id: 'r-apex',
      type: 'server',
      position: { x: 740, y: 240 },
      data: { label: 'NATS' },
    },
    {
      id: 'r-top',
      type: 'server',
      position: { x: 940, y: 100 },
      data: { label: 'NATS' },
    },
    {
      id: 'r-bot',
      type: 'server',
      position: { x: 940, y: 380 },
      data: { label: 'NATS' },
    },
    {
      id: 'client-2',
      type: 'subscriber',
      position: { x: 1140, y: 100 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 'l-top-apex',
      source: 'l-top',
      target: 'l-apex',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'l-bot-apex',
      source: 'l-bot',
      target: 'l-apex',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'l-top-bot',
      source: 'l-top',
      target: 'l-bot',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'r-apex-top',
      source: 'r-apex',
      target: 'r-top',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'r-apex-bot',
      source: 'r-apex',
      target: 'r-bot',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'r-top-bot',
      source: 'r-bot',
      target: 'r-top',
      type: 'animated',
      data: { color: ROUTE_COLOR, animated: false, straight: true },
    },
    {
      id: 'gw-top',
      source: 'l-top',
      target: 'r-top',
      type: 'animated',
      style: { strokeDasharray: '6, 6' },
      data: { color: GATEWAY_COLOR, animated: false, straight: true },
    },
    {
      id: 'gw-mid',
      source: 'l-apex',
      target: 'r-apex',
      type: 'animated',
      style: { strokeDasharray: '6, 6' },
      data: { color: GATEWAY_COLOR, animated: false, straight: true, label: 'Gateway Connections' },
    },
    {
      id: 'gw-bot',
      source: 'l-bot',
      target: 'r-bot',
      type: 'animated',
      style: { strokeDasharray: '6, 6' },
      data: { color: GATEWAY_COLOR, animated: false, straight: true },
    },
    {
      id: 'c1-l-bot',
      source: 'client-1',
      target: 'l-bot',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
    {
      id: 'r-top-c2',
      source: 'r-top',
      target: 'client-2',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
  ],
};
