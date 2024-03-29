import * as fs from 'node:fs'
import * as path from 'node:path'
import { expect } from 'chai';
import { Messages } from '@salesforce/core';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { SfProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { AnyJson } from '@salesforce/ts-types';
import { glob } from 'glob';
import Sinon = require('sinon');
import Patch from '../../../src/commands/mdata/patch';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('mdata:patch', () => {
    const $$ = new TestContext()
    let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

    beforeEach(() => {
        sfCommandStubs = stubSfCommandUx($$.SANDBOX);
    });

    afterEach(() => {
        $$.restore();
    });

    describe('empty config', () => {
        it('should return a warning message', async () => {
            try { await Patch.run(['-e', 'default']) } catch (err) { /* empty */ }
            const output = sfCommandStubs.warn
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');
            expect(output).to.contain(messages.getMessage('metadata.patch.warns.missingConfiguration'));
        });
    });


    describe('patch profile', () => {

        let writeFileSyncStub: Sinon.SinonStub;
        const commonStubs = function () {
            stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
                cb(null, [path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'), path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml')])
            })
            const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

            readFileSyncStub.callsFake((filePath: string, options) => {
                if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
                    return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app'))) as string;
                }

                return readFileSyncStub.wrappedMethod.call(this, filePath, options) as string;
            })

            writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
        }

        it('runs mdata:patch on a non-existent file with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/NonExistent.profile-meta.xml': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ManageSearchPromotionRules', 'ViewEventLogFiles']
                            }
                        },
                        'devShared': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ShowCompanyNameAsUserBadge']
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'default'])

            const output = sfCommandStubs.warn
                .getCalls()
                .flatMap((c) => c.args)
                .join('\n');

            expect(output).to.contain(messages.getMessage('metadata.patch.warns.missingFile', [path.join('force-app', 'main', 'default', 'profiles', 'NonExistent.profile-meta.xml')]));
        });

        it('runs mdata:patch removing userPermissions with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ManageSearchPromotionRules', 'ViewEventLogFiles']
                            }
                        },
                        'devShared': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ShowCompanyNameAsUserBadge']
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'default'])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.contain('<userPermissions><enabled>true</enabled><name>ManageReportsInPubFolders</name></userPermissions>');
            expect(resultingProfile1NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>ManageSearchPromotionRules</name></userPermissions>');
            expect(resultingProfile1NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>ViewEventLogFiles</name></userPermissions>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.contain('<userPermissions><enabled>true</enabled><name>SubmitMacrosAllowed</name></userPermissions>');
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>ViewEventLogFiles</name></userPermissions>');
        });

        it('runs mdata:patch removing userPermissions with a specific environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'devShared': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ManageSearchPromotionRules', 'SelectFilesFromSalesforce']
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.contain('<userPermissions><enabled>true</enabled><name>ManageReportsInPubFolders</name></userPermissions>');
            expect(resultingProfile1NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>ManageSearchPromotionRules</name></userPermissions>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.contain('<userPermissions><enabled>true</enabled><name>SubmitMacrosAllowed</name></userPermissions>');
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>SelectFilesFromSalesforce</name></userPermissions>');
        });


        it('runs mdata:patch disabling user permissions with a specific environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'devShared': {
                            'profiles/Admin.profile-meta.xml': {
                                'where': 'Profile',
                                'disablePermissions': ['ManageSearchPromotionRules', 'ManageSandboxes']
                            },
                            'profiles/Custom%3A Sales Profile.profile-meta.xml': {
                                'where': 'Profile',
                                'disablePermissions': ['UseWebLink', 'ManageSearchPromotionRules']
                            }
                        }
                    }
                }
            }));
            const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
            existsSyncStub.callsFake((_path: string) => {
                if (_path.includes('.profile-meta.xml')) {
                    return true;
                }
                return existsSyncStub.wrappedMethod.call(this, _path) as boolean;
            })
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');


            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<userPermissions><enabled>false</enabled><name>ManageReportsInPubFolders</name></userPermissions>');
            expect(resultingProfile1NoSpaces).to.contain('<userPermissions><enabled>false</enabled><name>ManageSandboxes</name></userPermissions>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>false</enabled><name>UseWebLink</name></userPermissions>');
            expect(resultingProfile2NoSpaces).to.contain('<userPermissions><enabled>false</enabled><name>ManageSearchPromotionRules</name></userPermissions>');
        });


        it('runs mdata:patch removing field permissions with a specific environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'devShared': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deleteFieldPermissions': ['Account.Active__c', 'Account.CustomerPriority__c']
                            },
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<fieldPermissions><editable>true</editable><field>Account.Active__c</field><readable>true</readable></fieldPermissions>');
            expect(resultingProfile1NoSpaces).to.not.contain('<fieldPermissions><editable>true</editable><field>Account.CustomerPriority__c</field><readable>true</readable></fieldPermissions>');
            expect(resultingProfile1NoSpaces).to.contain('<fieldPermissions><editable>false</editable><field>Account.Tradestyle</field><readable>true</readable></fieldPermissions>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.not.contain('<fieldPermissions><editable>true</editable><field>Account.Active__c</field><readable>true</readable></fieldPermissions>');
            expect(resultingProfile2NoSpaces).to.not.contain('<fieldPermissions><editable>true</editable><field>Account.CustomerPriority__c</field><readable>true</readable></fieldPermissions>');
            expect(resultingProfile2NoSpaces).to.contain('<fieldPermissions><editable>false</editable><field>Account.Tradestyle</field><readable>true</readable></fieldPermissions>');
        })

        it('runs mdata:patch disabling tabs with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'disableTabs': ['standard-Contact', 'CustomObject__c']
                            },
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run([])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<tabVisibilities><tab>standard-Account</tab><visibility>Hidden</visibility></tabVisibilities>');
            expect(resultingProfile1NoSpaces).to.contain('<tabVisibilities><tab>standard-Contact</tab><visibility>Hidden</visibility></tabVisibilities>');
            expect(resultingProfile1NoSpaces).to.contain('<tabVisibilities><tab>CustomObject__c</tab><visibility>Hidden</visibility></tabVisibilities>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.not.contain('<tabVisibilities><tab>standard-Account</tab><visibility>Hidden</visibility></tabVisibilities>');
            expect(resultingProfile2NoSpaces).to.contain('<tabVisibilities><tab>standard-Contact</tab><visibility>Hidden</visibility></tabVisibilities>');
            expect(resultingProfile2NoSpaces).to.contain('<tabVisibilities><tab>CustomObject__c</tab><visibility>Hidden</visibility></tabVisibilities>');
        });


        it('runs mdata:patch disabling apps with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'disableApplications': ['standard__LightningSales', 'standard__ServiceConsole']
                            },
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run([])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<applicationVisibilities><application>standard__LightningSales</application><default>false</default><visible>false</visible></applicationVisibilities>');
            expect(resultingProfile1NoSpaces).to.contain('<applicationVisibilities><application>standard__ServiceConsole</application><default>false</default><visible>false</visible></applicationVisibilities>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.contain('<applicationVisibilities><application>standard__LightningSales</application><default>false</default><visible>false</visible></applicationVisibilities>');
            expect(resultingProfile2NoSpaces).to.contain('<applicationVisibilities><application>standard__ServiceConsole</application><default>false</default><visible>false</visible></applicationVisibilities>');
        });


        it('runs mdata:patch enabling tabs with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'enableTabs': ['standard-Contact', 'TestSharing__c']
                            },
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run([])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<tabVisibilities><tab>TestSharing__c</tab><visibility>DefaultOn</visibility></tabVisibilities>');
            expect(resultingProfile1NoSpaces).to.contain('<tabVisibilities><tab>standard-Contact</tab><visibility>DefaultOn</visibility></tabVisibilities>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.not.contain('<tabVisibilities><tab>TestSharing__c</tab><visibility>DefaultOn</visibility></tabVisibilities>');
            expect(resultingProfile2NoSpaces).to.contain('<tabVisibilities><tab>standard-Contact</tab><visibility>DefaultOn</visibility></tabVisibilities>');
        });


        it('runs mdata:patch disabling objects with the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'disableObjects': ['Product2', 'TestSharing__c']
                            },
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run([])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete><allowEdit>false</allowEdit><allowRead>false</allowRead><modifyAllRecords>false</modifyAllRecords><object>TestSharing__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>');
            expect(resultingProfile1NoSpaces).to.contain('<objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete><allowEdit>false</allowEdit><allowRead>false</allowRead><modifyAllRecords>false</modifyAllRecords><object>Product2</object><viewAllRecords>false</viewAllRecords></objectPermissions>');
            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.contain('<objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete><allowEdit>false</allowEdit><allowRead>false</allowRead><modifyAllRecords>false</modifyAllRecords><object>TestSharing__c</object><viewAllRecords>false</viewAllRecords></objectPermissions>');
            expect(resultingProfile2NoSpaces).to.contain('<objectPermissions><allowCreate>false</allowCreate><allowDelete>false</allowDelete><allowEdit>false</allowEdit><allowRead>false</allowRead><modifyAllRecords>false</modifyAllRecords><object>Product2</object><viewAllRecords>false</viewAllRecords></objectPermissions>');
        });
    });

    describe('multiple patches', () => {
        let writeFileSyncStub: Sinon.SinonStub;
        const writtenFiles: {
            [key: string]: string | AnyJson;
        } = {};
        const commonStubs = function () {
            stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
                cb(null, [path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'), path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml')])
            })
            const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

            readFileSyncStub.callsFake((filePath: string, options) => {
                if (Object.prototype.hasOwnProperty.call(writtenFiles, filePath)) {
                    return writtenFiles[filePath];
                } else if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
                    return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app'))) as string
                }

                return readFileSyncStub.wrappedMethod.call(this, filePath, options) as string;
            })

            writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
            writeFileSyncStub.callsFake((filePath: string, contents: string | AnyJson) => {
                if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
                    writtenFiles[filePath] = contents;
                }
            })
        }

        it('runs mdata:patch on Admin profile with different fixes for the same file', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ManageSearchPromotionRules', 'SelectFilesFromSalesforce']
                            }
                        },
                        'devShared': {
                            'profiles/*': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['ManageSearchPromotionRules', 'SelectFilesFromSalesforce']
                            },
                            'profiles/Admin.profile-meta.xml': {
                                'where': 'Profile',
                                'deletePermissionBlocks': ['RunReports']
                            }
                        }
                    }
                }
            }));
            const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
            existsSyncStub.callsFake((filePath: string) => {
                if (filePath.includes('.profile-meta.xml')) {
                    return true;
                }
                return existsSyncStub.wrappedMethod.call(this, filePath) as boolean;
            })
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            const resultingProfile1NoSpaces = (writeFileSyncStub.args[1][1] as string).replace(/\s+/gi, '');
            const resultingProfile2NoSpaces = (writeFileSyncStub.args[2][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[1][0]).to.equal(path.join('force-app', 'main', 'default', 'profiles', 'Custom%3A Sales Profile.profile-meta.xml'));
            expect(resultingProfile1NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>SelectFilesFromSalesforce</name></userPermissions>');
            expect(resultingProfile1NoSpaces).to.contain('<userPermissions><enabled>true</enabled><name>RunReports</name></userPermissions>');

            expect(writeFileSyncStub.args[2][0]).to.contain(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>ManageSearchPromotionRules</name></userPermissions>');
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>SelectFilesFromSalesforce</name></userPermissions>');
            expect(resultingProfile2NoSpaces).to.not.contain('<userPermissions><enabled>true</enabled><name>RunReports</name></userPermissions>');
        });

    });


    describe('patch sites', () => {

        let writeFileSyncStub: Sinon.SinonStub;
        const commonStubs = function () {
            stubMethod($$.SANDBOX, glob, 'glob').callsFake((pattern: string, cb: (err: Error | null, matches: string[]) => void) => {
                cb(null, [path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml')])
            })
            const readFileSyncStub = stubMethod($$.SANDBOX, fs, 'readFileSync')

            readFileSyncStub.callsFake((filePath: string, options) => {
                if (filePath.startsWith(path.join('force-app', 'main', 'default'))) {
                    return readFileSyncStub.wrappedMethod.call(this, filePath.replace(path.join('force-app', 'main', 'default'), path.join(__dirname, '..', '..', 'data', 'force-app'))) as string
                }

                return readFileSyncStub.wrappedMethod.call(this, filePath, options) as string;
            })

            writeFileSyncStub = stubMethod($$.SANDBOX, fs, 'writeFileSync');
        }

        it('runs mdata:patch on CustomSite by replacing usernames using the default environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'replace': {
                                    'siteAdmin': 'replacedUserName@myCoolDomain.com',
                                    'siteGuestRecordDefaultOwner': 'replacedUserName2@myCoolDomain.com',
                                }
                            }
                        },
                        'devShared': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'replace': {
                                    'siteAdmin': 'replacedUserName@myCoolDomain.com.devShared',
                                    'siteGuestRecordDefaultOwner': 'replacedUserName2@myCoolDomain.com.devShared',
                                }
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'default'])

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteAdmin>fakeSiteAdmin@myCoolDomain.com</siteAdmin>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteGuestRecordDefaultOwner>fakeSiteAdmin@myCoolDomain.com</siteGuestRecordDefaultOwner>');
            expect(writeFileSyncStub.args[0][1]).to.contain('<siteAdmin>replacedUserName@myCoolDomain.com</siteAdmin>');
            expect(writeFileSyncStub.args[0][1]).to.contain('<siteGuestRecordDefaultOwner>replacedUserName2@myCoolDomain.com</siteGuestRecordDefaultOwner>');
        });

        it('runs mdata:patch on CustomSite by adding tags using the devShared environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'replace': {
                                    'siteAdmin': 'replacedUserName@myCoolDomain.com',
                                    'siteGuestRecordDefaultOwner': 'replacedUserName2@myCoolDomain.com',
                                }
                            }
                        },
                        'devShared': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'filter': ['siteAdmin', 'siteGuestRecordDefaultOwner']
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteAdmin>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteGuestRecordDefaultOwner>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('</siteAdmin>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('</siteGuestRecordDefaultOwner>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteAdmin>fakeSiteAdmin@myCoolDomain.com</siteAdmin>');
            expect(writeFileSyncStub.args[0][1]).to.not.contain('<siteGuestRecordDefaultOwner>fakeSiteAdmin@myCoolDomain.com</siteGuestRecordDefaultOwner>');
        });

        it('runs mdata:patch on CustomSite by removing usernames using the devShared environment name', async () => {
            stubMethod($$.SANDBOXES.PROJECT, SfProject.prototype, 'resolveProjectConfig').callsFake(() => ({
                'packageDirectories': [
                    {
                        'path': 'force-app',
                        'default': true
                    }
                ],
                'namespace': '',
                'sfdcLoginUrl': 'https://login.salesforce.com',
                'sourceApiVersion': '50.0',
                'plugins': {
                    'mdataPatches': {
                        'default': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'replace': {
                                    'siteAdmin': 'replacedUserName@myCoolDomain.com',
                                    'siteGuestRecordDefaultOwner': 'replacedUserName2@myCoolDomain.com',
                                }
                            }
                        },
                        'devShared': {
                            'sites/*': {
                                'where': 'CustomSite',
                                'concat': [{ testConcat: ['sampleString'] }, { testConcatNested: [{ nestedTag: ['coolString'] }] }]
                            }
                        }
                    }
                }
            }));
            commonStubs();

            await Patch.run(['-e', 'devShared'])

            const resultingCommunityNoSpaces = (writeFileSyncStub.args[0][1] as string).replace(/\s+/gi, '');

            expect(writeFileSyncStub.args[0][0]).to.equal(path.join('force-app', 'main', 'default', 'sites', 'SampleCommunity.site-meta.xml'));
            expect(resultingCommunityNoSpaces).to.contain('<testConcat>sampleString</testConcat>');
            expect(resultingCommunityNoSpaces).to.contain('<testConcatNested><nestedTag>coolString</nestedTag></testConcatNested>')
        });
    });
});
