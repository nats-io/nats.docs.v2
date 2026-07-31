# expires

<Reloadable state="reloadable" note="Folded into each user's permissions at parse time (only users with no explicit `permissions`). Re-applied live, but setPermissions resets the client's reply-tracking map on EVERY reload, so a service still owing a response for a request received before the reload loses permission to publish it." />
The amount of time the permission is valid. Values such
as 1s, 1m, 1h (1 second, minute, hour) etc can be specified.
Default doesn't have a time limit.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
