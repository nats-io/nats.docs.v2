---
title: System Errors
sidebar_label: Errors
description: NATS server non-JetStream errors for client, route, gateway, and leafnode connections
---

# System Errors

This page documents all non-JetStream errors that the NATS server can return to clients, routes, gateways, and leafnode connections.


## Authentication and Authorization Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Authentication expired | `ErrAuthExpired` | An expired authorization due to timeout. |
| Proxy is not trusted | `ErrAuthProxyNotTrusted` | An error condition on failed authentication due to a connection from a proxy not in the list of trusted proxies. |
| Proxy connection required | `ErrAuthProxyRequired` | An error condition on failed authentication due to a connection not coming from a proxy. |
| Authentication timeout | `ErrAuthTimeout` | An error condition on failed authorization due to timeout. |
| Authentication error | `ErrAuthentication` | An error condition on failed authentication. |
| Credentials have been revoked | `ErrRevocation` | Returned when a credential has been revoked. |
| Service import not authorized | `ErrServiceImportAuthorization` | Returned when a service import is not authorized. |
| Stream import not authorized | `ErrStreamImportAuthorization` | Returned when a stream import is not authorized. |
| Authorization Violation | `Authorization Violation` | Client attempted an operation that violates configured permissions |
| User Authentication Expired | `User Authentication Expired` | User JWT or credentials have expired |
| Account Authentication Expired | `Account Authentication Expired` | Account authentication has expired |
| User Authentication Revoked | `User Authentication Revoked` | User credentials have been revoked |
| Permissions Violation for Publish | `Permissions Violation for Publish` | Client attempted to publish to a subject without permission |
| Permissions Violation for Subscription | `Permissions Violation for Subscription` | Client attempted to subscribe to a subject without permission |


## Connection Limit Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Maximum account active connections exceeded | `ErrTooManyAccountConnections` | That an account has reached its maximum number of active connections. |
| Maximum connections exceeded | `ErrTooManyConnections` | A client that the maximum number of connections supported by the server has been reached. |
| Maximum subscriptions exceeded | `ErrTooManySubs` | A client that the maximum number of subscriptions per connection has been reached. |
| Connection Throttling Is Active | `Connection Throttling Is Active` | Server is actively throttling new connections |
| Maximum Clients Exceeded | `Maximum Clients Exceeded` | Server has reached its maximum number of allowed clients |


## Protocol and Payload Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Invalid client protocol | `ErrBadClientProtocol` | A client requested an invalid client protocol. |
| Bad message header detected | `ErrBadMsgHeader` | The parser detected a bad message header |
| Maximum control line exceeded | `ErrMaxControlLine` | An error condition when the control line is too big. |
| Maximum payload exceeded | `ErrMaxPayload` | An error condition when the payload is too big. |
| Message headers not supported | `ErrMsgHeadersNotSupported` | The parser detected a message header but they are not supported on this server. |
| No responders requires headers support | `ErrNoRespondersRequiresHeaders` | That a client needs to have headers on if they want no responders behavior. |
| Maximum Payload Violation | `Maximum Payload Violation` | Published message exceeds the configured maximum payload size |
| Protocol Violation | `Protocol Violation` | Client violated the NATS protocol |
| Parser Error | `Parser Error` | Server encountered an error parsing client protocol |


## Subject and Publishing Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Invalid publish subject | `ErrBadPublishSubject` | An error condition for an invalid publish subject. |
| Bad qualifier | `ErrBadQualifier` | Used to error on a bad qualifier for a transform. |
| Invalid subject | `ErrBadSubject` | An error condition for an invalid subject. |
| Invalid mapping destination | `ErrInvalidMappingDestination` | Used for all subject mapping destination errors |
| Invalid transform | `ErrInvalidMappingDestinationSubject` | Used to error on a bad transform destination mapping |
| Malformed subject | `ErrMalformedSubject` | Returned when a subscription is made with a subject that does not conform to subject rules. |
| Wildcard index out of range | `ErrMappingDestinationIndexOutOfRange` | Returned when the mapping destination function is passed an out of range wildcard index value for one of it's arguments |
| Function argument is invalid or in the wrong format | `ErrMappingDestinationInvalidArg` | Returned when the mapping destination function is passed and invalid argument |
| Not enough arguments passed to the function | `ErrMappingDestinationNotEnoughArgs` | Returned when the mapping destination function is not passed enough arguments |
| The only mapping function allowed for import transforms is `{{Wildcard()}}` | `ErrMappingDestinationNotSupportedForImport` | Returned when you try to use a mapping function other than wildcard in a transform that needs to be reversible (i.e. an import) |
| Not using all of the token wildcard(s) | `ErrMappingDestinationNotUsingAllWildcards` | Used to error on a transform destination not using all of the token wildcards |
| Too many arguments passed to the function | `ErrMappingDestinationTooManyArgs` | Returned when the mapping destination function is passed too many arguments |
| No matching transforms available | `ErrNoTransforms` | No subject transforms are available to map this subject. |
| Reserved account | `ErrReservedAccount` | A reserved account that can not be created. |
| Reserved internal subject | `ErrReservedPublishSubject` | An error condition when sending to a reserved subject, e.g. `_SYS.>` |
| Subject has exceeded number of tokens limit | `ErrTooManySubTokens` | A client that the subject has too many tokens. |
| Unknown function | `ErrUnknownMappingDestinationFunction` | Returned when a subject mapping destination contains an unknown mustache-escaped mapping function. |
| Invalid Subscription | `Invalid Subscription` | Subscription request is invalid |


