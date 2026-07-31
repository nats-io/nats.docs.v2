# disk_max_stream_bytes

<Aliases aliases="store_max_stream_bytes" />
<Reloadable state="reloadable" note="Applied by replacing the account's whole limits map, so it is all-or-nothing: on a standalone server the update is rejected if it would put max_memory/max_file below already-reserved stream bytes, and the reload still reports success (the error is only logged). Worse, the account walk returns on the first such error, so accounts later in iteration order get no limit update at all. Enforced when assets are created or updated; existing streams/consumers above the new value are left running." />
Maximum bytes any given file-based stream is allowed to be allocated.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
