# JetStream Errors

This page contains a comprehensive list of all JetStream error codes and their descriptions, organized by category.


## Account Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10002      | `JSAccountResourcesExceededErr`              | 400         | resource limits exceeded for account                                                         |
| 10035      | `JSNoAccountErr`              | 503         | account not found                                                         |
| 10039      | `JSNotEnabledForAccountErr`              | 503         | JetStream not enabled for account                                                         |


## General Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10003      | `JSBadRequestErr`              | 400         | bad request                                                         |
| 10015      | `JSSnapshotDeliverSubjectInvalidErr`              | 400         | deliver subject not valid                                                         |
| 10023      | `JSInsufficientResourcesErr`              | 503         | insufficient resources                                                         |
| 10025      | `JSInvalidJSONErr`              | 400         | invalid JSON: `{err}`                                                         |
| 10028      | `JSMemoryResourcesExceededErr`              | 500         | insufficient memory resources available                                                         |
| 10038      | `JSNotEmptyRequestErr`              | 400         | expected an empty request payload                                                         |
| 10041      | `JSRaftGeneralErrF`              | 500         | `{err}`                                                         |
| 10042      | `JSRestoreSubscribeFailedErrF`              | 500         | JetStream unable to subscribe to restore snapshot `{subject}`: `{err}`                                                         |
| 10043      | `JSSequenceNotFoundErrF`              | 400         | sequence `{seq}` not found                                                         |
| 10047      | `JSStorageResourcesExceededErr`              | 500         | insufficient storage resources available                                                         |
| 10072      | `JSTempStorageFailedErr`              | 500         | JetStream unable to open temp storage for restore                                                         |
| 10073      | `JSTemplateNameNotMatchSubjectErr`              | 400         | template name in subject does not match request                                                         |
| 10075      | `JSPeerRemapErr`              | 503         | peer remap failed                                                         |
| 10076      | `JSNotEnabledErr`              | 503         | JetStream not enabled                                                         |
| 10120      | `JSNoLimitsErr`              | 400         | no JetStream default or applicable tiered limit present                                                         |
| 10133      | `JSReplicasCountCannotBeNegative`              | 400         | replicas count cannot be negative                                                         |
| 10157      | `JSPedanticErrF`              | 400         | pedantic mode: `{err}`                                                         |
| 10185      | `JSRequiredApiLevelErr`              | 412         | JetStream minimum api level required                                                         |
| 10205      | `JSBatchPublishDisabledErr`              | 400         | batch publish is disabled                                                         |
| 10206      | `JSBatchPublishInvalidPatternErr`              | 400         | batch publish pattern is invalid                                                         |
| 10207      | `JSBatchPublishInvalidBatchIDErr`              | 400         | batch publish ID is invalid                                                         |
| 10208      | `JSBatchPublishUnknownBatchIDErr`              | 400         | batch publish ID unknown                                                         |
| 10211      | `JSBatchPublishTooManyInflight`              | 429         | batch publish too many inflight                                                         |


## Clustering Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10004      | `JSClusterIncompleteErr`              | 503         | incomplete results                                                         |
| 10005      | `JSClusterNoPeersErrF`              | 400         | `{err}`                                                         |
| 10006      | `JSClusterNotActiveErr`              | 500         | JetStream not in clustered mode                                                         |
| 10007      | `JSClusterNotAssignedErr`              | 500         | JetStream cluster not assigned to this server                                                         |
| 10008      | `JSClusterNotAvailErr`              | 503         | JetStream system temporarily unavailable                                                         |
| 10009      | `JSClusterNotLeaderErr`              | 500         | JetStream cluster can not handle request                                                         |
| 10010      | `JSClusterRequiredErr`              | 503         | JetStream clustering support required                                                         |
| 10011      | `JSClusterTagsErr`              | 400         | tags placement not supported for operation                                                         |
| 10036      | `JSClusterUnSupportFeatureErr`              | 503         | not currently supported in clustered mode                                                         |
| 10040      | `JSClusterPeerNotMemberErr`              | 400         | peer not a member                                                         |
| 10044      | `JSClusterServerNotMemberErr`              | 400         | server is not a member of the cluster                                                         |
| 10202      | `JSClusterServerMemberChangeInflightErr`              | 400         | cluster member change is in progress                                                         |


