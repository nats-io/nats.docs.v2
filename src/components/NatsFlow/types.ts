/**
 * Core types for the NATS Flow animation framework
 */

export type NodeType = 'server' | 'client' | 'publisher' | 'subscriber';

export interface Position {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: NodeType;
  position: Position;
  label?: string;
  color?: string;
}

export interface Message {
  id: string;
  subject: string;
  payload?: string;
  from: string;
  to: string[];
  progress: number; // 0 to 1
  duration: number; // milliseconds
  color?: string;
}

export interface Connection {
  from: string;
  to: string;
  type?: 'solid' | 'dashed';
}

export interface AnimationStep {
  type: 'publish' | 'deliver' | 'request' | 'reply' | 'pause';
  from?: string;
  to?: string | string[];
  subject?: string;
  payload?: string;
  duration?: number;
  color?: string;
}

export interface Scenario {
  title: string;
  description?: string;
  nodes: Node[];
  connections: Connection[];
  steps: AnimationStep[];
  loop?: boolean;
}

export interface ControlButton {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  icon?: string;
}
