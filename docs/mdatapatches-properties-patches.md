# Patches Schema

```txt
https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                          |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :---------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Forbidden             | none                | [mdataPatches.schema.json*](../out/mdataPatches.schema.json "open original schema") |

## mdataPatches Type

`object` ([Patches](mdatapatches-properties-patches.md))

# mdataPatches Properties

| Property                | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                    |
| :---------------------- | :-------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [hook](#hook)           | `boolean` | Optional | cannot be null | [Metadata Patcher](mdatapatches-properties-patches-properties-enable-pre-deploy-sf-cli-hook.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches/properties/hook")             |
| `^(?!hook)([a-zA-Z]+)$` | Merged    | Optional | cannot be null | [Metadata Patcher](mdatapatches-properties-patches-patternproperties-environment.md "https://sfdx-metadata-patcher.com/schemas/environment#/properties/mdataPatches/patternProperties/^(?!hook)([a-zA-Z]+)$") |

## hook

Set to true in order to enable Pre Deploy Hook in SF CLI force:source:deploy and force:source:push commands

`hook`

*   is optional

*   Type: `boolean` ([Enable Pre Deploy SF CLI Hook](mdatapatches-properties-patches-properties-enable-pre-deploy-sf-cli-hook.md))

*   cannot be null

*   defined in: [Metadata Patcher](mdatapatches-properties-patches-properties-enable-pre-deploy-sf-cli-hook.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches/properties/hook")

### hook Type

`boolean` ([Enable Pre Deploy SF CLI Hook](mdatapatches-properties-patches-properties-enable-pre-deploy-sf-cli-hook.md))

## Pattern: `^(?!hook)([a-zA-Z]+)$`

Environment name, the list of patches to apply is matched against what it supplied to the command via the "-e" switch. If none then "default" environment name is assumed.

`^(?!hook)([a-zA-Z]+)$`

*   is optional

*   Type: `object` ([Environment](mdatapatches-properties-patches-patternproperties-environment.md))

*   cannot be null

*   defined in: [Metadata Patcher](mdatapatches-properties-patches-patternproperties-environment.md "https://sfdx-metadata-patcher.com/schemas/environment#/properties/mdataPatches/patternProperties/^(?!hook)(\[a-zA-Z]+)$")

### ^(?!hook)(\[a-zA-Z]+)$ Type

`object` ([Environment](mdatapatches-properties-patches-patternproperties-environment.md))

all of

*   [Environment patches](environment-allof-environment-patches.md "check type definition")
