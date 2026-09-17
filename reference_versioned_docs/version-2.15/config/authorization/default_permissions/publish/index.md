# publish

<Aliases aliases="pub" />
<Reloadable state="reloadable" note="Folded into each user's permissions while the config is parsed, so it only affects users with no explicit `permissions`; from there it follows the users path and is re-applied to live client connections. Not re-applied to existing leafnode connections." />
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
| [`allow`](./allow.md) | List of subjects that are allowed to the client. | `string` | - | Yes\* |
| [`deny`](./deny.md) | List of subjects that are denied to the client. | `string` | - | Yes\* |

\* See the property page for reload caveats.
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

