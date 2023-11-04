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
* [`sf mdata apex testdependencies`](#sf-mdata-apex-testdependencies)
* [`sf mdata communities publish`](#sf-mdata-communities-publish)
* [`sf mdata manifest align`](#sf-mdata-manifest-align)
* [`sf mdata manifest sort`](#sf-mdata-manifest-sort)
* [`sf mdata patch`](#sf-mdata-patch)
* [`sf mdata permset retrieve`](#sf-mdata-permset-retrieve)
* [`sf mdata profile retrieve`](#sf-mdata-profile-retrieve)
* [`sf mdata statecountry configure`](#sf-mdata-statecountry-configure)
* [`sf mdata statecountry template`](#sf-mdata-statecountry-template)
* [`sf mdata translations convert`](#sf-mdata-translations-convert)

## `sf mdata apex testdependencies`

computes the list of (statically) dependant Apex Test Classes to a list of Apex Classes supplied in input up to a certain depth

```
USAGE
  $ sf mdata apex testdependencies [--json] [--config | -n <value> | -l <value> | -x <value> | -d <value> | --fuzzythreshold
    <value> | --usecodecoverage] [--prod] [-o <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -d, --destructivemanifest=<value>  file path for destructive manifest (package.xml) of components to delete in delta
  -l, --depth=<value>                [default: -1] how many iterations to perform while navigating the tree of
                                     dependencies
  -n, --nameconv=<value>             [default: Test] naming convention to apply to generate Apex Class Test names
  -o, --target-org=<value>           [default: raffaele.fioratto@gmail.com.pbiconn] Username or alias of the target org
  -x, --manifest=<value>             file path for manifest (package.xml) of components to deploy in delta
  --config                           show interactive prompt to configure the plugin (writes result on
                                     sfdx-project.json)
  --fuzzythreshold=<value>           [default: .6] the minimum score that can be returned in the fuzzy match
  --loglevel=<option>                [default: info] logging level for this command invocation
                                     <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>
  --prod                             pass this flag if the command is running while validating / deploying to production
  --usecodecoverage                  include target org existing code coverage tables to extract dependencies

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To configure the plugin:
      $ sfdx mdata:apex:testdependencies --config

  To find all test dependecies for classes in a delta package in a SFDX project with a specific naming convention for test classes:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --nameconv _Test

  To find all test dependecies for classes in a delta package in a SFDX project when deploying into production:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --prod

  To find all test dependecies for classes in a delta package in a SFDX project with a custom fuzzy threshold score:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --fuzzythreshold 0.75

  To find all test dependecies up to a certain depth in a SFDX project:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml -l 1

  To find all test dependecies for classes in a delta package including ApexCodeCoverage in target org in a SFDX project:
      $ sfdx mdata:apex:testdependencies -x package.xml -d destructiveChanges.xml --usecodecoverage
```

_See code: [src/commands/mdata/apex/testdependencies.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/apex/testdependencies.ts)_

## `sf mdata communities publish`

publishes one or more Experience Cloud communities

```
USAGE
  $ sf mdata communities publish [--json] [-n <value>] [-u <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -n, --name=<value>            comma-separated list of community names
  -u, --targetusername=<value>  Username or alias of the target org
  --loglevel=<option>           [default: info] logging level for this command invocation
                                <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

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

_See code: [src/commands/mdata/communities/publish.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/communities/publish.ts)_

## `sf mdata manifest align`

align manifest (package.xml) in a project using the source format according to the components present in the project itself

```
USAGE
  $ sf mdata manifest align [--json] [-r <value>] [-p <value>] [-x <value>] [-m <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -m, --metadata=<value>    comma-separated list of metadata component names to include in the manifest
  -p, --sourcepath=<value>  comma-separated list of paths to the local source files from which the manifest
                            (package.xml) is generated
  -r, --rootdir=<value>     a source directory from which the manifest (package.xml) is generated
  -x, --manifest=<value>    [default: manifest/package.xml] output filepath to which the manifest (package.xml) is
                            written
  --loglevel=<option>       [default: info] logging level for this command invocation
                            <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

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

_See code: [src/commands/mdata/manifest/align.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/manifest/align.ts)_

## `sf mdata manifest sort`

sort alphabetically the components in a manifest (package.xml) file

```
USAGE
  $ sf mdata manifest sort -x <value> [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -x, --manifest=<value>  (required) file path for manifest (package.xml) of components to sort
  --loglevel=<option>     [default: info] logging level for this command invocation
                          <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To sort the components of a manifest file
      $ sfdx mdata:manifest:sort -x manifest/package.xml
```

_See code: [src/commands/mdata/manifest/sort.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/manifest/sort.ts)_

## `sf mdata patch`

patches source metadata files in order to solve common Salesforce deployment bugs or to modifly on the fly API endpoints

```
USAGE
  $ sf mdata patch [--json] [-e <value>] [-r <value>] [-m <value>] [-s <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -e, --env=<value>           [default: default] Environment name used to select the correct patch set from
                              sfdx-project.json
  -m, --mdapimapfile=<value>  file with JSON that maps workspaces files (using source structure) to mdapi files. Not
                              intended to be used when invoked directly, but when invoked by CLI Pre Deploy Hook.
  -r, --rootdir=<value>       the input directory that contains the source files to be patched
  -s, --subpath=<value>       [default: main/default] Optional subpath(s) between the root dir and the actual sources
                              dir (where the profiles/, classes/, etc. are stored)
  --loglevel=<option>         [default: info] logging level for this command invocation
                              <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/mdata/patch.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/patch.ts)_

## `sf mdata permset retrieve`

retrieve one or more profiles in a project considering all the rest of sources

```
USAGE
  $ sf mdata permset retrieve [--json] [-r <value>] [-p <value>] [-u <value>] [-x <value>] [-m <value>] [-d <value>]
    [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -d, --outdir=<value>          output directory to store the retrieved permission sets
  -m, --permsets=<value>        comma-separated list of permission sets names to retrieve (by default they are all
                                retrieved according to what is found in sources/root dir/manifest)
  -p, --sourcepath=<value>      comma-separated list of paths to the local source files from to retrieve together with
                                permission sets
  -r, --rootdir=<value>         a source directory from which the components together with permission sets are retrieved
  -u, --targetusername=<value>  Username or alias of the target org
  -x, --manifest=<value>        [default: manifest/package.xml] manifest (package.xml) to retrieve
  --loglevel=<option>           [default: info] logging level for this command invocation
                                <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To retrieve the permission sets in the default package source directory
      $ sfdx mdata:permsets:retrieve

  To retrieve the permission sets in the default package source directory from a list of source directories
      $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3

  To retrieve the permission sets in the default package source directory from the default source directory together with components of another directory
      $ sfdx mdata:permsets:retrieve -r /path/to/root/dir

  To retrieve the permission sets in the default package source directory from a manifest (package.xml)
      $ sfdx mdata:permsets:retrieve -x manifest/package.xml

  To retrieve the permission sets in a specific output folder from the default source directory
      $ sfdx mdata:permsets:retrieve -d /path/to/out/dir

  To retrieve a specific list of permission sets in the default package source directory
      $ sfdx mdata:permsets:retrieve -m "MyCoolPermSet1,MyCoolPermSet2"
```

_See code: [src/commands/mdata/permset/retrieve.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/permset/retrieve.ts)_

## `sf mdata profile retrieve`

retrieve one or more profiles in a project considering all the rest of sources

```
USAGE
  $ sf mdata profile retrieve [--json] [-r <value>] [-p <value>] [-u <value>] [-x <value>] [-m <value>] [-d <value>]
    [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -d, --outdir=<value>          output directory to store the retrieved profiles
  -m, --profiles=<value>        comma-separated list of profile names to retrieve (by default they are all retrieved
                                according to what is found in sources/root dir/manifest)
  -p, --sourcepath=<value>      comma-separated list of paths to the local source files from to retrieve together with
                                profiles
  -r, --rootdir=<value>         a source directory from which the components together with profiles are retrieved
  -u, --targetusername=<value>  Username or alias of the target org
  -x, --manifest=<value>        [default: manifest/package.xml] manifest (package.xml) to retrieve
  --loglevel=<option>           [default: info] logging level for this command invocation
                                <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To retrieve the profiles in the default package source directory
      $ sfdx mdata:permsets:retrieve

  To retrieve the profiles in the default package source directory from a list of source directories
      $ sfdx mdata:permsets:retrieve -p /path/to/source1,/path/to/source2,/path/to/source3

  To retrieve the profiles in the default package source directory from the default source directory together with components of another directory
      $ sfdx mdata:permsets:retrieve -r /path/to/root/dir

  To retrieve the profiles in the default package source directory from a manifest (package.xml)
      $ sfdx mdata:permsets:retrieve -x manifest/package.xml

  To retrieve the profiles in a specific output folder from the default source directory
      $ sfdx mdata:permsets:retrieve -d /path/to/out/dir

  To retrieve a specific list of profiles in the default package source directory
      $ sfdx mdata:permsets:retrieve -m "Admin,Read Only,Custom: Sales Profile"
```

_See code: [src/commands/mdata/profile/retrieve.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/profile/retrieve.ts)_

## `sf mdata statecountry configure`

configure new and/or existing Country and State Picklist values from an Excel file mapping using Selenium Webdriver

```
USAGE
  $ sf mdata statecountry configure -f <value> [--json] [-c skip|rename] [-v] [-m <value>] [-u <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -c, --conflictspolicy=<option>  [default: skip] specify the policy to use in resolving conflicts with existing Country
                                  and / or State codes with different labels. Use "skip" to ignore the change proposed
                                  in the Excel file and keep the value already in the Org as it is. Use "rename" to edit
                                  the existing value in the Org with the label supplied in the Excel file
                                  <options: skip|rename>
  -f, --mappingpath=<value>       (required) Excel file containing the mappings of Countries and States to configure in
                                  the target Org
  -m, --mdatafile=<value>         file path to an existing AddressSettings file to determine possible conflicts between
                                  the configuration in the target Org and the mapping supplied in the Excel file. If not
                                  specified a fresh one is retrieved from the target Org
  -u, --targetusername=<value>    Username or alias of the target org
  -v, --check                     specify the policy to use in resolving conflicts with existing Country and / or State
                                  codes with different labels. Use "skip" to ignore the change proposed in the Excel
                                  file and keep the value already in the Org as it is. Use "rename" to edit the existing
                                  value in the Org with the label supplied in the Excel file
  --loglevel=<option>             [default: info] logging level for this command invocation
                                  <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To configure the State / Country Picklist from an Excel file in the current default org
      $ sfdx mdata:statecountry:configure -f /path/to/state/country/to/configure.xlsx
```

_See code: [src/commands/mdata/statecountry/configure.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/statecountry/configure.ts)_

## `sf mdata statecountry template`

generate an Excel file template from the currently configured Country and State picklist in the target Org

```
USAGE
  $ sf mdata statecountry template -p <value> [--json] [-m <value>] [-u <value>] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -m, --mdatafile=<value>       file path to an existing AddressSettings file to determine possible conflicts between
                                the configuration in the target Org and the mapping supplied in the Excel file. If not
                                specified a fresh one is retrieved from the target Org
  -p, --outputpath=<value>      (required) File path where the resulting Excel file will be written to
  -u, --targetusername=<value>  Username or alias of the target org
  --loglevel=<option>           [default: info] logging level for this command invocation
                                <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  To generate an Excel template of the State / Country Picklist currently configured in the current default org
      $ sfdx mdata:statecountry:template -o /path/to/template/to/generate.xlsx
```

_See code: [src/commands/mdata/statecountry/template.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/statecountry/template.ts)_

## `sf mdata translations convert`

converts a translation file from one format to another (e.g. from Salesforce Translation Format (STF) to Excel or viceversa)

```
USAGE
  $ sf mdata translations convert -f stf|xlsx -t stf|xlsx -i <value> -d <value> [--json] [-m <value>] [-s <value>] [-r <value>]
    [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -d, --outfile=<value>       (required) Path of the output file
  -f, --from=<option>         (required) Format of the source file
                              <options: stf|xlsx>
  -i, --infile=<value>        (required) Path of the input file
  -m, --metadata=<value>      Comma-separated list of metadata component names
  -r, --rowheadernum=<value>  [default: 1] Index (starts from 1) of the row that contains the header
  -s, --sheets=<value>        Comma-separated list of XLSX sheet names
  -t, --to=<option>           (required) Format of the destination file
                              <options: stf|xlsx>
  --loglevel=<option>         [default: info] logging level for this command invocation
                              <options: trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL>

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/mdata/translations/convert.ts](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.9.0/src/commands/mdata/translations/convert.ts)_
<!-- commandsstop -->
