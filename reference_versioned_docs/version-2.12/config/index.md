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
| [`host`](/reference/2.12/config/host) | Host for client connections. | `string` | `0.0.0.0` | Yes |
| [`port`](/reference/2.12/config/port) | Port for client connections. Use `-1` for a random available port. | `integer` | `4222` | Yes |
| [`listen`](/reference/2.12/config/listen) | `<host>:<port>` for a client connections. | `string` | - | Yes |
| [`client_advertise`](/reference/2.12/config/client_advertise) | Advertised client `<host>:<port>`. Useful for cluster setups behind a NAT. | `string` | - | Yes |
| [`tls`](/reference/2.12/config/tls) | TLS configuration for client and HTTP monitoring. | `object` | - | Yes |
| [`allow_non_tls`](/reference/2.12/config/allow_non_tls) | Allow mixed TLS and non-TLS on the same port. | `boolean` | - | Yes |
| [`ocsp`](/reference/2.12/config/ocsp) | OCSP Stapling is honored by default for certificates that have the `status_request` `Must-Staple` flag. If explicitly disabled, the server will not request staples even if `Must-Staple` is present. | `(multiple)` | `true` | Yes |
| [`mqtt`](/reference/2.12/config/mqtt) | Configuration for enabling the MQTT interface. | `object` | - | Yes |
| [`websocket`](/reference/2.12/config/websocket) | Configuration for enabling the WebSocket interface. | `object` | - | Yes |
### Centralized Auth

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`authorization`](/reference/2.12/config/authorization) | Static single or multi-user declaration. | `object` | - | Yes |
| [`accounts`](/reference/2.12/config/accounts) | Static config-defined accounts. | `object` | - | Yes |
| [`no_auth_user`](/reference/2.12/config/no_auth_user) | Name of the user that non-authenticated clients will inherit the authorization controls of. This must be a user defined in either the `authorization` or `accounts` block. | `string` | - | Yes |
### Decentralized Auth

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`operator`](/reference/2.12/config/operator) | One or more operator JWTs, either in files or inlined. | `(multiple)` | - | Yes |
| [`trusted_keys`](/reference/2.12/config/trusted_keys) | One or more operator public keys to trust. | `string` | - | Yes |
| [`resolver`](/reference/2.12/config/resolver) | Takes precedence over the value obtained from the `operator` if defined.  If a string value is used, it must be `MEMORY` or `URL(<url>)` where where `url` is an HTTP endpoint pointing to the NATS account resolver.  Note: the NATS account resolver is deprecated and the built-in NATS-based resolver should be used. | `(multiple)` | - | Yes |
| [`resolver_tls`](/reference/2.12/config/resolver_tls) |  | `object` | - | Yes |
| [`resolver_preload`](/reference/2.12/config/resolver_preload) | Map of account public key to the account JWT. | `string` | - | Yes |
| [`resolver_pinned_accounts`](/reference/2.12/config/resolver_pinned_accounts) |  | `(multiple)` | - | Yes |
| [`system_account`](/reference/2.12/config/system_account) | Name or public key of the account that will be deemed the *system* account. | `string` | `$SYS` | Yes |
| [`no_system_account`](/reference/2.12/config/no_system_account) |  | `boolean` | - | Yes |
### Clustering

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cluster`](/reference/2.12/config/cluster) | Configuration for clustering a set of servers. | `object` | - | Yes |
| [`gateway`](/reference/2.12/config/gateway) | Configuration for setting up gateway connections between clusters. | `object` | - | No |
### Leafnodes

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`leafnodes`](/reference/2.12/config/leafnodes) | Configuration for setting up leaf node connections. | `object` | - | No |
### JetStream

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`jetstream`](/reference/2.12/config/jetstream) |  | `(multiple)` | `false` | No |
| [`store_dir`](/reference/2.12/config/store_dir) | Directory to use for file-based JetStream storage. | `string` | - | Yes |
### Subject Mapping

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`mappings`](/reference/2.12/config/mappings) |  | `(multiple)` | - | Yes |
### Logging

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`debug`](/reference/2.12/config/debug) | If true, enables debug log messages. | `boolean` | `false` | Yes |
| [`trace`](/reference/2.12/config/trace) | If true, enables protocol trace log messages, excluding the system account. | `boolean` | `false` | Yes |
| [`trace_verbose`](/reference/2.12/config/trace_verbose) | If true, enables protocol trace log messages, including the system account. | `boolean` | `false` | Yes |
| [`logtime`](/reference/2.12/config/logtime) | If false, log without timestamps. | `string` | `true` | Yes |
| [`logtime_utc`](/reference/2.12/config/logtime_utc) | If true, log timestamps with be in UTC rather than the local timezone. | `string` | `false` | Yes |
| [`logfile`](/reference/2.12/config/logfile) | Log file name. | `string` | - | Yes |
| [`logfile_size_limit`](/reference/2.12/config/logfile_size_limit) | Size in bytes after the log file rolls over to a new one. | `integer` | `0` | Yes |
| [`syslog`](/reference/2.12/config/syslog) | Log to syslog. | `boolean` | `false` | Yes |
| [`remote_syslog`](/reference/2.12/config/remote_syslog) | Remote syslog address. | `string` | - | Yes |
### Monitoring and Tracing

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`server_name`](/reference/2.12/config/server_name) | The servers name, shows up in logging. Defaults to the generated server ID. When JetStream is used, within a domain, all server names need to be unique. | `string` | - | Yes |
| [`server_tags`](/reference/2.12/config/server_tags) | One or more tags associated with the server. This is currently used for placement of JetStream streams and consumers. | `(multiple)` | - | Yes |
| [`http`](/reference/2.12/config/http) | Listen specification `<host>:<port>` for server monitoring. | `string` | - | Yes |
| [`https`](/reference/2.12/config/https) | Listen specification `<host>:<port>` for TLS server monitoring. | `string` | - | Yes |
| [`http_port`](/reference/2.12/config/http_port) | HTTP port for server monitoring. | `integer` | - | Yes |
| [`https_port`](/reference/2.12/config/https_port) | HTTPS port for server monitoring. | `integer` | - | Yes |
| [`http_base_path`](/reference/2.12/config/http_base_path) | Base path for monitoring endpoints. | `string` | - | Yes |
| [`connect_error_reports`](/reference/2.12/config/connect_error_reports) | Number of attempts at which a repeated failed route, gateway or leaf node connection is reported. Connect attempts are made once every second. | `integer` | `3600` | Yes |
| [`reconnect_error_reports`](/reference/2.12/config/reconnect_error_reports) | Number of failed attempt to reconnect a route, gateway or leaf node connection. Default is to report every attempt. | `integer` | `1` | Yes |
| [`max_traced_msg_len`](/reference/2.12/config/max_traced_msg_len) | Set a limit to the trace of the payload of a message. | `integer` | `0` | Yes |
### Runtime Configuration

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_control_line`](/reference/2.12/config/max_control_line) | Maximum length of a protocol line (including combined length of subject and queue group). Increasing this value may require client changes to be used. Applies to all traffic. | `string` | `4KB` | Yes |
| [`max_connections`](/reference/2.12/config/max_connections) | Maximum number of active client connections. | `string` | `64K` | Yes |
| [`max_payload`](/reference/2.12/config/max_payload) | Maximum number of bytes in a message payload. Reducing this size may force you to implement chunking in your clients. Applies to client and leafnode payloads. It is not recommended to use values over 8MB but `max_payload` can be set up to 64MB. The max payload must be equal or smaller to the `max_pending` value. | `string` | `1MB` | Yes |
| [`max_pending`](/reference/2.12/config/max_pending) | Maximum number of bytes buffered for a connection Applies to client connections. Note that applications can also set `PendingLimits` (number of messages and total size) for their subscriptions. | `string` | `64MB` | Yes |
| [`max_subscriptions`](/reference/2.12/config/max_subscriptions) | Maximum numbers of subscriptions per client and leafnode accounts connection. A value of `0` means unlimited. | `string` | `0` | Yes |
| [`max_subscription_tokens`](/reference/2.12/config/max_subscription_tokens) |  | `integer` | - | Yes |
| [`ping_interval`](/reference/2.12/config/ping_interval) | Duration at which pings are sent to clients, leaf nodes and routes. In the presence of client traffic, such as messages or client side pings, the server will not send pings. Therefore it is recommended to keep this value bigger than what clients use. | `string` | `2m` | Yes |
| [`ping_max`](/reference/2.12/config/ping_max) | After how many unanswered pings the server will allow before closing the connection. | `integer` | `2` | Yes |
| [`write_deadline`](/reference/2.12/config/write_deadline) | Maximum number of seconds the server will block when writing. Once this threshold is exceeded the connection will be closed. See slow consumer on how to deal with this on the client. | `duration` | `10s` | Yes |
| [`no_header_support`](/reference/2.12/config/no_header_support) | Disables support for message headers. | `boolean` | - | Yes |
| [`disable_sublist_cache`](/reference/2.12/config/disable_sublist_cache) | If true, disable subscription caches for all accounts. This saves resources in situations where different subjects are used all the time. | `boolean` | `false` | Yes |
| [`lame_duck_duration`](/reference/2.12/config/lame_duck_duration) | Must be at least 30s. | `duration` | `2m` | Yes |
| [`lame_duck_grace_period`](/reference/2.12/config/lame_duck_grace_period) | This is the duration the server waits, after entering lame duck mode, before starting to close client connections | `duration` | `10s` | Yes |
| [`pidfile`](/reference/2.12/config/pidfile) |  | `string` | - | Yes |
| [`ports_file_dir`](/reference/2.12/config/ports_file_dir) |  | `string` | - | Yes |
| [`prof_port`](/reference/2.12/config/prof_port) |  | `integer` | - | Yes |
| [`default_js_domain`](/reference/2.12/config/default_js_domain) | Account to domain name mapping. | `string` | - | Yes |
