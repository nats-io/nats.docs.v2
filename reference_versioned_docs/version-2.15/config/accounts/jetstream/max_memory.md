# max_memory

<Aliases aliases="max_mem, mem, memory" />
<Reloadable state="reloadable" note="Applied by replacing the account's whole limits map, so it is all-or-nothing: on a standalone server the update is rejected if it would put max_memory/max_file below already-reserved stream bytes, and the reload still reports success (the error is only logged). Worse, the account walk returns on the first such error, so accounts later in iteration order get no limit update at all. This is the value whose reduction triggers that rejection." />
The maximum storage allowed across all memory-based assets.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
