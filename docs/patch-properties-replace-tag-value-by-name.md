# Replace tag value by name Schema

```txt
https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/replace
```

Replace the value of a tag in the XML metadata file with a new one

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                            |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :-------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [patch.schema.json*](../out/patch.schema.json "open original schema") |

## replace Type

`object` ([Replace tag value by name](patch-properties-replace-tag-value-by-name.md))

# replace Properties

| Property | Type   | Required | Nullable       | Defined by                                                                                                                                                                                                              |
| :------- | :----- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `^.*$`   | Merged | Optional | cannot be null | [File Path or Glob Pattern patches](patch-properties-replace-tag-value-by-name-patternproperties-tag-name.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/replace/patternProperties/^.*$") |

## Pattern: `^.*$`

The tag name to search

`^.*$`

*   is optional

*   Type: `string` ([Tag name](patch-properties-replace-tag-value-by-name-patternproperties-tag-name.md))

*   cannot be null

*   defined in: [File Path or Glob Pattern patches](patch-properties-replace-tag-value-by-name-patternproperties-tag-name.md "https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/replace/patternProperties/^.\*$")

### ^.\*$ Type

`string` ([Tag name](patch-properties-replace-tag-value-by-name-patternproperties-tag-name.md))

all of

*   [New Tag Value](patch-properties-replace-tag-value-by-name-patternproperties-tag-name-allof-new-tag-value.md "check type definition")

### ^.\*$ Examples

```json
"siteAdmin"
```

```json
"externalSharingModel"
```
