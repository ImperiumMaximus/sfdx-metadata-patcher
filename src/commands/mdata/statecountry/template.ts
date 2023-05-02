import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Mdata } from '../../../mdata';
import { ExcelUtility } from '../../../excelUtility';
import { AddressSettingsMetadataCountry, AddressSettingsMetadataState, LoggerLevel, CountryDataTable, StatesDataTable } from '../../../typeDefs';
import { getAddressSettingsJson } from '../../../retrieveUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class StateCountryTemplate extends SfCommand<AnyJson> {
    public static readonly summary = messages.getMessage('statecountry.template.description');

    public static readonly examples = [
        `To generate an Excel template of the State / Country Picklist currently configured in the current default org
    $ sfdx mdata:statecountry:template -o /path/to/template/to/generate.xlsx`

    ];

    public static readonly flags = {
        outputpath: Flags.string({
            char: 'p',
            summary: messages.getMessage('statecountry.template.flags.outputpath'),
            required: true
        }),
        mdatafile: Flags.string({
            char: 'm',
            summary: messages.getMessage('statecountry.template.flags.mdatafile')
        }),
        targetusername: Flags.string({
          summary: messages.getMessage('general.flags.targetusername'),
          char: 'u',
        }),
        loglevel: Flags.string({
            summary: messages.getMessage('general.flags.loglevel'),
            default: 'info',
            required: false,
            options: [
                'trace',
                'debug',
                'info',
                'warn',
                'error',
                'fatal',
                'TRACE',
                'DEBUG',
                'INFO',
                'WARN',
                'ERROR',
                'FATAL'
            ]
        })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = true;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    protected actualFlags: {
      outputpath: string;
      mdatafile: string;
      targetusername: string;
      loglevel: string;
    };

    protected org: Org;

    protected countriesToCheck = {};
    protected statesToCheck = {};

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(StateCountryTemplate)).flags;

        Mdata.setLogLevel(this.actualFlags.loglevel, this.jsonEnabled());

        this.org = await Org.create({ aliasOrUsername: this.actualFlags.targetusername });

        Mdata.log(messages.getMessage('general.infos.usingUsername', [this.org.getUsername()]), LoggerLevel.INFO);

        const addressSettingsJson = await getAddressSettingsJson(this.actualFlags.mdatafile, this.org.getUsername());

        const templateSheets: Array<(CountryDataTable | StatesDataTable)> = [];

        const countryDataTable: CountryDataTable = {
            name: 'Countries',
            columns: ['label', 'isoCode', 'integrationValue', 'active', 'visible'],
            rows: []
        };
        const statesDataTable: StatesDataTable = {
            name: 'States',
            columns: ['countryIsoCode', 'label', 'isoCode', 'integrationValue', 'active', 'visible'],
            rows: []
        };

        addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].map((country: AddressSettingsMetadataCountry) => {
            countryDataTable.rows.push(countryDataTable.columns.reduce((acc, c) => {
                acc[c] = { value: country[c][0], type: 'string' };
                return acc;
            }, { label: null, isoCode: null, integrationValue: null, active: null, visible: null }));

            if (Object.prototype.hasOwnProperty.call(country, 'states')) {
                country['states'].forEach((s: AddressSettingsMetadataState & { countryIsoCode: string }) => {
                    statesDataTable.rows.push(statesDataTable.columns.slice(1).reduce((sAcc, sc) => {
                        sAcc[sc] = { value: s[sc][0], type: 'string' };
                        return sAcc;
                    }, { countryIsoCode: country['isoCode'][0], label: null, isoCode: null, integrationValue: null, active: null, visible: null }));
                });
            }
        });

        templateSheets.push(countryDataTable);
        templateSheets.push(statesDataTable);

        await ExcelUtility.toExcel(templateSheets, this.actualFlags.outputpath);

        return null;
    }
}
