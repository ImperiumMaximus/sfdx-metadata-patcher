# File Path or Glob Pattern Schema

```txt
https://sfdx-metadata-patcher.com/schemas/environment#/allOf/0/patternProperties/^.*$
```

Exact file path of a file or a glob pattern in the source folder to which the patches will be applied. If the pattern matches multiple files, the patches will applied to all files that match.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                        |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :-------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [environment.schema.json*](../out/environment.schema.json "open original schema") |

## ^.\*$ Type

`object` ([File Path or Glob Pattern](environment-allof-environment-patches-patternproperties-file-path-or-glob-pattern.md))

all of

*   [File Path or Glob Pattern patches](environment-allof-environment-patches-patternproperties-file-path-or-glob-pattern-allof-file-path-or-glob-pattern-patches.md "check type definition")

## ^.\*$ Examples

```json
"profiles/*"
```

```json
"profiles/Admin.profile-meta.xml"
```

```json
"sites/*.site-meta.xml"
```
