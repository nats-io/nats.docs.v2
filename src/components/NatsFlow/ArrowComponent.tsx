import React from 'react';
import type { Connection, Node } from './types';
import styles from './NatsFlow.module.css';

interface ArrowComponentProps {
  connection: Connection;
  fromNode: Node;
  toNode: Node;
}

export const ArrowComponent: React.FC<ArrowComponentProps> = ({
  connection,
  fromNode,
  toNode,
}) => {
  const fromX = fromNode.position.x + 40;
  const fromY = fromNode.position.y + 40;
  const toX = toNode.position.x + 40;
  const toY = toNode.position.y + 40;

  const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

  const lineType = connection.type || 'solid';

  return (
    <div
      className={styles.arrow}
      style={{
        width: `${length}px`,
        left: `${fromX}px`,
        top: `${fromY}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <div
        className={`${styles.arrowLine} ${
          lineType === 'dashed' ? styles.arrowDashed : ''
        }`}
      />
      <div className={styles.arrowHead} />
    </div>
  );
};
