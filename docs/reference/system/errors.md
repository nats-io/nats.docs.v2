---
title: System Errors
sidebar_label: Errors
description: NATS server non-JetStream errors for client, route, gateway, and leafnode connections
---

# System Errors

This page documents all non-JetStream errors that the NATS server can return to clients, routes, gateways, and leafnode connections.


## Authentication and Authorization Errors

| Error | Description |
|-------|-------------|
| `ErrAuthExpired` | ErrAuthExpired represents an expired authorization due to timeout. |
| `ErrAuthProxyNotTrusted` | ErrAuthProxyNotTrusted represents an error condition on failed authentication due to a connection from a proxy not in the list of trusted proxies. |
| `ErrAuthProxyRequired` | ErrAuthProxyRequired represents an error condition on failed authentication due to a connection not coming from a proxy. |
| `ErrAuthTimeout` | ErrAuthTimeout represents an error condition on failed authorization due to timeout. |
| `ErrAuthentication` | ErrAuthentication represents an error condition on failed authentication. |
| `ErrRevocation` | ErrRevocation is returned when a credential has been revoked. |
| `ErrServiceImportAuthorization` | ErrServiceImportAuthorization is returned when a service import is not authorized. |
| `ErrStreamImportAuthorization` | ErrStreamImportAuthorization is returned when a stream import is not authorized. |
| `Permissions Violation for Publish` | Client attempted to publish to a subject without permission |


## Connection Limit Errors

| Error | Description |
|-------|-------------|
| `ErrTooManyAccountConnections` | ErrTooManyAccountConnections signals that an account has reached its maximum number of active connections. |
| `ErrTooManyConnections` | ErrTooManyConnections signals a client that the maximum number of connections supported by the server has been reached. |
| `ErrTooManySubTokens` | ErrTooManySubTokens signals a client that the subject has too many tokens. |
| `ErrTooManySubs` | ErrTooManySubs signals a client that the maximum number of subscriptions per connection has been reached. |
| `Connection Throttling Is Active` | Server is actively throttling new connections |


## Protocol and Payload Errors

| Error | Description |
|-------|-------------|
| `ErrBadClientProtocol` | ErrBadClientProtocol signals a client requested an invalid client protocol. |
| `ErrBadMsgHeader` | ErrBadMsgHeader signals the parser detected a bad message header |
| `ErrMaxControlLine` | ErrMaxControlLine represents an error condition when the control line is too big. |
| `ErrMaxPayload` | ErrMaxPayload represents an error condition when the payload is too big. |
| `ErrMsgHeadersNotSupported` | ErrMsgHeadersNotSupported signals the parser detected a message header but they are not supported on this server. |
| `ErrNoRespondersRequiresHeaders` | ErrNoRespondersRequiresHeaders signals that a client needs to have headers on if they want no responders behavior. |


## Subject and Publishing Errors

| Error | Description |
|-------|-------------|
| `ErrBadPublishSubject` | ErrBadPublishSubject represents an error condition for an invalid publish subject. |
| `ErrBadQualifier` | ErrBadQualifier is used to error on a bad qualifier for a transform. |
| `ErrBadSubject` | ErrBadSubject represents an error condition for an invalid subject. |
| `ErrInvalidMappingDestination` | ErrInvalidMappingDestination is used for all subject mapping destination errors |
| `ErrInvalidMappingDestinationSubject` | ErrInvalidMappingDestinationSubject is used to error on a bad transform destination mapping |
| `ErrMalformedSubject` | ErrMalformedSubject is returned when a subscription is made with a subject that does not conform to subject rules. |
| `ErrMappingDestinationIndexOutOfRange` | ErrMappingDestinationIndexOutOfRange is returned when the mapping destination function is passed an out of range wildcard index value for one of it's arguments |
| `ErrMappingDestinationInvalidArg` | ErrMappingDestinationInvalidArg is returned when the mapping destination function is passed and invalid argument |
| `ErrMappingDestinationNotEnoughArgs` | ErrMappingDestinationNotEnoughArgs is returned when the mapping destination function is not passed enough arguments |
| `ErrMappingDestinationNotSupportedForImport` | ErrMappingDestinationNotSupportedForImport is returned when you try to use a mapping function other than wildcard in a transform that needs to be reversible (i.e. an import) |
| `ErrMappingDestinationNotUsingAllWildcards` | ErrMappingDestinationNotUsingAllWildcards is used to error on a transform destination not using all of the token wildcards |
| `ErrMappingDestinationTooManyArgs` | ErrMappingDestinationTooManyArgs is returned when the mapping destination function is passed too many arguments |
| `ErrNoTransforms` | ErrNoTransforms signals no subject transforms are available to map this subject. |
| `ErrReservedAccount` | ErrReservedAccount represents a reserved account that can not be created. |
| `ErrReservedPublishSubject` | ErrReservedPublishSubject represents an error condition when sending to a reserved subject, e.g. `_SYS.>` |
| `ErrUnknownMappingDestinationFunction` | ErrUnknownMappingDestinationFunction is returned when a subject mapping destination contains an unknown mustache-escaped mapping function. |
| `Invalid Subscription` | Subscription request is invalid |


