import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

export default function GuidesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </BaseIcon>
  );
}
