sfdx-metadata-patcher
=====================

A Salesforce DX Plugin to hotpatch metadata before deployments

[![Version](https://img.shields.io/npm/v/sfdx-metadata-patcher.svg)](https://npmjs.org/package/sfdx-metadata-patcher)
[![CircleCI](https://circleci.com/gh/ImperiumMaximus/sfdx-metadata-patcher/tree/master.svg?style=shield)](https://circleci.com/gh/ImperiumMaximus/sfdx-metadata-patcher/tree/master)
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
## Usage
```sh-session
$ sfdx mdata:patch --help
```
## Commands
<!-- commands -->
* [`sfdx mdata:apex:testdependencies -m <string> [-n <string>] [-d <number>] [-j <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdataapextestdependencies--m-string--n-string--d-number--j-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:communities:publish [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatacommunitiespublish--n-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatapatch--e-string--r-string--m-string--s-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx mdata:translations:convert -f <string> -t <string> -i <string> -o <string> [-m <string>] [-s <string>] [-r <number>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatatranslationsconvert--f-string--t-string--i-string--o-string--m-string--s-string--r-number---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx mdata:apex:testdependencies -m <string> [-n <string>] [-d <number>] [-j <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

computes the list of (statically) dependant Apex Test Classes to a list of Apex Classes supplied in input up to a certain depth

```
computes the list of (statically) dependant Apex Test Classes to a list of Apex Classes supplied in input up to a certain depth

USAGE
  $ sfdx mdata:apex:testdependencies -m <string> [-n <string>] [-d <number>] [-j <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --depth=depth                                                                 how many iterations to perform while
                                                                                    navigating the tree of dependencies

  -j, --javabinary=javabinary                                                       path of java executable

  -m, --metadata=metadata                                                           (required) comma-separated list of
                                                                                    Apex Class names

  -n, --nameconv=nameconv                                                           [default: Test] naming convention to
                                                                                    apply to generate Apex Class Test
                                                                                    names

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: info] logging level for
                                                                                    this command invocation

EXAMPLES
  To find all test dependecies for a class in a SFDX project:
       $ sfdx mdata:apex:testdependencies -m foo.cls
  To find all test dependecies for multiple classes in a SFDX project:
       $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls
  To find all test dependecies up to a certain depth for multiple classes in a SFDX project:
       $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls -d 1
  To find all test dependecies up to a certain depth for multiple classes in a SFDX project using a specific java 
  version:
       $ sfdx mdata:apex:testdependencies -m foo.cls,bar.cls -d 1 -j /opt/my_cool_java_version/bin/java
```

_See code: [lib/commands/mdata/apex/testdependencies.js](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.9/lib/commands/mdata/apex/testdependencies.js)_

## `sfdx mdata:communities:publish [-n <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

publishes one or more Experience Cloud communities

```
publishes one or more Experience Cloud communities

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

_See code: [lib/commands/mdata/communities/publish.js](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.9/lib/commands/mdata/communities/publish.js)_

## `sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

patches source metadata files in order to solve common Salesforce deployment bugs or to modifly on the fly API endpoints

```
patches source metadata files in order to solve common Salesforce deployment bugs or to modifly on the fly API endpoints

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

_See code: [lib/commands/mdata/patch.js](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.9/lib/commands/mdata/patch.js)_

## `sfdx mdata:translations:convert -f <string> -t <string> -i <string> -o <string> [-m <string>] [-s <string>] [-r <number>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

converts a translation file from one format to another (e.g. from Salesforce Translation Format (STF) to Excel or viceversa)

```
converts a translation file from one format to another (e.g. from Salesforce Translation Format (STF) to Excel or viceversa)

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

_See code: [lib/commands/mdata/translations/convert.js](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.9/lib/commands/mdata/translations/convert.js)_
<!-- commandsstop -->
