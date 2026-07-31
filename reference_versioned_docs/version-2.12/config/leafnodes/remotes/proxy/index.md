# proxy

<Since version="2.12" />
<Reloadable state="not-reloadable" />
Reach the remote through an HTTP proxy.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`url`](./url.md) | Proxy URL, e.g. `http://proxy.example.com:3128`. | `string` | - | No |
| [`username`](./username.md) | User name for proxy authentication. | `string` | - | No |
| [`password`](./password.md) | Password for proxy authentication. | `string` | - | No |
| [`timeout`](./timeout.md) | How long to wait for the proxy to establish the tunnel. | `duration` | - | No |
