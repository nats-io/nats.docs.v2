---
id: kubernetes
title: "3. Kubernetes"
sidebar_position: 3
description: Stand the ORDERS cluster up as a StatefulSet with the NATS Helm chart, then declare its streams and consumers as CRDs
---

# 3. Kubernetes

The [previous page](/learn/deployment/sizing-and-resources) gave the
ORDERS workload a sizing baseline: an R3 file stream that fits a 10 Gi
volume, with `order-svc` running comfortably in ~128 Mi. This page stands
that cluster up on Kubernetes.

The three-node cluster `east` you built in Topologies (`n1-east`,
`n2-east`, `n3-east`) becomes three pods. On Kubernetes those pods are
named by ordinal: **`nats-0`, `nats-1`, `nats-2`**. They're the same
three nodes carrying the same R3 `ORDERS` stream; only the names change.
The rest of this chapter uses the pod names, because lame-duck,
disruption-budget, and rolling-update language is all ordinal-based.

This page introduces two ideas: the NATS Helm chart, which deploys the
cluster as a StatefulSet, and the NACK controller, which lets you
declare the `ORDERS` stream and its consumers as Kubernetes resources
instead of running CLI commands.

## The NATS Helm chart deploys a StatefulSet

A NATS cluster isn't a stateless web app. Each node owns a slice of the
R3 stream on its own disk, and node identity has to survive a restart:
`nats-1` must come back as `nats-1`, with its volume, not as a fresh
replica. That requirement rules out a Deployment and calls for a
**StatefulSet**: the Kubernetes workload that gives each pod a stable
name, a stable network identity, and a stable volume across restarts.

The **NATS Helm chart** installs that StatefulSet for you. Its
`values.yaml` describes the cluster, and Helm renders the StatefulSet,
the headless service, the ConfigMap, and the probes from it. A minimal
values file for the three-node ORDERS cluster:

```yaml
# values.yaml — the three-node ORDERS cluster
config:
  cluster:
    enabled: true
    replicas: 3          # nats-0, nats-1, nats-2
  jetstream:
    enabled: true
    fileStore:
      pvc:
        size: 10Gi       # the sizing baseline from the previous page

# Bring all three pods up at once instead of one-at-a-time, so the
# cluster forms in a single pass rather than waiting on ordinals.
podManagementPolicy: Parallel
```

Install it with the chart's release name `nats`, which is what gives the
pods their `nats-N` names:

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm install nats nats/nats -f values.yaml
```

Two things are worth naming. `podManagementPolicy: Parallel` tells the
StatefulSet to start all three pods together. The default starts them in
order, waiting for each to become ready before the next. That deadlocks
a NATS cluster, because no single node is ready until it can see its
peers. Parallel lets them find each other and form the cluster in one
pass.

The second is the **headless service**. It gives each pod a stable DNS
name of the form `nats-0.nats.default.svc.cluster.local`. The nodes use
those names to route to each other, and a client inside the Kubernetes
cluster dials the same service to reach any of them.

The chart has many more values, with sensible defaults for almost all of
them. Every server configuration option is documented in
[Reference → Configuration](/reference/config); here we cover only the
values this deployment needs.

## Three probes, one monitor port

Kubernetes decides a pod's lifecycle from its probes, and a JetStream
node has three distinct states worth probing. The chart wires all three
against the monitor port (8222) and the `/healthz` endpoint:

```yaml
# rendered into the StatefulSet by the chart — shown for reference
startupProbe:
  httpGet: { path: /healthz, port: 8222 }
  failureThreshold: 90        # ~900s window for the node to boot + sync
readinessProbe:
  httpGet: { path: "/healthz?js-server-only=true", port: 8222 }
livenessProbe:
  httpGet: { path: "/healthz?js-enabled-only=true", port: 8222 }
```

The **startup probe** guards the boot window. A node rejoining a cluster
may need to catch its stream replicas up from its peers before it's
useful, and that can take minutes. The generous failure threshold keeps
Kubernetes from killing a pod that's doing legitimate startup work. The
**readiness probe** asks whether this server is ready to serve clients,
so Kubernetes takes a not-ready pod out of the service rotation. The
**liveness probe** asks only whether JetStream is enabled at all; it's
the last resort that restarts a truly wedged process.

What each `/healthz` query parameter reports, and which advisories to
alert on, belongs to [Monitoring](/learn/monitoring/jetstream-health).
Here the probes are just plumbing that keeps the StatefulSet honest.

## Declare streams as CRDs with the NACK controller

You could now open a shell in the chart's `nats-box` pod and run `nats
stream add ORDERS` by hand. That works, but it's imperative: the stream
exists because someone ran a command, and nothing brings it back if it's
deleted. Kubernetes prefers declarative state, and NATS has a controller
for exactly that.

The **NACK controller** runs in the cluster and reconciles **CRDs**
(Custom Resource Definitions) against the NATS cluster. You write a
`Stream` resource describing the `ORDERS` stream you want, apply it with
`kubectl`, and the controller calls the JetStream API to make the cluster
match. (The term *controller* here is the Kubernetes piece; the security
*operator* `ACME` is a different thing, taught in
[Security](/learn/security).)

Here's the `ORDERS` stream as a CRD, the same R3 file stream from every
other chapter, now declarative:

```yaml
# orders-stream.yaml — the ORDERS stream as a declarative resource
apiVersion: jetstream.nats.io/v1beta2
kind: Stream
metadata:
  name: orders
