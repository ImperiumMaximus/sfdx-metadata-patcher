import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as cliProgress from 'cli-progress';
import { Mdata } from '../../../mdata';
import { CommunitiesCAPIResponse, CommunitiesPublishCAPIResponse, CommunityWRCAPI, LoggerLevel } from './../../../typeDefs';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class Publish extends SfCommand<AnyJson> {
    public static readonly summary = messages.getMessage('communities.publish.description');

    public static readonly examples = [
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
    ];

    public static readonly flags = {
        name: Flags.string({
            char: 'n',
            summary: messages.getMessage('communities.publish.flags.name')
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
      name: string;
      targetusername: string;
      loglevel: string;
    };

    protected org: Org;

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(Publish)).flags;

        Mdata.setLogLevel(this.actualFlags.loglevel, this.jsonEnabled());

        this.org = await Org.create({ aliasOrUsername: this.actualFlags.targetusername });
        const names = this.actualFlags.name ? this.actualFlags.name.split(',') : [];

        const conn = this.org.getConnection(this.actualFlags['api-version'] as string);

        const communitiesList = (await conn.request<CommunitiesCAPIResponse>(`${conn.baseUrl()}/connect/communities/`));
        let actualCommunitiesList: CommunityWRCAPI[];

        if (names?.length) {
            actualCommunitiesList = communitiesList.communities.filter(c => c.siteAsContainerEnabled && names.includes(c.name));
        } else {
            actualCommunitiesList = Array.from(communitiesList.communities).filter(c => c.siteAsContainerEnabled);
        }

        if (!actualCommunitiesList.length) {
            Mdata.log(messages.getMessage('communities.publish.errors.noCommunitiesFound'), LoggerLevel.ERROR);
            return messages.getMessage('communities.publish.errors.noCommunitiesFound');
        }

        let bar: cliProgress.SingleBar;
        const publishResults = [];

        if (!this.jsonEnabled()) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('communities.publish.infos.progressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(actualCommunitiesList.length, 0, { communityName: actualCommunitiesList[0].name });
        }

        publishResults.push(await actualCommunitiesList.reduce(async (prevPublishPromise, c, i) => {
            const r = await prevPublishPromise;
            if (i) {
                publishResults.push(r);
            }
            if (!this.jsonEnabled()) {
                bar.increment(1, { communityName: c.name });
            }
            return conn.request({
                method: 'POST',
                url: `${conn.baseUrl()}/connect/communities/${c.id}/publish`,
                body: '{}'
            });
        }, Promise.resolve<CommunitiesPublishCAPIResponse>(null)));

        if (!this.jsonEnabled()) {
            bar.update(actualCommunitiesList.length, { communityName: 'Completed' });

            bar.stop();
        }

        return { publishedCommunities: publishResults };
    }
}
