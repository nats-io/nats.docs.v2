# resolver

<Aliases aliases="`account_resolver`, `account_resolvers`" />
<Reloadable /> 
Takes precedence over the value obtained from
the `operator` if defined.

If a string value is used, it must be `MEMORY` or `URL(<url>)`
where where `url` is an HTTP endpoint pointing to the NATS account
resolver.

Note: the NATS account resolver is deprecated and the built-in
NATS-based resolver should be used.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` |  | - |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`type`](/reference/config/resolver/type) | Defines whether the resolver type. A `full` resolver stores all account JWTs unless they are explicitly deleted.  A `cache` resolver stores only a subset based on a least-recently-used (LRU) TTL. | `string` | - | Yes |
| [`dir`](/reference/config/resolver/dir) | The path to storing account JWT files when pushed to the server. | `string` | - | Yes |
| [`limit`](/reference/config/resolver/limit) | If set, limit the number of stored JWTs. In `full` mode, new JWTs will be rejected where as in `cache` mode, old JWTs will be evicted for new JWTs. | `integer` | - | Yes |
| [`ttl`](/reference/config/resolver/ttl) | If `cache` mode, defines how long an account JWT will be cached for before being considered for auto-eviction. | `duration` | - | Yes |
| [`interval`](/reference/config/resolver/interval) | Defines the interval the resolver will randomly contact another server to reconcile JWTs, such as receiving new ones and deleting old ones.  Applies to `full` mode only. | `duration` | - | Yes |
| [`timeout`](/reference/config/resolver/timeout) | Defines the request timeout for resolvers interacting with with other resolvers. | `duration` | - | Yes |
| [`allow_delete`](/reference/config/resolver/allow_delete) | If true, allows JWTs to be deleted. Note, in `full` mode, this will result in the JWT file being renamed to with a `.delete` suffix, unless `hard_delete` is true. | `boolean` | `false` | Yes |
| [`hard_delete`](/reference/config/resolver/hard_delete) | If true, and the resolver is in `full` mode, deleted account JWTs will be removed from disk rather than having the `.delete` suffix appended. | `boolean` | `false` | Yes |
