# README

## Top-level Schemas

*   [Environment](./envinroment.md "Environment name, the list of patches to apply is matched against what it supplied to the command via the \"-e\" switch") – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/environment`

*   [File Path or Glob Pattern patches](./patch.md) – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch`

*   [Metadata Patcher](./mdatapatches.md "List of patches to apply to metadata") – `https://sfdx-metadata-patcher.com/schemas/mdataPatches`

## Other Schemas

### Objects

*   [Environment patches](./envinroment-allof-environment-patches.md) – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/environment#/allOf/0`

*   [File Path or Glob Pattern](./envinroment-allof-environment-patches-patternproperties-file-path-or-glob-pattern.md "Exact file path of a file or a glob pattern in the source folder to which the patches will be applied") – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/environment#/allOf/0/patternProperties/^.*$`

*   [File Path or Glob Pattern patches](./envinroment-allof-environment-patches-patternproperties-file-path-or-glob-pattern-allof-file-path-or-glob-pattern-patches.md) – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/allOf/0/patternProperties/^.*$/allOf/0`

*   [Patches](./mdatapatches-properties-patches.md) – `https://sfdx-metadata-patcher.com/schemas/mdataPatches#/properties/mdataPatches`

*   [Replace tag value by name](./patch-properties-replace-tag-value-by-name.md "Replace the value of a tag in the XML metadata file with a new one") – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/replace`

*   [Replace tag value by name](./patch-properties-replace-tag-value-by-name.md "Replace the value of a tag in the XML metadata file with a new one") – `https://sfdx-metadata-patcher.com/schemas/mdataPatches/patch#/properties/replace`

### Arrays



## Version Note

The schemas linked above follow the JSON Schema Spec version: `http://json-schema.org/draft-06/schema#`
