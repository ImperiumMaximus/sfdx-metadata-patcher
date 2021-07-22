import { expect, test } from '@salesforce/command/lib/test';
import { Messages } from '@salesforce/core';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { SfdxProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const $$ = testSetup()

describe('mdata:patch', () => {
  describe('empty config', () => {
    test
      .stdout()
      .command(['mdata:patch', '-e', 'default'])
      .it('should return a warning message', ctx => {
        expect(ctx.stdout).to.contain(messages.getMessage('metadata.patch.warns.missingConfiguration'));
      });
  });

  describe('patch profile', () => {

    let writeFileSyncStub;
    const commonStubs = function () {
      stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
        cb(null, [path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'), path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml')])
      })
      const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

      readFileSyncStub.callsFake((filePath: string) => {
        if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
          return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app')));
        } else {
          return ""
        }
      })

      writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/NonExistent.profile-meta.xml": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "ViewEventLogFiles"]
                  }
                },
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ShowCompanyNameAsUserBadge"]
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'default'])
      .it('runs mdata:patch on a non-existent file with the default environment name', ctx => {
        expect(ctx.stdout).to.contain(messages.getMessage('metadata.patch.warns.missingFile', [path.join('force-app', 'main', 'default', 'profiles', 'NonExistent.profile-meta.xml')]));
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "ViewEventLogFiles"]
                  }
                },
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ShowCompanyNameAsUserBadge"]
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'default'])
      .it('runs mdata:patch removing userPermissions with the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageReportsInPubFolders</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageSearchPromotionRules</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ViewEventLogFiles</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SubmitMacrosAllowed</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ViewEventLogFiles</name>
    </userPermissions>`);
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "SelectFilesFromSalesforce"]
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch removing userPermissions with a specific environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageReportsInPubFolders</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageSearchPromotionRules</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SubmitMacrosAllowed</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SelectFilesFromSalesforce</name>
    </userPermissions>`);
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "devShared": {
                  "profiles/Admin.profile-meta.xml": {
                    "where": "Profile",
                    "disablePermissions": ["ManageSearchPromotionRules", "ManageSandboxes"]
                  },
                  "profiles/Custom%3A Sales Profile.profile-meta.xml": {
                    "where": "Profile",
                    "disablePermissions": ["UseWebLink", "ManageSearchPromotionRules"]
                  }
                }
              }
            }
          }
        });
        const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
        existsSyncStub.callsFake((path: string) => {
          if (path.includes('.profile-meta.xml')) {
            return true;
          }
          return existsSyncStub.wrappedMethod.call(this, path);
        })
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch disabling user permissions with a specific environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>false</enabled>
        <name>ManageReportsInPubFolders</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<userPermissions>
        <enabled>false</enabled>
        <name>ManageSandboxes</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<userPermissions>
        <enabled>false</enabled>
        <name>UseWebLink</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<userPermissions>
        <enabled>false</enabled>
        <name>ManageSearchPromotionRules</name>
    </userPermissions>`);
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deleteFieldPermissions": ["Account.Active__c", "Account.CustomerPriority__c"]
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch removing field permissions with a specific environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<fieldPermissions>
        <editable>true</editable>
        <field>Account.Active__c</field>
        <readable>true</readable>
    </fieldPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<fieldPermissions>
            <editable>true</editable>
            <field>Account.CustomerPriority__c</field>
            <readable>true</readable>
        </fieldPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<fieldPermissions>
        <editable>false</editable>
        <field>Account.Tradestyle</field>
        <readable>true</readable>
    </fieldPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<fieldPermissions>
        <editable>true</editable>
        <field>Account.Active__c</field>
        <readable>true</readable>
    </fieldPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<fieldPermissions>
        <editable>true</editable>
        <field>Account.CustomerPriority__c</field>
        <readable>true</readable>
    </fieldPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<fieldPermissions>
        <editable>false</editable>
        <field>Account.Tradestyle</field>
        <readable>true</readable>
    </fieldPermissions>`);
      })


    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "disableTabs": ["standard-Contact", "CustomObject__c"]
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch'])
      .it('runs mdata:patch disabling tabs with the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<tabVisibilities>
        <tab>standard-Account</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<tabVisibilities>
        <tab>standard-Contact</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<tabVisibilities>
        <tab>CustomObject__c</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<tabVisibilities>
        <tab>standard-Account</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<tabVisibilities>
        <tab>standard-Contact</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<tabVisibilities>
        <tab>CustomObject__c</tab>
        <visibility>Hidden</visibility>
    </tabVisibilities>`);
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "disableApplications": ["standard__LightningSales", "standard__ServiceConsole"]
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch'])
      .it('runs mdata:patch disabling apps with the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<applicationVisibilities>
        <application>standard__LightningSales</application>
        <default>false</default>
        <visible>false</visible>
    </applicationVisibilities>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<applicationVisibilities>
        <application>standard__ServiceConsole</application>
        <default>false</default>
        <visible>false</visible>
    </applicationVisibilities>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.contain(`<applicationVisibilities>
        <application>standard__LightningSales</application>
        <default>false</default>
        <visible>false</visible>
    </applicationVisibilities>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<applicationVisibilities>
        <application>standard__ServiceConsole</application>
        <default>false</default>
        <visible>false</visible>
    </applicationVisibilities>`);
      });


    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "enableTabs": ["standard-Contact", "TestSharing__c"]
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch'])
      .it('runs mdata:patch enabling tabs with the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<tabVisibilities>
        <tab>TestSharing__c</tab>
        <visibility>DefaultOn</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<tabVisibilities>
        <tab>standard-Contact</tab>
        <visibility>DefaultOn</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<tabVisibilities>
        <tab>TestSharing__c</tab>
        <visibility>DefaultOn</visibility>
    </tabVisibilities>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<tabVisibilities>
        <tab>standard-Contact</tab>
        <visibility>DefaultOn</visibility>
    </tabVisibilities>`);
      });


    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "disableObjects": ["Product2", "TestSharing__c"]
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch'])
      .it('runs mdata:patch disabling objects with the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>false</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>TestSharing__c</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>false</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Product2</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.contain(`<objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>false</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>TestSharing__c</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<objectPermissions>
        <allowCreate>false</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>false</allowEdit>
        <allowRead>false</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Product2</object>
        <viewAllRecords>false</viewAllRecords>
    </objectPermissions>`);
      });
  });

  describe('multiple patches', () => {
    let writeFileSyncStub;
    let writtenFiles = {};
    const commonStubs = function () {
      stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
        cb(null, [path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'), path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml')])
      })
      const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

      readFileSyncStub.callsFake((filePath: string) => {
        if (Object.prototype.hasOwnProperty.call(writtenFiles, filePath)) {
          return writtenFiles[filePath];
        } else if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
          return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app')))
        } else {
          return ""
        }
      })

      writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
      writeFileSyncStub.callsFake((filePath: string, contents: string | Object) => {
        if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
          writtenFiles[filePath] = contents;
        }
      })
    }

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "SelectFilesFromSalesforce"]
                  }
                },
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "SelectFilesFromSalesforce"]
                  },
                  "profiles/Admin.profile-meta.xml": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["RunReports"]
                  }
                }
              }
            }
          }
        });
        const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
        existsSyncStub.callsFake((filePath: string) => {
          if (filePath.includes('.profile-meta.xml')) {
            return true;
          }
          return existsSyncStub.wrappedMethod.call(this, filePath);
        })
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch on Admin profile with different fixes for the same file', ctx => {
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
        expect(writeFileSyncStub.args[1][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SelectFilesFromSalesforce</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>RunReports</name>
    </userPermissions>`);

        expect(writeFileSyncStub.args[2][0]).to.contain(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
        expect(writeFileSyncStub.args[2][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageSearchPromotionRules</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[2][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SelectFilesFromSalesforce</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[2][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>RunReports</name>
    </userPermissions>`);
      });

  });

  describe('patch sites', () => {

    let writeFileSyncStub;
    const commonStubs = function () {
      stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
        cb(null, [path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml')])
      })
      const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

      readFileSyncStub.callsFake((filePath: string) => {
        if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
          return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app')))
        } else {
          return ""
        }
      })

      writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
    }

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "sites/*": {
                    "where": "CustomSite",
                    "replace": {
                      "siteAdmin": "replacedUserName@myCoolDomain.com",
                      "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
                    }
                  }
                },
                "devShared": {
                  "sites/*": {
                    "where": "CustomSite",
                    "replace": {
                      "siteAdmin": "replacedUserName@myCoolDomain.com.devShared",
                      "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com.devShared",
                    }
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'default'])
      .it('runs mdata:patch on CustomSite by replacing usernames using the default environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteAdmin>fakeSiteAdmin@myCoolDomain.com</siteAdmin>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteGuestRecordDefaultOwner>fakeSiteAdmin@myCoolDomain.com</siteGuestRecordDefaultOwner>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<siteAdmin>replacedUserName@myCoolDomain.com</siteAdmin>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<siteGuestRecordDefaultOwner>replacedUserName2@myCoolDomain.com</siteGuestRecordDefaultOwner>`);
      });

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "sites/*": {
                    "where": "CustomSite",
                    "replace": {
                      "siteAdmin": "replacedUserName@myCoolDomain.com",
                      "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
                    }
                  }
                },
                "devShared": {
                  "sites/*": {
                    "where": "CustomSite",
                    "filter": ["siteAdmin", "siteGuestRecordDefaultOwner"]
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch on CustomSite by adding tags using the devShared environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteAdmin>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteGuestRecordDefaultOwner>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`</siteAdmin>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`</siteGuestRecordDefaultOwner>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteAdmin>fakeSiteAdmin@myCoolDomain.com</siteAdmin>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<siteGuestRecordDefaultOwner>fakeSiteAdmin@myCoolDomain.com</siteGuestRecordDefaultOwner>`);
      });

      test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "sites/*": {
                    "where": "CustomSite",
                    "replace": {
                      "siteAdmin": "replacedUserName@myCoolDomain.com",
                      "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
                    }
                  }
                },
                "devShared": {
                  "sites/*": {
                    "where": "CustomSite",
                    "concat": [{ testConcat: ["sampleString"] }, { testConcatNested: [{ nestedTag: ["coolString"] }] }]
                  }
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch on CustomSite by removing usernames using the devShared environment name', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
        expect(writeFileSyncStub.args[0][1]).to.contain(`<testConcat>sampleString</testConcat>`);
        expect(writeFileSyncStub.args[0][1]).to.contain(`<testConcatNested>
        <nestedTag>coolString</nestedTag>
    </testConcatNested>`)
      });
  });

  describe('patching hook', () => {
    let writeFileSyncStub;
    let writtenFiles = {}
    const commonStubs = function () {
      const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

      readFileSyncStub.callsFake((filePath: string) => {
        if (Object.prototype.hasOwnProperty.call(writtenFiles, filePath)) {
          return writtenFiles[filePath];
        } else if (filePath.startsWith('sdx_sourceDeploy_pkg_1613771557082')) {
          return readFileSyncStub.wrappedMethod.call(this, filePath.replace('sdx_sourceDeploy_pkg_1613771557082', path.join(__dirname, '..', '..', 'data', 'src')))
        } else if (filePath === 'mdapimap.json') {
          return readFileSyncStub.wrappedMethod.call(this, path.join(__dirname, '..', '..', 'data', 'src', filePath));
        } else {
          return "";
        }
      })

      writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync')
      writeFileSyncStub.callsFake((filePath: string, contents: string | Object) => {
        if (filePath.startsWith('sdx_sourceDeploy_pkg_1613771557082')) {
          writtenFiles[filePath] = contents;
        }
      })
    }

    test
      .do(() => {
        const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
        existsSyncStub.callsFake((filePath: string) => {
          if (filePath === 'mdapimap.json') {
            return true;
          }
          return existsSyncStub.wrappedMethod.call(this, filePath);
        })
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => {
          return {
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
                "default": {
                  "sites/*": {
                    "where": "CustomSite",
                    "replace": {
                      "siteAdmin": "replacedUserName@myCoolDomain.com",
                      "siteGuestRecordDefaultOwner": "replacedUserName2@myCoolDomain.com",
                    }
                  }
                },
                "devShared": {
                  "profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "SelectFilesFromSalesforce"]
                  },
                  "objects/**/*.object-meta.xml": {
                    "where": "CustomObject",
                    "replace": {
                      "externalSharingModel": "ReadOnly"
                    }
                  },
                  "objects/Account/Account.object-meta.xml": {
                    "where": "CustomObject",
                    "replace": {
                      "enableHistory": "true"
                    }
                  },
                  "objects/Account/fields/*": {
                    "where": "CustomField",
                    "replace": {
                      "label": "test replace"
                    }
                  },
                  "objects/Account/fields/Active__c.field-meta.xml": {
                    "where": "CustomField",
                    "replace": {
                      "required": "true"
                    }
                  },
                  "objects/Account/listViews/NewLastWeek.listView-meta.xml": {
                    "where": "ListView",
                    "replace": {
                      "label": "Old Last Week"
                    }
                  },
                  "objects/Account/webLinks/Billing.webLink-meta.xml": {
                    "where": "WebLink",
                    "replace": {
                      "url": "https://www.google.com"
                    }
                  },
                }
              }
            }
          }
        });
        commonStubs();
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared', '-r', 'sdx_sourceDeploy_pkg_1613771557082', '-s', '', '-m', 'mdapimap.json'])
      .it('runs mdata:patch as a pre deploy hook', ctx => {
        expect(writeFileSyncStub.args[0][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'profiles', 'Admin.profile'));
        expect(writeFileSyncStub.args[0][1]).to.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageReportsInPubFolders</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>ManageSearchPromotionRules</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[0][1]).to.not.contain(`<userPermissions>
        <enabled>true</enabled>
        <name>SelectFilesFromSalesforce</name>
    </userPermissions>`);
        expect(writeFileSyncStub.args[1][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.not.contain('<externalSharingModel>Private</externalSharingModel>');
        expect(writeFileSyncStub.args[7][1]).to.contain('<externalSharingModel>ReadOnly</externalSharingModel>');

        expect(writeFileSyncStub.args[2][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.not.contain('<enableHistory>false</enableHistory>');
        expect(writeFileSyncStub.args[7][1]).to.contain('<enableHistory>true</enableHistory>');

        expect(writeFileSyncStub.args[3][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.contain(`<fields>
        <fullName>Active__c</fullName>
        <externalId>false</externalId>
        <label>test replace</label>
        <required>true</required>
        <trackFeedHistory>false</trackFeedHistory>
        <type>Picklist</type>
        <valueSet>
            <valueSetDefinition>
                <sorted>false</sorted>
                <value>
                    <fullName>No</fullName>
                    <default>false</default>
                    <label>No</label>
                </value>
                <value>
                    <fullName>Yes</fullName>
                    <default>false</default>
                    <label>Yes</label>
                </value>
            </valueSetDefinition>
        </valueSet>
    </fields>`);
        expect(writeFileSyncStub.args[4][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.contain(`<fields>
        <fullName>CustomerPriority__c</fullName>
        <externalId>false</externalId>
        <label>test replace</label>
        <required>false</required>
        <trackFeedHistory>false</trackFeedHistory>
        <type>Picklist</type>
        <valueSet>
            <valueSetDefinition>
                <sorted>false</sorted>
                <value>
                    <fullName>High</fullName>
                    <default>false</default>
                    <label>High</label>
                </value>
                <value>
                    <fullName>Low</fullName>
                    <default>false</default>
                    <label>Low</label>
                </value>
                <value>
                    <fullName>Medium</fullName>
                    <default>false</default>
                    <label>Medium</label>
                </value>
            </valueSetDefinition>
        </valueSet>
    </fields>`);


        expect(writeFileSyncStub.args[6][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.not.contain(`<listViews>
        <fullName>NewLastWeek</fullName>
        <filterScope>Everything</filterScope>
        <filters>
            <field>ACCOUNT.CREATED_DATE</field>
            <operation>equals</operation>
            <value>LAST_WEEK</value>
        </filters>
        <label>New Last Week</label>
    </listViews>`);
        expect(writeFileSyncStub.args[7][1]).to.contain(`<listViews>
        <fullName>NewLastWeek</fullName>
        <filterScope>Everything</filterScope>
        <filters>
            <field>ACCOUNT.CREATED_DATE</field>
            <operation>equals</operation>
            <value>LAST_WEEK</value>
        </filters>
        <label>Old Last Week</label>
    </listViews>`);

        expect(writeFileSyncStub.args[7][0]).to.equal(path.join('sdx_sourceDeploy_pkg_1613771557082', 'objects', 'Account.object'));
        expect(writeFileSyncStub.args[7][1]).to.not.contain(`<webLinks>
        <fullName>Billing</fullName>
        <availability>online</availability>
        <displayType>link</displayType>
        <encodingKey>UTF-8</encodingKey>
        <hasMenubar>true</hasMenubar>
        <hasScrollbars>true</hasScrollbars>
        <hasToolbar>true</hasToolbar>
        <height>600</height>
        <isResizable>true</isResizable>
        <linkType>url</linkType>
        <masterLabel>Billing</masterLabel>
        <openType>newWindow</openType>
        <position>none</position>
        <protected>false</protected>
        <showsLocation>true</showsLocation>
        <showsStatus>true</showsStatus>
        <url>http://www.genwatt.com/genwatt/billing.htm?actname={!Account_Name}</url>
    </webLinks>`);
        expect(writeFileSyncStub.args[7][1]).to.contain(`<webLinks>
        <fullName>Billing</fullName>
        <availability>online</availability>
        <displayType>link</displayType>
        <encodingKey>UTF-8</encodingKey>
        <hasMenubar>true</hasMenubar>
        <hasScrollbars>true</hasScrollbars>
        <hasToolbar>true</hasToolbar>
        <height>600</height>
        <isResizable>true</isResizable>
        <linkType>url</linkType>
        <masterLabel>Billing</masterLabel>
        <openType>newWindow</openType>
        <position>none</position>
        <protected>false</protected>
        <showsLocation>true</showsLocation>
        <showsStatus>true</showsStatus>
        <url>https://www.google.com</url>
    </webLinks>`);
      });

  });
});
