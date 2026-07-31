# exports

<Reloadable state="reloadable" note="The whole export set is discarded and rebuilt from the config file on every reload; changes apply to connections that are already up." />
A list of exports for this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`stream`](./stream.md) | A subject or subject with wildcards that the account will publish to. Exclusive of `service`. | `string` | - | Yes |
| [`service`](./service.md) | A subject or subject with wildcards that the account will subscribe to. Exclusive of `stream`. | `string` | - | Yes |
| [`accounts`](./accounts.md) | A list of account names that can import the stream or service. If not specified, the service or stream is public and any account can import it. | `string` | - | Yes |
| [`response_type`](./response_type.md) | Indicates if a response to a service request consists of a single or a stream of messages. Possible values are `single` or `stream`. | `string` | `single` | Yes |
