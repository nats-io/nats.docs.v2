# allow_responses

<Reloadable /> 

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max`](/reference/2.12/config/leafnodes/authorization/default_permissions/allow_responses/max) | The maximum number of response messages that can be published. | `integer` | - | Yes |
| [`expires`](/reference/2.12/config/leafnodes/authorization/default_permissions/allow_responses/expires) | The amount of time the permission is valid. Values such as 1s, 1m, 1h (1 second, minute, hour) etc can be specified. Default doesn't have a time limit. | `duration` | - | Yes |
