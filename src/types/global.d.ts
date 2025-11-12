import type { NatsFlow as NatsFlowComponent } from '../components/NatsFlow';
import type {
  publishSubscribeScenario,
  requestReplyScenario,
  queueGroupScenario,
  fanOutScenario,
} from '../components/NatsFlow';
import type React from 'react';
import type ReactDOM from 'react-dom/client';

declare global {
  interface Window {
    React?: typeof React;
    ReactDOM?: typeof ReactDOM;
    NatsFlow?: {
      NatsFlow: typeof NatsFlowComponent;
      scenarios: {
        publishSubscribe: typeof publishSubscribeScenario;
        requestReply: typeof requestReplyScenario;
        queueGroup: typeof queueGroupScenario;
        fanOut: typeof fanOutScenario;
      };
    };
  }
}

export {};
