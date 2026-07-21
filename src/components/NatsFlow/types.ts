import type { Node, Edge } from '@xyflow/react';

export interface NatsEdge extends Edge {
  pathOptions?: {
    offset?: number;
    curvature?: number;
  };
}

export interface NatsFlowScenario {
  nodes: Node[];
  edges: NatsEdge[];
  description?: string;
}

export interface NatsFlowProps {
  scenario: NatsFlowScenario;
  width?: number;
  height?: number;
  showControls?: boolean;
  autoPlay?: boolean;
  animationSpeed?: number;
}

export type AnimatedEdgeData = {
  color?: string;
  size?: number;
  label?: string;
  labelOffset?: number; // Vertical offset for label positioning
  labelColor?: string; // Color for the label text
  throughput?: number;
  animated?: boolean;
  delay?: number; // Delay in milliseconds before starting animation
  interval?: number; // Interval in milliseconds between circles (default: 2000)
  straight?: boolean;
  dashed?: boolean;
  bow?: number; // Vertical arc, in px, for edges that share a node pair: negative bows the path up, positive down, so parallel lanes don't overlap
};

export type NatsNodeData = {
  label: string;
  type?: 'publisher' | 'subscriber' | 'service' | 'queue';
  status?: 'active' | 'inactive' | 'processing';
};
