---
id: auth-callout
title: "8. Auth Callout"
sidebar_position: 9
description: Delegating the authentication decision to an external service over $SYS.REQ.USER.AUTH, and the signed request and response that protect it
---

# 8. Auth Callout

Every page so far decided authentication inside the server. Centralized
mode checked a user list in the config. Decentralized mode verified a
signature chain back to the operator. Either way, the server held
everything it needed to say yes or no.

Sometimes the server cannot hold it. The real source of truth for "who
is this?" lives in an OIDC provider, an LDAP directory, or a custom
service that mints short-lived credentials. You do not want to copy that
directory into NATS config, and you cannot teach the server to speak
LDAP.

Auth callout is the answer. The server stops deciding and starts asking.

## What auth callout is

**Auth callout** delegates the authentication decision to an external
NATS service. When a client connects, the server does not check the
client itself. It packages up what the client presented, sends that to a
service you run, and waits for a verdict.

That service is the **auth service** — in our scenario, `auth-svc`. It
receives each connection attempt, applies whatever logic it likes
(query OIDC, look up LDAP, validate a token against a database), and
replies with either a user identity or a rejection.

The hand-off happens over one well-known subject:
`$SYS.REQ.USER.AUTH`. The server publishes the connection request there.
`auth-svc` subscribes there. Authentication becomes a request/reply
exchange over NATS itself.

This is the move that lets NATS authenticate against anything. The
server speaks NATS; `auth-svc` speaks NATS and OIDC, or NATS and LDAP,
or NATS and your bespoke token format. The protocol between them is
fixed; what `auth-svc` does in the middle is yours.

This whole mechanism is defined in **ADR-26**, which specifies the
request and response shape, the signing rules, and the optional
encryption we point to at the end.

## The flow

<div class="nats-flow" data-scenario="authCalloutAnimated" data-width="600" data-height="380"></div>

Follow one connection through.

A client connects, presenting a token — say `ord-token-123`. The server
finds no matching user in its own config. Instead of rejecting the
client, it builds a request describing the attempt.

The server publishes that request to `$SYS.REQ.USER.AUTH`. `auth-svc` is
subscribed, so it receives the request, reads the token, and decides the
token maps to the `order-svc` user in `ORDERS`.

`auth-svc` replies with a user identity for `order-svc`. The server
reads the reply, admits the client as `order-svc`, and the publish
succeeds — exactly as if `order-svc` had logged in directly.

The client never knew a callout happened. It connected with a token and
got a working connection. The directory lookup, the mapping, the
verdict — all of that lived in `auth-svc`, off to the side.

## Configure it

Auth callout lives in the `authorization` block, the same block that
held the config user list back on the
[authentication basics page](/learn/security/authentication-basics). You
add an `auth_callout` section to it:

```conf
authorization {
    # auth-svc connects with these credentials.
    users: [ { user: "auth-svc", password: "s3cr3t" } ]

    auth_callout {
        # Public account nkey allowed to sign the response.
        issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
        # Users that bypass the callout (the auth service itself).
        auth_users: [ auth-svc ]
    }
}
```

Three fields carry the meaning.

`issuer` is the public account nkey allowed to sign the response. The
server admits a client only if the reply was signed by this key. It
starts with `A`, because it is an account key — the same prefix you read
on the [decentralized auth page](/learn/security/decentralized-auth).

`auth_users` lists the users that skip the callout. `auth-svc` itself
connects to NATS to receive requests, so it must authenticate the
ordinary way. Listing it here tells the server "do not call out for this
one" — otherwise the service that answers callouts could never connect
to receive them.

The `users` entry above defines those bypass credentials. `auth-svc`
connects with user `auth-svc` and password `s3cr3t`, and because that
name is in `auth_users`, the server lets it in without a callout. Every
*other* connection triggers one.

A fourth field, `account`, names which account `auth-svc` runs in and
where `$SYS.REQ.USER.AUTH` is protected. We leave it unset here, so it
defaults to the global account `$G`. The next section explains why
production setups override it.

Auth callout requires NATS Server 2.10.0 or later. It is also disabled
in FIPS-140 mode and cannot be configured there.

## Why the auth service runs in its own account

`$SYS.REQ.USER.AUTH` carries every connection attempt on the server.
Each request includes whatever the client presented — its token, its
password, its nkey. That is sensitive traffic.

The server protects this subject automatically. On the account where
auth callout runs, only the users in `auth_users` may receive on
`$SYS.REQ.USER.AUTH`. No ordinary user can subscribe to it and harvest
other clients' credentials.

ADR-26 recommends one step further: run `auth-svc` in its own dedicated
account. The reason is that the auth service can bind a client to *any*
authorized account. A service that powerful should be isolated, so a
compromise of some other tenant cannot reach it, and a bug in `auth-svc`
cannot leak into a tenant's subject space.

This is the `account` field from the config above. Point it at a small
account that holds nothing but `auth-svc`, and the callout machinery
stays sealed off from `ORDERS`, `ANALYTICS`, and everything else.

## The signed request and response

The request/reply over `$SYS.REQ.USER.AUTH` is the obvious attack
surface. If anything could publish a fake reply, it could forge any
user. Two signatures close that gap.

The server signs the request. Every request the server sends to
`$SYS.REQ.USER.AUTH` is a JWT signed by the server's own nkey. When
`auth-svc` decodes it, it can prove the request genuinely came from the
server it trusts — not from some other client trying to provoke a
verdict.

