import React, { useState } from 'react';
import { NatsFlow } from '../NatsFlow';
import type { Scenario, ControlButton } from '../types';

/**
 * Example: Custom Scenario with Dynamic Behavior
 * Shows how to create scenarios on the fly with custom controls
 */
export const CustomScenarioDemo: React.FC = () => {
  const [subscriberCount, setSubscriberCount] = useState(2);

  // Dynamically generate scenario based on subscriber count
  const generateScenario = (numSubscribers: number): Scenario => {
    const nodes = [
      {
        id: 'publisher',
        type: 'publisher' as const,
        position: { x: 100, y: 180 },
        label: 'Publisher',
      },
      {
        id: 'server',
        type: 'server' as const,
        position: { x: 360, y: 180 },
        label: 'NATS',
      },
    ];

    const connections = [{ from: 'publisher', to: 'server' }];

    // Add subscribers dynamically
    const subscriberIds: string[] = [];
    for (let i = 0; i < numSubscribers; i++) {
      const subId = `sub${i + 1}`;
      subscriberIds.push(subId);

      const angle = (Math.PI / 2) + ((i / (numSubscribers - 1)) - 0.5) * Math.PI;
      const radius = 260;
      const x = 360 + Math.cos(angle) * radius;
      const y = 180 + Math.sin(angle) * radius;

      nodes.push({
        id: subId,
        type: 'subscriber' as const,
        position: { x, y },
        label: `Sub ${i + 1}`,
      });

      connections.push({ from: 'server', to: subId });
    }

    return {
      title: `Publish to ${numSubscribers} Subscribers`,
      description: 'Adjust the number of subscribers using the controls below',
      nodes,
      connections,
      steps: [
        {
          type: 'publish',
          from: 'publisher',
          to: 'server',
          subject: 'update',
          duration: 1200,
          color: '#27AAE1',
        },
        {
          type: 'publish',
          from: 'server',
          to: subscriberIds,
          subject: 'update',
          duration: 1500,
          color: '#27AAE1',
        },
        {
          type: 'pause',
          duration: 1000,
        },
      ],
      loop: true,
    };
  };

  const scenario = generateScenario(subscriberCount);

  const customButtons: ControlButton[] = [
    {
      label: 'Add Subscriber',
      action: () => setSubscriberCount((c) => Math.min(c + 1, 6)),
      variant: 'success',
      icon: '➕',
    },
    {
      label: 'Remove Subscriber',
      action: () => setSubscriberCount((c) => Math.max(c - 1, 1)),
      variant: 'danger',
      icon: '➖',
    },
  ];

  return (
    <NatsFlow
      scenario={scenario}
      customButtons={customButtons}
      height={400}
    />
  );
};