## Consumer Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10012      | `JSConsumerCreateErrF`              | 500         | `{err}`                                                         |
| 10013      | `JSConsumerNameExistErr`              | 400         | consumer name already in use                                                         |
| 10014      | `JSConsumerNotFoundErr`              | 404         | consumer not found                                                         |
| 10016      | `JSConsumerDurableNameNotInSubjectErr`              | 400         | consumer expected to be durable but no durable name set in subject                                                         |
| 10017      | `JSConsumerDurableNameNotMatchSubjectErr`              | 400         | consumer name in subject does not match durable name in request                                                         |
| 10018      | `JSConsumerDurableNameNotSetErr`              | 400         | consumer expected to be durable but a durable name was not set                                                         |
| 10019      | `JSConsumerEphemeralWithDurableInSubjectErr`              | 400         | consumer expected to be ephemeral but detected a durable name set in subject                                                         |
| 10020      | `JSConsumerEphemeralWithDurableNameErr`              | 400         | consumer expected to be ephemeral but a durable name was set in request                                                         |
| 10026      | `JSMaximumConsumersLimitErr`              | 400         | maximum consumers limit reached                                                         |
| 10029      | `JSMirrorConsumerSetupFailedErrF`              | 500         | `{err}`                                                         |
| 10045      | `JSSourceConsumerSetupFailedErrF`              | 500         | `{err}`                                                         |
| 10078      | `JSConsumerConfigRequiredErr`              | 400         | consumer config required                                                         |
| 10079      | `JSConsumerDeliverToWildcardsErr`              | 400         | consumer deliver subject has wildcards                                                         |
| 10080      | `JSConsumerPushMaxWaitingErr`              | 400         | consumer in push mode can not set max waiting                                                         |
| 10081      | `JSConsumerDeliverCycleErr`              | 400         | consumer deliver subject forms a cycle                                                         |
| 10082      | `JSConsumerMaxPendingAckPolicyRequiredErr`              | 400         | consumer requires ack policy for max ack pending                                                         |
| 10083      | `JSConsumerSmallHeartbeatErr`              | 400         | consumer idle heartbeat needs to be >= 100ms                                                         |
| 10084      | `JSConsumerPullRequiresAckErr`              | 400         | consumer in pull mode requires explicit ack policy on workqueue stream                                                         |
| 10085      | `JSConsumerPullNotDurableErr`              | 400         | consumer in pull mode requires a durable name                                                         |
| 10086      | `JSConsumerPullWithRateLimitErr`              | 400         | consumer in pull mode can not have rate limit set                                                         |
| 10087      | `JSConsumerMaxWaitingNegativeErr`              | 400         | consumer max waiting needs to be positive                                                         |
| 10088      | `JSConsumerHBRequiresPushErr`              | 400         | consumer idle heartbeat requires a push based consumer                                                         |
| 10089      | `JSConsumerFCRequiresPushErr`              | 400         | consumer flow control requires a push based consumer                                                         |
| 10090      | `JSConsumerDirectRequiresPushErr`              | 400         | consumer direct requires a push based consumer                                                         |
| 10091      | `JSConsumerDirectRequiresEphemeralErr`              | 400         | consumer direct requires an ephemeral consumer                                                         |
| 10092      | `JSConsumerOnMappedErr`              | 400         | consumer direct on a mapped consumer                                                         |
| 10093      | `JSConsumerFilterNotSubsetErr`              | 400         | consumer filter subject is not a valid subset of the interest subjects                                                         |
| 10094      | `JSConsumerInvalidPolicyErrF`              | 400         | `{err}`                                                         |
| 10095      | `JSConsumerInvalidSamplingErrF`              | 400         | failed to parse consumer sampling configuration: `{err}`                                                         |
| 10098      | `JSConsumerWQRequiresExplicitAckErr`              | 400         | workqueue stream requires explicit ack                                                         |
| 10099      | `JSConsumerWQMultipleUnfilteredErr`              | 400         | multiple non-filtered consumers not allowed on workqueue stream                                                         |
| 10100      | `JSConsumerWQConsumerNotUniqueErr`              | 400         | filtered consumer not unique on workqueue stream                                                         |
| 10101      | `JSConsumerWQConsumerNotDeliverAllErr`              | 400         | consumer must be deliver all on workqueue stream                                                         |
| 10102      | `JSConsumerNameTooLongErrF`              | 400         | consumer name is too long, maximum allowed is `{max}`                                                         |
| 10103      | `JSConsumerBadDurableNameErr`              | 400         | durable name can not contain '.', '*', '>'                                                         |
| 10104      | `JSConsumerStoreFailedErrF`              | 500         | error creating store for consumer: `{err}`                                                         |
| 10105      | `JSConsumerExistingActiveErr`              | 400         | consumer already exists and is still active                                                         |
| 10106      | `JSConsumerReplacementWithDifferentNameErr`              | 400         | consumer replacement durable config not the same                                                         |
| 10107      | `JSConsumerDescriptionTooLongErrF`              | 400         | consumer description is too long, maximum allowed is `{max}`                                                         |
| 10108      | `JSConsumerWithFlowControlNeedsHeartbeats`              | 400         | consumer with flow control also needs heartbeats                                                         |
| 10112      | `JSConsumerInvalidDeliverSubject`              | 400         | invalid push consumer deliver subject                                                         |
| 10114      | `JSConsumerMaxRequestBatchNegativeErr`              | 400         | consumer max request batch needs to be > 0                                                         |
| 10115      | `JSConsumerMaxRequestExpiresTooSmall`              | 400         | consumer max request expires needs to be >= 1ms                                                         |
| 10116      | `JSConsumerMaxDeliverBackoffErr`              | 400         | max deliver is required to be > length of backoff values                                                         |
| 10119      | `JSConsumerOfflineErr`              | 500         | consumer is offline                                                         |
| 10121      | `JSConsumerMaxPendingAckExcessErrF`              | 400         | consumer max ack pending exceeds system limit of `{limit}`                                                         |
| 10125      | `JSConsumerMaxRequestBatchExceededF`              | 400         | consumer max request batch exceeds server limit of `{limit}`                                                         |
| 10126      | `JSConsumerReplicasExceedsStream`              | 400         | consumer config replica count exceeds parent stream                                                         |
| 10127      | `JSConsumerNameContainsPathSeparatorsErr`              | 400         | Consumer name can not contain path separators                                                         |
| 10131      | `JSConsumerCreateFilterSubjectMismatchErr`              | 400         | Consumer create request did not match filtered subject from create subject                                                         |
| 10132      | `JSConsumerCreateDurableAndNameMismatch`              | 400         | Consumer Durable and Name have to be equal if both are provided                                                         |
| 10134      | `JSConsumerReplicasShouldMatchStream`              | 400         | consumer config replicas must match interest retention stream's replicas                                                         |
| 10135      | `JSConsumerMetadataLengthErrF`              | 400         | consumer metadata exceeds maximum size of `{limit}`                                                         |
| 10136      | `JSConsumerDuplicateFilterSubjects`              | 400         | consumer cannot have both FilterSubject and FilterSubjects specified                                                         |
| 10137      | `JSConsumerMultipleFiltersNotAllowed`              | 400         | consumer with multiple subject filters cannot use subject based API                                                         |
| 10138      | `JSConsumerOverlappingSubjectFilters`              | 400         | consumer subject filters cannot overlap                                                         |
| 10139      | `JSConsumerEmptyFilter`              | 400         | consumer filter in FilterSubjects cannot be empty                                                         |
| 10148      | `JSConsumerAlreadyExists`              | 400         | consumer already exists                                                         |
| 10149      | `JSConsumerDoesNotExist`              | 400         | consumer does not exist                                                         |
| 10153      | `JSConsumerInactiveThresholdExcess`              | 400         | consumer inactive threshold exceeds system limit of `{limit}`                                                         |
| 10159      | `JSConsumerPriorityPolicyWithoutGroup`              | 400         | Setting PriorityPolicy requires at least one PriorityGroup to be set                                                         |
| 10160      | `JSConsumerInvalidPriorityGroupErr`              | 400         | Provided priority group does not exist for this consumer                                                         |
| 10161      | `JSConsumerEmptyGroupName`              | 400         | Group name cannot be an empty string                                                         |
| 10162      | `JSConsumerInvalidGroupNameErr`              | 400         | Valid priority group name must match A-Z, a-z, 0-9, -_/=)+ and may not exceed 16 characters                                                         |
| 10178      | `JSConsumerPushWithPriorityGroupErr`              | 400         | priority groups can not be used with push consumers                                                         |
| 10181      | `JSConsumerAckPolicyInvalidErr`              | 400         | consumer ack policy invalid                                                         |
| 10182      | `JSConsumerReplayPolicyInvalidErr`              | 400         | consumer replay policy invalid                                                         |
| 10183      | `JSConsumerAckWaitNegativeErr`              | 400         | consumer ack wait needs to be positive                                                         |
| 10184      | `JSConsumerBackOffNegativeErr`              | 400         | consumer backoff needs to be positive                                                         |
| 10195      | `JSConsumerOfflineReasonErrF`              | 500         | consumer is offline: `{err}`                                                         |
| 10196      | `JSConsumerPriorityGroupWithPolicyNone`              | 400         | consumer can not have priority groups when policy is none                                                         |
| 10197      | `JSConsumerPinnedTTLWithoutPriorityPolicyNone`              | 400         | PinnedTTL cannot be set when PriorityPolicy is none                                                         |
| 10204      | `JSConsumerInvalidResetErr`              | 400         | invalid reset: `{err}`                                                         |
| 10213      | `JSMirrorDurableConsumerCfgInvalid`              | 400         | stream mirror consumer config is invalid                                                         |
| 10214      | `JSMirrorConsumerRequiresAckFCErr`              | 400         | stream mirror consumer requires flow control ack policy                                                         |
| 10215      | `JSSourceDurableConsumerCfgInvalid`              | 400         | stream source consumer config is invalid                                                         |
| 10216      | `JSSourceDurableConsumerDuplicateDetected`              | 400         | duplicate stream source consumer detected                                                         |
| 10217      | `JSSourceConsumerRequiresAckFCErr`              | 400         | stream source consumer requires flow control ack policy                                                         |
| 10218      | `JSConsumerAckFCRequiresPushErr`              | 400         | flow control ack policy requires a push based consumer                                                         |
| 10219      | `JSConsumerAckFCRequiresFCErr`              | 400         | flow control ack policy requires flow control                                                         |
| 10220      | `JSConsumerAckFCRequiresMaxAckPendingErr`              | 400         | flow control ack policy requires max ack pending                                                         |
| 10221      | `JSConsumerAckFCRequiresNoAckWaitErr`              | 400         | flow control ack policy requires unset ack wait                                                         |
| 10222      | `JSConsumerAckFCRequiresNoMaxDeliverErr`              | 400         | flow control ack policy requires unset max deliver                                                         |


