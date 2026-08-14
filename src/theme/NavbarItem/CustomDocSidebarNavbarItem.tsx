import React from 'react';
import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import { DocsIcon, TutorialsIcon, LearnIcon, ReferenceIcon, RocketIcon } from '@site/src/components/Icons';
import type { Props } from '@theme/NavbarItem/DefaultNavbarItem';

const iconMap: Record<string, React.ComponentType<{ className?: string; width?: number; height?: number }>> = {
  'Concepts': DocsIcon,
  'Tutorials': TutorialsIcon,
  'Learn': LearnIcon,
  'Reference': ReferenceIcon,
  'Release Notes': RocketIcon,
};

export default function CustomDocSidebarNavbarItem(props: Props): React.JSX.Element {
  const labelText = typeof props.label === 'string' ? props.label : '';
  const Icon = labelText ? iconMap[labelText] : null;
  
  const enhancedProps = {
    ...props,
    label: Icon ? (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon width={20} height={20} />
        <span>{labelText}</span>
      </span>
    ) : props.label,
  };

  return <DefaultNavbarItem {...enhancedProps} />;
}