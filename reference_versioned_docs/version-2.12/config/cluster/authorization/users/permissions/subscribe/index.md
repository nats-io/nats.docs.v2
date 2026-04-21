# subscribe

<Aliases aliases="`sub`" />
<Reloadable /> 
A single subject, list of subjects, or a allow-deny map of
subjects for subscribing. Note, that the subject permission can
have an optional second value declaring a queue name.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` |  | - |
| `[ string ]` |  | - |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`allow`](/reference/config/cluster/authorization/users/permissions/subscribe/allow) | List of subjects that are allowed to the client. | `string` | - | Yes |
| [`deny`](/reference/config/cluster/authorization/users/permissions/subscribe/deny) | List of subjects that are denied to the client. | `string` | - | Yes |
## Examples

### Allow subscribe on `foo`
```
foo
```
### Allow subscribe on `foo` in group matching `*.dev`
```
foo *.dev
```
### Allow subscribe on `foo.>` and `bar` in group `v1`
```
[foo.>, "bar v1"]
```
### Allow subscribe to `foo.*` except `foo.bar`
```
{
  allow: "foo.*"
  deny: "foo.bar"
}
```

