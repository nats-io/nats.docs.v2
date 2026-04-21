# publish

<Aliases aliases="`pub`" />
<Reloadable /> 
A single subject, list of subjects, or a allow-deny map of
subjects for publishing. Specifying a single subject or list
of subjects denotes an *allow* and implcitly denies publishing
to all other subjects.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` |  | - |
| `[ string ]` |  | - |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`allow`](/reference/2.11/config/gateway/authorization/users/permissions/publish/allow) | List of subjects that are allowed to the client. | `string` | - | Yes |
| [`deny`](/reference/2.11/config/gateway/authorization/users/permissions/publish/deny) | List of subjects that are denied to the client. | `string` | - | Yes |
## Examples

### Allow publish to `foo`
```
foo
```
### Allow publish on `foo` and `bar.*`
```
[foo, bar.*]
```
### Allow publish to `foo.*` except `foo.bar`
```
{
  allow: "foo.*"
  deny: "foo.bar"
}
```

