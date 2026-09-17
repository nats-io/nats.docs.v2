# imports

<Reloadable state="reloadable" note="Fully re-resolved, but every reload tears down and re-creates ALL of the account's service-import subscriptions, so there is a short window where imported service subjects have no subscriber and requests arriving in it are dropped." />
A list of imports for this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`stream`](./stream/index.md) | Stream import source configuration. Exclusive of `service`. | `object` | - | Yes |
| [`service`](./service/index.md) | Stream import source configuration. Exclusive of `stream`. | `object` | - | Yes |
| [`prefix`](./prefix.md) | A local subject prefix mapping for the imported stream. Applicable to `stream`. | `string` | - | Yes |
| [`to`](./to.md) | A local subject mapping for the imported service. Applicable to `service`. | `string` | - | Yes |
