// To parse this data:
//
//   import { Convert, MetadataTypeInfos } from './file';
//
//   const metadataTypeInfos = Convert.toMetadataTypeInfos(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-shadow, no-shadow,
  @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-call,
  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access,
  @typescript-eslint/no-unsafe-argument,  @typescript-eslint/restrict-template-expressions,
  @typescript-eslint/no-unsafe-return
*/

export interface MetadataTypeInfos {
    typeDefs: TypeDefs;
}

export interface TypeDefs {
    [key: string]: MetadataType;
}

export interface DecompositionConfig {
    strategy: Strategy;
    workspaceStrategy: WorkspaceStrategy;
    commitStrategy: CommitStrategy;
    metadataName: string;
    useSparseComposition: boolean;
    decompositions: Decomposition[];
    contentStrategy: ContentStrategy;
    isGlobal?: boolean;
    isEmptyContainer?: boolean;
}

export enum CommitStrategy {
    FineGrainTracking = 'fineGrainTracking',
    VirtualDecomposition = 'virtualDecomposition'
}

export enum ContentStrategy {
    ExperienceBundleStrategy = 'experienceBundleStrategy',
    NA = 'N/A',
    NonDecomposedContent = 'nonDecomposedContent',
    StaticResource = 'staticResource'
}

export interface Decomposition {
    metadataName: string;
    metadataEntityNameElement: MetadataEntityNameElement;
    xmlFragmentName: string;
    defaultDirectory: string;
    ext: string;
    hasStandardMembers: boolean;
    isAddressable: boolean;
}

export enum MetadataEntityNameElement {
    FullName = 'fullName',
    Name = 'name'
}

export enum Strategy {
    DescribeMetadata = 'describeMetadata',
    NonDecomposed = 'nonDecomposed'
}

export enum WorkspaceStrategy {
    FolderPerSubtype = 'folderPerSubtype',
    InFolderMetadataType = 'inFolderMetadataType',
    NonDecomposed = 'nonDecomposed'
}

export interface MetadataType {
    metadataName: string;
    isAddressable: boolean;
    isSourceTracked: boolean;
    ext?: string;
    hasContent: boolean;
    defaultDirectory: string;
    nameForMsgs: string;
    nameForMsgsPlural: string;
    contentIsBinary: boolean;
    childXmlNames?: string[];
    hasStandardMembers?: boolean;
    deleteSupported: boolean;
    decompositionConfig?: DecompositionConfig;
    hasVirtualSubtypes?: boolean;
    parent?: MetadataType;
    inFolder?: boolean;
    folderTypeDef?: MetadataType;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toMetadataTypeInfos(json: string): MetadataTypeInfos {
        return cast(JSON.parse(json), r('MetadataTypeInfos'));
    }

