import React from 'react';
import type { Node, NodeType } from './types';
import styles from './NatsFlow.module.css';

interface NodeComponentProps {
  node: Node;
  highlighted?: boolean;
}

const getNodeIcon = (type: NodeType): string => {
  switch (type) {
    case 'server':
      return '🖥️';
    case 'client':
      return '💻';
    case 'publisher':
      return '📤';
    case 'subscriber':
      return '📥';
    default:
      return '⬡';
  }
};

const getNodeColor = (type: NodeType): string => {
  switch (type) {
    case 'server':
      return '#27AAE1'; // NATS blue
    case 'client':
      return '#375C93';
    case 'publisher':
      return '#34A574';
    case 'subscriber':
      return '#8DC63F';
    default:
      return '#666';
  }
};

export const NodeComponent: React.FC<NodeComponentProps> = ({ node, highlighted }) => {
  const color = node.color || getNodeColor(node.type);
  const icon = getNodeIcon(node.type);

  return (
    <div
      className={`${styles.node} ${highlighted ? styles.highlighted : ''}`}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        borderColor: color,
      }}
    >
      <div className={styles.nodeIcon}>{icon}</div>
      {node.label && <div className={styles.nodeLabel}>{node.label}</div>}
    </div>
  );
};
