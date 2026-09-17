# default_max_consumers

<Since version="2.15" />
<Reloadable state="reloadable" note="Read live at the moment a consumer is created, so the new value applies to the next consumer created on any stream, including a stream that already exists. It does not remove consumers that already exceed it." />
The default maximum number of consumers allowed on a stream that
does not set its own `max_consumers`, and whose account has no
consumer limit either. Set to `-1` to disable this default and
allow an unlimited number of consumers, matching pre-2.15
behavior.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
