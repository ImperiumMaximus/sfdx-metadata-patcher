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
* [`sfdx mdata:patch [-e <string>] [-r <string>] [-m <string>] [-s <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-mdatapatch--e-string--r-string--m-string--s-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

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

_See code: [lib/commands/mdata/patch.js](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.5/lib/commands/mdata/patch.js)_
<!-- commandsstop -->

<!-- examples -->
## Sample sfdx-project.json
```javascript
  {
    "packageDirectories": [
      {
        "path": "force-app",
        "default": true
      }
    ],
    "namespace": "",
    "sfdcLoginUrl": "https://login.salesforce.com",
    "sourceApiVersion": "50.0",
    "plugins": {
      "mdataPatches": {
        "hook": true,
        "default": {
          "sites/*": {
            "where": "CustomSite",
            "replace": {
              "siteAdmin": "replacedUserName@myCoolDomain.com",
              "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
            },
            "filter": ["siteAdmin", "siteGuestRecordDefaultOwner"]
          },
          "profiles/Admin.profile-meta.xml": {
            "where": "Profile",
            "deleteFieldPermissions": ["Account.Active__c", "Account.CustomerPriority__c"],
            "disablePermissions": ["ManageSearchPromotionRules", "ManageSandboxes"]
          }
        },
        "uat": {
          "sites/*": {
            "where": "CustomSite",
            "concat": [{ testConcat: ["sampleString"] }, { testConcatNested: [{ nestedTag: ["coolString"] }] }],
            "replace": {
              "siteAdmin": "replacedUserName@myCoolDomain.com",
              "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
            }
          },
          "profiles/*": {
            "where": "Profile",
            "disableObjects": ["Product2", "TestSharing__c"],
            "enableTabs": ["standard-Contact", "TestSharing__c"],
            "disableApplications": ["standard__LightningSales", "standard__ServiceConsole"],
            "disableTabs": ["standard-Contact", "CustomObject__c"],
            "deletePermissionBlocks": ["ManageSearchPromotionRules", "SelectFilesFromSalesforce"]
          }
        }
      }
    }
  }
```
_See schema definition: [docs/README.md](https://github.com/ImperiumMaximus/sfdx-metadata-patcher/blob/v0.0.5/docs/README.md)_
<!-- examplesstop -->

## Pre Deploy Hook
By setting ```plugins.mdataPatches.hook = true``` in ```sfdx-project.json```, a pre deploy hook for the commands ```sfdx force:source:deploy``` and ```sfdx force:source:push``` will be installed. This means that the fixes will be applied transparently everytime you perform a deployment from your IDE without even bothering to manually patch your metadata! The environment name (```-e``` switch) will be inferred based on the alias of your current default org set in the Salesforce CLI. 

_See official Salesforce CLI documentation: [Create a Salesforce Hook](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks_steps.htm)_
