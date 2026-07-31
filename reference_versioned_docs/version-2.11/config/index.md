# Configuration

While the NATS server has many flags that allow for simple testing of features, the NATS server products provide a flexible configuration format that combines the best of traditional formats and newer styles such as JSON and YAML.

## Syntax

The NATS configuration file supports the following syntax:

* Lines can be commented with `#` and `//`
* Values can be assigned to properties with:
  * Equals sign: `foo = 2`
  * Colon: `foo: 2`
  * Whitespace: `foo 2`
* Arrays are enclosed in brackets: `["a", "b", "c"]`
* Maps are enclosed in braces: `{foo: 2}`
* Maps can be assigned with no key separator
* Semicolons can be used as terminators

The NATS configuration file is parsed with UTF-8 encoding.

:::note
The NATS configuration in the file can also be rendered as a JSON object (with comments!), but to combine it with variables the variables still have to be unquoted.
:::

### Strings and Numbers

The configuration parser is very forgiving, as you have seen:

* values can be a primitive, or a list, or a map
* strings and numbers typically do the right thing
* numbers support units such as, 1K for 1000, 1KB for 1024

String values that start with a digit or a dot '.' can create issues. To force such values as strings, quote them.

Bad Config:

```text
listen: 127.0.0.1:4222
authorization: {
    # BAD!
    token: 3secret
}
```

Good Config:

```text
listen: 127.0.0.1:4222
authorization: {
    token: "3secret"
}
```

### Variables

Server configurations can specify variables. Variables allow you to reference a value from one or more sections in the configuration. Variables:

* Are block-scoped
* Are referenced with a `$` prefix. They have to be unquoted when being referenced, for example an assigment like `foo = "$example"` will result in `foo` being the literal string `"$example"`.
* Can be resolved from environment variables having the same name

:::warning
If the environment variable value begins with a number you may have trouble resolving it depending on the server version you are running.
:::

```text
# Define a variable in the config
TOKEN: "secret"

# Reference the variable
authorization {
    token: $TOKEN
}
```

A similar configuration, but this time, the value is in the environment:

```text
# TOKEN is defined in the environment
authorization {
    token: $TOKEN
}
```

The environment variable can either be inlined (below) or previously exported.

```
TOKEN="hello" nats-server -c /config/file
```

### Include Directive

The `include` directive allows you to split a server configuration into several files. This is useful for separating configuration into chunks that you can easily reuse between different servers.

Includes _must_ use relative paths, and are relative to the main configuration \(the one specified via the `-c` option\):

server.conf:

```text
listen: 127.0.0.1:4222
include ./auth.conf
```

:::note
Note that `include` is not followed by `=` or `:`, as it is a _directive_.
:::

auth.conf:

```text
authorization: {
    token: "f0oBar"
}
```

Starting the server only needs to refer to the top-level config containing the include.

```text
nats-server -c server.conf
```


## Properties

### Connectivity

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`host`](./host.md) | Host for client connections. | `string` | `0.0.0.0` | No |
| [`port`](./port.md) | Port for client connections. Use `-1` for a random available port. | `integer` | `4222` | No\* |
| [`listen`](./listen.md) | `<host>:<port>` for a client connections. | `string` | - | No |
| [`client_advertise`](./client_advertise.md) | Advertised client `<host>:<port>`. Useful for cluster setups behind a NAT. | `string` | - | Yes |
| [`tls`](./tls/index.md) | TLS configuration for client and HTTP monitoring. | `object` | - | Yes\* |
| [`allow_non_tls`](./allow_non_tls.md) | Allow mixed TLS and non-TLS on the same port. | `boolean` | - | No |
| [`ocsp`](./ocsp/index.md) | OCSP Stapling is honored by default for certificates that have the `status_request` `Must-Staple` flag. If explicitly disabled, the server will not request staples even if `Must-Staple` is present. | `(multiple)` | `true` | Yes |
| [`ocsp_cache`](./ocsp_cache/index.md) | Cache OCSP responses the server staples, so it does not query the responder on every handshake. | `(multiple)` | - | Yes |
| [`mqtt`](./mqtt/index.md) | Configuration for enabling the MQTT interface. | `object` | - | Yes\* |
| [`websocket`](./websocket/index.md) | Configuration for enabling the WebSocket interface. | `object` | - | Yes\* |

