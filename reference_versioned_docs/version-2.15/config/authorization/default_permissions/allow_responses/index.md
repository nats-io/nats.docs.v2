# allow_responses

<Reloadable state="reloadable" note="Folded into each user's permissions at parse time (only users with no explicit `permissions`). Re-applied live, but setPermissions resets the client's reply-tracking map on EVERY reload, so a service still owing a response for a request received before the reload loses permission to publish it." />

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max`](./max.md) | The maximum number of response messages that can be published. | `integer` | - | Yes\* |
| [`expires`](./expires.md) | The amount of time the permission is valid. Values such as 1s, 1m, 1h (1 second, minute, hour) etc can be specified. Default doesn't have a time limit. | `duration` | - | Yes\* |

\* See the property page for reload caveats.
