import React from 'react';
import type { Message, Node } from './types';
import styles from './NatsFlow.module.css';

interface MessageComponentProps {
  message: Message;
  fromNode: Node;
  toNode: Node;
}

export const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  fromNode,
  toNode,
}) => {
  const fromX = fromNode.position.x + 40; // Center of node (80px width / 2)
  const fromY = fromNode.position.y + 40;
  const toX = toNode.position.x + 40;
  const toY = toNode.position.y + 40;

  const x = fromX + (toX - fromX) * message.progress;
  const y = fromY + (toY - fromY) * message.progress;

  const color = message.color || '#27AAE1';

  return (
    <div
      className={styles.message}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: color,
      }}
      title={`${message.subject}${message.payload ? ': ' + message.payload : ''}`}
    >
      <div className={styles.messageLabel}>{message.subject}</div>
    </div>
  );
};
