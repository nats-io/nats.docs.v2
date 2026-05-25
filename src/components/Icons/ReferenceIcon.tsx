import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

export default function ReferenceIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </BaseIcon>
  );
}