## TLS and Security Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Certificate not pinned | `ErrCertNotPinned` | Returned when pinned certs are set and the certificate is not in it |
| Secure Connection - TLS Required | `Secure Connection - TLS Required` | Server requires TLS but client attempted non-TLS connection |
| TLS Handshake Error | `TLS Handshake Error` | TLS handshake with client failed |


## Account Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Account exists | `ErrAccountExists` | Returned when an account is attempted to be registered but already exists. |
| Account expired | `ErrAccountExpired` | Returned when an account has expired. |
| Account resolver no new claims | `ErrAccountResolverSameClaims` | Returned when same claims have been fetched. |
| Account resolver update too soon | `ErrAccountResolverUpdateTooSoon` | Returned when we attempt an update too soon to last request. |
| Account validation failed | `ErrAccountValidation` | Returned when an account has failed validation. |
| Bad account | `ErrBadAccount` | A malformed or incorrect account. |
| Bad sampling percentage, should be 1-100 | `ErrBadSampling` | Returned when the sampling for latency tracking is not 1 `>=` sample `<=` 100. |
| Bad service response type | `ErrBadServiceType` | Returned when latency tracking is being applied to non-singleton response types. |
| Import forms a cycle | `ErrImportFormsCycle` | Returned when an import would form a cycle. |
| Account missing | `ErrMissingAccount` | Returned when an account does not exist. |
| Service missing | `ErrMissingService` | Returned when an account does not have an exported service. |
| Account resolver missing | `ErrNoAccountResolver` | Returned when we attempt an update but do not have an account resolver. |
| System account not setup | `ErrNoSysAccount` | Returned when an attempt to publish or subscribe is made when there is no internal system account defined. |
| Stream import prefix can not contain wildcard tokens | `ErrStreamImportBadPrefix` | Returned when a stream import prefix contains wildcards. |
| Stream import already exists | `ErrStreamImportDuplicate` | Returned when a stream import is a duplicate of one that already exists. |
| Failed Account Registration | `Failed Account Registration` | Failed to register client with account |


## Server Name and Cluster Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Cluster name conflicts between cluster and gateway definitions | `ErrClusterNameConfigConflict` | That the options for cluster name in cluster and gateway are in conflict. |
| Cluster name cannot contain spaces | `ErrClusterNameHasSpaces` | That the cluster name contains spaces, which is not allowed. |
| Cluster name from remote server conflicts | `ErrClusterNameRemoteConflict` | That a remote server has a different cluster name. |
| Duplicate server name | `ErrDuplicateServerName` | Returned when processing a server remote connection and the server reports that this server name is already used in the cluster. |
| Gateway name cannot contain spaces | `ErrGatewayNameHasSpaces` | That the gateway name contains spaces, which is not allowed. |
| Remote leafnode has same cluster name | `ErrLeafNodeHasSameClusterName` | An error condition when a leafnode is a cluster and it has the same cluster name as the hub cluster. |
| Server name cannot contain spaces | `ErrServerNameHasSpaces` | That the server name contains spaces, which is not allowed. |


## Wrong Port Connection Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Attempted to connect to leaf node port | `ErrClientConnectedToLeafNodePort` | An error condition when a client attempted to connect to the leaf node listen port. |
| Attempted to connect to route port | `ErrClientConnectedToRoutePort` | An error condition when a client attempted to connect to the route listen port. |
| Attempted to connect to gateway port | `ErrClientOrRouteConnectedToGatewayPort` | An error condition when a client or route attempted to connect to the Gateway port. |
| Attempted to connect to wrong port | `ErrConnectedToWrongPort` | An error condition when a connection is attempted to the wrong listen port (for instance a LeafNode to a client port, etc...) |


## Gateway-Specific Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Wrong gateway | `ErrWrongGateway` | An error condition when a server receives a connect request from a remote Gateway with a destination name that does not match the server's Gateway's name. |
| Connection to Gateway Rejected | `Connection to Gateway Rejected` | Gateway rejected the connection |