## Stream Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10021      | `JSStreamExternalApiOverlapErrF`              | 400         | stream external api prefix `{prefix}` must not overlap with `{subject}`                                                         |
| 10022      | `JSStreamExternalDelPrefixOverlapsErrF`              | 400         | stream external delivery prefix `{prefix}` overlaps with stream subject `{subject}`                                                         |
| 10024      | `JSStreamInvalidExternalDeliverySubjErrF`              | 400         | stream external delivery prefix `{prefix}` must not contain wildcards                                                         |
| 10027      | `JSMaximumStreamsLimitErr`              | 400         | maximum number of streams reached                                                         |
| 10048      | `JSStreamAssignmentErrF`              | 500         | `{err}`                                                         |
| 10049      | `JSStreamCreateErrF`              | 500         | `{err}`                                                         |
| 10050      | `JSStreamDeleteErrF`              | 500         | `{err}`                                                         |
| 10051      | `JSStreamGeneralErrorF`              | 500         | `{err}`                                                         |
| 10052      | `JSStreamInvalidConfigF`              | 500         | `{err}`                                                         |
| 10053      | `JSStreamLimitsErrF`              | 500         | `{err}`                                                         |
| 10054      | `JSStreamMessageExceedsMaximumErr`              | 400         | message size exceeds maximum allowed                                                         |
| 10056      | `JSStreamMismatchErr`              | 400         | stream name in subject does not match request                                                         |
| 10057      | `JSStreamMsgDeleteFailedF`              | 500         | `{err}`                                                         |
| 10058      | `JSStreamNameExistErr`              | 400         | stream name already in use with a different configuration                                                         |
| 10059      | `JSStreamNotFoundErr`              | 404         | stream not found                                                         |
| 10060      | `JSStreamNotMatchErr`              | 400         | expected stream does not match                                                         |
| 10061      | `JSStreamReplicasNotUpdatableErr`              | 400         | Replicas configuration can not be updated                                                         |
| 10062      | `JSStreamRestoreErrF`              | 500         | restore failed: `{err}`                                                         |
| 10063      | `JSStreamSequenceNotMatchErr`              | 503         | expected stream sequence does not match                                                         |
| 10064      | `JSStreamSnapshotErrF`              | 500         | snapshot failed: `{err}`                                                         |
| 10065      | `JSStreamSubjectOverlapErr`              | 400         | subjects overlap with an existing stream                                                         |
| 10066      | `JSStreamTemplateCreateErrF`              | 500         | `{err}`                                                         |
| 10067      | `JSStreamTemplateDeleteErrF`              | 500         | `{err}`                                                         |
| 10068      | `JSStreamTemplateNotFoundErr`              | 404         | template not found                                                         |
| 10069      | `JSStreamUpdateErrF`              | 500         | `{err}`                                                         |
| 10070      | `JSStreamWrongLastMsgIDErrF`              | 400         | wrong last msg ID: `{id}`                                                         |
| 10071      | `JSStreamWrongLastSequenceErrF`              | 400         | wrong last sequence: `{seq}`                                                         |
| 10074      | `JSStreamReplicasNotSupportedErr`              | 500         | replicas > 1 not supported in non-clustered mode                                                         |
| 10077      | `JSStreamStoreFailedF`              | 503         | `{err}`                                                         |
| 10096      | `JSStreamInvalidErr`              | 500         | stream not valid                                                         |
| 10097      | `JSStreamHeaderExceedsMaximumErr`              | 400         | header size exceeds maximum allowed of 64k                                                         |
| 10109      | `JSStreamSealedErr`              | 400         | invalid operation on sealed stream                                                         |
| 10110      | `JSStreamPurgeFailedF`              | 500         | `{err}`                                                         |
| 10111      | `JSStreamRollupFailedF`              | 500         | `{err}`                                                         |
| 10113      | `JSStreamMaxBytesRequired`              | 400         | account requires a stream config to have max bytes set                                                         |
| 10117      | `JSStreamInfoMaxSubjectsErr`              | 500         | subject details would exceed maximum allowed                                                         |
| 10118      | `JSStreamOfflineErr`              | 500         | stream is offline                                                         |
| 10122      | `JSStreamMaxStreamBytesExceeded`              | 400         | stream max bytes exceeds account limit max stream bytes                                                         |
| 10123      | `JSStreamMoveAndScaleErr`              | 400         | can not move and scale a stream in a single update                                                         |
| 10124      | `JSStreamMoveInProgressF`              | 400         | stream move already in progress: `{msg}`                                                         |
| 10128      | `JSStreamNameContainsPathSeparatorsErr`              | 400         | Stream name can not contain path separators                                                         |
| 10129      | `JSStreamMoveNotInProgress`              | 400         | stream move not in progress                                                         |
| 10130      | `JSStreamNameExistRestoreFailedErr`              | 400         | stream name already in use, cannot restore                                                         |
| 10156      | `JSStreamTransformInvalidDestination`              | 400         | stream transform: `{err}`                                                         |
| 10158      | `JSStreamDuplicateMessageConflict`              | 409         | duplicate message id is in process                                                         |
| 10163      | `JSStreamExpectedLastSeqPerSubjectNotReady`              | 503         | expected last sequence per subject temporarily unavailable                                                         |
| 10164      | `JSStreamWrongLastSequenceConstantErr`              | 400         | wrong last sequence                                                         |
| 10167      | `JSStreamTooManyRequests`              | 429         | too many requests                                                         |
| 10180      | `JSStreamMinLastSeqErr`              | 412         | min last sequence                                                         |
| 10193      | `JSStreamExpectedLastSeqPerSubjectInvalid`              | 400         | missing sequence for expected last sequence per subject                                                         |
| 10194      | `JSStreamOfflineReasonErrF`              | 500         | stream is offline: `{err}`                                                         |


