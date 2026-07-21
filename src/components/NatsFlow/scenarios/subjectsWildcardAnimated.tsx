import React from 'react';
import { MarkerType, ReactFlow, Background, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PublisherNode, SubscriberNode, ServerNode } from '../nodes';
import { AnimatedEdge } from '../edges';

const nodeTypes = {
  publisher: PublisherNode,
  subscriber: SubscriberNode,
  server: ServerNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

/**
 * Subjects wildcard matching - showing all scenarios simultaneously.
 * Shows:
 * - Three publishers sending to different subjects
 * - One subscriber with wildcard "weather.*.east"
 * - Which messages match (reach subscriber) and which don't
 */
function SubjectsWildcardAnimatedInner({
  width = 700,
  height = 450,
}: {
  width?: number;
  height?: number;
}) {
  // All nodes visible - 3 publishers, 1 server, 1 subscriber
  const nodes = [
    {
      id: 'publisher-1',
      type: 'publisher',
      position: { x: 0, y: 50 },
      data: { label: 'Publisher 1' },
    },
    {
      id: 'publisher-2',
      type: 'publisher',
      position: { x: 0, y: 200 },
      data: { label: 'Publisher 2' },
    },
    {
      id: 'publisher-3',
      type: 'publisher',
      position: { x: 0, y: 350 },
      data: { label: 'Publisher 3' },
    },
    {
      id: 'server',
      type: 'server',
      position: { x: 300, y: 200 },
      data: { label: 'NATS' },
    },
    {
      id: 'subscriber',
      type: 'subscriber',
      position: { x: 550, y: 200 },
      data: { label: 'Subscriber' },
    },
  ];

  // Edges - all publishers to server, color-coded by match status
  // Stagger timing so each publisher sends at different times
  // Use 12-second intervals so the full sequence plays before repeating
  const edges: any[] = [
    // Publisher 1: orders.retail.placed → MATCHES (sends first)
    {
      id: 'e-pub1-server',
      source: 'publisher-1',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#10b981', // Green - matches
        animated: true,
        label: 'orders.retail.placed',
        delay: 0, // Starts immediately
        interval: 10000, // Repeat every 10 seconds
      },
    },
    // Publisher 2: orders.retail.shipped → MATCHES (sends second)
    {
      id: 'e-pub2-server',
      source: 'publisher-2',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#3b82f6', // Blue - matches
        animated: true,
        label: 'orders.retail.shipped',
        delay: 3000, // Starts 3 seconds after publisher 1
        interval: 10000, // Repeat every 10 seconds
      },
    },
    // Publisher 3: orders.wholesale.placed → NO MATCH (sends third)
    {
      id: 'e-pub3-server',
      source: 'publisher-3',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#ef4444', // Red - no match
        animated: true,
        label: 'orders.wholesale.placed',
        delay: 6000, // Starts 6 seconds after publisher 1
        interval: 10000, // Repeat every 10 seconds
      },
    },
    // Server to subscriber - only matching messages (green paths)
    // Needs to match timing with publishers 1 and 2
    {
      id: 'e-server-sub-1',
      source: 'server',
      target: 'subscriber',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#10b981', // Green (from publisher 1)
        animated: true,
        delay: 2000, // Starts after message reaches server from pub 1
        interval: 10000, // Repeat every 10 seconds
        label: 'orders.retail.*',
      },
    },
    {
      id: 'e-server-sub-2',
      source: 'server',
      target: 'subscriber',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        bow: 55,
        color: '#3b82f6', // Blue (from publisher 2)
        animated: true,
        delay: 5000, // Starts after message reaches server from pub 2
        interval: 10000, // Repeat every 10 seconds
      },
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Info text */}
      <div
        style={{
          marginBottom: '12px',
          fontSize: '13px',
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        Subscriber listens with wildcard <code>orders.retail.*</code> where <code>*</code> matches exactly one token.
      </div>

      {/* Flow diagram */}
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnDrag={false}
          preventScrolling={true}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>

      {/* Pattern explanation */}
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#4b5563',
        }}
      >
        <strong>Pattern: orders.retail.*</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li style={{ color: '#059669' }}>✓ <strong>orders.retail.placed</strong> matches first two tokens</li>
          <li style={{ color: '#2563eb' }}>✓ <strong>orders.retail.shipped</strong> matches first two token</li>
          <li style={{ color: '#dc2626' }}>✗ <strong>orders.wholesale.placed</strong> - different second token</li>
        </ul>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
          Green and blue messages flow to subscriber; red message stops at server.
        </div>
      </div>
    </div>
  );
}

// Wrapper component that provides ReactFlow context
export function SubjectsWildcardAnimated(props: { width?: number; height?: number }) {
  return (
    <ReactFlowProvider>
      <SubjectsWildcardAnimatedInner {...props} />
    </ReactFlowProvider>
  );
}
