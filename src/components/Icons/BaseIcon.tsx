import React from 'react';
import type { ReactNode } from 'react';
import type { IconProps } from './types';

export default function BaseIcon({
  className = '',
  width = 24,
  height = 24,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
