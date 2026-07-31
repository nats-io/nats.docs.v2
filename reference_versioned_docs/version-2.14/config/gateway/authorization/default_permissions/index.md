# default_permissions

<Reloadable state="noop" note="Parsed and thrown away; there is no gateway permissions field in the server at any version." />
The default permissions applied to users, if permissions are
not explicitly defined for them.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`publish`](./publish/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for publishing. Specifying a single subject or list of subjects denotes an *allow* and implcitly denies publishing to all other subjects. | `(multiple)` | - | Ignored |
| [`subscribe`](./subscribe/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for subscribing. Note, that the subject permission can have an optional second value declaring a queue name. | `(multiple)` | - | Ignored |
| [`allow_responses`](./allow_responses/index.md) |  | `(multiple)` | - | Ignored |
