# imports

<Reloadable /> 
A list of imports for this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`stream`](/reference/config/accounts/imports/stream) | Stream import source configuration. Exclusive of `service`. | `object` | - | Yes |
| [`service`](/reference/config/accounts/imports/service) | Stream import source configuration. Exclusive of `stream`. | `object` | - | Yes |
| [`prefix`](/reference/config/accounts/imports/prefix) | A local subject prefix mapping for the imported stream. Applicable to `stream`. | `string` | - | Yes |
| [`to`](/reference/config/accounts/imports/to) | A local subject mapping for the imported service. Applicable to `service`. | `string` | - | Yes |
