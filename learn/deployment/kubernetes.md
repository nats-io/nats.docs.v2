---
id: kubernetes
title: "Kubernetes"
sidebar_position: 3
description: Stand the ORDERS cluster up as a StatefulSet with the NATS Helm chart, then declare its streams and consumers as CRDs
---

# Kubernetes

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

A NATS cluster is stateful, unlike a stateless web app. Each node owns a slice of the
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
```

Install it with the chart's release name `nats`, which is what gives the
pods their `nats-N` names:

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm install nats nats/nats -f values.yaml
```

Two things are worth naming. The chart already sets
`podManagementPolicy: Parallel` on the StatefulSet, so you don't add it to
`values.yaml`. It starts all three pods together instead of one at a time;
the ordered default would wait for each pod to become ready before
starting the next, and that deadlocks a NATS cluster, because no single
node is ready until it can see its peers. Parallel lets them find each
other and form the cluster in one pass.

The second is the **headless service**. It gives each pod a stable DNS
name of the form `nats-0.nats-headless.default.svc.cluster.local`, and the
nodes use those names to route to each other. Clients don't dial the
headless service: the chart also creates a regular ClusterIP service named
`nats`, and that's the address a client inside the Kubernetes cluster
connects to — the one readiness pulls a not-ready pod out of.

The chart has many more values, with sensible defaults for almost all of
them. Every server configuration option is documented in
[Reference → Configuration](/reference/config); here we cover only the
values this deployment needs.

## The three probes on the monitor port

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
Here the probes are just the configuration that reports each pod's state
to the StatefulSet.

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

The reconcile is a closed loop. If someone
deletes the stream by hand, the controller detects the drift and recreates
it from the CRD. The declared state is the source of truth, and the
controller keeps changing the cluster back to match it.

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

**Replica catch-up shows up in the startup probe, not readiness.** The
chart points the readiness probe at `/healthz?js-server-only=true`, which
checks only that the server and its JetStream subsystem are up — it
deliberately skips every stream, consumer, and meta-assignment check. So a
pod catching its R3 replicas up after a restart still reports ready and
keeps serving clients. The plain `/healthz` the startup probe uses is the
strict one: it checks the meta layer and every stream and consumer asset,
which is why the chart sets its `failureThreshold` to 90 — a wide window
for a rebooting node to finish syncing before Kubernetes gives up on it.
To widen that window further, override the probe fields through the
chart's container `merge`/`patch`; there's no named `failureThreshold`
value.

**Never mix CLI and CRD management of the same stream.** The NACK
controller reconciles the `Stream` CRD against the cluster, but what it
enforces depends on its mode. By default it re-creates a stream that's
been deleted (it notices on its ~30-second resync), yet it does *not*
revert a manual `nats stream edit`: a config change sticks until the CRD
itself next changes. Run the controller in its `--control-loop` mode and
it also enforces config drift, reverting manual edits on about a
one-minute cycle. Either way, pick one owner per stream — let the CRD own
it or the CLI own it, never both.

Whichever owner you pick, verify the stream the controller created is
actually the R3 stream you declared. Open a shell in `nats-box` and read
it back:

<div class="nats-example" data-type="learn-deployment-kubernetes-streamLs" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
[Config management](/learn/deployment/config-management).

## See also

- [Reference → Configuration](/reference/config) — every server
  configuration option, including the full `Stream` CRD field set
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster)
  — the `n1-east`/`n2-east`/`n3-east` cluster these pods deploy
- [Monitoring → JetStream health](/learn/monitoring/jetstream-health) —
  what the `/healthz` probes report and what to alert on
