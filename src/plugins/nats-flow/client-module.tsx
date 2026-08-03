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
      PublishAckAnimated: module.PublishAckAnimated,
      JetStreamConsumersAnimated: module.JetStreamConsumersAnimated,
      JetStreamPipelineAnimated: module.JetStreamPipelineAnimated,
      ConsumerServerSideAnimated: module.ConsumerServerSideAnimated,
      DoubleAckAnimated: module.DoubleAckAnimated,
      RedeliveryOrderAnimated: module.RedeliveryOrderAnimated,
      TwoConsumersAnimated: module.TwoConsumersAnimated,
      AckResponsesAnimated: module.AckResponsesAnimated,
      WorkerPoolAnimated: module.WorkerPoolAnimated,
      CrashRedeliveryAnimated: module.CrashRedeliveryAnimated,
      PriorityOverflowAnimated: module.PriorityOverflowAnimated,
      PriorityPinnedAnimated: module.PriorityPinnedAnimated,
      PriorityPrioritizedAnimated: module.PriorityPrioritizedAnimated,
      MaxAgeAnimated: module.MaxAgeAnimated,
      MaxMsgsAnimated: module.MaxMsgsAnimated,
      DiscardOldAnimated: module.DiscardOldAnimated,
      DiscardNewAnimated: module.DiscardNewAnimated,
      DeleteMessageAnimated: module.DeleteMessageAnimated,
      PurgeStreamAnimated: module.PurgeStreamAnimated,
      SequenceGapAnimated: module.SequenceGapAnimated,
      NodeLossAnimated: module.NodeLossAnimated,
      LeaderFailoverAnimated: module.LeaderFailoverAnimated,
      AsyncOrderingAnimated: module.AsyncOrderingAnimated,
      AtomicBatchAnimated: module.AtomicBatchAnimated,
      FastIngestAnimated: module.FastIngestAnimated,
      LimitsRetentionAnimated: module.LimitsRetentionAnimated,
      InterestRetentionAnimated: module.InterestRetentionAnimated,
      WorkQueueRetentionAnimated: module.WorkQueueRetentionAnimated,
      CentralizedAuthAnimated: module.CentralizedAuthAnimated,
      DecentralizedAuthAnimated: module.DecentralizedAuthAnimated,
      AuthCalloutAnimated: module.AuthCalloutAnimated,
      SingleToClusterAnimated: module.SingleToClusterAnimated,
      ClusterMeshAnimated: module.ClusterMeshAnimated,
      SuperClusterAnimated: module.SuperClusterAnimated,
      LeafNodeAnimated: module.LeafNodeAnimated,
      MassiveScaleAnimated: module.MassiveScaleAnimated,
      // --- Learn deep-dive scenarios (2026-06) ---
      ServiceRequestAnimated: module.ServiceRequestAnimated,
      ServiceEndpointsAnimated: module.ServiceEndpointsAnimated,
      ServiceDiscoveryAnimated: module.ServiceDiscoveryAnimated,
      ServiceStatsAnimated: module.ServiceStatsAnimated,
      ServiceScalingAnimated: module.ServiceScalingAnimated,
      ConnectHandshakeAnimated: module.ConnectHandshakeAnimated,
      ReconnectBackoffAnimated: module.ReconnectBackoffAnimated,
      DrainVsCloseAnimated: module.DrainVsCloseAnimated,
      SlowConsumerAnimated: module.SlowConsumerAnimated,
      RequestRetryAnimated: module.RequestRetryAnimated,
      TlsAuthHandshakeAnimated: module.TlsAuthHandshakeAnimated,
      KvWatchAnimated: module.KvWatchAnimated,
      KvCasRetryAnimated: module.KvCasRetryAnimated,
      KvTtlExpiryAnimated: module.KvTtlExpiryAnimated,
      ObjectPutGetAnimated: module.ObjectPutGetAnimated,
      ObjectWatchSyncAnimated: module.ObjectWatchSyncAnimated,
      ObjectRollupAnimated: module.ObjectRollupAnimated,
      ClusterGossipAnimated: module.ClusterGossipAnimated,
      RaftElectionAnimated: module.RaftElectionAnimated,
      R3ReplicationAnimated: module.R3ReplicationAnimated,
      PeerScalingAnimated: module.PeerScalingAnimated,
      MonitoringEndpointsAnimated: module.MonitoringEndpointsAnimated,
      ConsumerLagAnimated: module.ConsumerLagAnimated,
      AdvisoryFlowAnimated: module.AdvisoryFlowAnimated,
      MetricsScrapeAnimated: module.MetricsScrapeAnimated,
      StreamSnapshotAnimated: module.StreamSnapshotAnimated,
      MirrorDRAnimated: module.MirrorDRAnimated,
      MirrorFailoverAnimated: module.MirrorFailoverAnimated,
      CrdReconcileAnimated: module.CrdReconcileAnimated,
      ConfigReloadAnimated: module.ConfigReloadAnimated,
      LameDuckUpgradeAnimated: module.LameDuckUpgradeAnimated,
      MirrorCopyAnimated: module.MirrorCopyAnimated,
      SourcesMergeAnimated: module.SourcesMergeAnimated,
      DirectGetAnimated: module.DirectGetAnimated,
      BatchGetAnimated: module.BatchGetAnimated,
      SubjectTransformAnimated: module.SubjectTransformAnimated,
      MessageTtlAnimated: module.MessageTtlAnimated,
      AccountIsolationAnimated: module.AccountIsolationAnimated,
      CrossAccountExportAnimated: module.CrossAccountExportAnimated,
      ResolverPushAnimated: module.ResolverPushAnimated,
      TlsFirstHandshakeAnimated: module.TlsFirstHandshakeAnimated,
      // --- MQTT deep-dive scenarios ---
      MqttBridgeAnimated: module.MqttBridgeAnimated,
      MqttRetainedAnimated: module.MqttRetainedAnimated,
      // --- WebSocket deep-dive scenarios ---
      WsUpgradeAnimated: module.WsUpgradeAnimated,
      WsLeafNodeAnimated: module.WsLeafNodeAnimated,
      scenarios: {
        publishSubscribe: module.publishSubscribeScenario,
        requestReply: module.requestReplyScenario,
        requestReplyScatterGather: module.requestReplyScatterGatherScenario,
        requestReplyQueueGroup: module.requestReplyQueueGroupScenario,
        queueGroup: module.queueGroupScenario,
        fanOut: module.fanOutScenario,
        fanIn: module.fanInScenario,
        toggleableSubscribers: module.toggleableSubscribersScenario,
        singleServer: module.singleServerScenario,
        topologiesSingleServer: module.topologiesSingleServerScenario,
        topologiesClusterMesh: module.topologiesClusterMeshScenario,
        cluster: module.clusterScenario,
        superCluster: module.superClusterScenario,
        leafNode: module.leafNodeScenario,
        massiveScale: module.massiveScaleScenario,
      },
    };

    console.log('NatsFlow components loaded and available');

    // Trigger initialization after components are loaded
    const event = new CustomEvent('natsflow-loaded');
    window.dispatchEvent(event);
  });
}

export {};