spec:
  name: ORDERS
  subjects: ["orders.>"]
  storage: file
  replicas: 3
```

And the two consumers that read it: the `shipping` pull consumer and the
`analytics` consumer filtering `orders.shipped`.

```yaml
# orders-consumers.yaml — consumers as declarative resources
apiVersion: jetstream.nats.io/v1beta2
kind: Consumer
metadata:
  name: shipping
spec:
  streamName: ORDERS
  durableName: shipping
---
apiVersion: jetstream.nats.io/v1beta2
kind: Consumer
metadata:
  name: analytics
spec:
  streamName: ORDERS
  durableName: analytics
  filterSubject: orders.shipped
```

Apply them and the controller does the rest:

```bash
kubectl apply -f orders-stream.yaml -f orders-consumers.yaml
```

The controller watches the CRD, calls the JetStream API on the cluster,
creates the R3 stream across `nats-0..2`, and writes the result back into
the resource's `.status`. From then on the stream's desired state lives
in version control, not in someone's terminal history.

<div class="nats-flow" data-scenario="crdReconcileAnimated" data-width="600" data-height="350"></div>

The reconcile is a closed loop, and that's the payoff. If someone
deletes the stream by hand, the controller detects the drift and recreates
it from the CRD. The declared state is the source of truth; the
controller keeps steering the cluster back to it.

The `Stream` resource has many more fields: `maxBytes`, `maxAge`,
`placement`, `mirror`, `sources`, and the rest of the stream
configuration. The full set is documented in
[Reference → Configuration](/reference/config); this page sets only the
fields the ORDERS stream needs.

## Pitfalls

A few traps catch teams the first time they run NATS on Kubernetes. Each
is scoped to this page's two concepts: the StatefulSet and the CRDs.

**A pod stuck Pending is usually an unbound volume.** A StatefulSet pod
can't start until its persistent volume is bound, and on a cluster with
no default storage class the claim hangs forever: `nats-0` sits in
`Pending` and the whole cluster waits on it. The Helm chart provisions
volumes through `volumeClaimTemplates` by default, so each pod gets its
own claim; the fix when a pod hangs is to confirm a storage class exists,
not to delete and retry the pod.

**A ConfigMap edit does not reload the server by itself.** Editing the
config the NATS Helm chart renders changes the file, but the running
`nats-server` keeps its old config until something sends it a SIGHUP. The
chart includes the **config reloader sidecar** (the
`nats-server-config-reloader` container, enabled by default) to send
that signal for you; without it, a config change sits inert until the pod
restarts. Turning a ConfigMap change into a live reload is its own
subject, covered on
[Config management](/learn/deployment/config-management).

**A flapping readiness probe during a rebalance is normal.** When
JetStream moves R3 replicas between pods (after a restart, or when you
scale), the readiness probe can briefly report a pod as not-ready even
though the cluster is healthy. The probe is doing its job: it pulls a
pod out of the service rotation while that pod catches up. You can watch
it happen:

```bash
kubectl describe pod nats-0
# Events: ... Readiness probe failed ... then recovers as the replica syncs
```

Don't restart the pod chasing it. If the flapping is frequent enough to
disrupt clients, raise the readiness probe's `failureThreshold` in
`values.yaml` so a mid-rebalance blip doesn't pull the pod out.

**Never mix CLI and CRD management of the same stream.** The NACK
controller continuously reconciles the CRD against the cluster. If you
run `nats stream edit ORDERS` by hand while a `Stream` CRD owns it, the
controller sees the drift and reverts your change within about 30
seconds — your edit silently vanishes. Pick one owner per stream: either
the CRD or the CLI, never both.

Whichever owner you pick, verify the stream the controller created is
actually the R3 stream you declared. Open a shell in `nats-box` and read
it back:

<div class="nats-example" data-type="learn-deployment-kubernetes-streamLs" data-languages="cli,js,go,python,java,rust,csharp"></div>

The line that matters is `Replicas: 3`. If it reads `1`, the CRD spec is
missing `replicas: 3`, or the controller hasn't finished reconciling;
check the resource's `.status` before assuming the stream is wrong.

## Where you are

The ORDERS cluster now runs on Kubernetes:

- three pods (`nats-0`, `nats-1`, `nats-2`) managed by a StatefulSet,
  each with a stable name, DNS entry, and volume; they're the same
  `n1-east`/`n2-east`/`n3-east` nodes from Topologies
- the NATS Helm chart rendering the StatefulSet, the headless service,
  the ConfigMap, and the three `/healthz` probes
- the `ORDERS` stream and the `shipping` and `analytics` consumers
  declared as CRDs, reconciled by the NACK controller, with their desired
  state in version control

## What's next

The cluster is running, but its config is baked into a ConfigMap you
can't yet change without restarting pods. The next page splits that
config into includes and reloads it live (limits, TLS paths, accounts)
with a SIGHUP and zero downtime.

Continue to
[4. Config management](/learn/deployment/config-management).

## See also

- [Reference → Configuration](/reference/config) — every server
  configuration option, including the full `Stream` CRD field set
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster)
  — the `n1-east`/`n2-east`/`n3-east` cluster these pods deploy
- [Monitoring → JetStream health](/learn/monitoring/jetstream-health) —
  what the `/healthz` probes report and what to alert on
