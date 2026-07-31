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
  topologiesSingleServerScenario,
  topologiesClusterMeshScenario,
  clusterScenario,
  superClusterScenario,
  leafNodeScenario,
  massiveScaleScenario,
  ToggleableSubscribersScenario as ToggleableSubscribersScenarioComponent,
  QueueGroupAnimated as QueueGroupAnimatedComponent,
  PublishSubscribeAnimated as PublishSubscribeAnimatedComponent,
  SubjectsWildcardAnimated as SubjectsWildcardAnimatedComponent,
  JetStreamContrastAnimated as JetStreamContrastAnimatedComponent,
  PublishAckAnimated as PublishAckAnimatedComponent,
  JetStreamConsumersAnimated as JetStreamConsumersAnimatedComponent,
  JetStreamPipelineAnimated as JetStreamPipelineAnimatedComponent,
  ConsumerServerSideAnimated as ConsumerServerSideAnimatedComponent,
  DoubleAckAnimated as DoubleAckAnimatedComponent,
  RedeliveryOrderAnimated as RedeliveryOrderAnimatedComponent,
  TwoConsumersAnimated as TwoConsumersAnimatedComponent,
  AckResponsesAnimated as AckResponsesAnimatedComponent,
  WorkerPoolAnimated as WorkerPoolAnimatedComponent,
  CrashRedeliveryAnimated as CrashRedeliveryAnimatedComponent,
  PriorityOverflowAnimated as PriorityOverflowAnimatedComponent,
  PriorityPinnedAnimated as PriorityPinnedAnimatedComponent,
  PriorityPrioritizedAnimated as PriorityPrioritizedAnimatedComponent,
  MaxAgeAnimated as MaxAgeAnimatedComponent,
  MaxMsgsAnimated as MaxMsgsAnimatedComponent,
  DiscardOldAnimated as DiscardOldAnimatedComponent,
  DiscardNewAnimated as DiscardNewAnimatedComponent,
  DeleteMessageAnimated as DeleteMessageAnimatedComponent,
  PurgeStreamAnimated as PurgeStreamAnimatedComponent,
  SequenceGapAnimated as SequenceGapAnimatedComponent,
  NodeLossAnimated as NodeLossAnimatedComponent,
  LeaderFailoverAnimated as LeaderFailoverAnimatedComponent,
  AsyncOrderingAnimated as AsyncOrderingAnimatedComponent,
  AtomicBatchAnimated as AtomicBatchAnimatedComponent,
  FastIngestAnimated as FastIngestAnimatedComponent,
  LimitsRetentionAnimated as LimitsRetentionAnimatedComponent,
  InterestRetentionAnimated as InterestRetentionAnimatedComponent,
  WorkQueueRetentionAnimated as WorkQueueRetentionAnimatedComponent,
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
  MirrorCopyAnimated as MirrorCopyAnimatedComponent,
  SourcesMergeAnimated as SourcesMergeAnimatedComponent,
  DirectGetAnimated as DirectGetAnimatedComponent,
  BatchGetAnimated as BatchGetAnimatedComponent,
  SubjectTransformAnimated as SubjectTransformAnimatedComponent,
  MessageTtlAnimated as MessageTtlAnimatedComponent,
  AccountIsolationAnimated as AccountIsolationAnimatedComponent,
  CrossAccountExportAnimated as CrossAccountExportAnimatedComponent,
  ResolverPushAnimated as ResolverPushAnimatedComponent,
  TlsFirstHandshakeAnimated as TlsFirstHandshakeAnimatedComponent,
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
      PublishAckAnimated: typeof PublishAckAnimatedComponent;
      JetStreamConsumersAnimated: typeof JetStreamConsumersAnimatedComponent;
      JetStreamPipelineAnimated: typeof JetStreamPipelineAnimatedComponent;
      ConsumerServerSideAnimated: typeof ConsumerServerSideAnimatedComponent;
      DoubleAckAnimated: typeof DoubleAckAnimatedComponent;
      RedeliveryOrderAnimated: typeof RedeliveryOrderAnimatedComponent;
      TwoConsumersAnimated: typeof TwoConsumersAnimatedComponent;
      AckResponsesAnimated: typeof AckResponsesAnimatedComponent;
      WorkerPoolAnimated: typeof WorkerPoolAnimatedComponent;
      CrashRedeliveryAnimated: typeof CrashRedeliveryAnimatedComponent;
      PriorityOverflowAnimated: typeof PriorityOverflowAnimatedComponent;
      PriorityPinnedAnimated: typeof PriorityPinnedAnimatedComponent;
      PriorityPrioritizedAnimated: typeof PriorityPrioritizedAnimatedComponent;
      MaxAgeAnimated: typeof MaxAgeAnimatedComponent;
      MaxMsgsAnimated: typeof MaxMsgsAnimatedComponent;
      DiscardOldAnimated: typeof DiscardOldAnimatedComponent;
      DiscardNewAnimated: typeof DiscardNewAnimatedComponent;
      DeleteMessageAnimated: typeof DeleteMessageAnimatedComponent;
      PurgeStreamAnimated: typeof PurgeStreamAnimatedComponent;
      SequenceGapAnimated: typeof SequenceGapAnimatedComponent;
      NodeLossAnimated: typeof NodeLossAnimatedComponent;
      LeaderFailoverAnimated: typeof LeaderFailoverAnimatedComponent;
      AsyncOrderingAnimated: typeof AsyncOrderingAnimatedComponent;
      AtomicBatchAnimated: typeof AtomicBatchAnimatedComponent;
      FastIngestAnimated: typeof FastIngestAnimatedComponent;
      LimitsRetentionAnimated: typeof LimitsRetentionAnimatedComponent;
      InterestRetentionAnimated: typeof InterestRetentionAnimatedComponent;
      WorkQueueRetentionAnimated: typeof WorkQueueRetentionAnimatedComponent;
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
      MirrorCopyAnimated: typeof MirrorCopyAnimatedComponent;
      SourcesMergeAnimated: typeof SourcesMergeAnimatedComponent;
      DirectGetAnimated: typeof DirectGetAnimatedComponent;
      BatchGetAnimated: typeof BatchGetAnimatedComponent;
      SubjectTransformAnimated: typeof SubjectTransformAnimatedComponent;
      MessageTtlAnimated: typeof MessageTtlAnimatedComponent;
      AccountIsolationAnimated: typeof AccountIsolationAnimatedComponent;
      CrossAccountExportAnimated: typeof CrossAccountExportAnimatedComponent;
      ResolverPushAnimated: typeof ResolverPushAnimatedComponent;
      TlsFirstHandshakeAnimated: typeof TlsFirstHandshakeAnimatedComponent;
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
        topologiesSingleServer: typeof topologiesSingleServerScenario;
        topologiesClusterMesh: typeof topologiesClusterMeshScenario;
        cluster: typeof clusterScenario;
        superCluster: typeof superClusterScenario;
        leafNode: typeof leafNodeScenario;
        massiveScale: typeof massiveScaleScenario;
      };
    };
  }
}

export {};
