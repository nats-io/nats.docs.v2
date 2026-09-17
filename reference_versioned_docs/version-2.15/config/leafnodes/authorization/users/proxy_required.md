# proxy_required

<Since version="2.12" />
<Reloadable state="reloadable" note="Read when a leaf node authenticates, so the new value applies to connections made after the reload. Existing connections keep the setting they connected under." />
Reject this user's leaf node connections if they did not
arrive through a PROXY protocol header. Setting
`proxy_required` on the surrounding `authorization` block
applies the requirement to every user regardless of what
they set here.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