    public static metadataTypeInfosToJson(value: MetadataTypeInfos): string {
        return JSON.stringify(uncast(value, r('MetadataTypeInfos')), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key '${key}'. Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`);
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) { /* empty */ }
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.includes(val)) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue('array', val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue('Date', val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== 'object' || Array.isArray(val)) {
            return invalidValue('object', val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === 'any') return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === 'object' && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === 'object') {
        return Object.prototype.hasOwnProperty.call(typ, 'unionMembers') ? transformUnion(typ.unionMembers, val)
            : Object.prototype.hasOwnProperty.call(typ, 'arrayItems')    ? transformArray(typ.arrayItems, val)
                : Object.prototype.hasOwnProperty.call(typ, 'props')         ? transformObject(getProps(typ), typ.additional, val)
                    : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== 'number') return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any): object {
    return { arrayItems: typ };
}

function u(...typs: any[]): object {
    return { unionMembers: typs };
}

function o(props: any[], additional: any): object {
    return { props, additional };
}

function r(name: string): object {
    return { ref: name };
}

const typeMap: any = {
    MetadataTypeInfos: o([
        { json: 'typeDefs', js: 'typeDefs', typ: r('TypeDefs') }
    ], false),
    TypeDefs: o([
        { json: 'AccountRelationshipShareRule', js: 'AccountRelationshipShareRule', typ: r('MetadataType') },
        { json: 'AppointmentSchedulingPolicy', js: 'AppointmentSchedulingPolicy', typ: r('MetadataType') },
        { json: 'InstalledPackage', js: 'InstalledPackage', typ: r('MetadataType') },
        { json: 'CustomLabels', js: 'CustomLabels', typ: r('MetadataType') },
        { json: 'NavigationMenu', js: 'NavigationMenu', typ: r('MetadataType') },
        { json: 'StaticResource', js: 'StaticResource', typ: r('MetadataType') },
        { json: 'Scontrol', js: 'Scontrol', typ: r('MetadataType') },
        { json: 'TimeSheetTemplate', js: 'TimeSheetTemplate', typ: r('MetadataType') },
        { json: 'ExperienceBundle', js: 'ExperienceBundle', typ: r('MetadataType') },
        { json: 'Certificate', js: 'Certificate', typ: r('MetadataType') },
        { json: 'Icon', js: 'Icon', typ: r('MetadataType') },
        { json: 'BusinessProcessGroup', js: 'BusinessProcessGroup', typ: r('MetadataType') },
        { json: 'BusinessProcessFeedbackConfiguration', js: 'BusinessProcessFeedbackConfiguration', typ: r('MetadataType') },
        { json: 'LightningMessageChannel', js: 'LightningMessageChannel', typ: r('MetadataType') },
        { json: 'AuraDefinitionBundle', js: 'AuraDefinitionBundle', typ: r('MetadataType') },
        { json: 'LightningComponentBundle', js: 'LightningComponentBundle', typ: r('MetadataType') },
        { json: 'ApexComponent', js: 'ApexComponent', typ: r('MetadataType') },
        { json: 'ApexPage', js: 'ApexPage', typ: r('MetadataType') },
        { json: 'Queue', js: 'Queue', typ: r('MetadataType') },
        { json: 'RedirectWhitelistUrl', js: 'RedirectWhitelistUrl', typ: r('MetadataType') },
        { json: 'IframeWhiteListUrlSettings', js: 'IframeWhiteListUrlSettings', typ: r('MetadataType') },
        { json: 'CustomDataType', js: 'CustomDataType', typ: r('MetadataType') },
        { json: 'CaseSubjectParticle', js: 'CaseSubjectParticle', typ: r('MetadataType') },
        { json: 'ExternalDataSource', js: 'ExternalDataSource', typ: r('MetadataType') },
        { json: 'NamedCredential', js: 'NamedCredential', typ: r('MetadataType') },
        { json: 'InboundNetworkConnection', js: 'InboundNetworkConnection', typ: r('MetadataType') },
        { json: 'OutboundNetworkConnection', js: 'OutboundNetworkConnection', typ: r('MetadataType') },
        { json: 'InboundCertificate', js: 'InboundCertificate', typ: r('MetadataType') },
        { json: 'ExternalServiceRegistration', js: 'ExternalServiceRegistration', typ: r('MetadataType') },
        { json: 'Role', js: 'Role', typ: r('MetadataType') },
        { json: 'Territory', js: 'Territory', typ: r('MetadataType') },
        { json: 'Group', js: 'Group', typ: r('MetadataType') },
        { json: 'UiPlugin', js: 'UiPlugin', typ: r('MetadataType') },
        { json: 'GlobalValueSet', js: 'GlobalValueSet', typ: r('MetadataType') },
        { json: 'GlobalPicklist', js: 'GlobalPicklist', typ: r('MetadataType') },
        { json: 'StandardValueSet', js: 'StandardValueSet', typ: r('MetadataType') },
        { json: 'CustomPermission', js: 'CustomPermission', typ: r('MetadataType') },
        { json: 'CustomObject', js: 'CustomObject', typ: r('MetadataType') },
        { json: 'ReportType', js: 'ReportType', typ: r('MetadataType') },
        { json: 'Report', js: 'Report', typ: r('MetadataType') },
        { json: 'ReportFolder', js: 'ReportFolder', typ: r('MetadataType') },
        { json: 'Dashboard', js: 'Dashboard', typ: r('MetadataType') },
        { json: 'DashboardFolder', js: 'DashboardFolder', typ: r('MetadataType') },
        { json: 'VisualizationPlugin', js: 'VisualizationPlugin', typ: r('MetadataType') },
        { json: 'AnalyticSnapshot', js: 'AnalyticSnapshot', typ: r('MetadataType') },
        { json: 'CustomFeedFilter', js: 'CustomFeedFilter', typ: r('MetadataType') },
        { json: 'Layout', js: 'Layout', typ: r('MetadataType') },
        { json: 'Document', js: 'Document', typ: r('MetadataType') },
        { json: 'DocumentFolder', js: 'DocumentFolder', typ: r('MetadataType') },
        { json: 'CustomPageWebLink', js: 'CustomPageWebLink', typ: r('MetadataType') },
        { json: 'Letterhead', js: 'Letterhead', typ: r('MetadataType') },
        { json: 'EmailTemplate', js: 'EmailTemplate', typ: r('MetadataType') },
        { json: 'EmailFolder', js: 'EmailFolder', typ: r('MetadataType') },
        { json: 'QuickAction', js: 'QuickAction', typ: r('MetadataType') },
        { json: 'Form', js: 'Form', typ: r('MetadataType') },
        { json: 'FlexiPage', js: 'FlexiPage', typ: r('MetadataType') },
        { json: 'CustomTab', js: 'CustomTab', typ: r('MetadataType') },
        { json: 'CustomApplicationComponent', js: 'CustomApplicationComponent', typ: r('MetadataType') },
        { json: 'CustomApplication', js: 'CustomApplication', typ: r('MetadataType') },
        { json: 'Portal', js: 'Portal', typ: r('MetadataType') },
        { json: 'EmbeddedServiceConfig', js: 'EmbeddedServiceConfig', typ: r('MetadataType') },
        { json: 'EmbeddedServiceLiveAgent', js: 'EmbeddedServiceLiveAgent', typ: r('MetadataType') },
        { json: 'EmbeddedServiceFieldService', js: 'EmbeddedServiceFieldService', typ: r('MetadataType') },
        { json: 'EmbeddedServiceBranding', js: 'EmbeddedServiceBranding', typ: r('MetadataType') },
        { json: 'RecommendationStrategy', js: 'RecommendationStrategy', typ: r('MetadataType') },
        { json: 'Flow', js: 'Flow', typ: r('MetadataType') },
        { json: 'FlowDefinition', js: 'FlowDefinition', typ: r('MetadataType') },
        { json: 'EventType', js: 'EventType', typ: r('MetadataType') },
        { json: 'EventSubscription', js: 'EventSubscription', typ: r('MetadataType') },
        { json: 'EventDelivery', js: 'EventDelivery', typ: r('MetadataType') },
        { json: 'Workflow', js: 'Workflow', typ: r('MetadataType') },
        { json: 'AssignmentRules', js: 'AssignmentRules', typ: r('MetadataType') },
        { json: 'AutoResponseRules', js: 'AutoResponseRules', typ: r('MetadataType') },
        { json: 'EscalationRules', js: 'EscalationRules', typ: r('MetadataType') },
        { json: 'PostTemplate', js: 'PostTemplate', typ: r('MetadataType') },
        { json: 'ApprovalProcess', js: 'ApprovalProcess', typ: r('MetadataType') },
        { json: 'HomePageComponent', js: 'HomePageComponent', typ: r('MetadataType') },
        { json: 'HomePageLayout', js: 'HomePageLayout', typ: r('MetadataType') },
        { json: 'CustomObjectTranslation', js: 'CustomObjectTranslation', typ: r('MetadataType') },
        { json: 'Translations', js: 'Translations', typ: r('MetadataType') },
        { json: 'GlobalValueSetTranslation', js: 'GlobalValueSetTranslation', typ: r('MetadataType') },
        { json: 'StandardValueSetTranslation', js: 'StandardValueSetTranslation', typ: r('MetadataType') },
        { json: 'ApexClass', js: 'ApexClass', typ: r('MetadataType') },
        { json: 'ApexEmailNotifications', js: 'ApexEmailNotifications', typ: r('MetadataType') },
        { json: 'ApexTrigger', js: 'ApexTrigger', typ: r('MetadataType') },
        { json: 'ApexTestSuite', js: 'ApexTestSuite', typ: r('MetadataType') },
        { json: 'Profile', js: 'Profile', typ: r('MetadataType') },
        { json: 'PermissionSet', js: 'PermissionSet', typ: r('MetadataType') },
        { json: 'PermissionSetGroup', js: 'PermissionSetGroup', typ: r('MetadataType') },
        { json: 'CustomMetadata', js: 'CustomMetadata', typ: r('MetadataType') },
        { json: 'ProfilePasswordPolicy', js: 'ProfilePasswordPolicy', typ: r('MetadataType') },
        { json: 'ProfileSessionSetting', js: 'ProfileSessionSetting', typ: r('MetadataType') },
        { json: 'DataCategoryGroup', js: 'DataCategoryGroup', typ: r('MetadataType') },
        { json: 'RemoteSiteSetting', js: 'RemoteSiteSetting', typ: r('MetadataType') },
        { json: 'CspTrustedSite', js: 'CspTrustedSite', typ: r('MetadataType') },
        { json: 'MatchingRules', js: 'MatchingRules', typ: r('MetadataType') },
        { json: 'DuplicateRule', js: 'DuplicateRule', typ: r('MetadataType') },
        { json: 'CleanDataService', js: 'CleanDataService', typ: r('MetadataType') },
        { json: 'ServiceChannel', js: 'ServiceChannel', typ: r('MetadataType') },
        { json: 'QueueRoutingConfig', js: 'QueueRoutingConfig', typ: r('MetadataType') },
        { json: 'ServicePresenceStatus', js: 'ServicePresenceStatus', typ: r('MetadataType') },
        { json: 'PresenceDeclineReason', js: 'PresenceDeclineReason', typ: r('MetadataType') },
        { json: 'PresenceUserConfig', js: 'PresenceUserConfig', typ: r('MetadataType') },
        { json: 'AuthProvider', js: 'AuthProvider', typ: r('MetadataType') },
        { json: 'WaveTemplateBundle', js: 'WaveTemplateBundle', typ: r('MetadataType') },
        { json: 'WaveApplication', js: 'WaveApplication', typ: r('MetadataType') },
        { json: 'WaveDataset', js: 'WaveDataset', typ: r('MetadataType') },
        { json: 'EclairGeoData', js: 'EclairGeoData', typ: r('MetadataType') },
        { json: 'WaveLens', js: 'WaveLens', typ: r('MetadataType') },
        { json: 'WaveDashboard', js: 'WaveDashboard', typ: r('MetadataType') },
        { json: 'WaveComponent', js: 'WaveComponent', typ: r('MetadataType') },
        { json: 'WaveXmd', js: 'WaveXmd', typ: r('MetadataType') },
        { json: 'WaveDataflow', js: 'WaveDataflow', typ: r('MetadataType') },
        { json: 'WaveRecipe', js: 'WaveRecipe', typ: r('MetadataType') },
        { json: 'DiscoveryAIModel', js: 'DiscoveryAIModel', typ: r('MetadataType') },
        { json: 'DiscoveryGoal', js: 'DiscoveryGoal', typ: r('MetadataType') },
        { json: 'CustomSite', js: 'CustomSite', typ: r('MetadataType') },
        { json: 'ChannelLayout', js: 'ChannelLayout', typ: r('MetadataType') },
        { json: 'ContentAsset', js: 'ContentAsset', typ: r('MetadataType') },
        { json: 'MarketingResourceType', js: 'MarketingResourceType', typ: r('MetadataType') },
        { json: 'SharingRules', js: 'SharingRules', typ: r('MetadataType') },
        { json: 'SharingSet', js: 'SharingSet', typ: r('MetadataType') },
        { json: 'Community', js: 'Community', typ: r('MetadataType') },
        { json: 'ChatterExtension', js: 'ChatterExtension', typ: r('MetadataType') },
        { json: 'CallCenter', js: 'CallCenter', typ: r('MetadataType') },
        { json: 'MilestoneType', js: 'MilestoneType', typ: r('MetadataType') },
        { json: 'EntitlementProcess', js: 'EntitlementProcess', typ: r('MetadataType') },
        { json: 'EntitlementTemplate', js: 'EntitlementTemplate', typ: r('MetadataType') },
        { json: 'CustomNotificationType', js: 'CustomNotificationType', typ: r('MetadataType') },
        { json: 'ConnectedApp', js: 'ConnectedApp', typ: r('MetadataType') },
        { json: 'AppMenu', js: 'AppMenu', typ: r('MetadataType') },
        { json: 'DelegateGroup', js: 'DelegateGroup', typ: r('MetadataType') },
        { json: 'SiteDotCom', js: 'SiteDotCom', typ: r('MetadataType') },
        { json: 'Network', js: 'Network', typ: r('MetadataType') },
        { json: 'NetworkBranding', js: 'NetworkBranding', typ: r('MetadataType') },
        { json: 'CustomExperience', js: 'CustomExperience', typ: r('MetadataType') },
        { json: 'CommunityThemeDefinition', js: 'CommunityThemeDefinition', typ: r('MetadataType') },
        { json: 'BrandingSet', js: 'BrandingSet', typ: r('MetadataType') },
        { json: 'FlowCategory', js: 'FlowCategory', typ: r('MetadataType') },
        { json: 'LightningBolt', js: 'LightningBolt', typ: r('MetadataType') },
        { json: 'LightningExperienceTheme', js: 'LightningExperienceTheme', typ: r('MetadataType') },
        { json: 'CommunityTemplateDefinition', js: 'CommunityTemplateDefinition', typ: r('MetadataType') },
        { json: 'ManagedTopics', js: 'ManagedTopics', typ: r('MetadataType') },
        { json: 'ManagedContentType', js: 'ManagedContentType', typ: r('MetadataType') },
        { json: 'KeywordList', js: 'KeywordList', typ: r('MetadataType') },
        { json: 'UserCriteria', js: 'UserCriteria', typ: r('MetadataType') },
        { json: 'ModerationRule', js: 'ModerationRule', typ: r('MetadataType') },
        { json: 'Territory2Type', js: 'Territory2Type', typ: r('MetadataType') },
        { json: 'Territory2Model', js: 'Territory2Model', typ: r('MetadataType') },
        { json: 'Territory2Rule', js: 'Territory2Rule', typ: r('MetadataType') },
        { json: 'Territory2', js: 'Territory2', typ: r('MetadataType') },
        { json: 'CampaignInfluenceModel', js: 'CampaignInfluenceModel', typ: r('MetadataType') },
        { json: 'SamlSsoConfig', js: 'SamlSsoConfig', typ: r('MetadataType') },
        { json: 'DataPipeline', js: 'DataPipeline', typ: r('MetadataType') },
        { json: 'CorsWhitelistOrigin', js: 'CorsWhitelistOrigin', typ: r('MetadataType') },
        { json: 'ActionLinkGroupTemplate', js: 'ActionLinkGroupTemplate', typ: r('MetadataType') },
        { json: 'LicenseDefinition', js: 'LicenseDefinition', typ: r('MetadataType') },
        { json: 'TransactionSecurityPolicy', js: 'TransactionSecurityPolicy', typ: r('MetadataType') },
        { json: 'AccessControlPolicy', js: 'AccessControlPolicy', typ: r('MetadataType') },
        { json: 'RestrictionRule', js: 'RestrictionRule', typ: r('MetadataType') },
        { json: 'Skill', js: 'Skill', typ: r('MetadataType') },
        { json: 'LiveChatDeployment', js: 'LiveChatDeployment', typ: r('MetadataType') },
        { json: 'LiveChatButton', js: 'LiveChatButton', typ: r('MetadataType') },
        { json: 'LiveChatAgentConfig', js: 'LiveChatAgentConfig', typ: r('MetadataType') },
        { json: 'SynonymDictionary', js: 'SynonymDictionary', typ: r('MetadataType') },
        { json: 'XOrgHub', js: 'XOrgHub', typ: r('MetadataType') },
        { json: 'PathAssistant', js: 'PathAssistant', typ: r('MetadataType') },
        { json: 'LeadConvertSettings', js: 'LeadConvertSettings', typ: r('MetadataType') },
        { json: 'LiveChatSensitiveDataRule', js: 'LiveChatSensitiveDataRule', typ: r('MetadataType') },
        { json: 'PlatformCachePartition', js: 'PlatformCachePartition', typ: r('MetadataType') },
        { json: 'AssistantRecommendationType', js: 'AssistantRecommendationType', typ: r('MetadataType') },
        { json: 'InsightType', js: 'InsightType', typ: r('MetadataType') },
        { json: 'TopicsForObjects', js: 'TopicsForObjects', typ: r('MetadataType') },
        { json: 'Audience', js: 'Audience', typ: r('MetadataType') },
        { json: 'EmailServicesFunction', js: 'EmailServicesFunction', typ: r('MetadataType') },
        { json: 'IntegrationHubSettingsType', js: 'IntegrationHubSettingsType', typ: r('MetadataType') },
        { json: 'IntegrationHubSettings', js: 'IntegrationHubSettings', typ: r('MetadataType') },
        { json: 'OrchestrationContext', js: 'OrchestrationContext', typ: r('MetadataType') },
        { json: 'Orchestration', js: 'Orchestration', typ: r('MetadataType') },
        { json: 'AIAssistantTemplate', js: 'AIAssistantTemplate', typ: r('MetadataType') },
        { json: 'Settings', js: 'Settings', typ: r('MetadataType') },
        { json: 'FeatureParameterBoolean', js: 'FeatureParameterBoolean', typ: r('MetadataType') },
        { json: 'FeatureParameterDate', js: 'FeatureParameterDate', typ: r('MetadataType') },
        { json: 'FeatureParameterInteger', js: 'FeatureParameterInteger', typ: r('MetadataType') },
        { json: 'FunctionReference', js: 'FunctionReference', typ: r('MetadataType') },
        { json: 'CommandAction', js: 'CommandAction', typ: r('MetadataType') },
        { json: 'OauthCustomScope', js: 'OauthCustomScope', typ: r('MetadataType') },
        { json: 'PlatformEventChannel', js: 'PlatformEventChannel', typ: r('MetadataType') },
        { json: 'PlatformEventSubscriberConfig', js: 'PlatformEventSubscriberConfig', typ: r('MetadataType') },
        { json: 'CustomHelpMenuSection', js: 'CustomHelpMenuSection', typ: r('MetadataType') },
        { json: 'Prompt', js: 'Prompt', typ: r('MetadataType') },
        { json: 'MlDomain', js: 'MlDomain', typ: r('MetadataType') },
        { json: 'Bot', js: 'Bot', typ: r('MetadataType') },
        { json: 'AnimationRule', js: 'AnimationRule', typ: r('MetadataType') },
        { json: 'RecordActionDeployment', js: 'RecordActionDeployment', typ: r('MetadataType') },
        { json: 'EmbeddedServiceFlowConfig', js: 'EmbeddedServiceFlowConfig', typ: r('MetadataType') },
        { json: 'PlatformEventChannelMember', js: 'PlatformEventChannelMember', typ: r('MetadataType') },
        { json: 'CanvasMetadata', js: 'CanvasMetadata', typ: r('MetadataType') },
        { json: 'MobileApplicationDetail', js: 'MobileApplicationDetail', typ: r('MetadataType') },
        { json: 'LightningOnboardingConfig', js: 'LightningOnboardingConfig', typ: r('MetadataType') },
        { json: 'NotificationTypeConfig', js: 'NotificationTypeConfig', typ: r('MetadataType') },
        { json: 'ParticipantRole', js: 'ParticipantRole', typ: r('MetadataType') },
        { json: 'PaymentGatewayProvider', js: 'PaymentGatewayProvider', typ: r('MetadataType') },
        { json: 'GatewayProviderPaymentMethodType', js: 'GatewayProviderPaymentMethodType', typ: r('MetadataType') },
        { json: 'MyDomainDiscoverableLogin', js: 'MyDomainDiscoverableLogin', typ: r('MetadataType') },
        { json: 'CareProviderSearchConfig', js: 'CareProviderSearchConfig', typ: r('MetadataType') },
        { json: 'CareSystemFieldMapping', js: 'CareSystemFieldMapping', typ: r('MetadataType') },
        { json: 'DocumentType', js: 'DocumentType', typ: r('MetadataType') },
        { json: 'OcrSampleDocument', js: 'OcrSampleDocument', typ: r('MetadataType') },
        { json: 'OcrTemplate', js: 'OcrTemplate', typ: r('MetadataType') },
        { json: 'ActionPlanTemplate', js: 'ActionPlanTemplate', typ: r('MetadataType') },
        { json: 'WorkSkillRouting', js: 'WorkSkillRouting', typ: r('MetadataType') },
        { json: 'DecisionTable', js: 'DecisionTable', typ: r('MetadataType') },
        { json: 'DecisionTableDatasetLink', js: 'DecisionTableDatasetLink', typ: r('MetadataType') },
        { json: 'BatchCalcJobDefinition', js: 'BatchCalcJobDefinition', typ: r('MetadataType') },
        { json: 'BriefcaseDefinition', js: 'BriefcaseDefinition', typ: r('MetadataType') },
        { json: 'BatchProcessJobDefinition', js: 'BatchProcessJobDefinition', typ: r('MetadataType') },
        { json: 'WebStoreTemplate', js: 'WebStoreTemplate', typ: r('MetadataType') },
        { json: 'DynamicTrigger', js: 'DynamicTrigger', typ: r('MetadataType') },
        { json: 'ObjectHierarchyRelationship', js: 'ObjectHierarchyRelationship', typ: r('MetadataType') },
        { json: 'SalesAgreementSettings', js: 'SalesAgreementSettings', typ: r('MetadataType') },
        { json: 'AcctMgrTargetSettings', js: 'AcctMgrTargetSettings', typ: r('MetadataType') },
        { json: 'AccountForecastSettings', js: 'AccountForecastSettings', typ: r('MetadataType') },
        { json: 'IndustriesManufacturingSettings', js: 'IndustriesManufacturingSettings', typ: r('MetadataType') },
        { json: 'EntityImplements', js: 'EntityImplements', typ: r('MetadataType') },
        { json: 'FieldServiceMobileExtension', js: 'FieldServiceMobileExtension', typ: r('MetadataType') },
        { json: 'DataSource', js: 'DataSource', typ: r('MetadataType') },
        { json: 'DataSourceObject', js: 'DataSourceObject', typ: r('MetadataType') },
        { json: 'ExternalDataConnector', js: 'ExternalDataConnector', typ: r('MetadataType') },
        { json: 'DataConnectorS3', js: 'DataConnectorS3', typ: r('MetadataType') },
        { json: 'DataStreamDefinition', js: 'DataStreamDefinition', typ: r('MetadataType') },
        { json: 'MktDataTranObject', js: 'MktDataTranObject', typ: r('MetadataType') },
        { json: 'FieldSrcTrgtRelationship', js: 'FieldSrcTrgtRelationship', typ: r('MetadataType') },
        { json: 'ObjectSourceTargetMap', js: 'ObjectSourceTargetMap', typ: r('MetadataType') },
        { json: 'BenefitAction', js: 'BenefitAction', typ: r('MetadataType') },
        { json: 'ChannelObjectLinkingRule', js: 'ChannelObjectLinkingRule', typ: r('MetadataType') },
        { json: 'MutingPermissionSet', js: 'MutingPermissionSet', typ: r('MetadataType') },
        { json: 'ConversationVendorInfo', js: 'ConversationVendorInfo', typ: r('MetadataType') },
        { json: 'ConversationVendorFieldDef', js: 'ConversationVendorFieldDef', typ: r('MetadataType') },
        { json: 'SchedulingRule', js: 'SchedulingRule', typ: r('MetadataType') },
        { json: 'DataMappingSchema', js: 'DataMappingSchema', typ: r('MetadataType') },
        { json: 'DataMapping', js: 'DataMapping', typ: r('MetadataType') },
        { json: 'FederationDataMappingUsage', js: 'FederationDataMappingUsage', typ: r('MetadataType') },
        { json: 'ConnectedSystem', js: 'ConnectedSystem', typ: r('MetadataType') },
        { json: 'SvcCatalogCategory', js: 'SvcCatalogCategory', typ: r('MetadataType') },
        { json: 'SvcCatalogFulfillmentFlow', js: 'SvcCatalogFulfillmentFlow', typ: r('MetadataType') },
        { json: 'SvcCatalogItemDef', js: 'SvcCatalogItemDef', typ: r('MetadataType') },
        { json: 'CustomField', js: 'CustomField', typ: r('MetadataType') },
        { json: 'Index', js: 'Index', typ: r('MetadataType') },
        { json: 'BusinessProcess', js: 'BusinessProcess', typ: r('MetadataType') },
        { json: 'CompactLayout', js: 'CompactLayout', typ: r('MetadataType') },
        { json: 'RecordType', js: 'RecordType', typ: r('MetadataType') },
        { json: 'WebLink', js: 'WebLink', typ: r('MetadataType') },
        { json: 'ValidationRule', js: 'ValidationRule', typ: r('MetadataType') },
        { json: 'SharingReason', js: 'SharingReason', typ: r('MetadataType') },
        { json: 'ListView', js: 'ListView', typ: r('MetadataType') },
        { json: 'FieldSet', js: 'FieldSet', typ: r('MetadataType') },
        { json: 'CustomFieldTranslation', js: 'CustomFieldTranslation', typ: r('MetadataType') },
        { json: 'SharingOwnerRule', js: 'SharingOwnerRule', typ: r('MetadataType') },
        { json: 'SharingCriteriaRule', js: 'SharingCriteriaRule', typ: r('MetadataType') },
        { json: 'SharingGuestRule', js: 'SharingGuestRule', typ: r('MetadataType') },
        { json: 'SharingTerritoryRule', js: 'SharingTerritoryRule', typ: r('MetadataType') },
        { json: 'BotVersion', js: 'BotVersion', typ: r('MetadataType') }
    ], false),
    DecompositionConfig: o([
        { json: 'strategy', js: 'strategy', typ: r('Strategy') },
        { json: 'workspaceStrategy', js: 'workspaceStrategy', typ: r('WorkspaceStrategy') },
        { json: 'commitStrategy', js: 'commitStrategy', typ: r('CommitStrategy') },
        { json: 'metadataName', js: 'metadataName', typ: '' },
        { json: 'useSparseComposition', js: 'useSparseComposition', typ: true },
        { json: 'decompositions', js: 'decompositions', typ: a(r('Decomposition')) },
        { json: 'contentStrategy', js: 'contentStrategy', typ: r('ContentStrategy') },
        { json: 'isGlobal', js: 'isGlobal', typ: u(undefined, true) },
        { json: 'isEmptyContainer', js: 'isEmptyContainer', typ: u(undefined, true) }
    ], false),
    Decomposition: o([
        { json: 'metadataName', js: 'metadataName', typ: '' },
        { json: 'metadataEntityNameElement', js: 'metadataEntityNameElement', typ: r('MetadataEntityNameElement') },
        { json: 'xmlFragmentName', js: 'xmlFragmentName', typ: '' },
        { json: 'defaultDirectory', js: 'defaultDirectory', typ: '' },
        { json: 'ext', js: 'ext', typ: '' },
        { json: 'hasStandardMembers', js: 'hasStandardMembers', typ: true },
        { json: 'isAddressable', js: 'isAddressable', typ: true }
    ], false),
    MetadataType: o([
        { json: 'metadataName', js: 'metadataName', typ: '' },
        { json: 'isAddressable', js: 'isAddressable', typ: true },
        { json: 'isSourceTracked', js: 'isSourceTracked', typ: true },
        { json: 'ext', js: 'ext', typ: u(undefined, '') },
        { json: 'hasContent', js: 'hasContent', typ: true },
        { json: 'defaultDirectory', js: 'defaultDirectory', typ: '' },
        { json: 'nameForMsgs', js: 'nameForMsgs', typ: '' },
        { json: 'nameForMsgsPlural', js: 'nameForMsgsPlural', typ: '' },
        { json: 'contentIsBinary', js: 'contentIsBinary', typ: true },
        { json: 'childXmlNames', js: 'childXmlNames', typ: u(undefined, a('')) },
        { json: 'hasStandardMembers', js: 'hasStandardMembers', typ: u(undefined, true) },
        { json: 'deleteSupported', js: 'deleteSupported', typ: true },
        { json: 'decompositionConfig', js: 'decompositionConfig', typ: u(undefined, r('DecompositionConfig')) },
        { json: 'hasVirtualSubtypes', js: 'hasVirtualSubtypes', typ: u(undefined, true) },
        { json: 'parent', js: 'parent', typ: u(undefined, r('MetadataType')) },
        { json: 'inFolder', js: 'inFolder', typ: u(undefined, true) },
        { json: 'folderTypeDef', js: 'folderTypeDef', typ: u(undefined, r('MetadataType')) }
    ], false),
    CommitStrategy: [
        'fineGrainTracking',
        'virtualDecomposition'
    ],
    ContentStrategy: [
        'experienceBundleStrategy',
        'N/A',
        'nonDecomposedContent',
        'staticResource'
    ],
    MetadataEntityNameElement: [
        'fullName',
        'name'
    ],
    Strategy: [
        'describeMetadata',
        'nonDecomposed'
    ],
    WorkspaceStrategy: [
        'folderPerSubtype',
        'inFolderMetadataType',
        'nonDecomposed'
    ]
};
