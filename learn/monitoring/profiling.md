---
id: profiling
title: "Profiling the server"
sidebar_position: 6
description: "Collect CPU and memory profiles from a NATS server when the monitoring numbers say something is wrong but not where"
---

# Profiling the server

Every number in this chapter so far reports *what* the `east` cluster is
doing: how many clients `n1-east` holds, how far the `shipping` consumer
has fallen behind, how much memory the process has taken. None of them
say *where* inside the server that memory or CPU time went, and a
profile does.

Profiling sits outside the chapter's four lenses. You reach for it when
`/varz` shows `n1-east` growing its heap with no matching change in
traffic, or pinning a core while the Grafana panels show nothing that
explains it. It's a development and support tool: you collect a profile,
read it with `go tool pprof`, and often hand it to whoever is debugging
the server. For day-to-day runtime statistics, keep using the
[monitoring port](/learn/monitoring/monitoring-endpoints).

You'll collect a profile two ways: over the system account with the
`nats` CLI, and from the server's own HTTP profiling port. Both produce
the same pprof file.

## A profile is a sample of the running process

A **profile** is a sample the Go runtime takes from inside the server
process. It comes back in **pprof** format, the binary format
[`go tool pprof`](https://pkg.go.dev/net/http/pprof) reads. Each kind of
profile answers a different question, and which one you want follows
from the symptom:

| Profile | What it holds | Ask for it when |
|---|---|---|
| `heap` | Live objects only | Memory is growing and you want to know what still holds it |
| `allocs` | Every allocation since startup, freed ones included | Memory churn: you want to know what allocates the most |
| `goroutine` | A stack trace for every goroutine running now | The server looks stuck, or its goroutine count is climbing |
| `cpu` | Stacks sampled over a fixed window | A node is pinning a core |

The server also serves `block`, `mutex`, and `threadcreate`. `block`
needs sampling turned on before it holds anything (see
[Pitfalls](#pitfalls)); the other two are rarely the first thing you
reach for.

Memory and goroutine profiles return immediately, because the runtime
already has the data. A CPU profile has to watch the process for a
while, so the request blocks for the length of the sampling window and
then returns.

## Request a profile over the system account

`nats server request profile` asks running servers for a profile and
writes each reply to a file. The request travels on
`$SYS.REQ.SERVER.PING.PROFILEZ`, so your context has to be connected to
the **system account**. A normal account like `ACME` has no permission
on `$SYS`, so the request gets no replies.

<div class="nats-example" data-type="learn-monitoring-profiling-requestProfile" data-languages="cli"></div>

Every server that answers writes its own file, named
`<profile>-<timestamp>-<server>` in the working directory:

```text
Server "n1-east" profile written: heap-20260824-141530-n1-east
Server "n2-east" profile written: heap-20260824-141530-n2-east
Server "n3-east" profile written: heap-20260824-141530-n3-east
```

Nothing here changes the server's configuration or requires a restart,
which is why this is the route to try first.

### Narrow the request to specific servers

Asking the whole system for a profile is fine on a three-node cluster
and wasteful on a large one. The `--name`, `--host`, `--cluster`, and
`--tags` flags limit which servers answer, and they combine.

<div class="nats-example" data-type="learn-monitoring-profiling-selectServers" data-languages="cli"></div>

### CPU profiles need a sampling window

For `cpu`, the CLI reuses the global `--timeout` flag as the sampling
window. The default is `5s`, so a bare
`nats server request profile cpu` samples for five seconds. The server
rejects a window longer than **15 seconds** and returns an error instead
of a profile, so a long capture has to come from the profiling port
below.

<div class="nats-example" data-type="learn-monitoring-profiling-cpuProfile" data-languages="cli"></div>

## Or expose the profiling port

The server can also serve Go's `net/http/pprof` handlers on a port of
its own. It's off until you set `prof_port` in the node's
configuration:

```conf
prof_port: 65432
```

`prof_port` is not reloadable, so a SIGHUP won't pick it up and the node
has to restart before the port comes up. See
[Reference → prof_port](/reference/config/prof_port), and
[Config management](/learn/deployment/config-management) for what SIGHUP
does and doesn't cover.

Once the port is listening, `http://localhost:65432/debug/pprof/` lists
every profile the runtime offers, and each one downloads over plain
HTTP:

```bash
# Live heap, returns immediately.
curl -o heap.prof http://localhost:65432/debug/pprof/heap

# CPU sampled for 30 seconds; the request blocks for that long.
curl -o cpu.prof "http://localhost:65432/debug/pprof/profile?seconds=30"
```

The 15-second cap is a limit of the system-account handler, not of
`pprof`, so `?seconds=` accepts a longer window here.

## Read the profile

Both routes produce the same pprof file, and `go tool pprof` reads it.
A text summary of the heaviest call sites:

```bash
go tool pprof -top heap-20260824-141530-n1-east
```

Or the interactive web view, with flame graphs and a call tree:

```bash
go tool pprof -http=:8080 cpu.prof
```

If you're collecting the profile for someone else to read, you need
neither; send the file as it is.

## Pitfalls

Three problems come up the first time an operator profiles a production
node. All three stay within this page's two routes: the system-account
request and the profiling port.

**The profiling port has no authentication.** Nothing checks who asks:
anyone who can reach `:65432` can pull a goroutine dump, and a goroutine
dump shows subjects and internal state. The port also binds to the same
host as the client port, `host`, which defaults to `0.0.0.0` and covers
every interface; there is no separate profiling host to narrow. Leave
`prof_port` unset in production, or restrict the port with firewall
rules or a network policy. The system-account route carries no such
exposure because it's authenticated like any other `$SYS` request, so
prefer it.

**Turning on `prof_port` costs a restart.** It isn't reloadable, so
enabling it on a live node means a rolling restart of the cluster: not
what you want mid-incident, when the state you're chasing may not
survive the restart. Reach for `nats server request profile` first. It
needs no config change and no restart, and it captures the node as it is
right now.

**Block profiling is empty until you enable it.** Asking for `block`
without setting `prof_block_rate` returns a profile with nothing in it,
because the runtime samples blocking events only when the rate is above
zero. Unlike `prof_port`, `prof_block_rate` *is* reloadable, so you can
raise it with a SIGHUP, take the profile, and drop it back to zero.
Leave it off the rest of the time; block sampling slows the server down.

## Where you are

You can now collect a profile from a running server. The `east` cluster
and the ORDERS workload are still running exactly as you left them;
nothing on this page changed them. What you added is a way to answer the
question the four lenses can't: when `/varz` says `n1-east` is spending
memory or CPU, a profile says on what.

Two routes get you there. `nats server request profile` works over the
system account against a live cluster, needs no config change, and caps
CPU sampling at 15 seconds. `prof_port` serves the full `pprof` endpoint
set over HTTP with no cap and no authentication, and needs a restart to
turn on. Both write pprof files that `go tool pprof` reads.

## What's next

The next page recaps the four ways of observing, points to where the
*fixes* for what you observe live, and collects every page's Pitfalls
into one production checklist.

Continue to [Where to go next](/learn/monitoring/where-next).

## See also

- [Monitoring endpoints](/learn/monitoring/monitoring-endpoints) — the
  `/varz` memory and CPU numbers that send you here
- [Deployment → sizing and resources](/learn/deployment/sizing-and-resources)
  — what a node is expected to spend, before you go looking for why it
  spent more
- [Deployment → hardening](/learn/deployment/hardening) — closing ports
  the internet shouldn't reach
- [Reference → profilez](/reference/system/monitor/profilez) — the
  request and response schema behind `nats server request profile`
