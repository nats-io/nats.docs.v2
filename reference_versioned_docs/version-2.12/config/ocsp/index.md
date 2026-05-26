# ocsp

<Reloadable /> 
OCSP Stapling is honored by default for certificates that have the
`status_request` `Must-Staple` flag. If explicitly disabled, the
server will not request staples even if `Must-Staple` is present.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` |  | `true`, `false` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`mode`](/reference/2.12/config/ocsp/mode) | The OCSP stapling mode to adhere to. | `string` | - | Yes |
| [`url`](/reference/2.12/config/ocsp/url) | An explicit override URL to request staples. | `string` | - | Yes |
| [`urls`](/reference/2.12/config/ocsp/urls) | An explicit list of override URLs to request staples. | `string` | - | Yes |
