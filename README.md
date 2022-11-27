sfdx-metadata-patcher
=====================

A Salesforce DX Plugin to hotpatch metadata before deployments

[![Version](https://img.shields.io/npm/v/sfdx-metadata-patcher.svg)](https://npmjs.org/package/sfdx-metadata-patcher)
[![Node.js CI](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/actions/workflows/nodejs.yml/badge.svg)](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/actions/workflows/nodejs.yml)
[![Codecov](https://codecov.io/gh/ImperiumMaximus/sfdx-metadata-patcher/branch/master/graph/badge.svg)](https://codecov.io/gh/ImperiumMaximus/sfdx-metadata-patcher)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-metadata-patcher.svg)](https://npmjs.org/package/sfdx-metadata-patcher)
[![License](https://img.shields.io/npm/l/sfdx-metadata-patcher.svg)](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/master/package.json)

<!-- install -->
## Install
### From Sources
1. Install the SDFX CLI.
1. Clone the repository: `git clone https://github.com/ImperiumMaximus/sfdx-metadata-patcher.git`
1. Install npm modules: `npm install`
1. Link the plugin: `sfdx plugins:link .`
### As Plugin
```sh-session
$ sfdx plugins:install sfdx-metadata-patcher
```
## Commands
<!-- commands -->
* [`sfdx mdata:apex:testdependencies`](#sfdx-mdataapextestdependencies)
* [`sfdx mdata:communities:publish [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatacommunitiespublish--n-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:manifest:align [-r <string>] [-p <string>] [-x <string>] [-m <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatamanifestalign--r-string--p-string--x-string--m-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:manifest:sort -x <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatamanifestsort--x-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatapatch--e-string--r-string--m-string--s-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:permset:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatapermsetretrieve--r-string--p-string--x-string--m-string--d-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:profile:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdataprofileretrieve--r-string--p-string--x-string--m-string--d-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:statecountry:configure -f <string> [-c <string>] [-v] [-m <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatastatecountryconfigure--f-string--c-string--v--m-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:statecountry:template -o <string> [-m <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatastatecountrytemplate--o-string--m-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:translations:convert -f <string> -t <string> -i <string> -o <string> [-m <string>] [-s <string>] [-r <number>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatatranslationsconvert--f-string--t-string--i-string--o-string--m-string--s-string--r-number---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx mdata:apex:testdependencies`

computes the list of (statically) dependant Apex Test Classes to a list of Apex Classes supplied in input up to a certain depth

```
USAGE
  $ sfdx mdata:apex:testdependencies

OPTIONS
  -d, --destructivemanifest=destructivemanifest                                     file path for destructive manifest
                                                                                    (package.xml) of components to
                                                                                    delete in delta

  -l, --depth=depth                                                                 [default: -1] how many iterations to
                                                                                    perform while navigating the tree of
                                                                                    dependencies

  -n, --nameconv=nameconv                                                           [default: Test] naming convention to
                                                                                    apply to generate Apex Class Test
                                                                                    names

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -x, --manifest=manifest                                                           file path for manifest (package.xml)
                                                                                    of components to deploy in delta

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --config                                                                          show interactive prompt to configure
                                                                                    the plugin (writes result on
                                                                                    sfdx-project.json

  --fuzzythreshold=fuzzythreshold                                                   [default: 0.6] the minimum score
                                                                                    that can be returned in the fuzzy
                                                                                    match

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

  --prod                                                                            pass this flag if the command is
                                                                                    running while validating / deploying
                                                                                    to production

  --usecodecoverage                                                                 include target org existing code
                                                                                    coverage tables to extract
                                                                                    dependencies

EXAMPLES
  To configure the plugin:
      $ sfdx mdata:apex:testdependencies --config
  To find all test dependecies for classes in a delta package in a SFDX project with a specific naming convention for 
  test classes:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --nameconv _Test
  To find all test dependecies for classes in a delta package in a SFDX project when deploying into production:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --prod
  To find all test dependecies for classes in a delta package in a SFDX project with a custom fuzzy threshold score:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --fuzzythreshold 0.75
  To find all test dependecies up to a certain depth in a SFDX project:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml -l 1
  To find all test dependecies for classes in a delta package including ApexCodeCoverage in target org in a SFDX 
  project:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --usecodecoverage
```

_See code: [src/commands/mdata/apex/testdependencies.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/apex/testdependencies.ts)_

## `sfdx mdata:communities:publish [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

publishes one or more Experience Cloud communities

```
USAGE
  $ sfdx mdata:communities:publish [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -n, --name=name                                                                   comma-separated list of community
                                                                                    names

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLES
  To publish all the communities in the org:
      $ sfdx mdata:communities:publish
  To find a community named Customer and publish it:
      $ sfdx mdata:communities:publish -n Customer
  To find communities named Customer, Partner and publish them:
      $ sfdx mdata:communities:publish -n Customer,Partner

  To find a community named Customer in Org with alias uat and publish it:
      $ sfdx mdata:communities:publish -n Customer -u uat
  To find a community named Customer in Org with username admin.user@uat.myorg.com and publish it:
      $ sfdx mdata:communities:publish -n Customer -u admin.user@uat.myorg.com
```

_See code: [src/commands/mdata/communities/publish.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/communities/publish.ts)_

## `sfdx mdata:manifest:align [-r <string>] [-p <string>] [-x <string>] [-m <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

align manifest (package.xml) in a project using the source format according to the components present in the project itself

```
USAGE
  $ sfdx mdata:manifest:align [-r <string>] [-p <string>] [-x <string>] [-m <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -m, --metadata=metadata                                                           comma-separated list of metadata
                                                                                    component names to include in the
                                                                                    manifest

  -p, --sourcepath=sourcepath                                                       comma-separated list of paths to the
                                                                                    local source files from which the
                                                                                    manifest (package.xml) is generated

  -r, --rootdir=rootdir                                                             a source directory from which the
                                                                                    manifest (package.xml) is generated

  -x, --manifest=manifest                                                           [default: manifest/package.xml]
                                                                                    output filepath to which the
                                                                                    manifest (package.xml) is written

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLES
  To align the manifest from the default package source directory
      $ sfdx mdata:manifest:align -x manifest/package.xml
  To align the manifest from a list of source directories
      $ sfdx mdata:manifest:align -p /path/to/source1,/path/to/source2,/path/to/source3 -x manifest/package.xml
  To align the manifest from the default package source directory together with components of another directory
      $ sfdx mdata:manifest:align -r /path/to/root/dir -x manifest/package.xml
  To align the manifest from the default package source directory with only specific metadata
      $ sfdx mdata:manifest:align -m ApexClass,ApexTrigger,CustomObject -x manifest/package.xml
```

_See code: [src/commands/mdata/manifest/align.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/manifest/align.ts)_

## `sfdx mdata:manifest:sort -x <string> [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

sort alphabetically the components in a manifest (package.xml) file

```
USAGE
  $ sfdx mdata:manifest:sort -x <string> [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -x, --manifest=manifest                                                           (required) file path for manifest
                                                                                    (package.xml) of components to sort

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLE
  To sort the components of a manifest file
      $ sfdx mdata:manifest:sort -x manifest/package.xml
```

_See code: [src/commands/mdata/manifest/sort.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/manifest/sort.ts)_

## `sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

patches source metadata files in order to solve common Salesforce deployment bugs or to modifly on the fly API endpoints

```
USAGE
  $ sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -e, --env=env                                                                     [default: default] Environment name
                                                                                    used to select the correct patch set
                                                                                    from sfdx-project.json

  -m, --mdapimapfile=mdapimapfile                                                   file with JSON that maps workspaces
                                                                                    files (using source structure) to
                                                                                    mdapi files. Not intended to be used
                                                                                    when invoked directly, but when
                                                                                    invoked by CLI Pre Deploy Hook.

  -r, --rootdir=rootdir                                                             the input directory that contains
                                                                                    the source files to be patched

  -s, --subpath=subpath                                                             [default: main/default] Optional
                                                                                    subpath(s) between the root dir and
                                                                                    the actual sources dir (where the
                                                                                    profiles/, classes/, etc. are
                                                                                    stored)

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation
```

_See code: [src/commands/mdata/patch.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/patch.ts)_

## `sfdx mdata:permset:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

retrieve one or more profiles in a project considering all the rest of sources

```
USAGE
  $ sfdx mdata:permset:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] 
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outdir=outdir                                                               output directory to store the
                                                                                    retrieved permission sets

  -m, --permsets=permsets                                                           comma-separated list of permission
                                                                                    sets names to retrieve (by default
                                                                                    they are all retrieved according to
                                                                                    what is found in sources/root
                                                                                    dir/manifest)

  -p, --sourcepath=sourcepath                                                       comma-separated list of paths to the
                                                                                    local source files from to retrieve
                                                                                    together with permission sets

  -r, --rootdir=rootdir                                                             a source directory from which the
                                                                                    components together with permission
                                                                                    sets are retrieved

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -x, --manifest=manifest                                                           [default: manifest/package.xml]
                                                                                    manifest (package.xml) to retrieve

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLES
  To retrieve the permission sets in the default package source directory
      $ sfdx mdata:permsets:retrieve
  To retrieve the permission sets in the default package source directory from a list of source directories
      $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3
  To retrieve the permission sets in the default package source directory from the default source directory together 
  with components of another directory
      $ sfdx mdata:permsets:retrieve -r /path/to/root/dir
  To retrieve the permission sets in the default package source directory from a manifest (package.xml)
      $ sfdx mdata:permsets:retrieve -x manifest/package.xml
  To retrieve the permission sets in a specific output folder from the default source directory
      $ sfdx mdata:permsets:retrieve -d /path/to/out/dir
  To retrieve a specific list of permission sets in the default package source directory
      $ sfdx mdata:permsets:retrieve -m "MyCoolPermSet1,MyCoolPermSet2"
```

_See code: [src/commands/mdata/permset/retrieve.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/permset/retrieve.ts)_

## `sfdx mdata:profile:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

retrieve one or more profiles in a project considering all the rest of sources

```
USAGE
  $ sfdx mdata:profile:retrieve [-r <string>] [-p <string>] [-x <string>] [-m <string>] [-d <string>] [-u <string>] 
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outdir=outdir                                                               output directory to store the
                                                                                    retrieved profiles

  -m, --profiles=profiles                                                           comma-separated list of profile
                                                                                    names to retrieve (by default they
                                                                                    are all retrieved according to what
                                                                                    is found in sources/root
                                                                                    dir/manifest)

  -p, --sourcepath=sourcepath                                                       comma-separated list of paths to the
                                                                                    local source files from to retrieve
                                                                                    together with profiles

  -r, --rootdir=rootdir                                                             a source directory from which the
                                                                                    components together with profiles
                                                                                    are retrieved

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -x, --manifest=manifest                                                           [default: manifest/package.xml]
                                                                                    manifest (package.xml) to retrieve

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLES
  To retrieve the profiles in the default package source directory
      $ sfdx mdata:permsets:retrieve
  To retrieve the profiles in the default package source directory from a list of source directories
      $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3
  To retrieve the profiles in the default package source directory from the default source directory together with 
  components of another directory
      $ sfdx mdata:permsets:retrieve -r /path/to/root/dir
  To retrieve the profiles in the default package source directory from a manifest (package.xml)
      $ sfdx mdata:permsets:retrieve -x manifest/package.xml
  To retrieve the profiles in a specific output folder from the default source directory
      $ sfdx mdata:permsets:retrieve -d /path/to/out/dir
  To retrieve a specific list of profiles in the default package source directory
      $ sfdx mdata:permsets:retrieve -m "Admin,Read Only,Custom: Sales Profile"
```

_See code: [src/commands/mdata/profile/retrieve.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/profile/retrieve.ts)_

## `sfdx mdata:statecountry:configure -f <string> [-c <string>] [-v] [-m <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

configure new and/or existing Country and State Picklist values from an Excel file mapping using Selenium Webdriver

```
USAGE
  $ sfdx mdata:statecountry:configure -f <string> [-c <string>] [-v] [-m <string>] [-u <string>] [--apiversion <string>]
   [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --conflictspolicy=skip|rename
      [default: skip] specify the policy to use in resolving conflicts with existing Country and / or State codes with
      different labels. Use "skip" to ignore the change proposed in the Excel file and keep the value already in the Org
      as it is. Use "rename" to edit the existing value in the Org with the label supplied in the Excel file

  -f, --mappingpath=mappingpath
      (required) Excel file containing the mappings of Countries and States to configure in the target Org

  -m, --mdatafile=mdatafile
      file path to an existing AddressSettings file to determine possible conflicts between the configuration in the
      target Org and the mapping supplied in the Excel file. If not specified a fresh one is retrieved from the target Org

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  -v, --check
      specify the policy to use in resolving conflicts with existing Country and / or State codes with different labels.
      Use "skip" to ignore the change proposed in the Excel file and keep the value already in the Org as it is. Use
      "rename" to edit the existing value in the Org with the label supplied in the Excel file

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: info] logging level for this command invocation

EXAMPLE
  To configure the State / Country Picklist from an Excel file in the current default org
      $ sfdx mdata:statecountry:configure -f /path/to/state/country/to/configure.xlsx
```

_See code: [src/commands/mdata/statecountry/configure.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/statecountry/configure.ts)_

## `sfdx mdata:statecountry:template -o <string> [-m <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

generate an Excel file template from the currently configured Country and State picklist in the target Org

```
USAGE
  $ sfdx mdata:statecountry:template -o <string> [-m <string>] [-u <string>] [--apiversion <string>] [--json] 
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -m, --mdatafile=mdatafile
      file path to an existing AddressSettings file to determine possible conflicts between the configuration in the
      target Org and the mapping supplied in the Excel file. If not specified a fresh one is retrieved from the target Org

  -o, --outputpath=outputpath
      (required) File path where the resulting Excel file will be written to

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: info] logging level for this command invocation

EXAMPLE
  To generate an Excel template of the State / Country Picklist currently configured in the current default org
      $ sfdx mdata:statecountry:template -o /path/to/template/to/generate.xlsx
```

_See code: [src/commands/mdata/statecountry/template.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/statecountry/template.ts)_

## `sfdx mdata:translations:convert -f <string> -t <string> -i <string> -o <string> [-m <string>] [-s <string>] [-r <number>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

converts a translation file from one format to another (e.g. from Salesforce Translation Format (STF) to Excel or viceversa)

```
USAGE
  $ sfdx mdata:translations:convert -f <string> -t <string> -i <string> -o <string> [-m <string>] [-s <string>] [-r 
  <number>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --from=stf|xlsx                                                               (required) Format of the source file
  -i, --infile=infile                                                               (required) Path of the input file

  -m, --metadata=metadata                                                           Comma-separated list of metadata
                                                                                    component names

  -o, --outfile=outfile                                                             (required) Path of the output file

  -r, --rowheadernum=rowheadernum                                                   [default: 1] Index (starts from 1)
                                                                                    of the row that contains the header

  -s, --sheets=sheets                                                               Comma-separated list of XLSX sheet
                                                                                    names

  -t, --to=stf|xlsx                                                                 (required) Format of the destination
                                                                                    file

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation
```

_See code: [src/commands/mdata/translations/convert.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.24/src/commands/mdata/translations/convert.ts)_
<!-- commandsstop -->
