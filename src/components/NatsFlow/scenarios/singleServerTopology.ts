import type { NatsFlowScenario } from '../types';

const CLIENT_COLOR = '#3b82f6';

export const singleServerTopologyScenario: NatsFlowScenario = {
  description: 'A single NATS server with clients connected directly to it.',
  nodes: [
    {
      id: 'client-1',
      type: 'publisher',
      position: { x: 40, y: 120 },
      data: { label: 'Client' },
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 300, y: 120 },
      data: { label: 'NATS' },
    },
    {
      id: 'client-2',
      type: 'subscriber',
      position: { x: 560, y: 120 },
      data: { label: 'Client' },
    },
  ],
  edges: [
    {
      id: 'c1-server',
      source: 'client-1',
      target: 'server',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
    {
      id: 'server-c2',
      source: 'server',
      target: 'client-2',
      type: 'animated',
      data: { color: CLIENT_COLOR, animated: false, straight: true },
    },
  ],
};
