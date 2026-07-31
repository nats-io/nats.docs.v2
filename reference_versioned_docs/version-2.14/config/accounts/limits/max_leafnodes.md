# max_leafnodes

<Aliases aliases="max_leafs" />
<Reloadable state="reloadable" note="Only checked when a leafnode registers with the account. reloadAuthorization walks s.clients, and leafnode connections live in s.leafs, so existing leafnodes are never re-checked - the new limit only applies to leafnodes that connect after the reload." />
The maximum number of concurrent leafnode connections allowed.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
