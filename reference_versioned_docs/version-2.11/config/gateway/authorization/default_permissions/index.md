# default_permissions

<Reloadable /> 
The default permissions applied to users, if permissions are
not explicitly defined for them.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`publish`](/reference/2.11/config/gateway/authorization/default_permissions/publish) | A single subject, list of subjects, or a allow-deny map of subjects for publishing. Specifying a single subject or list of subjects denotes an *allow* and implcitly denies publishing to all other subjects. | `(multiple)` | - | Yes |
| [`subscribe`](/reference/2.11/config/gateway/authorization/default_permissions/subscribe) | A single subject, list of subjects, or a allow-deny map of subjects for subscribing. Note, that the subject permission can have an optional second value declaring a queue name. | `(multiple)` | - | Yes |
| [`allow_responses`](/reference/2.11/config/gateway/authorization/default_permissions/allow_responses) |  | `(multiple)` | - | Yes |
