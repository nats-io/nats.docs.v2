# permissions

<Reloadable /> 

## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`publish`](/reference/config/cluster/authorization/users/permissions/publish) | A single subject, list of subjects, or a allow-deny map of subjects for publishing. Specifying a single subject or list of subjects denotes an *allow* and implcitly denies publishing to all other subjects. | `(multiple)` | - | Yes |
| [`subscribe`](/reference/config/cluster/authorization/users/permissions/subscribe) | A single subject, list of subjects, or a allow-deny map of subjects for subscribing. Note, that the subject permission can have an optional second value declaring a queue name. | `(multiple)` | - | Yes |
| [`allow_responses`](/reference/config/cluster/authorization/users/permissions/allow_responses) |  | `(multiple)` | - | Yes |
