import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import React from 'react';
import ReactDOM from 'react-dom/client';

if (ExecutionEnvironment.canUseDOM) {
  // Globally suppress ResizeObserver errors (harmless React Flow warnings)
  window.addEventListener('error', (e) => {
    if (e.message?.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  });

  // Make React available globally for the loader
  window.React = React;
  window.ReactDOM = ReactDOM;

  // Import NatsFlow components and make them globally available
  import('../../components/NatsFlow').then((module) => {
    window.NatsFlow = {
      NatsFlow: module.NatsFlow,
      ToggleableSubscribersScenario: module.ToggleableSubscribersScenario,
      QueueGroupAnimated: module.QueueGroupAnimated,
      PublishSubscribeAnimated: module.PublishSubscribeAnimated,
      scenarios: {
        publishSubscribe: module.publishSubscribeScenario,
        requestReply: module.requestReplyScenario,
        queueGroup: module.queueGroupScenario,
        fanOut: module.fanOutScenario,
        toggleableSubscribers: module.toggleableSubscribersScenario,
      },
    };

    console.log('NatsFlow components loaded and available');

    // Trigger initialization after components are loaded
    const event = new CustomEvent('natsflow-loaded');
    window.dispatchEvent(event);
  });
}

export {};
