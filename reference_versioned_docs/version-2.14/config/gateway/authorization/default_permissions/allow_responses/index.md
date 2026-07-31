# allow_responses

<Reloadable state="noop" />

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max`](./max.md) | The maximum number of response messages that can be published. | `integer` | - | Ignored |
| [`expires`](./expires.md) | The amount of time the permission is valid. Values such as 1s, 1m, 1h (1 second, minute, hour) etc can be specified. Default doesn't have a time limit. | `duration` | - | Ignored |
