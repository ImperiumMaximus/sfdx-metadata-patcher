import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';
import { Mdata } from '../../../mdata';
import { LoggerLevel, PackageXml } from '../../../typeDefs';
import { parseXml, writeXml } from '../../../xmlUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class ManifestSort extends SfdxCommand {

    public static description = messages.getMessage('manifest.sort.description');

    public static examples = [
        `To sort the components of a manifest file
    $ sfdx mdata:manifest:sort -x manifest/package.xml`,

    ];

    protected static flagsConfig = {
        manifest: flags.string({
            char: 'x',
            description: messages.getMessage('manifest.sort.flags.manifest'),
            required: true
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

        console.error(this.flags.manifest);

        if (!fs.existsSync(this.flags.manifest)) {
            Mdata.log(messages.getMessage('manifest.sort.errors.noInputFileFound'), LoggerLevel.FATAL);
            return null;
        }

        let manifestXml: PackageXml;
        try {
            manifestXml = (await parseXml(this.flags.manifest)) as unknown as PackageXml;
        } catch (e) {
            Mdata.log(messages.getMessage('manifest.sort.errors.badXml', e.message), LoggerLevel.FATAL);
            return null;
        }

        manifestXml.Package.types = manifestXml.Package.types.sort((a, b) => a.name[0].localeCompare(b.name[0]));
        manifestXml.Package.types.forEach(t => t.members.sort((a, b) => a.localeCompare(b)));

        try {
            await writeXml(this.flags.manifest, manifestXml);
        } catch (e) {
            Mdata.log(messages.getMessage('manifest.sort.errors.writeXml', e.message), LoggerLevel.FATAL);
            return null;
        }

        if (this.flags.json) {
            return manifestXml;
        }
        return null;
    }
}
