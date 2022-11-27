import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Mdata } from '../../../mdata';
import { ExcelUtility } from '../../../excelUtility';
import { LoggerLevel, TranslationDataTable } from '../../../typeDefs';
import { getAddressSettingsJson } from '../../../retrieveUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class StateCountryTemplate extends SfdxCommand {
    public static description = messages.getMessage('statecountry.template.description');

    public static examples = [
        `To generate an Excel template of the State / Country Picklist currently configured in the current default org
    $ sfdx mdata:statecountry:template -o /path/to/template/to/generate.xlsx`

    ];

    protected static flagsConfig = {
        outputpath: flags.string({
            char: 'o',
            description: messages.getMessage('statecountry.template.flags.outputpath'),
            required: true
        }),
        mdatafile: flags.string({
            char: 'm',
            description: messages.getMessage('statecountry.template.flags.mdatafile')
        }),
        loglevel: flags.enum({
            description: messages.getMessage('general.flags.loglevel'),
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

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    protected countriesToCheck = {};
    protected statesToCheck = {};

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        this.org = await Org.create({ aliasOrUsername: this.flags.targetusername });

        Mdata.log(messages.getMessage('general.infos.usingUsername', [this.org.getUsername()]), LoggerLevel.INFO);

        const addressSettingsJson = await getAddressSettingsJson(this.flags.mdatafile, this.org.getUsername());

        const templateSheets: TranslationDataTable[] = [];

        const countryDataTable: TranslationDataTable = {
            name: 'Countries',
            columns: ['label', 'isoCode', 'integrationValue', 'active', 'visible'],
            rows: []
        };
        const statesDataTable: TranslationDataTable = {
            name: 'States',
            columns: ['countryIsoCode', 'label', 'isoCode', 'integrationValue', 'active', 'visible'],
            rows: []
        };

        addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].map((country: AnyJson) => {
            countryDataTable.rows.push(countryDataTable.columns.reduce((acc: object, c: string) => {
                acc[c] = country[c][0];

                if (Object.prototype.hasOwnProperty.call(country, 'states')) {
                    country['states'].forEach((s: AnyJson) => {
                        statesDataTable.rows.push(statesDataTable.columns.slice(1).reduce((sAcc: object, sc: string) => {
                            sAcc[sc] = s[sc][0];
                            return sAcc;
                        }, { countryIsoCode: country['isoCode'][0] }));
                    });
                }
                return acc;
            }, {}));
        });

        templateSheets.push(countryDataTable);
        templateSheets.push(statesDataTable);

        await ExcelUtility.toExcel(templateSheets, this.flags.outputpath);

        return null;
    }
}
