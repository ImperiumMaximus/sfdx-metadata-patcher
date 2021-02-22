# Environment Schema

```txt
https://sfdx-metadata-patcher.com/schemas/environment
```

Environment name, the list of patches to apply is matched against what it supplied to the command via the "-e" switch. If none then "default" environment name is assumed.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                       |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [environment.schema.json](../out/environment.schema.json "open original schema") |

## Environment Type

`object` ([Environment](environment.md))

all of

*   [Environment patches](environment-allof-environment-patches.md "check type definition")