\* See the property page for reload caveats.
### Centralized Auth

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`authorization`](./authorization/index.md) | Static single or multi-user declaration. | `object` | - | Yes |
| [`accounts`](./accounts/index.md) | Static config-defined accounts. | `object` | - | Yes |
| [`no_auth_user`](./no_auth_user.md) | Name of the user that non-authenticated clients will inherit the authorization controls of. This must be a user defined in either the `authorization` or `accounts` block. | `string` | - | Yes\* |

\* See the property page for reload caveats.
### Decentralized Auth

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`operator`](./operator.md) | One or more operator JWTs, either in files or inlined. | `(multiple)` | - | No |
| [`trusted_keys`](./trusted_keys.md) | One or more operator public keys to trust. | `string` | - | No |
| [`resolver`](./resolver/index.md) | Takes precedence over the value obtained from the `operator` if defined.  If a string value is used, it must be `MEMORY` or `URL(<url>)` where where `url` is an HTTP endpoint pointing to the [NATS account resolver](https://docs.nats.io/legacy/nas).  Note: the NATS account resolver is deprecated and the built-in NATS-based resolver should be used. | `(multiple)` | - | Yes\* |
| [`resolver_tls`](./resolver_tls/index.md) |  | `object` | - | Yes |
| [`resolver_preload`](./resolver_preload.md) | Map of account public key to the account JWT. | `string` | - | Yes\* |
| [`resolver_pinned_accounts`](./resolver_pinned_accounts.md) |  | `(multiple)` | - | Yes |
| [`system_account`](./system_account.md) | Name or public key of the account that will be deemed the *system* account. | `string` | `$SYS` | No |
| [`no_system_account`](./no_system_account.md) |  | `boolean` | - | No |

\* See the property page for reload caveats.
### Clustering

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cluster`](./cluster/index.md) | Configuration for clustering a set of servers. | `object` | - | Yes\* |
| [`gateway`](./gateway/index.md) | Configuration for setting up gateway connections between clusters. | `object` | - | Yes\* |

\* See the property page for reload caveats.
### Leafnodes

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`leafnodes`](./leafnodes/index.md) | Configuration for setting up leaf node connections. | `object` | - | Yes\* |

\* See the property page for reload caveats.
### JetStream

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`jetstream`](./jetstream/index.md) |  | `(multiple)` | `false` | Yes\* |
| [`store_dir`](./store_dir.md) | Directory to use for file-based JetStream storage. | `string` | - | Yes\* |

\* See the property page for reload caveats.
### Subject Mapping

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`mappings`](./mappings/index.md) |  | `(multiple)` | - | Yes |
### Logging

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`debug`](./debug.md) | If true, enables debug log messages. | `boolean` | `false` | Yes\* |
| [`trace`](./trace.md) | If true, enables protocol trace log messages, excluding the system account. | `boolean` | `false` | Yes\* |
| [`trace_headers`](./trace_headers.md) | Trace message headers. Also enables `trace`. | `boolean` | `false` | Yes |
| [`trace_verbose`](./trace_verbose.md) | If true, enables protocol trace log messages, including the system account. | `boolean` | `false` | Yes\* |
| [`logtime`](./logtime.md) | If false, log without timestamps. | `string` | `true` | Yes\* |
| [`logtime_utc`](./logtime_utc.md) | If true, log timestamps with be in UTC rather than the local timezone. | `string` | `false` | Yes |
| [`logfile`](./logfile.md) | Log file name. | `string` | - | Yes\* |
| [`logfile_max_num`](./logfile_max_num.md) | Maximum number of rotated log files to keep. Older ones are deleted. | `integer` | - | No |
| [`logfile_size_limit`](./logfile_size_limit.md) | Size in bytes after the log file rolls over to a new one. | `integer` | `0` | No |
| [`syslog`](./syslog.md) | Log to syslog. | `boolean` | `false` | Yes\* |
| [`remote_syslog`](./remote_syslog.md) | Remote syslog address. | `string` | - | Yes\* |

\* See the property page for reload caveats.
### Monitoring and Tracing

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`server_name`](./server_name.md) | The servers name, shows up in logging. Defaults to the generated server ID. When JetStream is used, within a domain, all server names need to be unique. | `string` | - | No |
| [`server_tags`](./server_tags.md) | One or more tags associated with the server. This is currently used for placement of JetStream streams and consumers. | `(multiple)` | - | Yes\* |
| [`http`](./http.md) | Listen specification `<host>:<port>` for server monitoring. | `string` | - | No |
| [`https`](./https.md) | Listen specification `<host>:<port>` for TLS server monitoring. | `string` | - | No |
| [`http_port`](./http_port.md) | HTTP port for server monitoring. | `integer` | - | No |
| [`https_port`](./https_port.md) | HTTPS port for server monitoring. | `integer` | - | No |
| [`http_base_path`](./http_base_path.md) | Base path for monitoring endpoints. | `string` | - | No\* |
| [`connect_error_reports`](./connect_error_reports.md) | Number of attempts at which a repeated failed route, gateway or leaf node connection is reported. Connect attempts are made once every second. | `integer` | `3600` | Yes\* |
| [`reconnect_error_reports`](./reconnect_error_reports.md) | Number of failed attempt to reconnect a route, gateway or leaf node connection. Default is to report every attempt. | `integer` | `1` | Yes |
| [`max_traced_msg_len`](./max_traced_msg_len.md) | Set a limit to the trace of the payload of a message. | `integer` | `0` | Yes |

\* See the property page for reload caveats.
### Runtime Configuration

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_control_line`](./max_control_line.md) | Maximum length of a protocol line (including combined length of subject and queue group). Increasing this value may require client changes to be used. Applies to all traffic. | `string` | `4KB` | Yes\* |
| [`max_connections`](./max_connections.md) | Maximum number of active client connections. | `string` | `64K` | Yes |
| [`max_payload`](./max_payload.md) | Maximum number of bytes in a message payload. Reducing this size may force you to implement chunking in your clients. Applies to client and leafnode payloads. It is not recommended to use values over 8MB but `max_payload` can be set up to 64MB. The max payload must be equal or smaller to the `max_pending` value. | `string` | `1MB` | Yes |
| [`max_pending`](./max_pending.md) | Maximum number of bytes buffered for a connection Applies to client connections. Note that applications can also set `PendingLimits` (number of messages and total size) for their subscriptions. | `string` | `64MB` | No |
| [`max_subscriptions`](./max_subscriptions.md) | Maximum numbers of subscriptions per client and leafnode accounts connection. A value of `0` means unlimited. | `string` | `0` | No\* |
| [`max_subscription_tokens`](./max_subscription_tokens.md) |  | `integer` | - | No |
| [`ping_interval`](./ping_interval.md) | Duration at which pings are sent to clients, leaf nodes and routes. In the presence of client traffic, such as messages or client side pings, the server will not send pings. Therefore it is recommended to keep this value bigger than what clients use. | `string` | `2m` | Yes |
| [`ping_max`](./ping_max.md) | After how many unanswered pings the server will allow before closing the connection. | `integer` | `2` | Yes |
| [`max_closed_clients`](./max_closed_clients.md) | How many closed connections the server keeps for `/connz` reporting. | `integer` | `10000` | No |
| [`no_fast_producer_stall`](./no_fast_producer_stall.md) | Do not stall a fast producer when a consumer cannot keep up. The server drops messages to the slow consumer instead. | `boolean` | `false` | Yes |
| [`default_sentinel`](./default_sentinel.md) | User name applied to connections that authenticate with a sentinel JWT, which carries no permissions of its own. | `string` | - | Yes |
| [`write_deadline`](./write_deadline.md) | Maximum number of seconds the server will block when writing. Once this threshold is exceeded the connection will be closed. See slow consumer on how to deal with this on the client. | `duration` | `10s` | Yes\* |
| [`no_header_support`](./no_header_support.md) | Disables support for message headers. | `boolean` | - | No |
| [`disable_sublist_cache`](./disable_sublist_cache.md) | If true, disable subscription caches for all accounts. This saves resources in situations where different subjects are used all the time. | `boolean` | `false` | No |
| [`lame_duck_duration`](./lame_duck_duration.md) | Must be at least 30s. | `duration` | `2m` | No |
| [`lame_duck_grace_period`](./lame_duck_grace_period.md) | This is the duration the server waits, after entering lame duck mode, before starting to close client connections | `duration` | `10s` | No |
| [`pidfile`](./pidfile.md) |  | `string` | - | Yes |
| [`ports_file_dir`](./ports_file_dir.md) |  | `string` | - | Yes |
| [`prof_block_rate`](./prof_block_rate.md) | Go block-profile sampling rate. Set only while profiling; it slows the server down. | `integer` | - | Yes |
| [`prof_port`](./prof_port.md) |  | `integer` | - | No |
| [`default_js_domain`](./default_js_domain.md) | Account to domain name mapping. | `string` | - | No |

\* See the property page for reload caveats.
