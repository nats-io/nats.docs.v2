# tpm

<Reloadable state="not-reloadable" />
Seal the filestore encryption key in the machine's TPM, so it
cannot be read off disk.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`keys_file`](./keys_file.md) | File the TPM-sealed key is stored in. | `string` | - | No |
| [`encryption_password`](./encryption_password.md) | Password protecting the sealed key. | `string` | - | No |
| [`srk_password`](./srk_password.md) | Password for the TPM storage root key. | `string` | - | No |
| [`pcr`](./pcr.md) | Platform Configuration Register the key is sealed against, so it only unseals on an unchanged boot state. | `integer` | - | No |
| [`cipher`](./cipher.md) | Cipher used for the filestore once the key is unsealed. | `string` | - | No |