## Mirror Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10030      | `JSMirrorMaxMessageSizeTooBigErr`              | 400         | stream mirror must have max message size >= source                                                         |
| 10031      | `JSMirrorWithSourcesErr`              | 400         | stream mirrors can not also contain other sources                                                         |
| 10032      | `JSMirrorWithStartSeqAndTimeErr`              | 400         | stream mirrors can not have both start seq and start time configured                                                         |
| 10033      | `JSMirrorWithSubjectFiltersErr`              | 400         | stream mirrors can not contain filtered subjects                                                         |
| 10034      | `JSMirrorWithSubjectsErr`              | 400         | stream mirrors can not contain subjects                                                         |
| 10055      | `JSStreamMirrorNotUpdatableErr`              | 400         | stream mirror configuration can not be updated                                                         |
| 10142      | `JSMirrorInvalidStreamName`              | 400         | mirrored stream name is invalid                                                         |
| 10143      | `JSMirrorWithFirstSeqErr`              | 400         | stream mirrors can not have first sequence configured                                                         |
| 10150      | `JSMirrorMultipleFiltersNotAllowed`              | 400         | mirror with multiple subject transforms cannot also have a single subject filter                                                         |
| 10151      | `JSMirrorInvalidSubjectFilter`              | 400         | mirror transform source: `{err}`                                                         |
| 10152      | `JSMirrorOverlappingSubjectFilters`              | 400         | mirror subject filters can not overlap                                                         |
| 10154      | `JSMirrorInvalidTransformDestination`              | 400         | mirror transform: `{err}`                                                         |
| 10173      | `JSMirrorWithCountersErr`              | 400         | stream mirrors can not also calculate counters                                                         |
| 10186      | `JSMirrorWithMsgSchedulesErr`              | 400         | stream mirrors can not also schedule messages                                                         |
| 10198      | `JSMirrorWithAtomicPublishErr`              | 400         | stream mirrors can not also use atomic publishing                                                         |
| 10209      | `JSMirrorWithBatchPublishErr`              | 400         | stream mirrors can not also use batch publishing                                                         |


