# subscribe

<Aliases aliases="sub" />
<Reloadable state="reloadable" note="Folded into each user's permissions while the config is parsed, so it only affects users with no explicit `permissions`; from there it follows the users path and is re-applied to live client connections. Not re-applied to existing leafnode connections." />
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
| [`allow`](./allow.md) | List of subjects that are allowed to the client. | `string` | - | Yes\* |
| [`deny`](./deny.md) | List of subjects that are denied to the client. | `string` | - | Yes\* |

\* See the property page for reload caveats.
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