The request also pins a one-time identity. The server generates a fresh
public user nkey for this connection and places it in the request, in a
field called `user_nkey`. The reply is only valid if it names that exact
nkey as its subject. A captured old reply cannot be replayed against a
new connection, because each connection carries its own nkey.

`auth-svc` signs the response. The reply is a user JWT — the same kind
of signed identity document from the
[decentralized auth page](/learn/security/decentralized-auth). It must
be signed by the `issuer` account key from the config, name the
connection's `user_nkey` as its subject, and carry the server's public
ID as its audience. Miss any of those and the server rejects the reply.

So the protocol is symmetric. The server proves the request is real with
its signature; `auth-svc` proves the verdict is authorized with its
signature. Neither side trusts an unsigned message, and the one-time
nkey makes each exchange single-use.

The response can also carry an error instead of a user JWT. When
`auth-svc` decides the token is invalid, it replies with an error
message, and the server rejects the connection. A rejection is an
explicit verdict, not a timeout.

## When to reach for it

Auth callout is the heavier tool. Reach for it when the identity lives
somewhere NATS cannot see.

- **OIDC / SSO.** A client carries a bearer token from your identity
  provider; `auth-svc` validates it and maps the claims to a NATS user.
- **LDAP / directory.** Users and groups live in a corporate directory;
  `auth-svc` looks them up and grants the matching permissions.
- **Custom tokens.** A bespoke credential — an API key, a signed cookie,
  a license token — that only your service knows how to verify.

If your users fit a static config list, use centralized authentication.
If they fit a trust chain you control with `nsc`, use operator mode.
Auth callout is for when the verdict must come from a system NATS does
not own.

## What we are leaving out

A few parts of ADR-26 go beyond this page.

The request and response can be **encrypted** with an x25519 **xkey**,
so the credentials on `$SYS.REQ.USER.AUTH` are sealed even from a leaked
subscription. You set `xkey` in the `auth_callout` block to turn it on.

In **operator mode**, auth callout is configured on the account's JWT
instead of the server config, and the account declares which other
accounts `auth-svc` may bind clients to. The mechanism is the same; the
binding rules move into the JWT.

The full request claim — client info, TLS state, connection options —
and the encryption and operator-mode binding details are documented in
[Reference](/reference/) and in ADR-26. We use only the `issuer` and
`auth_users` fields, in the global account, here.

Writing the `auth-svc` handler itself — decoding the request, validating
the token, signing the response — is a programming task with ready-made
libraries. The See also links point at runnable services in several
languages.

## Pitfalls

Auth callout sits on the connection path, and one field decides who skips
it. Two mistakes account for most callout incidents.

**The auth service is a single point of failure.** Every new connection
that needs a callout waits for `auth-svc` to reply. If `auth-svc` is down,
slow, or crashed, the server gets no reply, waits out the `timeout` in the
`authorization` block, and rejects the client. The default wait is two
seconds, so an outage turns into two seconds of latency on every new
connection followed by a rejection.

Set `timeout` deliberately and treat the auth service as production
infrastructure. Run more than one instance so a single slow one does not
stall logins, and keep its OIDC or LDAP lookups fast. The timeout is a
backstop, not a substitute for a healthy service.

This is what an outage looks like — the publish triggers a callout, nobody
answers, and the connection is rejected after the timeout:

<div class="nats-example" data-type="learn-security-auth-callout-callout-timeout" data-languages="cli,js,go,python,java,rust,csharp"></div>

**`auth_users` is not a convenience allow-list.** Every user named in
`auth_users` skips the callout and connects with no external check. The
list exists for one job: letting `auth-svc` itself in so it can receive
requests on `$SYS.REQ.USER.AUTH`.

Adding an application user here to "save a round trip" silently exempts it
from authentication. List only `auth-svc`. Everything else goes through the
callout, which is the point of turning callout on.

<div class="nats-example" data-type="learn-security-auth-callout-auth-users-scope" data-languages="cli,js,go,python,java,rust,csharp"></div>

The other classic mistakes — leaving the callout in the global account `$G`,
and skipping `xkey` so credentials cross `$SYS.REQ.USER.AUTH` in the clear —
are the reasons the two sections above exist. Run `auth-svc` in its own
account, and reach for `xkey` when the wire carries secrets you would not
want a leaked subscription to read.

## Where you are

Auth callout is configured and understood:

- The server delegates the decision by publishing each connection
  attempt to `$SYS.REQ.USER.AUTH`.
- `auth-svc` subscribes there, maps a token to a user, and replies. In
  our scenario it maps `ord-token-123` to `order-svc` in `ORDERS`.
- The server signs the request; `auth-svc` signs the response with the
  `issuer` account key. The one-time `user_nkey` stops replay.
- `auth-svc` runs in its own isolated account, the only place allowed to
  receive on the protected subject.

This is the last mechanism in the chapter. You now have the full
toolbox: accounts, centralized and decentralized authentication,
authorization, cross-account sharing, encryption, and callout.

## What is next

The next page steps back and maps where to go from here — the operations
chapters that put these pieces into a real deployment, and the reference
material for the fields this chapter only touched.

Continue to [9. Where to go next](/learn/security/where-next).

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of NATS authentication and authorization.
- [3. Decentralized Authentication](/learn/security/decentralized-auth) —
  the user JWTs and account nkeys that the callout response reuses.
- [Reference](/reference/) — the full auth callout request claim, xkey
  encryption, and operator-mode binding.
