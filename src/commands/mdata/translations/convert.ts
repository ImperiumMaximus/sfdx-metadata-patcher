import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as path from 'path';
import { ExcelUtility } from '../../../excelUtility';
import { Mdata } from '../../../mdata';
import { TranslationUtility } from '../../../translationUtility';
import { TranslationDataTable } from '../../../typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

const ALLOWED_FROM_TO_COMBO = {
    stf: [
        'xlsx'
    ],
    xlsx: [
        'stf'
    ]
};

export default class Publish extends SfdxCommand {
    public static description = messages.getMessage('translations.convert.description');

    /*public static examples = [
        `To publish all the communities in the org:
    $ sfdx mdata:communities:publish`,

        `To find a community named Customer and publish it:
    $ sfdx mdata:communities:publish -n Customer`,

        `To find communities named Customer, Partner and publish them:
    $ sfdx mdata:communities:publish -n Customer,Partner
`,

        `To find a community named Customer in Org with alias uat and publish it:
    $ sfdx mdata:communities:publish -n Customer -u uat`,

        `To find a community named Customer in Org with username admin.user@uat.myorg.com and publish it:
    $ sfdx mdata:communities:publish -n Customer -u admin.user@uat.myorg.com`
    ];*/

    protected static flagsConfig = {
        from: flags.string({
            char: 'f',
            description: messages.getMessage('translations.convert.flags.from'),
            options: ['stf', 'xlsx'],
            required: true
        }),
        to: flags.string({
            char: 't',
            description: messages.getMessage('translations.convert.flags.to'),
            options: ['stf', 'xlsx'],
            required: true
        }),
        infile: flags.string({
            char: 'i',
            description: messages.getMessage('translations.convert.flags.infile'),
            required: true
        }),
        outfile: flags.string({
            char: 'o',
            description: messages.getMessage('translations.convert.flags.outfile'),
            required: true
        }),
        metadata: flags.string({
            char: 'm',
            description: messages.getMessage('translations.convert.flags.metadata')
        }),
        sheets: flags.string({
            char: 's',
            description: messages.getMessage('translations.convert.flags.sheets')
        }),
        rowheadernum: flags.number({
            char: 'r',
            description: messages.getMessage('translations.convert.flags.rowheadernum'),
            default: 1
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
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    public async run(): Promise<AnyJson> {
        Mdata.setLogLevel(this.flags.loglevel, this.flags.json);

        if (!Object.prototype.hasOwnProperty.call(ALLOWED_FROM_TO_COMBO, this.flags.from) ||
            !ALLOWED_FROM_TO_COMBO[this.flags.from].includes(this.flags.to)) {
            throw new Error(messages.getMessage('translations.convert.errors.invalidFromToCombo'));
        }

        let dataTableList: TranslationDataTable[] = [];
        if (this.flags.from === 'stf' && this.flags.to === 'xlsx') {
            if (path.extname(this.flags.infile) === '.zip') {
                dataTableList = await TranslationUtility.importSTFZipFile(this.flags.infile, 'utf8', this.flags.metadata ? this.flags.metadata.split(',') : []);
            } else {
                dataTableList.push(await TranslationUtility.importSTFFile(this.flags.infile, 'utf8'));
            }

            await ExcelUtility.toExcel(dataTableList, this.flags.outfile);
        } else if (this.flags.from === 'xlsx' && this.flags.to === 'stf') {
            dataTableList = await ExcelUtility.importFromExcel(this.flags.infile, this.flags.sheets ? this.flags.sheets.split(',') : [], this.flags.rowheadernum);

            await TranslationUtility.exportToSTF(dataTableList, this.flags.outfile, 'utf8');
        }

        return null;
    }
}