## Source Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10046      | `JSSourceMaxMessageSizeTooBigErr`              | 400         | stream source must have max message size >= target                                                         |
| 10140      | `JSSourceDuplicateDetected`              | 400         | duplicate source configuration detected                                                         |
| 10141      | `JSSourceInvalidStreamName`              | 400         | sourced stream name is invalid                                                         |
| 10144      | `JSSourceMultipleFiltersNotAllowed`              | 400         | source with multiple subject transforms cannot also have a single subject filter                                                         |
| 10145      | `JSSourceInvalidSubjectFilter`              | 400         | source transform source: `{err}`                                                         |
| 10146      | `JSSourceInvalidTransformDestination`              | 400         | source transform: `{err}`                                                         |
| 10147      | `JSSourceOverlappingSubjectFilters`              | 400         | source filters can not overlap                                                         |
| 10155      | `JSStreamTransformInvalidSource`              | 400         | stream transform source: `{err}`                                                         |
| 10187      | `JSSourceWithMsgSchedulesErr`              | 400         | stream source can not also schedule messages                                                         |
| 10203      | `JSMessageSchedulesSourceInvalidErr`              | 400         | message schedules source is invalid                                                         |


## Message Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10037      | `JSNoMessageFoundErr`              | 404         | no message found                                                         |
| 10165      | `JSMessageTTLInvalidErr`              | 400         | invalid per-message TTL                                                         |
| 10166      | `JSMessageTTLDisabledErr`              | 400         | per-message TTL is disabled                                                         |
| 10168      | `JSMessageIncrDisabledErr`              | 400         | message counters is disabled                                                         |
| 10169      | `JSMessageIncrMissingErr`              | 400         | message counter increment is missing                                                         |
| 10170      | `JSMessageIncrPayloadErr`              | 400         | message counter has payload                                                         |
| 10171      | `JSMessageIncrInvalidErr`              | 400         | message counter increment is invalid                                                         |
| 10172      | `JSMessageCounterBrokenErr`              | 400         | message counter is broken                                                         |
| 10188      | `JSMessageSchedulesDisabledErr`              | 400         | message schedules is disabled                                                         |
| 10189      | `JSMessageSchedulesPatternInvalidErr`              | 400         | message schedules pattern is invalid                                                         |
| 10190      | `JSMessageSchedulesTargetInvalidErr`              | 400         | message schedules target is invalid                                                         |
| 10191      | `JSMessageSchedulesTTLInvalidErr`              | 400         | message schedules invalid per-message TTL                                                         |
| 10192      | `JSMessageSchedulesRollupInvalidErr`              | 400         | message schedules invalid rollup                                                         |
| 10201      | `JSAtomicPublishContainsDuplicateMessageErr`              | 400         | atomic publish batch contains duplicate message id                                                         |
| 10212      | `JSMessageSchedulesSchedulerInvalidErr`              | 400         | message schedules invalid scheduler                                                         |
| 10223      | `JSMessageSchedulesTimeZoneInvalidErr`              | 400         | message schedules time zone is invalid                                                         |


