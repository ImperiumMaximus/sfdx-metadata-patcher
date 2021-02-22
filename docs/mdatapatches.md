# Metadata Patcher Schema

```txt
https://sfdx-metadata-patcher.com/schemas/mdataPatches
```

List of patches to apply to metadata. The list can be different for each environment. Use "default" for the list of patches when no specific environment name is supplied to command.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                         |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [mdataPatches.schema.json](../out/mdataPatches.schema.json "open original schema") |

## Metadata Patcher Type

`object` ([Metadata Patcher](mdatapatches.md))

# Metadata Patcher Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                               |
| :---------------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| [mdataPatches](#mdatapatches) | `object` | Optional | cannot be null | [Metadata Patcher](mdatapatches-properties-patches.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches") |

## mdataPatches



`mdataPatches`

*   is optional

*   Type: `object` ([Patches](mdatapatches-properties-patches.md))

*   cannot be null

*   defined in: [Metadata Patcher](mdatapatches-properties-patches.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches")

### mdataPatches Type

`object` ([Patches](mdatapatches-properties-patches.md))
