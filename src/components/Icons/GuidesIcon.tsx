import React from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function GuidesIcon({ className = '', width = 24, height = 24 }: IconProps) {
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
      <path d="M9 11H3V3h6v8z" />
      <path d="M21 11h-6V3h6v8z" />
      <path d="M9 21H3v-8h6v8z" />
      <path d="M21 21h-6v-8h6v8z" />
      <path d="M12 3v18" opacity="0.3" />
      <path d="M3 12h18" opacity="0.3" />
    </svg>
  );
}