# sync_interval

<Aliases aliases="sync" />
<Reloadable state="not-reloadable" />
Defines the internal to force sync file-based stream and consumer data
to disk. The filestore relies on the operating system's filesystem buffers
to periodically sync to disk. However, the server will still periodically
force sync files based on this interval.

For use cases where unclean shutdowns are common, this can provide more
control over how frequently to force sync data when written.

If a value `always` is used, a explicit sync will occur on every write.
Do note that this will degrade the max throughput due to the additional
I/O calls.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
| `string` |  | `always` |
