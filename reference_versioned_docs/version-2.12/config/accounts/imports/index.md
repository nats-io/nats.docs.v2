# imports

<Reloadable /> 
A list of imports for this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`stream`](/reference/2.12/config/accounts/imports/stream) | Stream import source configuration. Exclusive of `service`. | `object` | - | Yes |
| [`service`](/reference/2.12/config/accounts/imports/service) | Stream import source configuration. Exclusive of `stream`. | `object` | - | Yes |
| [`prefix`](/reference/2.12/config/accounts/imports/prefix) | A local subject prefix mapping for the imported stream. Applicable to `stream`. | `string` | - | Yes |
| [`to`](/reference/2.12/config/accounts/imports/to) | A local subject mapping for the imported service. Applicable to `service`. | `string` | - | Yes |
