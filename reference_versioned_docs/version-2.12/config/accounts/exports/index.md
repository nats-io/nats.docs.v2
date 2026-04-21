# exports

<Reloadable /> 
A list of exports for this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`stream`](/reference/config/accounts/exports/stream) | A subject or subject with wildcards that the account will publish to. Exclusive of `service`. | `string` | - | Yes |
| [`service`](/reference/config/accounts/exports/service) | A subject or subject with wildcards that the account will subscribe to. Exclusive of `stream`. | `string` | - | Yes |
| [`accounts`](/reference/config/accounts/exports/accounts) | A list of account names that can import the stream or service. If not specified, the service or stream is public and any account can import it. | `string` | - | Yes |
| [`response_type`](/reference/config/accounts/exports/response_type) | Indicates if a response to a service request consists of a single or a stream of messages. Possible values are `single` or `stream`. | `string` | `single` | Yes |
