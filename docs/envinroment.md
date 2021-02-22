# Environment Schema

```txt
https://sfdx-metadata-patcher.com/schemas/mdataPatches/environment
```

Environment name, the list of patches to apply is matched against what it supplied to the command via the "-e" switch. If none then "default" environment name is assumed.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                       |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [envinroment.schema.json](../out/envinroment.schema.json "open original schema") |

## Environment Type

`object` ([Environment](envinroment.md))

all of

*   [Environment patches](envinroment-allof-environment-patches.md "check type definition")
