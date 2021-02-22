# JSON Path Expression Schema

```txt
https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/where
```

Metadata XML files are converted to JSON internally, in order to extract the relevant chunk of the XML file to which the patches are applied the JSON path expression is executed against the JSON representation of the XML metadata file itself. Most of the times you just need to specificy the root XML tag name of the metadata XML file itself: e.g., Profile, CustomObject, CustomSite, etc.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                            |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :-------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [patch.schema.json*](../out/patch.schema.json "open original schema") |

## where Type

`string` ([JSON Path Expression](patch-properties-json-path-expression.md))

## where Examples

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
