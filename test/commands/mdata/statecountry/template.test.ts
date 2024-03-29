import { expect } from 'chai';
import { TestContext } from '@salesforce/core/lib/testSetup';
import Sinon = require('sinon');
import { stubMethod } from '@salesforce/ts-sinon';
import { Messages } from '@salesforce/core';
import * as ExcelJS from 'exceljs';
import * as retrieveUtility from '../../../../src/retrieveUtility';
import StateCountryTemplate from '../../../../src/commands/mdata/statecountry/template';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
// const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('statecountry:template', () => {
    const $$ = new TestContext();

    let xlsxWriteFileStub: Sinon.SinonStub;

    const commonStubs = function () {

        stubMethod($$.SANDBOX, retrieveUtility, 'getAddressSettingsJson').callsFake(() => ({
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
            }));
        xlsxWriteFileStub = stubMethod($$.SANDBOX, ExcelJS.Workbook.prototype.xlsx, 'writeFile');
    };

    beforeEach(() => {
        commonStubs();
    });

    afterEach(() => {
        $$.restore();
    });

    it('generates an Excel file with the AddressSettings metadata XML contents retrieved from the target Org', async () => {
        await StateCountryTemplate.run(['-p', 'out.xlsx', '-u', 'testusername']);
        expect(xlsxWriteFileStub.called).to.be.true;
        expect(xlsxWriteFileStub.args[0][0]).to.equal('out.xlsx');
    });
});
