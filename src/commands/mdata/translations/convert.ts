import * as path from 'node:path'
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { ExcelUtility } from '../../../excelUtility';
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

export default class Convert extends SfCommand<AnyJson> {
    public static readonly summary = messages.getMessage('translations.convert.description');

    /* public static examples = [
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

    public static readonly flags = {
        from: Flags.string({
            char: 'f',
            summary: messages.getMessage('translations.convert.flags.from'),
            options: ['stf', 'xlsx'],
            required: true
        }),
        to: Flags.string({
            char: 't',
            summary: messages.getMessage('translations.convert.flags.to'),
            options: ['stf', 'xlsx'],
            required: true
        }),
        infile: Flags.string({
            char: 'i',
            summary: messages.getMessage('translations.convert.flags.infile'),
            required: true
        }),
        outfile: Flags.string({
            char: 'd',
            summary: messages.getMessage('translations.convert.flags.outfile'),
            required: true
        }),
        metadata: Flags.string({
            char: 'm',
            summary: messages.getMessage('translations.convert.flags.metadata')
        }),
        sheets: Flags.string({
            char: 's',
            summary: messages.getMessage('translations.convert.flags.sheets')
        }),
        rowheadernum: Flags.integer({
            char: 'r',
            summary: messages.getMessage('translations.convert.flags.rowheadernum'),
            default: 1
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
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    protected actualFlags: {
      from: string;
      to: string;
      infile: string;
      outfile: string;
      metadata: string;
      sheets: string;
      rowheadernum: number;
      loglevel: string;
    };

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(Convert)).flags;

        if (!Object.prototype.hasOwnProperty.call(ALLOWED_FROM_TO_COMBO, this.actualFlags.from) ||
            !(ALLOWED_FROM_TO_COMBO[this.actualFlags.from] as string[]).includes(this.actualFlags.to)) {
            throw new SfError(messages.getMessage('translations.convert.errors.invalidFromToCombo'));
        }

        let dataTableList: TranslationDataTable[] = [];
        if (this.actualFlags.from === 'stf' && this.actualFlags.to === 'xlsx') {
            if (path.extname(this.actualFlags.infile) === '.zip') {
                dataTableList = await TranslationUtility.importSTFZipFile(this.actualFlags.infile, 'utf8', this.actualFlags.metadata ? this.actualFlags.metadata.split(',') : []);
            } else {
                dataTableList.push(await TranslationUtility.importSTFFile(this.actualFlags.infile, 'utf8'));
            }

            await ExcelUtility.toExcel(dataTableList, this.actualFlags.outfile);
        } else if (this.actualFlags.from === 'xlsx' && this.actualFlags.to === 'stf') {
            dataTableList = await ExcelUtility.importFromExcel<['Metadata Component' | 'Object/Type' | 'Sub Type 1' | 'Sub Type 2' | 'Label' | 'Translation' | 'Out of Date']>(this.actualFlags.infile, this.actualFlags.sheets ? this.actualFlags.sheets.split(',') : [], this.actualFlags.rowheadernum);

            TranslationUtility.exportToSTF(dataTableList, this.actualFlags.outfile, 'utf8');
        }

        return null;
    }
}
