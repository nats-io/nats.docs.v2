# default_permissions

<Reloadable state="reloadable" note="Folded into each user's permissions while the config is parsed, so it only affects users with no explicit `permissions`; from there it follows the users path and is re-applied to live client connections. Not re-applied to existing leafnode connections." />
The default permissions applied to users, if permissions are
not explicitly defined for them.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`publish`](./publish/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for publishing. Specifying a single subject or list of subjects denotes an *allow* and implcitly denies publishing to all other subjects. | `(multiple)` | - | Yes\* |
| [`subscribe`](./subscribe/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for subscribing. Note, that the subject permission can have an optional second value declaring a queue name. | `(multiple)` | - | Yes\* |
| [`allow_responses`](./allow_responses/index.md) |  | `(multiple)` | - | Yes\* |

\* See the property page for reload caveats.
