# gateways

<Reloadable /> 
List of gateway entries.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`name`](/reference/2.12/config/gateway/gateways/name) | Name of the gateway being connected to. | `string` | - | Yes |
| [`url`](/reference/2.12/config/gateway/gateways/url) | A single URL to connect to. | `string` | - | Yes |
| [`urls`](/reference/2.12/config/gateway/gateways/urls) | A list of URLs to connect to (multiple servers in a cluster). | `string` | - | Yes |
| [`tls`](/reference/2.12/config/gateway/gateways/tls) | A TLS configuration map for creating a secure gateway connection. If the top-level `gateway{}` tls block contains certificates that have both client and server purposes, it is possible to omit this one and the server will use the certificates from the `gateway{tls{}}` section. | `object` | - | Yes |
