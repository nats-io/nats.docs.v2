# certs

<Reloadable state="reloadable" />
Multiple certificate/key pairs to serve, so one listener can
present different certificates to different clients. Use this
instead of `cert_file` and `key_file`.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cert_file`](./cert_file.md) | Certificate file for this pair. | `string` | - | Yes |
| [`key_file`](./key_file.md) | Key file for this pair. | `string` | - | Yes |
