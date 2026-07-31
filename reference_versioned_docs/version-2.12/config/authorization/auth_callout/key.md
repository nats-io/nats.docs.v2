# key

<Aliases aliases="xkey" />
<Reloadable state="not-reloadable" note="diffOptions has no case for the AuthCallout field, so any change to this block - including adding or removing it - hits the default branch and aborts the entire reload with &quot;config reload not supported for AuthCallout&quot;. Every other change in the same config file is discarded with it." />
A public XKey that will encrypt server requests to the auth
service.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
