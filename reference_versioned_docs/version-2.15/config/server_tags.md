# server_tags

<Reloadable state="reloadable" note="The reload handler only logs; the new tags reach `/varz` and the next statsz update because the options are swapped." />
One or more tags associated with the server. This is currently
used for placement of JetStream streams and consumers.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` |  | - |
| `[ string ]` |  | - |
## Examples

```
cloud:aws
```
```
[region:us-west, az:1b]
```

