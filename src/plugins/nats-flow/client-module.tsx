import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import React from 'react';
import ReactDOM from 'react-dom/client';

if (ExecutionEnvironment.canUseDOM) {
  // Globally suppress ResizeObserver errors (harmless React Flow warnings).
  // Registered with capture: true so we run before webpack-dev-server's
  // overlay listener and can stopImmediatePropagation() in time.
  window.addEventListener('error', (e) => {
    if (e.message?.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, { capture: true });

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
      SubjectsWildcardAnimated: module.SubjectsWildcardAnimated,
      JetStreamContrastAnimated: module.JetStreamContrastAnimated,
      JetStreamConsumersAnimated: module.JetStreamConsumersAnimated,
      scenarios: {
        publishSubscribe: module.publishSubscribeScenario,
        requestReply: module.requestReplyScenario,
        requestReplyScatterGather: module.requestReplyScatterGatherScenario,
        requestReplyQueueGroup: module.requestReplyQueueGroupScenario,
        queueGroup: module.queueGroupScenario,
        fanOut: module.fanOutScenario,
        fanIn: module.fanInScenario,
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
