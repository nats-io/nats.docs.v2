# leafnodes

<Aliases aliases="`leaf`" />
Configuration for setting up leaf node connections.


## Properties

### Incoming Connections

A server that has been configured to *accept* connections
from one or more leaf nodes. This would be the *hub* in a
hub-and-spoke topology, for example.

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`host`](/reference/config/leafnodes/host) | Host name the server will listen on for incoming leaf node connections. | `string` | - | Yes |
| [`port`](/reference/config/leafnodes/port) | Port the server will listen for incoming leaf node connections. | `integer` | `7422` | Yes |
| [`listen`](/reference/config/leafnodes/listen) |  | `string` | - | Yes |
| [`tls`](/reference/config/leafnodes/tls) | TLS configuration for securing leaf node connections. | `object` | - | Yes |
| [`advertise`](/reference/config/leafnodes/advertise) | Hostport to advertise how this sever be contacted by leaf nodes. This is useful for setups with a NAT. | `string` | - | Yes |
| [`no_advertise`](/reference/config/leafnodes/no_advertise) | If true, the server will not be advertised to leaf nodes. | `boolean` | `false` | Yes |
| [`authorization`](/reference/config/leafnodes/authorization) | Authorization scoped to accepting leaf node connections. | `object` | - | Yes |
| [`min_version`](/reference/config/leafnodes/min_version) | The minimum server version required of the connecting leaf node. This must be at least version `2.8.0`. | `string` | - | Yes |
| [`compression`](/reference/config/leafnodes/compression) | Defines the compression mode to use for an incoming leafnode connection.  If set to `on`, it will use the `s2_auto`. | `(multiple)` | - | Yes |
### Outgoing Connections

A server that has been configured to *connect* to another
server configured to accept leaf node connections. In a
hub-and-spoke topology, this would be the *spoke*, typically
in a remote location or on an edge device.

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`remotes`](/reference/config/leafnodes/remotes) | List of entries specifiying servers where the leaf node client connection can be made. | `object` | - | No |
| [`reconnect`](/reference/config/leafnodes/reconnect) | Interval in seconds at which reconnect attempts to a remote server are made. | `integer` | - | Yes |