## TLS and Security Errors

| Error | Description |
|-------|-------------|
| `ErrCertNotPinned` | ErrCertNotPinned is returned when pinned certs are set and the certificate is not in it |
| `Secure Connection - TLS Required` | Server requires TLS but client attempted non-TLS connection |


## Account Errors

| Error | Description |
|-------|-------------|
| `ErrAccountExists` | ErrAccountExists is returned when an account is attempted to be registered but already exists. |
| `ErrAccountExpired` | ErrAccountExpired is returned when an account has expired. |
| `ErrAccountResolverSameClaims` | ErrAccountResolverSameClaims is returned when same claims have been fetched. |
| `ErrAccountResolverUpdateTooSoon` | ErrAccountResolverUpdateTooSoon is returned when we attempt an update too soon to last request. |
| `ErrAccountValidation` | ErrAccountValidation is returned when an account has failed validation. |
| `ErrBadAccount` | ErrBadAccount represents a malformed or incorrect account. |
| `ErrBadSampling` | ErrBadSampling is returned when the sampling for latency tracking is not 1 `>=` sample `<=` 100. |
| `ErrBadServiceType` | ErrBadServiceType is returned when latency tracking is being applied to non-singleton response types. |
| `ErrImportFormsCycle` | ErrImportFormsCycle is returned when an import would form a cycle. |
| `ErrMissingAccount` | ErrMissingAccount is returned when an account does not exist. |
| `ErrMissingService` | ErrMissingService is returned when an account does not have an exported service. |
| `ErrNoAccountResolver` | ErrNoAccountResolver is returned when we attempt an update but do not have an account resolver. |
| `ErrNoSysAccount` | ErrNoSysAccount is returned when an attempt to publish or subscribe is made when there is no internal system account defined. |
| `ErrStreamImportBadPrefix` | ErrStreamImportBadPrefix is returned when a stream import prefix contains wildcards. |
| `ErrStreamImportDuplicate` | ErrStreamImportDuplicate is returned when a stream import is a duplicate of one that already exists. |
| `Failed Account Registration` | Failed to register client with account |


## Server Name and Cluster Errors

| Error | Description |
|-------|-------------|
| `ErrClusterNameConfigConflict` | ErrClusterNameConfigConflict signals that the options for cluster name in cluster and gateway are in conflict. |
| `ErrClusterNameHasSpaces` | ErrClusterNameHasSpaces signals that the cluster name contains spaces, which is not allowed. |
| `ErrClusterNameRemoteConflict` | ErrClusterNameRemoteConflict signals that a remote server has a different cluster name. |
| `ErrDuplicateServerName` | ErrDuplicateServerName is returned when processing a server remote connection and the server reports that this server name is already used in the cluster. |
| `ErrGatewayNameHasSpaces` | ErrGatewayNameHasSpaces signals that the gateway name contains spaces, which is not allowed. |
| `ErrLeafNodeHasSameClusterName` | ErrLeafNodeHasSameClusterName represents an error condition when a leafnode is a cluster and it has the same cluster name as the hub cluster. |
| `ErrServerNameHasSpaces` | ErrServerNameHasSpaces signals that the server name contains spaces, which is not allowed. |


## Wrong Port Connection Errors

