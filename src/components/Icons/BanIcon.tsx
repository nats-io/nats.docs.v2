import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

export default function BanIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </BaseIcon>
  );
}
