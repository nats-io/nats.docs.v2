import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

// Three connected nodes: the shape of a system, not a single server.
export default function ArchitectureIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="18" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <line x1="10.8" y1="7.2" x2="6.2" y2="15.8" />
      <line x1="13.2" y1="7.2" x2="17.8" y2="15.8" />
      <line x1="7.5" y1="18" x2="16.5" y2="18" />
    </BaseIcon>
  );
}
