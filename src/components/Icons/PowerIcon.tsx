import React from 'react';
import BaseIcon from './BaseIcon';
import type { IconProps } from './types';

export default function PowerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0" />
    </BaseIcon>
  );
}
