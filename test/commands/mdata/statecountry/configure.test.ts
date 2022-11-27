import { expect, test } from '@salesforce/command/lib/test';
import { testSetup } from '@salesforce/core/lib/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import { Messages } from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'exceljs/lib/xlsx/xlsx';
import * as retrieveUtility from '../../../../src/retrieveUtility';
import { SeleniumUtility } from '../../../../src/seleniumUtility';
import { WebDriver } from 'selenium-webdriver';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const $$ = testSetup();

describe('statecountry:configure', () => {
    const commonStubs = function (rename: Boolean) {

        let currentUrl: string;
        let firstCallDone = false;

        stubMethod($$.SANDBOX, retrieveUtility, 'getAddressSettingsJson').callsFake((_: string, __: string) => {
            if (!firstCallDone) {
                firstCallDone = true;
                return {
                    'AddressSettings': {
                        'countriesAndStates': [{
                            'countries': [
                                {
                                    'label': ['Country1'],
                                    'isoCode': ['CT1'],
                                    'integrationValue': ['Country1'],
                                    'active': ['true'],
                                    'visible': ['false']
                                },
                                {
                                    'label': ['Country2'],
                                    'isoCode': ['CT2'],
                                    'integrationValue': ['Country2'],
                                    'active': ['true'],
                                    'visible': ['true'],
                                    'states': [
                                        {
                                            'label': ['State1'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        }
                                    ]
                                }
                            ]
                        }]
                    }
                }
            } else if (rename) {
                return {
                    'AddressSettings': {
                        'countriesAndStates': [{
                            'countries': [
                                {
                                    'label': ['Country1_'],
                                    'isoCode': ['CT1'],
                                    'integrationValue': ['Country1_'],
                                    'active': ['true'],
                                    'visible': ['false']
                                },
                                {
                                    'label': ['Country2'],
                                    'isoCode': ['CT2'],
                                    'integrationValue': ['Country2'],
                                    'active': ['true'],
                                    'visible': ['true'],
                                    'states': [
                                        {
                                            'label': ['State1_'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1_'],
                                            'active': ['true'],
                                            'visible': ['false'],
                                        },
                                        {
                                            'label': ['State2'],
                                            'isoCode': ['ST2'],
                                            'integrationValue': ['State2'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        },
                                        {
                                            'label': ['StateSame'],
                                            'isoCode': ['ST3'],
                                            'integrationValue': ['State1'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        }
                                    ]
                                },
                                {
                                    'label': ['Country3'],
                                    'isoCode': ['CT3'],
                                    'integrationValue': ['Country3'],
                                    'active': ['true'],
                                    'visible': ['false'],
                                    'states': [
                                        {
                                            'label': ['State1'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1'],
                                            'active': ['false'],
                                            'visible': ['false'],
                                        }
                                    ]
                                },
                                {
                                    'label': ['CountrySame'],
                                    'isoCode': ['CT4'],
                                    'integrationValue': ['Country1'],
                                    'active': ['true'],
                                    'visible': ['true'],
                                    'states': [
                                        {
                                            'label': ['State1'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        },
                                        {
                                            'label': ['State2'],
                                            'isoCode': ['ST2'],
                                            'integrationValue': ['State2'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        }
                                    ]
                                },
                            ]
                        }]
                    }
                }
            } else {
                return {
                    'AddressSettings': {
                        'countriesAndStates': [{
                            'countries': [
                                {
                                    'label': ['Country1'],
                                    'isoCode': ['CT1'],
                                    'integrationValue': ['Country1'],
                                    'active': ['true'],
                                    'visible': ['true']
                                },
                                {
                                    'label': ['Country2'],
                                    'isoCode': ['CT2'],
                                    'integrationValue': ['Country2'],
                                    'active': ['true'],
                                    'visible': ['true'],
                                    'states': [
                                        {
                                            'label': ['State1'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        },
                                        {
                                            'label': ['State2'],
                                            'isoCode': ['ST2'],
                                            'integrationValue': ['State2'],
                                            'active': ['true'],
                                            'visible': ['true'],
                                        }
                                    ]
                                },
                                {
                                    'label': ['Country3'],
                                    'isoCode': ['CT3'],
                                    'integrationValue': ['Country3'],
                                    'active': ['true'],
                                    'visible': ['false'],
                                    'states': [
                                        {
                                            'label': ['State1'],
                                            'isoCode': ['ST1'],
                                            'integrationValue': ['State1'],
                                            'active': ['false'],
                                            'visible': ['false'],
                                        }
                                    ]
                                }
                            ]
                        }]
                    }
                }
            }
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'getDriver').callsFake((url: string) => {
            currentUrl = url;
            return { 
                get: (url: string) => {
                    currentUrl = url;
                    return null;
                },
                getCurrentUrl: () => {
                    console.log(currentUrl);
                    return `${currentUrl}&success=true`;
                },
                quit: () => {
                    return null;
                }
            };
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'waitUntilPageLoad').callsFake((_: WebDriver) => {
            return true;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'fillTextInput').callsFake((_: WebDriver, __: string, ___: string) => {
            return null;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'clearAndFillTextInput').callsFake((_: WebDriver, __: string, ___: string) => {
            return null;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'setCheckboxValue').callsFake((_: WebDriver, __: string, ___: boolean) => {
            return true;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'waitToBeStaleness').callsFake((_: WebDriver, __: string) => {
            return null;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'clickButton').callsFake((_: WebDriver, __: string) => {
            return null;
        });

        stubMethod($$.SANDBOX, SeleniumUtility, 'elementExists').callsFake((_: WebDriver, __: string) => {
            return true;
        });
    };

    test
        .stdout()
        .do(() => {
            commonStubs(true);
            // Workaround in order to have a consistent instance of an ExcelJS.Workbook.
            // For some reason the instance created in the actual code doesn't have
            // its properties correctly populated, though this happens only during
            // test execution.
            const wb = new ExcelJS.Workbook();
            $$.SANDBOX.replaceGetter(wb, 'xlsx', () => {
                return new XLSX(wb);
            });

            const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
            existsSyncStub.callsFake((_path: string) => {
                if (_path.includes('mappings.xlsx')) {
                    return true;
                }
                return existsSyncStub.wrappedMethod.call(this, _path);
            })

            const xlsxReadStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'readFile');
            xlsxReadStub.callsFake(async (_path: string) => {
                if (_path.includes('mappings.xlsx')) {
                    return wb.xlsx.read(fs.createReadStream(_path));
                }
                return null;
            });
        })
        .command(['mdata:statecountry:configure', '-f', path.join(__dirname, '..', '..', '..', 'data', 'statecountry', 'mappings.xlsx'), '-c', 'rename', '-u', 'username'])
        .withOrg({ username: 'test@org.com' }, true)
        .it('Configure new and existing country/state picklist values renaming existing conflicting ones', (ctx) => {
            expect(ctx.stdout).to.contain(messages.getMessage('statecountry.configure.infos.checkOkMessage'));
        });


    test
        .stdout()
        .do(() => {
            commonStubs(false);
            // Workaround in order to have a consistent instance of an ExcelJS.Workbook.
            // For some reason the instance created in the actual code doesn't have
            // its properties correctly populated, though this happens only during
            // test execution.
            const wb = new ExcelJS.Workbook();
            $$.SANDBOX.replaceGetter(wb, 'xlsx', () => {
                return new XLSX(wb);
            });

            const existsSyncStub = stubMethod($$.SANDBOX, fs, 'existsSync')
            existsSyncStub.callsFake((_path: string) => {
                if (_path.includes('mappings.xlsx')) {
                    return true;
                }
                return existsSyncStub.wrappedMethod.call(this, _path);
            })

            const xlsxReadStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'readFile');
            xlsxReadStub.callsFake(async (_path: string) => {
                if (_path.includes('mappings.xlsx')) {
                    return wb.xlsx.read(fs.createReadStream(_path));
                }
                return null;
            });
        })
        .command(['mdata:statecountry:configure', '-f', path.join(__dirname, '..', '..', '..', 'data', 'statecountry', 'mappings.xlsx'), '-c', 'skip', '-u', 'username'])
        .withOrg({ username: 'test@org.com' }, true)
        .it('Configure new and existing country/state picklist values skipping existing ones', (ctx) => {
            expect(ctx.stdout).to.contain(messages.getMessage('statecountry.configure.infos.checkOkMessage'));
        });
});