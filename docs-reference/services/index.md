# Services API

The NATS Services API provides a framework for building observable microservices with built-in discovery, health checking, and monitoring.

## Overview

NATS Services extend the request-reply pattern with:
- Automatic service discovery
- Health monitoring endpoints
- Statistics collection
- Load balancing across instances
- Standardized response schemas

## API Responses

### [Info Response](./info-response)
Service metadata and configuration:
- Service name and version
- Endpoint descriptions
- Configuration details

### [Ping Response](./ping-response)
Health check and liveness probe:
- Service availability status
- Response time measurement
- Instance identification

### [Stats Response](./stats-response)
Operational statistics:
- Request counts and rates
- Error tracking
- Performance metrics
- Resource utilization

## Service Patterns

Services follow these conventions:
- Discovery - Services announce themselves on startup
- Monitoring - Built-in health and statistics endpoints
- Load Balancing - Automatic distribution via queue groups
- Versioning - API version management support
- Observability - Structured logging and metrics