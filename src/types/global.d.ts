import type { NatsFlow as NatsFlowComponent } from '../components/NatsFlow';
import type {
  publishSubscribeScenario,
  requestReplyScenario,
  requestReplyScatterGatherScenario,
  requestReplyQueueGroupScenario,
  queueGroupScenario,
  fanOutScenario,
  fanInScenario,
  toggleableSubscribersScenario,
  singleServerTopologyScenario,
  clusterTopologyScenario,
  superclusterTopologyScenario,
  leafnodeTopologyScenario,
  mixedTopologyScenario,
  ToggleableSubscribersScenario as ToggleableSubscribersScenarioComponent,
  QueueGroupAnimated as QueueGroupAnimatedComponent,
  PublishSubscribeAnimated as PublishSubscribeAnimatedComponent,
  SubjectsWildcardAnimated as SubjectsWildcardAnimatedComponent,
  JetStreamContrastAnimated as JetStreamContrastAnimatedComponent,
  JetStreamConsumersAnimated as JetStreamConsumersAnimatedComponent,
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
      JetStreamContrastAnimated: typeof JetStreamContrastAnimatedComponent;
      JetStreamConsumersAnimated: typeof JetStreamConsumersAnimatedComponent;
      scenarios: {
        publishSubscribe: typeof publishSubscribeScenario;
        requestReply: typeof requestReplyScenario;
        requestReplyScatterGather: typeof requestReplyScatterGatherScenario;
        requestReplyQueueGroup: typeof requestReplyQueueGroupScenario;
        queueGroup: typeof queueGroupScenario;
        fanOut: typeof fanOutScenario;
        fanIn: typeof fanInScenario;
        toggleableSubscribers: typeof toggleableSubscribersScenario;
        singleServerTopology: typeof singleServerTopologyScenario;
        clusterTopology: typeof clusterTopologyScenario;
        superclusterTopology: typeof superclusterTopologyScenario;
        leafnodeTopology: typeof leafnodeTopologyScenario;
        mixedTopology: typeof mixedTopologyScenario;
      };
    };
  }
}

export {};
