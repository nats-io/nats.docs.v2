import type { NatsFlow as NatsFlowComponent } from '../components/NatsFlow';
import type {
  publishSubscribeScenario,
  requestReplyScenario,
  requestReplyScatterGatherScenario,
  requestReplyQueueGroupScenario,
  queueGroupScenario,
  fanOutScenario,
  toggleableSubscribersScenario,
  ToggleableSubscribersScenario as ToggleableSubscribersScenarioComponent,
  QueueGroupAnimated as QueueGroupAnimatedComponent,
  PublishSubscribeAnimated as PublishSubscribeAnimatedComponent,
  SubjectsWildcardAnimated as SubjectsWildcardAnimatedComponent,
} from '../components/NatsFlow';
import type React from 'react';
import type ReactDOM from 'react-dom/client';

declare global {
  interface Window {
    React?: typeof React;
    ReactDOM?: typeof ReactDOM;
    NatsFlow?: {
      NatsFlow: typeof NatsFlowComponent;
      ToggleableSubscribersScenario: typeof ToggleableSubscribersScenarioComponent;
      QueueGroupAnimated: typeof QueueGroupAnimatedComponent;
      PublishSubscribeAnimated: typeof PublishSubscribeAnimatedComponent;
      SubjectsWildcardAnimated: typeof SubjectsWildcardAnimatedComponent;
      scenarios: {
        publishSubscribe: typeof publishSubscribeScenario;
        requestReply: typeof requestReplyScenario;
        requestReplyScatterGather: typeof requestReplyScatterGatherScenario;
        requestReplyQueueGroup: typeof requestReplyQueueGroupScenario;
        queueGroup: typeof queueGroupScenario;
        fanOut: typeof fanOutScenario;
        toggleableSubscribers: typeof toggleableSubscribersScenario;
      };
    };
  }
}

export {};
