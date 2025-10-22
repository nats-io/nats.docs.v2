import type { Scenario } from './types';

/**
 * Basic Publish/Subscribe scenario
 * Shows a publisher sending messages to multiple subscribers through NATS server
 */
export const publishSubscribeScenario: Scenario = {
  title: 'Publish/Subscribe Pattern',
  description: 'A publisher sends messages to multiple subscribers through the NATS server',
  nodes: [
    {
      id: 'publisher',
      type: 'publisher',
      position: { x: 100, y: 180 },
      label: 'Publisher',
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 360, y: 180 },
      label: 'NATS Server',
    },
    {
      id: 'sub1',
      type: 'subscriber',
      position: { x: 620, y: 100 },
      label: 'Subscriber 1',
    },
    {
      id: 'sub2',
      type: 'subscriber',
      position: { x: 620, y: 260 },
      label: 'Subscriber 2',
    },
  ],
  connections: [
    { from: 'publisher', to: 'server' },
    { from: 'server', to: 'sub1' },
    { from: 'server', to: 'sub2' },
  ],
  steps: [
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'news.sports',
      duration: 2000,
      color: '#34A574',
    },
    {
      type: 'publish',
      from: 'server',
      to: ['sub1', 'sub2'],
      subject: 'news.sports',
      duration: 2000,
      color: '#34A574',
    },
    {
      type: 'pause',
      duration: 1000,
    },
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'news.tech',
      duration: 2000,
      color: '#8DC63F',
    },
    {
      type: 'publish',
      from: 'server',
      to: ['sub1', 'sub2'],
      subject: 'news.tech',
      duration: 2000,
      color: '#8DC63F',
    },
    {
      type: 'pause',
      duration: 1500,
    },
  ],
  loop: true,
};

/**
 * Request/Reply scenario
 * Shows a client making a request and receiving a reply
 */
export const requestReplyScenario: Scenario = {
  title: 'Request/Reply Pattern',
  description: 'A client sends a request and receives a reply from a service',
  nodes: [
    {
      id: 'client',
      type: 'client',
      position: { x: 100, y: 180 },
      label: 'Client',
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 360, y: 180 },
      label: 'NATS Server',
    },
    {
      id: 'service',
      type: 'subscriber',
      position: { x: 620, y: 180 },
      label: 'Service',
    },
  ],
  connections: [
    { from: 'client', to: 'server' },
    { from: 'server', to: 'service' },
    { from: 'service', to: 'server', type: 'dashed' },
    { from: 'server', to: 'client', type: 'dashed' },
  ],
  steps: [
    {
      type: 'request',
      from: 'client',
      to: 'server',
      subject: 'get.user',
      payload: 'id:123',
      duration: 1800,
      color: '#375C93',
    },
    {
      type: 'request',
      from: 'server',
      to: 'service',
      subject: 'get.user',
      duration: 1800,
      color: '#375C93',
    },
    {
      type: 'pause',
      duration: 800,
    },
    {
      type: 'publish',
      from: 'service',
      to: 'server',
      subject: 'reply',
      payload: 'user data',
      duration: 1800,
      color: '#34A574',
    },
    {
      type: 'publish',
      from: 'server',
      to: 'client',
      subject: 'reply',
      duration: 1800,
      color: '#34A574',
    },
    {
      type: 'pause',
      duration: 2000,
    },
  ],
  loop: true,
};

/**
 * Fan-out scenario
 * Shows a message being distributed to many subscribers
 */
export const fanOutScenario: Scenario = {
  title: 'Fan-out Pattern',
  description: 'One publisher sends messages that fan out to multiple subscribers',
  nodes: [
    {
      id: 'publisher',
      type: 'publisher',
      position: { x: 100, y: 180 },
      label: 'Publisher',
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 360, y: 180 },
      label: 'NATS Server',
    },
    {
      id: 'sub1',
      type: 'subscriber',
      position: { x: 620, y: 60 },
      label: 'Sub 1',
    },
    {
      id: 'sub2',
      type: 'subscriber',
      position: { x: 620, y: 140 },
      label: 'Sub 2',
    },
    {
      id: 'sub3',
      type: 'subscriber',
      position: { x: 620, y: 220 },
      label: 'Sub 3',
    },
    {
      id: 'sub4',
      type: 'subscriber',
      position: { x: 620, y: 300 },
      label: 'Sub 4',
    },
  ],
  connections: [
    { from: 'publisher', to: 'server' },
    { from: 'server', to: 'sub1' },
    { from: 'server', to: 'sub2' },
    { from: 'server', to: 'sub3' },
    { from: 'server', to: 'sub4' },
  ],
  steps: [
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'broadcast',
      duration: 1200,
      color: '#27AAE1',
    },
    {
      type: 'publish',
      from: 'server',
      to: ['sub1', 'sub2', 'sub3', 'sub4'],
      subject: 'broadcast',
      duration: 1500,
      color: '#27AAE1',
    },
    {
      type: 'pause',
      duration: 1500,
    },
  ],
  loop: true,
};

/**
 * Queue Groups scenario
 * Shows load balancing across queue subscribers
 */
export const queueGroupScenario: Scenario = {
  title: 'Queue Groups (Load Balancing)',
  description: 'Messages are distributed across queue subscribers for load balancing',
  nodes: [
    {
      id: 'publisher',
      type: 'publisher',
      position: { x: 100, y: 180 },
      label: 'Publisher',
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 360, y: 180 },
      label: 'NATS Server',
    },
    {
      id: 'worker1',
      type: 'subscriber',
      position: { x: 620, y: 100 },
      label: 'Worker 1',
    },
    {
      id: 'worker2',
      type: 'subscriber',
      position: { x: 620, y: 180 },
      label: 'Worker 2',
    },
    {
      id: 'worker3',
      type: 'subscriber',
      position: { x: 620, y: 260 },
      label: 'Worker 3',
    },
  ],
  connections: [
    { from: 'publisher', to: 'server' },
    { from: 'server', to: 'worker1' },
    { from: 'server', to: 'worker2' },
    { from: 'server', to: 'worker3' },
  ],
  steps: [
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'tasks',
      payload: 'task 1',
      duration: 1000,
      color: '#34A574',
    },
    {
      type: 'publish',
      from: 'server',
      to: 'worker1',
      subject: 'tasks',
      duration: 1000,
      color: '#34A574',
    },
    {
      type: 'pause',
      duration: 500,
    },
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'tasks',
      payload: 'task 2',
      duration: 1000,
      color: '#8DC63F',
    },
    {
      type: 'publish',
      from: 'server',
      to: 'worker2',
      subject: 'tasks',
      duration: 1000,
      color: '#8DC63F',
    },
    {
      type: 'pause',
      duration: 500,
    },
    {
      type: 'publish',
      from: 'publisher',
      to: 'server',
      subject: 'tasks',
      payload: 'task 3',
      duration: 1000,
      color: '#375C93',
    },
    {
      type: 'publish',
      from: 'server',
      to: 'worker3',
      subject: 'tasks',
      duration: 1000,
      color: '#375C93',
    },
    {
      type: 'pause',
      duration: 1000,
    },
  ],
  loop: true,
};