## Leafnode-Specific Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Leafnodes disabled | `ErrLeafNodeDisabled` | When we disable leafnodes. |
| Leafnode loop detected | `ErrLeafNodeLoop` | A leafnode is trying to register for a cluster we already have registered. |


## Connection State Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Connection closed | `ErrConnectionClosed` | An error condition on a closed connection. |
| Server is not running | `ErrServerNotRunning` | Used to signal an error that a server is not running. |
| Stale Connection | `Stale Connection` | Connection is stale and will be closed |


## Other Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Search cycle depth exhausted | `ErrCycleSearchDepth` | Returned when we have exceeded our maximum search depth.. |
| Minimum version required | `ErrMinimumVersionRequired` | Returned when a connection is not at the minimum version required. |
| Subscribe permission violation | `ErrSubscribePermissionViolation` | Returned when processing of a subscription fails due to permissions. |


## Route-Specific Errors

| Error | Constant | Description |
|-------|----------|-------------|
| Route Authorization Violation | `Route Authorization Violation` | Route connection failed authorization |
| Duplicate Route | `Duplicate Route` | Route connection already exists to this server |


## Slow Consumer and Flow Control

| Error | Constant | Description |
|-------|----------|-------------|
| Slow Consumer Detected | `Slow Consumer Detected` | Server detected a slow consumer that is not keeping up with message delivery |
| Consumer Is Slow | `Consumer Is Slow` | Consumer is processing messages too slowly |
| Write Deadline Exceeded | `Write Deadline Exceeded` | Write operation to client exceeded the configured deadline |


## Connection Close Reasons

These are the reasons a client connection may be closed by the server.
They appear in monitoring data and disconnect events.

| Error | Constant | Description |
|-------|----------|-------------|
| Client Closed | `ClientClosed` | Client Closed |
| Authentication Timeout | `AuthenticationTimeout` | Authentication Timeout |
| Authentication Failure | `AuthenticationViolation` | Authentication Failure |
| TLS Handshake Failure | `TLSHandshakeError` | TLS Handshake Failure |
| Slow Consumer (Pending Bytes) | `SlowConsumerPendingBytes` | Slow Consumer (Pending Bytes) |
| Slow Consumer (Write Deadline) | `SlowConsumerWriteDeadline` | Slow Consumer (Write Deadline) |
| Write Error | `WriteError` | Write Error |
| Read Error | `ReadError` | Read Error |
| Parse Error | `ParseError` | Parse Error |
| Stale Connection | `StaleConnection` | Stale Connection |
| Protocol Violation | `ProtocolViolation` | Protocol Violation |
| Bad Client Protocol Version | `BadClientProtocolVersion` | Bad Client Protocol Version |
| Incorrect Port | `WrongPort` | Incorrect Port |
| Maximum Account Connections Exceeded | `MaxAccountConnectionsExceeded` | Maximum Account Connections Exceeded |
| Maximum Connections Exceeded | `MaxConnectionsExceeded` | Maximum Connections Exceeded |
| Maximum Message Payload Exceeded | `MaxPayloadExceeded` | Maximum Message Payload Exceeded |
| Maximum Control Line Exceeded | `MaxControlLineExceeded` | Maximum Control Line Exceeded |
| Maximum Subscriptions Exceeded | `MaxSubscriptionsExceeded` | Maximum Subscriptions Exceeded |
| Duplicate Route | `DuplicateRoute` | Duplicate Route |
| Route Removed | `RouteRemoved` | Route Removed |
| Server Shutdown | `ServerShutdown` | Server Shutdown |
| Authentication Expired | `AuthenticationExpired` | Authentication Expired |
| Wrong Gateway | `WrongGateway` | Wrong Gateway |
| Missing Account | `MissingAccount` | Missing Account |
| Credentials Revoked | `Revocation` | Credentials Revoked |
| Internal Client | `InternalClient` | Internal Client |
| Message Header Violation | `MsgHeaderViolation` | Message Header Violation |
| No Responders Requires Headers | `NoRespondersRequiresHeaders` | No Responders Requires Headers |
| Cluster Name Conflict | `ClusterNameConflict` | Cluster Name Conflict |
| Duplicate Remote LeafNode Connection | `DuplicateRemoteLeafnodeConnection` | Duplicate Remote LeafNode Connection |
| Duplicate Client ID | `DuplicateClientID` | Duplicate Client ID |
| Duplicate Server Name | `DuplicateServerName` | Duplicate Server Name |
| Minimum Version Required | `MinimumVersionRequired` | Minimum Version Required |
| Cluster Names Identical | `ClusterNamesIdentical` | Cluster Names Identical |
| Kicked | `Kicked` | Kicked |
| Proxy Not Trusted | `ProxyNotTrusted` | Proxy Not Trusted |
| Proxy Required | `ProxyRequired` | Proxy Required |


