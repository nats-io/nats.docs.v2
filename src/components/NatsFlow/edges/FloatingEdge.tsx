import { type CSSProperties } from 'react';
import {
  type EdgeProps,
  useStore,
  getStraightPath,
  type XYPosition,
  type InternalNode,
} from '@xyflow/react';
import type { AnimatedEdgeData } from '../types';

function getNodeCenter(node: InternalNode) {
  const w = (node.measured?.width ?? 0) / 2;
  const h = (node.measured?.height ?? 0) / 2;
  return {
    x: node.internals.positionAbsolute.x + w,
    y: node.internals.positionAbsolute.y + h,
  };
}

function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode): XYPosition {
  const center = getNodeCenter(intersectionNode);
  const targetCenter = getNodeCenter(targetNode);
  const isCircular = (intersectionNode.data as any)?.circular;

  if (isCircular) {
    const r = (intersectionNode.measured?.width ?? 0) / 2;
    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;
    const angle = Math.atan2(dy, dx);
    return { x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) };
  }

  const w = (intersectionNode.measured?.width ?? 0) / 2;
  const h = (intersectionNode.measured?.height ?? 0) / 2;

  const xx1 = (targetCenter.x - center.x) / (2 * w) - (targetCenter.y - center.y) / (2 * h);
  const yy1 = (targetCenter.x - center.x) / (2 * w) + (targetCenter.y - center.y) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  if (!isFinite(a)) return { x: center.x, y: center.y };
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  return {
    x: w * (xx3 + yy3) + center.x,
    y: h * (-xx3 + yy3) + center.y,
  };
}

export function FloatingEdge({ id, source, target, markerEnd, markerStart, data }: EdgeProps) {
  const edgeData = data as AnimatedEdgeData;
  const color = edgeData?.color || '#9ca3af';

  const { sourceNode, targetNode } = useStore((s) => ({
    sourceNode: s.nodeLookup.get(source),
    targetNode: s.nodeLookup.get(target),
  }));

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { x: sx, y: sy } = getNodeIntersection(sourceNode, targetNode);
  const { x: tx, y: ty } = getNodeIntersection(targetNode, sourceNode);

  const [path] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });

  return (
    <path
      id={id}
      d={path}
      markerEnd={markerEnd as string}
      markerStart={markerStart as string}
      style={{
        stroke: color,
        strokeWidth: 2,
        fill: 'none',
        strokeDasharray: edgeData?.dashed ? '8,6' : undefined,
      } as CSSProperties}
    />
  );
}

FloatingEdge.displayName = 'FloatingEdge';
