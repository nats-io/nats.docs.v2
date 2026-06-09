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
  singleServerScenario,
  clusterScenario,
  superClusterScenario,
  leafNodeScenario,
  massiveScaleScenario,
  ToggleableSubscribersScenario as ToggleableSubscribersScenarioComponent,
  QueueGroupAnimated as QueueGroupAnimatedComponent,
  PublishSubscribeAnimated as PublishSubscribeAnimatedComponent,
  SubjectsWildcardAnimated as SubjectsWildcardAnimatedComponent,
  JetStreamContrastAnimated as JetStreamContrastAnimatedComponent,
  JetStreamConsumersAnimated as JetStreamConsumersAnimatedComponent,
  CentralizedAuthAnimated as CentralizedAuthAnimatedComponent,
  DecentralizedAuthAnimated as DecentralizedAuthAnimatedComponent,
  AuthCalloutAnimated as AuthCalloutAnimatedComponent,
  SingleToClusterAnimated as SingleToClusterAnimatedComponent,
  ClusterMeshAnimated as ClusterMeshAnimatedComponent,
  SuperClusterAnimated as SuperClusterAnimatedComponent,
  LeafNodeAnimated as LeafNodeAnimatedComponent,
  MassiveScaleAnimated as MassiveScaleAnimatedComponent,
  ServiceRequestAnimated as ServiceRequestAnimatedComponent,
  ServiceEndpointsAnimated as ServiceEndpointsAnimatedComponent,
  ServiceDiscoveryAnimated as ServiceDiscoveryAnimatedComponent,
  ServiceStatsAnimated as ServiceStatsAnimatedComponent,
  ServiceScalingAnimated as ServiceScalingAnimatedComponent,
  ConnectHandshakeAnimated as ConnectHandshakeAnimatedComponent,
  ReconnectBackoffAnimated as ReconnectBackoffAnimatedComponent,
  DrainVsCloseAnimated as DrainVsCloseAnimatedComponent,
  SlowConsumerAnimated as SlowConsumerAnimatedComponent,
  RequestRetryAnimated as RequestRetryAnimatedComponent,
  TlsAuthHandshakeAnimated as TlsAuthHandshakeAnimatedComponent,
  KvWatchAnimated as KvWatchAnimatedComponent,
  KvCasRetryAnimated as KvCasRetryAnimatedComponent,
  KvTtlExpiryAnimated as KvTtlExpiryAnimatedComponent,
  ObjectPutGetAnimated as ObjectPutGetAnimatedComponent,
  ObjectWatchSyncAnimated as ObjectWatchSyncAnimatedComponent,
  ObjectRollupAnimated as ObjectRollupAnimatedComponent,
  ClusterGossipAnimated as ClusterGossipAnimatedComponent,
  RaftElectionAnimated as RaftElectionAnimatedComponent,
  R3ReplicationAnimated as R3ReplicationAnimatedComponent,
  PeerScalingAnimated as PeerScalingAnimatedComponent,
  MonitoringEndpointsAnimated as MonitoringEndpointsAnimatedComponent,
  ConsumerLagAnimated as ConsumerLagAnimatedComponent,
  AdvisoryFlowAnimated as AdvisoryFlowAnimatedComponent,
  MetricsScrapeAnimated as MetricsScrapeAnimatedComponent,
  StreamSnapshotAnimated as StreamSnapshotAnimatedComponent,
  MirrorDRAnimated as MirrorDRAnimatedComponent,
  MirrorFailoverAnimated as MirrorFailoverAnimatedComponent,
  CrdReconcileAnimated as CrdReconcileAnimatedComponent,
  ConfigReloadAnimated as ConfigReloadAnimatedComponent,
  LameDuckUpgradeAnimated as LameDuckUpgradeAnimatedComponent,
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
      CentralizedAuthAnimated: typeof CentralizedAuthAnimatedComponent;
      DecentralizedAuthAnimated: typeof DecentralizedAuthAnimatedComponent;
      AuthCalloutAnimated: typeof AuthCalloutAnimatedComponent;
      SingleToClusterAnimated: typeof SingleToClusterAnimatedComponent;
      ClusterMeshAnimated: typeof ClusterMeshAnimatedComponent;
      SuperClusterAnimated: typeof SuperClusterAnimatedComponent;
      LeafNodeAnimated: typeof LeafNodeAnimatedComponent;
      MassiveScaleAnimated: typeof MassiveScaleAnimatedComponent;
      ServiceRequestAnimated: typeof ServiceRequestAnimatedComponent;
      ServiceEndpointsAnimated: typeof ServiceEndpointsAnimatedComponent;
      ServiceDiscoveryAnimated: typeof ServiceDiscoveryAnimatedComponent;
      ServiceStatsAnimated: typeof ServiceStatsAnimatedComponent;
      ServiceScalingAnimated: typeof ServiceScalingAnimatedComponent;
      ConnectHandshakeAnimated: typeof ConnectHandshakeAnimatedComponent;
      ReconnectBackoffAnimated: typeof ReconnectBackoffAnimatedComponent;
      DrainVsCloseAnimated: typeof DrainVsCloseAnimatedComponent;
      SlowConsumerAnimated: typeof SlowConsumerAnimatedComponent;
      RequestRetryAnimated: typeof RequestRetryAnimatedComponent;
      TlsAuthHandshakeAnimated: typeof TlsAuthHandshakeAnimatedComponent;
      KvWatchAnimated: typeof KvWatchAnimatedComponent;
      KvCasRetryAnimated: typeof KvCasRetryAnimatedComponent;
      KvTtlExpiryAnimated: typeof KvTtlExpiryAnimatedComponent;
      ObjectPutGetAnimated: typeof ObjectPutGetAnimatedComponent;
      ObjectWatchSyncAnimated: typeof ObjectWatchSyncAnimatedComponent;
      ObjectRollupAnimated: typeof ObjectRollupAnimatedComponent;
      ClusterGossipAnimated: typeof ClusterGossipAnimatedComponent;
      RaftElectionAnimated: typeof RaftElectionAnimatedComponent;
      R3ReplicationAnimated: typeof R3ReplicationAnimatedComponent;
      PeerScalingAnimated: typeof PeerScalingAnimatedComponent;
      MonitoringEndpointsAnimated: typeof MonitoringEndpointsAnimatedComponent;
      ConsumerLagAnimated: typeof ConsumerLagAnimatedComponent;
      AdvisoryFlowAnimated: typeof AdvisoryFlowAnimatedComponent;
      MetricsScrapeAnimated: typeof MetricsScrapeAnimatedComponent;
      StreamSnapshotAnimated: typeof StreamSnapshotAnimatedComponent;
      MirrorDRAnimated: typeof MirrorDRAnimatedComponent;
      MirrorFailoverAnimated: typeof MirrorFailoverAnimatedComponent;
      CrdReconcileAnimated: typeof CrdReconcileAnimatedComponent;
      ConfigReloadAnimated: typeof ConfigReloadAnimatedComponent;
      LameDuckUpgradeAnimated: typeof LameDuckUpgradeAnimatedComponent;
      scenarios: {
        publishSubscribe: typeof publishSubscribeScenario;
        requestReply: typeof requestReplyScenario;
        requestReplyScatterGather: typeof requestReplyScatterGatherScenario;
        requestReplyQueueGroup: typeof requestReplyQueueGroupScenario;
        queueGroup: typeof queueGroupScenario;
        fanOut: typeof fanOutScenario;
        fanIn: typeof fanInScenario;
        toggleableSubscribers: typeof toggleableSubscribersScenario;
        singleServer: typeof singleServerScenario;
        cluster: typeof clusterScenario;
        superCluster: typeof superClusterScenario;
        leafNode: typeof leafNodeScenario;
        massiveScale: typeof massiveScaleScenario;
      };
    };
  }
}

export {};
