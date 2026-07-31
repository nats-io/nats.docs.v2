# permissions

<Reloadable state="reloadable" />
Subject permissions applied to routes, limiting what this cluster
will export to and import from its peers.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`publish`](./publish/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for publishing. Specifying a single subject or list of subjects denotes an *allow* and implcitly denies publishing to all other subjects. | `(multiple)` | - | Yes |
| [`subscribe`](./subscribe/index.md) | A single subject, list of subjects, or a allow-deny map of subjects for subscribing. Note, that the subject permission can have an optional second value declaring a queue name. | `(multiple)` | - | Yes |
| [`allow_responses`](./allow_responses/index.md) |  | `(multiple)` | - | Yes |
