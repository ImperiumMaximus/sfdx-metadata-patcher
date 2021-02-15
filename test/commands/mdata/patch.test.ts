import { expect, test } from '@salesforce/command/lib/test';
import { Messages } from '@salesforce/core';
import { testSetup } from '@salesforce/core/lib/testSetup';
//import { AnyFunction } from '@salesforce/ts-types';
import { SfdxProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { glob } from 'glob';
import * as fs from 'fs';//import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

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
  })

  describe('patch profile', () => {

    test
      .do(() => {
        stubMethod($$.SANDBOXES.PROJECT, SfdxProject.prototype, 'resolveProjectConfig').callsFake(() => { return {
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
                  "main/default/profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules", "ManageRecommendationStrategies"]
                  }
                },
                "devShared": {
                  "main/default/profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules"]
                  }
                }
              }
            }
          }
        });
      })
      .stdout()
      .command(['mdata:patch', '-e', 'default'])
      .it('runs mdata:patch -e default', ctx => {
        expect(ctx.stdout).to.contain('');
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
                  "main/default/profiles/*": {
                    "where": "Profile",
                    "deletePermissionBlocks": ["ManageSearchPromotionRules"]
                  }
                }
              }
            }
          }
        });
        stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
          cb(null, ['force-app/main/default/profiles/Admin.profile-meta.xml', 'force-app/main/default/profiles/Custom%3A Sales Profile.profile-meta.xml'])
        })
        const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

        readFileSyncStub.callsFake((path: string) => {
          if (path.startsWith('force-app/main/default')) {
            return readFileSyncStub.wrappedMethod.call(this, path.replace('force-app/main/default', __dirname + '/../../data'))
          } else {
            return ""
          }
        })
      })
      .stdout()
      .command(['mdata:patch', '-e', 'devShared'])
      .it('runs mdata:patch -e devShared', ctx => {
        expect(ctx.stdout).to.contain('');
      });
  })


});
