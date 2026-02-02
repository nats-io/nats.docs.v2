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
| `Authentication Error` | Authentication error |
| `Authentication Expired` | Authentication expired |
| `Authentication Timeout` | Authentication timeout |
| `Proxy connection required` | Proxy connection required |
| `Proxy is not trusted` | Proxy is not trusted |


## Connection Limit Errors

| Error | Description |
|-------|-------------|
| `Maximum Account Active Connections Exceeded` | Maximum account active connections exceeded |
| `Maximum Connections Exceeded` | Maximum connections exceeded |
| `Maximum subscriptions exceeded` | Maximum subscriptions exceeded |
| `Subject has exceeded number of tokens limit` | Subject has exceeded number of tokens limit |


## Protocol and Payload Errors

| Error | Description |
|-------|-------------|
| `Maximum Control Line Exceeded` | Maximum control line exceeded |
| `Maximum Payload Exceeded` | Maximum payload exceeded |


## Subject and Publishing Errors

| Error | Description |
|-------|-------------|
| `Invalid publish subject` | Invalid publish subject |
| `Invalid subject` | Invalid subject |
| `Malformed subject` | Malformed subject |
| `Reserved account` | Reserved account |
| `Reserved internal subject` | Reserved internal subject |


## Account Errors

| Error | Description |
|-------|-------------|
| `Account exists` | Account exists |
| `Account expired` | Account expired |
| `Account resolver no new claims` | Account resolver no new claims |
| `Account resolver update too soon` | Account resolver update too soon |
| `Account validation failed` | Account validation failed |
| `Service import not authorized` | Service import not authorized |
| `Stream import already exists` | Stream import already exists |
| `Stream import not authorized` | Stream import not authorized |
| `Stream import prefix can not contain wildcard tokens` | Stream import prefix can not contain wildcard tokens |


## Server Name and Cluster Errors

| Error | Description |
|-------|-------------|
| `Duplicate server name` | Duplicate server name |


## Wrong Port Connection Errors

| Error | Description |
|-------|-------------|
| `Attempted to connect to gateway port` | Attempted to connect to gateway port |
| `Attempted to connect to leaf node port` | Attempted to connect to leaf node port |
| `Attempted to connect to route port` | Attempted to connect to route port |
| `Attempted to connect to wrong port` | Attempted to connect to wrong port |


## Gateway-Specific Errors

| Error | Description |
|-------|-------------|
| `Gateway name cannot contain spaces` | Gateway name cannot contain spaces |
| `Wrong gateway` | Wrong gateway |


## Leafnode-Specific Errors

| Error | Description |
|-------|-------------|
| `Leafnode loop detected` | Leafnode loop detected |
| `Leafnodes disabled` | Leafnodes disabled |
| `Remote leafnode has same cluster name` | Remote leafnode has same cluster name |


## Connection State Errors

| Error | Description |
|-------|-------------|
| `Connection closed` | Connection closed |
| `Server is not running` | Server is not running |


## TLS and Security Errors

| Error | Description |
|-------|-------------|
| `Secure Connection - TLS Required` | Server requires TLS but client attempted non-TLS connection |
| `TLS Handshake Error` | TLS handshake failed |
| `Certificate Not Pinned` | Client certificate is not in the pinned certificates list |


## Route-Specific Errors

| Error | Description |
|-------|-------------|
| `Duplicate Route` | Route already exists to this server |
| `Route Authorization Violation` | Route connection failed authorization |
| `Cluster Name From Remote Server Conflicts` | Remote route server has conflicting cluster name |
| `Minimum Version Required` | Route connection does not meet minimum version requirement |


## Slow Consumer and Flow Control

| Error | Description |
|-------|-------------|
| `Slow Consumer` | Client is not consuming messages fast enough |
| `Write Deadline Exceeded` | Write operation exceeded deadline |


## Configuration and Resolver Errors

| Error | Description |
|-------|-------------|
| `Account Resolver Missing` | Account resolver is not configured |
| `System Account Not Configured` | System account is not properly configured |
| `Credentials Revoked` | Client credentials have been revoked |


