import type { NatsFlowScenario } from '../types';

// Topologies deep dive, page 2 (your-first-cluster): the `east` cluster as a
// clean three-server mesh. `order-svc` publishes `orders.created` to n1-east;
// the message takes a single hop *down* the n1-east -> n2-east route to
// `warehouse` on n2-east. n3-east is the idle third peer.
//
// The path deliberately turns (in from the left, down across a route, out to
// the right) so the hop reads as routing rather than one straight pipe. Servers
// are the circular variant (handles are invisible, so nothing floats). The two
// idle routes are gray FloatingEdges (border-to-border); the carrying hop and
// the publish/deliver segments are blue AnimatedEdges whose dots loop forever.
const ROUTE = '#94a3b8'; // idle route mesh (gray-blue)
const MSG = '#27AAE1'; // NATS primary blue — orders.created in flight

export const topologiesClusterMeshScenario: NatsFlowScenario = {
  description:
    'The east cluster: three servers meshed by routes, one order hopping from n1-east down to n2-east',
  nodes: [
    { id: 'order-svc', type: 'publisher', position: { x: 38, y: 95 }, data: { label: 'order-svc' } },
    { id: 'n1-east', type: 'server', position: { x: 225, y: 70 }, data: { label: 'n1-east', circular: true } },
    { id: 'n3-east', type: 'server', position: { x: 538, y: 70 }, data: { label: 'n3-east', circular: true } },
    { id: 'n2-east', type: 'server', position: { x: 225, y: 320 }, data: { label: 'n2-east', circular: true } },
    { id: 'warehouse', type: 'subscriber', position: { x: 675, y: 345 }, data: { label: 'warehouse' } },
  ],
  edges: [
    // Idle route mesh — gray, undirected (no arrowheads), no animation.
    { id: 'route-n1-n3', source: 'n1-east', target: 'n3-east', type: 'floating', data: { color: ROUTE } },
    { id: 'route-n2-n3', source: 'n2-east', target: 'n3-east', type: 'floating', data: { color: ROUTE } },
    // The route that carries the message: a single hop straight down from
    // n1-east to n2-east. n2-east sits directly below n1-east, so anchoring
    // bottom -> top draws a clean vertical drop. (Circular nodes only have
    // top/left/right/bottom handles, so a diagonal can't land on the natural
    // upper-left point — keeping the hop vertical avoids that entirely.)
    {
      id: 'route-n1-n2',
      source: 'n1-east',
      sourceHandle: 'bottom-out',
      target: 'n2-east',
      targetHandle: 'top-in',
      type: 'animated',
      data: { color: MSG, animated: true, straight: true, interval: 1600, delay: 500 },
    },
    // Publish in (top, horizontal) and deliver out (bottom, horizontal).
    {
      id: 'msg-in',
      source: 'order-svc',
      target: 'n1-east',
      type: 'animated',
      data: { color: MSG, animated: true, straight: true, interval: 1600, delay: 0, label: 'orders.created', labelColor: MSG },
    },
    {
      id: 'msg-out',
      source: 'n2-east',
      target: 'warehouse',
      type: 'animated',
      data: { color: MSG, animated: true, straight: true, interval: 1600, delay: 1000 },
    },
  ],
};
