import { expect } from 'chai';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { AuthInfo, Connection, Messages, Org } from '@salesforce/core';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { AnyJson, ensureString } from '@salesforce/ts-types';
import { HttpRequest } from 'jsforce/lib/types/common';
import { StreamPromise } from 'jsforce/lib/util/promise';
import { stubMethod } from '@salesforce/ts-sinon';
import { CommunitiesPublishCAPIResponse, CommunitiesCAPIResponse } from '../../../../src/typeDefs';
import Publish from '../../../../src/commands/mdata/communities/publish';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

describe('mdata communities publish', () => {
    const $$ = new TestContext();
    let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

    beforeEach(() => {
        sfCommandStubs = stubSfCommandUx($$.SANDBOX);
    });

    afterEach(() => {
        $$.restore();
    })

    it('publishes all communities with targetusername test@org.com', async () => {
        const authInfo = await AuthInfo.create({
            username: 'test@org.com'
        });

        stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
            const conn = new Connection({
                authInfo
            });

            type res = CommunitiesPublishCAPIResponse | CommunitiesCAPIResponse | AnyJson;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function req<T>(request: string | HttpRequest): StreamPromise<T extends res ? res : any> {
                if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562476',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
                    return new StreamPromise<CommunitiesCAPIResponse>((resolve) => resolve({
                        communities: [
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562476',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            }
                        ],
                        total: 1
                    }));
                }
                return new StreamPromise<AnyJson>((resolve) => resolve({}));
            }

            $$.SANDBOX.replace(conn, 'request', req);

            return conn;
        });

        await Publish.run(['--targetusername', 'test@org.com']);
        const output = sfCommandStubs.log
            .getCalls()
            .flatMap((c) => c.args)
            .join('\n');
        expect(output).to.equal('');
    })

    it('publishes all communities with targetusername test@org.com with json output', async () => {
        const authInfo = await AuthInfo.create({
            username: 'test@org.com'
        });

        stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
            const conn = new Connection({
                authInfo
            });

            type res = CommunitiesPublishCAPIResponse | CommunitiesCAPIResponse | AnyJson;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function req<T>(request: string | HttpRequest): StreamPromise<T extends res ? res : any> {
                if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562476',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
                    return new StreamPromise<CommunitiesCAPIResponse>((resolve) => resolve({
                        communities: [
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562476',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            }
                        ],
                        total: 1
                    }));
                }
                return new StreamPromise<AnyJson>((resolve) => resolve({}));
            }

            $$.SANDBOX.replace(conn, 'request', req);

            return conn;
        });

        const output = await Publish.run(['--targetusername', 'test@org.com', '--json']);
        expect(output).to.deep.equal({
            publishedCommunities: [
                {
                    id: '132562476',
                    message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                    name: 'FakeCommunity',
                    url: 'fake url'
                }
            ]
        });
    })

    it('publishes named community with targetusername test@org.com with json output', async () => {
        const authInfo = await AuthInfo.create({
            username: 'test@org.com'
        });

        stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
            const conn = new Connection({
                authInfo
            });

            type res = CommunitiesPublishCAPIResponse | CommunitiesCAPIResponse | AnyJson;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function req<T>(request: string | HttpRequest): StreamPromise<T extends res ? res : any> {
                if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/132562477\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562477',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
                    return new StreamPromise<CommunitiesCAPIResponse>((resolve) => resolve({
                        communities: [
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562476',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity2',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            },
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562477',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            }
                        ],
                        total: 1
                    }));
                }
                return new StreamPromise<AnyJson>((resolve) => resolve({}));
            }

            $$.SANDBOX.replace(conn, 'request', req);

            return conn;
        });

        const output = await Publish.run(['--targetusername', 'test@org.com', '--json', '-n', 'FakeCommunity']);
        expect(output).to.have.property('publishedCommunities');
        expect((output?.['publishedCommunities'] as AnyJson[]).filter((c: { id: string; message: string; name: string; url: string }) => c.id === '132562477')).to.have.length(1);
        expect((output?.['publishedCommunities'] as AnyJson[]).filter((c: { id: string; message: string; name: string; url: string }) => c.id === '132562476')).to.have.length(0);
    })

    it('publishes all communities (2) with targetusername test@org.com with json output', async () => {
        const authInfo = await AuthInfo.create({
            username: 'test@org.com'
        });

        stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
            const conn = new Connection({
                authInfo
            });

            type res = CommunitiesPublishCAPIResponse | CommunitiesCAPIResponse | AnyJson;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function req<T>(request: string | HttpRequest): StreamPromise<T extends res ? res : any> {
                if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/132562477\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562477',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/132562476\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562476',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity2',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
                    return new StreamPromise<CommunitiesCAPIResponse>((resolve) => resolve({
                        communities: [
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562476',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity2',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            },
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562477',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            }
                        ],
                        total: 1
                    }));
                }
                return new StreamPromise<AnyJson>((resolve) => resolve({}));
            }

            $$.SANDBOX.replace(conn, 'request', req);

            return conn;
        });

        const output = await Publish.run(['--targetusername', 'test@org.com', '--json']);
        expect(output).to.have.property('publishedCommunities');
        expect((output?.['publishedCommunities'] as AnyJson[]).filter((c: { id: string; message: string; name: string; url: string }) => c.id === '132562477')).to.have.length(1);
        expect((output?.['publishedCommunities'] as AnyJson[]).filter((c: { id: string; message: string; name: string; url: string }) => c.id === '132562476')).to.have.length(1);
    });

    it('should throw an error if the community is not found', async () => {
        const authInfo = await AuthInfo.create({
            username: 'test@org.com'
        });

        stubMethod($$.SANDBOX, Org.prototype, 'getConnection').callsFake(() => {
            const conn = new Connection({
                authInfo
            });

            type res = CommunitiesPublishCAPIResponse | CommunitiesCAPIResponse | AnyJson;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function req<T>(request: string | HttpRequest): StreamPromise<T extends res ? res : any> {
                if (typeof request == 'object' && ensureString(request?.['url']).match(/\/connect\/communities\/[a-zA-Z0-9]+\/publish/)) {
                    return new StreamPromise<CommunitiesPublishCAPIResponse>((resolve) => resolve({
                        id: '132562476',
                        message: 'We are publishing your changes now. You will receive an email confirmation when your changes are live.',
                        name: 'FakeCommunity',
                        url: 'fake url'
                    }));
                } else if (typeof request == 'string' && ensureString(request).match(/\/connect\/communities\//)) {
                    return new StreamPromise<CommunitiesCAPIResponse>((resolve) => resolve({
                        communities: [
                            {
                                allowChatterAccessWithoutLogin: false,
                                allowMembersToFlag: false,
                                description: null,
                                guestMemberVisibilityEnabled: false,
                                id: '132562476',
                                invitationsEnabled: false,
                                knowledgeableEnabled: false,
                                loginUrl: 'fake login url',
                                memberVisibilityEnabled: false,
                                name: 'FakeCommunity',
                                nicknameDisplayEnabled: false,
                                privateMessagesEnabled: false,
                                reputationEnabled: false,
                                sendWelcomeEmail: false,
                                siteAsContainerEnabled: true,
                                siteUrl: 'fake site url',
                                status: 'UnderConstruction',
                                templateName: 'fake template',
                                url: 'fake url',
                                urlPathPrefix: 'fake'
                            }
                        ],
                        total: 1
                    }));
                }
                return new StreamPromise<AnyJson>((resolve) => resolve({}));
            }

            $$.SANDBOX.replace(conn, 'request', req);

            return conn;
        });

        const output = await Publish.run(['--targetusername', 'test@org.com', '--json', '-n', 'FakeCommunity2']);
        expect(output).to.contain(messages.getMessage('communities.publish.errors.noCommunitiesFound'));
    });
})
