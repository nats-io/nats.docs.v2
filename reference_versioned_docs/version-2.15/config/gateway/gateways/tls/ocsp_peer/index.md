# ocsp_peer

<Reloadable state="reloadable" />
Verify the peer's certificate against its OCSP responder and reject
revoked certificates. Set an object to tune the checks.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` |  | `true`, `false` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`verify`](./verify.md) | Enable OCSP revocation checking of the peer's certificate. | `boolean` | `false` | Yes |
| [`ca_timeout`](./ca_timeout.md) | How long to wait for the OCSP responder. | `duration` | `2s` | Yes |
| [`allowed_clockskew`](./allowed_clockskew.md) | Clock skew tolerated when checking responder timestamps. | `duration` | `30s` | Yes |
| [`unknown_is_good`](./unknown_is_good.md) | Treat an `unknown` response from the responder as good. | `boolean` | `false` | Yes |
| [`warn_only`](./warn_only.md) | Log revocation failures instead of rejecting the connection. | `boolean` | `false` | Yes |
| [`cache_ttl_when_next_update_unset`](./cache_ttl_when_next_update_unset.md) | How long to cache a response that carries no next-update time. | `duration` | `1h` | Yes |
