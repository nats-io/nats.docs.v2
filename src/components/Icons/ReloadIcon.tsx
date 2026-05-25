import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

export default function ReloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </BaseIcon>
  );
}
