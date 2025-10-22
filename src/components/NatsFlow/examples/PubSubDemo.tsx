import React from 'react';
import { NatsFlow } from '../NatsFlow';
import { publishSubscribeScenario } from '../scenarios';
import type { ControlButton } from '../types';

/**
 * Example: Basic Publish/Subscribe Demo
 * Shows how to use the NatsFlow component with a pre-built scenario
 */
export const PubSubDemo: React.FC = () => {
  return <NatsFlow scenario={publishSubscribeScenario} />;
};

/**
 * Example: Publish/Subscribe with Custom Buttons
 * Shows how to add custom control buttons
 */
export const PubSubDemoWithCustomButtons: React.FC = () => {
  const customButtons: ControlButton[] = [
    {
      label: 'Slow Motion',
      action: () => {
        // Custom action - could modify scenario timing
        console.log('Slow motion activated');
      },
      variant: 'secondary',
      icon: '🐌',
    },
    {
      label: 'Fast Forward',
      action: () => {
        console.log('Fast forward activated');
      },
      variant: 'success',
      icon: '⚡',
    },
  ];

  return (
    <NatsFlow
      scenario={publishSubscribeScenario}
      customButtons={customButtons}
    />
  );
};
