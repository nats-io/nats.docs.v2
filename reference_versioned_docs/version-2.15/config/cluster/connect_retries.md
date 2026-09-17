# connect_retries

<Reloadable state="reloadable" note="Applies to route connection attempts started after the reload; an in-progress retry loop keeps the old value." />
After how many failed connect attempts to give up establishing a connection to a *discovered* route. Default is 0, do not retry.
When enabled, attempts will be made once a second. This, does not apply to explicitly configured routes.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