## Atomic Publish Errors

| Error Code | Constant                                     | HTTP Status | Description                                                                                  |
| ---------- | -------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 10174      | `JSAtomicPublishDisabledErr`              | 400         | atomic publish is disabled                                                         |
| 10175      | `JSAtomicPublishMissingSeqErr`              | 400         | atomic publish sequence is missing                                                         |
| 10176      | `JSAtomicPublishIncompleteBatchErr`              | 400         | atomic publish batch is incomplete                                                         |
| 10177      | `JSAtomicPublishUnsupportedHeaderBatchErr`              | 400         | atomic publish unsupported header used: `{header}`                                                         |
| 10179      | `JSAtomicPublishInvalidBatchIDErr`              | 400         | atomic publish batch ID is invalid                                                         |
| 10199      | `JSAtomicPublishTooLargeBatchErrF`              | 400         | atomic publish batch is too large: `{size}`                                                         |
| 10200      | `JSAtomicPublishInvalidBatchCommitErr`              | 400         | atomic publish batch commit is invalid                                                         |
| 10210      | `JSAtomicPublishTooManyInflight`              | 429         | atomic publish too many inflight                                                         |


## Appendix

### Additional Information

Some errors include additional context:

- **Help Text**: Some errors provide additional help information to guide troubleshooting
- **Comments**: Internal comments about the error condition
- **Deprecations**: Some errors deprecate older error codes
- **Placeholders**: Errors with `F` suffix typically include placeholders (e.g., `{err}`, `{limit}`) that are replaced with actual values at runtime

### HTTP Status Codes

JetStream errors typically map to the following HTTP status codes:

- **400 Bad Request**: Client error, invalid request or configuration
- **404 Not Found**: Resource not found (stream, consumer, message)
- **409 Conflict**: Conflicting operation or state
- **412 Precondition Failed**: Required precondition not met
- **429 Too Many Requests**: Rate limiting
- **500 Internal Server Error**: Server-side error
- **503 Service Unavailable**: Temporary unavailability or clustering issues
