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
 * Wildcard comparison showing * vs > patterns
 * Shows:
 * - Three publishers sending to subjects with different depths
 * - Two subscribers: one with * wildcard, one with > wildcard
 * - Clear visualization of what each wildcard pattern matches
 */
function WildcardComparisonInner({
  width = 800,
  height = 500,
}: {
  width?: number;
  height?: number;
}) {
  const nodes = [
    // Three publishers with different subject depths
    {
      id: 'publisher-1',
      type: 'publisher',
      position: { x: 0, y: 50 },
      data: { label: 'Smoke' },
    },
    {
      id: 'publisher-2',
      type: 'publisher',
      position: { x: 0, y: 150 },
      data: { label: 'Smoke Critical' },
    },
    {
      id: 'publisher-3',
      type: 'publisher',
      position: { x: 0, y: 250 },
      data: { label: 'Water' },
    },
    {
      id: 'publisher-4',
      type: 'publisher',
      position: { x: 0, y: 350 },
      data: { label: 'Water Critical' },
    },
    // NATS server in the middle
    {
      id: 'server',
      type: 'server',
      position: { x: 300, y: 200 },
      data: { label: 'NATS' },
    },
    // Two subscribers with different wildcard patterns
    {
      id: 'subscriber-alarm-star',
      type: 'subscriber',
      position: { x: 550, y: 80 },
      data: { label: 'Sub: sensor.alarm.*' },
    },
    {
      id: 'subscriber-star-star-critical',
      type: 'subscriber',
      position: { x: 550, y: 200 },
      data: { label: 'Sub: sensor.*.*.critical' },
    },
    {
      id: 'subscriber-gt',
      type: 'subscriber',
      position: { x: 550, y: 320 },
      data: { label: 'Sub: sensor.>' },
    },
  ];

  // Publishers to server
  const edges: any[] = [
    // Publisher 1: sensor.alarm.smoke (3 levels)
    {
      id: 'e-pub1-server',
      source: 'publisher-1',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#10b981', // Green
        animated: true,
        label: 'sensor.alarm.smoke',
        delay: 1000,
        interval: 14000,
      },
    },
    // Publisher 2: sensor.alarm.smoke.critical (4 levels - only matches >)
    {
      id: 'e-pub2-server',
      source: 'publisher-2',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#dc2626', // Red
        animated: true,
        label: 'sensor.alarm.smoke.critical',
        delay: 4000,
        interval: 14000,
      },
    },
    // Publisher 3: sensor.alarm.water (3 levels)
    {
      id: 'e-pub3-server',
      source: 'publisher-3',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#3b82f6', // Blue
        animated: true,
        label: 'sensor.alarm.water',
        delay: 7000,
        interval: 14000,
      },
    },
    // Publisher 4: sensor.alarm.water.critical (4 levels - only matches >)
    {
      id: 'e-pub4-server',
      source: 'publisher-4',
      target: 'server',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#f59e0b', // Orange
        animated: true,
        label: 'sensor.alarm.water.critical',
        delay: 10000,
        interval: 14000,
      },
    },
    // Server to subscribers
    {
      id: 'e-server-star-from-smoke',
      source: 'server',
      target: 'subscriber-alarm-star',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#10b981',
        animated: true,
        delay: 3000,
        interval: 14000,
      },
    },
    {
      id: 'e-server-gt-from-smoke',
      source: 'server',
      target: 'subscriber-gt',
      type: 'animated',
      animated: true,
      markerEnd: {type: MarkerType.ArrowClosed},
      data: {
        bow: -66,
        color: '#10b981',
        animated: true,
        delay: 3000,
        interval: 14000,
      },
    },
    {
        id: 'e-server-star-star-critical-from-smoke-critical',
        source: 'server',
        target: 'subscriber-star-star-critical',
        type: 'animated',
        animated: true,
        markerEnd: {type: MarkerType.ArrowClosed},
        data: {
          color: '#dc2626',
          animated: true,
          delay: 6000,
          interval: 14000,
        },
      },
      {
        id: 'e-server-gt-from-smoke-critical',
        source: 'server',
        target: 'subscriber-gt',
        type: 'animated',
        animated: true,
        markerEnd: {type: MarkerType.ArrowClosed},
        data: {
          bow: -22,
          color: '#dc2626',
          animated: true,
          delay: 6000,
          interval: 14000,
        },
      },
    {
      id: 'e-server-star-from-water',
      source: 'server',
      target: 'subscriber-alarm-star',
      type: 'animated',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        color: '#3b82f6',
        animated: true,
        delay: 9000,
        interval: 14000,
      },
    },
    {
      id: 'e-server-gt-from-water',
      source: 'server',
      target: 'subscriber-gt',
      type: 'animated',
      animated: true,
      markerEnd: {type: MarkerType.ArrowClosed},
      data: {
        bow: 22,
        color: '#3b82f6',
        animated: true,
        delay: 9000,
        interval: 14000,
      },
    },
    {
      id: 'e-server-star-star-critical-from-water-critical',
      source: 'server',
      target: 'subscriber-star-star-critical',
      type: 'animated',
      animated: true,
      markerEnd: {type: MarkerType.ArrowClosed},
      data: {
        color: '#f59e0b',
        animated: true,
        delay: 12000,
        interval: 14000,
      },
    },
    {
      id: 'e-server-gt-from-water-critical',
      source: 'server',
      target: 'subscriber-gt',
      type: 'animated',
      animated: true,
      markerEnd: {type: MarkerType.ArrowClosed},
      data: {
        bow: 66,
        color: '#f59e0b',
        animated: true,
        delay: 12000,
        interval: 14000,
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
        Comparing <code>*</code> (single token) vs <code>&gt;</code> (multiple tokens) wildcards
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
          display: 'grid',
          gridTemplateColumns: 'auto repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {/* Header row */}
        <div style={{ color: '#000000' }}><strong>Subject</strong></div>
        <div style={{ color: '#000000' }}><strong>sensor.alarm.*</strong></div>
        <div style={{ color: '#000000' }}><strong>sensor.*.*.critical</strong></div>
        <div style={{ color: '#000000' }}><strong>{'sensor.>'}</strong></div>

        {/* sensor.alarm.smoke */}
        <div style={{ color: '#10b981' }}><strong>sensor.alarm.smoke</strong></div>
        <div style={{ color: '#10b981' }}>✓</div>
        <div style={{ color: '#9ca3af' }}>✗ (too few tokens)</div>
        <div style={{ color: '#10b981' }}>✓</div>

        {/* sensor.alarm.smoke.critical */}
        <div style={{ color: '#dc2626' }}><strong>sensor.alarm.smoke.critical</strong></div>
        <div style={{ color: '#9ca3af' }}>✗ (too many tokens)</div>
        <div style={{ color: '#dc2626' }}>✓</div>
        <div style={{ color: '#dc2626' }}>✓</div>

        {/* sensor.alarm.water */}
        <div style={{ color: '#2563eb' }}><strong>sensor.alarm.water</strong></div>
        <div style={{ color: '#2563eb' }}>✓</div>
        <div style={{ color: '#9ca3af' }}>✗ (too few tokens)</div>
        <div style={{ color: '#2563eb' }}>✓</div>

        {/* sensor.alarm.water.critical */}
        <div style={{ color: '#f59e0b' }}><strong>sensor.alarm.water.critical</strong></div>
        <div style={{ color: '#9ca3af' }}>✗ (too many tokens)</div>
        <div style={{ color: '#f59e0b' }}>✓</div>
        <div style={{ color: '#f59e0b' }}>✓</div>

      </div>
    </div>
  );
}

// Wrapper component that provides ReactFlow context
export function WildcardComparison(props: { width?: number; height?: number }) {
  return (
    <ReactFlowProvider>
      <WildcardComparisonInner {...props} />
    </ReactFlowProvider>
  );
}