| Error | Description |
|-------|-------------|
| `ErrClientConnectedToLeafNodePort` | ErrClientConnectedToLeafNodePort represents an error condition when a client attempted to connect to the leaf node listen port. |
| `ErrClientConnectedToRoutePort` | ErrClientConnectedToRoutePort represents an error condition when a client attempted to connect to the route listen port. |
| `ErrClientOrRouteConnectedToGatewayPort` | ErrClientOrRouteConnectedToGatewayPort represents an error condition when a client or route attempted to connect to the Gateway port. |
| `ErrConnectedToWrongPort` | ErrConnectedToWrongPort represents an error condition when a connection is attempted to the wrong listen port (for instance a LeafNode to a client port, etc...) |


## Gateway-Specific Errors

| Error | Description |
|-------|-------------|
| `ErrWrongGateway` | ErrWrongGateway represents an error condition when a server receives a connect request from a remote Gateway with a destination name that does not match the server's Gateway's name. |
| `Connection to Gateway Rejected` | Gateway rejected the connection |


## Leafnode-Specific Errors

| Error | Description |
|-------|-------------|
| `ErrLeafNodeDisabled` | ErrLeafNodeDisabled is when we disable leafnodes. |
| `ErrLeafNodeLoop` | ErrLeafNodeLoop signals a leafnode is trying to register for a cluster we already have registered. |


## Connection State Errors

| Error | Description |
|-------|-------------|
| `ErrConnectionClosed` | ErrConnectionClosed represents an error condition on a closed connection. |
| `ErrServerNotRunning` | ErrServerNotRunning is used to signal an error that a server is not running. |


## Other Errors

| Error | Description |
|-------|-------------|
| `ErrCycleSearchDepth` | ErrCycleSearchDepth is returned when we have exceeded our maximum search depth.. |
| `ErrMinimumVersionRequired` | ErrMinimumVersionRequired is returned when a connection is not at the minimum version required. |
| `ErrSubscribePermissionViolation` | ErrSubscribePermissionViolation is returned when processing of a subscription fails due to permissions. |


## Route-Specific Errors

| Error | Description |
|-------|-------------|
| `Route Authorization Violation` | Route connection failed authorization |


## Connection Close Reasons

These are the reasons a client connection may be closed by the server.
They appear in monitoring data and disconnect events.

| Error | Description |
|-------|-------------|
| `ClientClosed` | Client Closed |
| `AuthenticationTimeout` | Authentication Timeout |
| `AuthenticationViolation` | Authentication Failure |
| `TLSHandshakeError` | TLS Handshake Failure |
| `SlowConsumerPendingBytes` | Slow Consumer (Pending Bytes) |
| `SlowConsumerWriteDeadline` | Slow Consumer (Write Deadline) |
| `WriteError` | Write Error |
| `ReadError` | Read Error |
| `ParseError` | Parse Error |
| `StaleConnection` | Stale Connection |
| `ProtocolViolation` | Protocol Violation |
| `BadClientProtocolVersion` | Bad Client Protocol Version |
| `WrongPort` | Incorrect Port |
| `MaxAccountConnectionsExceeded` | Maximum Account Connections Exceeded |
| `MaxConnectionsExceeded` | Maximum Connections Exceeded |
| `MaxPayloadExceeded` | Maximum Message Payload Exceeded |
| `MaxControlLineExceeded` | Maximum Control Line Exceeded |
| `MaxSubscriptionsExceeded` | Maximum Subscriptions Exceeded |
| `DuplicateRoute` | Duplicate Route |
| `RouteRemoved` | Route Removed |
| `ServerShutdown` | Server Shutdown |
| `AuthenticationExpired` | Authentication Expired |
| `WrongGateway` | Wrong Gateway |
| `MissingAccount` | Missing Account |
| `Revocation` | Credentials Revoked |
| `InternalClient` | Internal Client |
| `MsgHeaderViolation` | Message Header Violation |
| `NoRespondersRequiresHeaders` | No Responders Requires Headers |
| `ClusterNameConflict` | Cluster Name Conflict |
| `DuplicateRemoteLeafnodeConnection` | Duplicate Remote LeafNode Connection |
| `DuplicateClientID` | Duplicate Client ID |
| `DuplicateServerName` | Duplicate Server Name |
| `MinimumVersionRequired` | Minimum Version Required |
| `ClusterNamesIdentical` | Cluster Names Identical |
| `Kicked` | Kicked |
| `ProxyNotTrusted` | Proxy Not Trusted |
| `ProxyRequired` | Proxy Required |


