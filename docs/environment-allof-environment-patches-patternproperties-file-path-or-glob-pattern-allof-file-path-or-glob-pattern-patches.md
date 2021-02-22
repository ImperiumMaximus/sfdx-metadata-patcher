# File Path or Glob Pattern patches Schema

```txt
https://sfdx-metadata-patcher.com/schemas/patch#/allOf/0/patternProperties/^.*$/allOf/0
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                        |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :-------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [environment.schema.json*](../out/environment.schema.json "open original schema") |

## 0 Type

`object` ([File Path or Glob Pattern patches](environment-allof-environment-patches-patternproperties-file-path-or-glob-pattern-allof-file-path-or-glob-pattern-patches.md))

# 0 Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                                                               |
| :------------------ | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [where](#where)     | `string` | Optional | cannot be null | [File Path or Glob Pattern patches](patch-properties-json-path-expression.md "https://sfdx-metadata-patcher.com/schemas/patch#/properties/where")        |
| [replace](#replace) | `object` | Optional | cannot be null | [File Path or Glob Pattern patches](patch-properties-replace-tag-value-by-name.md "https://sfdx-metadata-patcher.com/schemas/patch#/properties/replace") |

## where

Metadata XML files are converted to JSON internally, in order to extract the relevant chunk of the XML file to which the patches are applied the JSON path expression is executed against the JSON representation of the XML metadata file itself. Most of the times you just need to specificy the root XML tag name of the metadata XML file itself: e.g., Profile, CustomObject, CustomSite, etc.

`where`

*   is optional

*   Type: `string` ([JSON Path Expression](patch-properties-json-path-expression.md))

*   cannot be null

*   defined in: [File Path or Glob Pattern patches](patch-properties-json-path-expression.md "https://sfdx-metadata-patcher.com/schemas/patch#/properties/where")

### where Type

`string` ([JSON Path Expression](patch-properties-json-path-expression.md))

### where Examples

```json
"CustomObject"
```

```json
"CustomSite"
```

```json
"CustomField"
```

```json
"CustomObject.actionOverrides[actionName=Delete]"
```

## replace

Replace the value of a tag in the XML metadata file with a new one

`replace`

*   is optional

*   Type: `object` ([Replace tag value by name](patch-properties-replace-tag-value-by-name.md))

*   cannot be null

*   defined in: [File Path or Glob Pattern patches](patch-properties-replace-tag-value-by-name.md "https://sfdx-metadata-patcher.com/schemas/patch#/properties/replace")

### replace Type

`object` ([Replace tag value by name](patch-properties-replace-tag-value-by-name.md))
