import * as cliProgress from 'cli-progress';
import { WebDriver } from 'selenium-webdriver';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, Org, SfError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { getAddressSettingsJson } from '../../../retrieveUtility';
import { ExcelUtility } from '../../../excelUtility';
import { AddressSettingsMetadata, AddressSettingsMetadataCountry, AddressSettingsMetadataState, CountryDataTable, CountryDataTableRow, StateDataTableRow, StatesDataTable } from '../../../typeDefs';
import { SeleniumUtility } from '../../../seleniumUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class StateCountryConfigure extends SfCommand<AnyJson> {
    public static readonly summary = messages.getMessage('statecountry.configure.description');

    public static readonly examples = [
        `To configure the State / Country Picklist from an Excel file in the current default org
    $ sfdx mdata:statecountry:configure -f /path/to/state/country/to/configure.xlsx`

    ];

    public static readonly flags = {
        mappingpath: Flags.string({
            char: 'f',
            summary: messages.getMessage('statecountry.configure.flags.mappingpath'),
            required: true
        }),
        conflictspolicy: Flags.string({
            char: 'c',
            default: 'skip',
            summary: messages.getMessage('statecountry.configure.flags.conflicts'),
            options: [
                'skip',
                'rename'
            ]
        }),
        check: Flags.boolean({
            char: 'v',
            default: true,
            summary: messages.getMessage('statecountry.configure.flags.conflicts')
        }),
        mdatafile: Flags.string({
            char: 'm',
            summary: messages.getMessage('statecountry.configure.flags.mdatafile')
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
      mappingpath: string;
      conflictspolicy: string;
      check: boolean;
      mdatafile: string;
      targetusername: string;
      loglevel: string;
      'api-version'?: string;
    };

    protected org: Org;

    protected countriesToCheck: { [key: string]: CountryDataTableRow } = {};
    protected statesToCheck: { [key: string]: { [key: string]: StateDataTableRow } } = {};
    protected skippedCountries = new Set();

    public async run(): Promise<AnyJson> {
        this.actualFlags = (await this.parse(StateCountryConfigure)).flags;

        this.org = await Org.create({ aliasOrUsername: this.actualFlags.targetusername });

        this.log(messages.getMessage('general.infos.usingUsername', [this.org.getUsername()]));

        const addressSettingsJson: AddressSettingsMetadata = await getAddressSettingsJson(this.actualFlags.mdatafile, this.org.getUsername());

        const statesByCountries: { [key: string]: Set<string> } = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].reduce((acc, country) => {
            acc[country['isoCode'][0]] = new Set();
            if (Object.prototype.hasOwnProperty.call(country, 'states')) {
                acc[country['isoCode'][0]] = new Set(country['states'].map((state: AddressSettingsMetadataState) => state['isoCode'][0]));
            }
            return acc;
        }, {});

        const countriesByIntValue: { [key: string]: AddressSettingsMetadataCountry } = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].reduce((acc, country) => {
            acc[country['integrationValue'][0]] = country;
            return acc;
        }, {});

        const statesByCountryByIntValue: { [key: string]: { [key: string]: AddressSettingsMetadataState } } = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries']
            .filter((country: AnyJson) => Object.prototype.hasOwnProperty.call(country, 'states'))
            .reduce((acc: { [key: string]: {
              [key: string]: AddressSettingsMetadataState;
            }; }, country: AddressSettingsMetadataCountry) => {
                acc[country['isoCode'][0]] = country['states'].reduce((sAcc: { [key: string]: AddressSettingsMetadataState }, state: AddressSettingsMetadataState) => {
                    sAcc[state['integrationValue'][0]] = state;
                    return sAcc;
                }, {});
                return acc;
            }, {});

        const mappings = await ExcelUtility.importFromExcel<['label' | 'isoCode' | 'integrationValue' | 'active' | 'visible', 'countryIsoCode' | 'label' | 'isoCode' | 'integrationValue' | 'active' | 'visible']>(this.actualFlags.mappingpath, ['Countries', 'States'], 1);

        const driver = await SeleniumUtility.getDriver(this.getStartUrl());
        if (!(await SeleniumUtility.waitUntilPageLoad(driver))) {
            throw new SfError(messages.getMessage('statecountry.configure.errors.cannotretrieveASMdata'));
        }

        await this.processCountries(mappings[0] as CountryDataTable, statesByCountries, countriesByIntValue, driver);
        await this.processStates(mappings[1] as StatesDataTable, statesByCountries, statesByCountryByIntValue, driver);

        await driver.quit();

        if (this.actualFlags.check) {
            if (await this.checkConfigurationStatus()) {
                this.log(messages.getMessage('statecountry.configure.infos.checkOkMessage'));
            } else {
                this.logToStderr(messages.getMessage('statecountry.configure.errors.checkKoMessage'));
            }
        }

        return null;
    }

    private getStartUrl(): string {
        return `${this.org.getConnection(this.actualFlags['api-version']).instanceUrl}/secur/frontdoor.jsp?sid=${this.org.getConnection(this.actualFlags['api-version']).accessToken}&retURL=/i18n/ConfigStateCountry.apexp?setupid=AddressCleanerOverview`;
    }

    private getNewCountryUrl(): string {
        return `${this.org.getConnection(this.actualFlags['api-version']).instanceUrl}/i18n/ConfigureNewCountry.apexp?setupid=AddressCleanerOverview`;
    }

    private getEditExistingCountryUrl(countryIsoCode: string): string {
        return `${this.org.getConnection(this.actualFlags['api-version']).instanceUrl}/i18n/ConfigureCountry.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview`;
    }

    private getNewStateUrl(countryIsoCode: string): string {
        return `${this.org.getConnection(this.actualFlags['api-version']).instanceUrl}/i18n/ConfigureNewState.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview`;
    }

    private getEditExistingStateUrl(countryIsoCode: string, stateIsoCode: string): string {
        return `${this.org.getConnection(this.actualFlags['api-version']).instanceUrl}/i18n/ConfigureState.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview&stateIso=${stateIsoCode}`;
    }

    private async processCountries(countriesDataTable: CountryDataTable, existingStatesByCountries:  { [key: string]: Set<string> }, countriesByIntValue:  { [key: string]: AddressSettingsMetadataCountry }, driver: WebDriver): Promise<boolean> {
        let bar: cliProgress.SingleBar;

        if (!this.jsonEnabled() && countriesDataTable.rows.length) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('statecountry.configure.infos.countryProgressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(countriesDataTable.rows.length, 0, { countryIsoCode: countriesDataTable.rows[0].isoCode });
        }

        for (const country of countriesDataTable.rows) {
            if (bar) {
                bar.update({ countryIsoCode: country.isoCode });
            }

            if (this.actualFlags.conflictspolicy === 'rename' && Object.prototype.hasOwnProperty.call(countriesByIntValue, country['integrationValue']) &&
                countriesByIntValue[country.integrationValue]['isoCode'][0] !== country.isoCode) {
                const countryToRename = countriesByIntValue[country['integrationValue']];
                const countryToRenameNewConfig = {
                    isoCode: countryToRename['isoCode'][0],
                    integrationValue: `${countryToRename['integrationValue'][0]}_`,
                    label: `${countryToRename['label'][0]}_`,
                    active: `${countryToRename['active'][0]}`,
                    visible: 'false'
                };
                // eslint-disable-next-line no-await-in-loop
                await this.editExistingCountry(driver, countryToRenameNewConfig);
                this.countriesToCheck[countryToRenameNewConfig['isoCode']] = countryToRenameNewConfig;
            } else if (Object.prototype.hasOwnProperty.call(countriesByIntValue, country['integrationValue']) &&
                countriesByIntValue[country['integrationValue']]['isoCode'][0] !== country['isoCode']) {
                this.skippedCountries.add(country['isoCode']);
                if (bar) {
                    bar.increment(1, { countryIsoCode: country['isoCode'] });
                }
                continue;
            }

            if (!Object.prototype.hasOwnProperty.call(existingStatesByCountries, country['isoCode'])) {
                // eslint-disable-next-line no-await-in-loop
                if (await this.addNewCountry(driver, country)) {
                    this.countriesToCheck[country['isoCode']] = country;
                    existingStatesByCountries[country['isoCode']] = new Set();
                } else {
                    throw new SfError(messages.getMessage('statecountry.configure.errors.cannotAddNewCountry', [country['isoCode']]));
                }
            } else if (this.actualFlags.conflictspolicy === 'rename') {
                // eslint-disable-next-line no-await-in-loop
                if (await this.editExistingCountry(driver, country)) {
                    this.countriesToCheck[country['isoCode']] = country;
                } else {
                    throw new SfError(messages.getMessage('statecountry.configure.errors.cannotEditExistingCountry', [country['isoCode']]));
                }
            }
            if (bar) {
                bar.increment(1, { countryIsoCode: country['isoCode'] });
            }
        }

        if (bar) {
            bar.update(countriesDataTable.rows.length, { countryIsoCode: 'Completed' });
            bar.stop();
        }

        return true;
    }

    // eslint-disable-next-line complexity
    private async processStates(statesDataTable: StatesDataTable, existingStatesByCountries: { [key: string]: Set<string> }, statesByCountryByIntValue: { [key: string]: { [key: string]: AddressSettingsMetadataState } }, driver: WebDriver): Promise<boolean> {
        let bar: cliProgress.SingleBar;

        if (!this.jsonEnabled() && statesDataTable.rows.length) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('statecountry.configure.infos.stateProgressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(statesDataTable.rows.length, 0, { countryIsoCode: statesDataTable.rows[0]['countryIsoCode'], stateIsoCode: statesDataTable.rows[0]['isoCode'] });
        }

        for (const state of statesDataTable.rows) {
            if (bar) {
                bar.update({ countryIsoCode: state['countryIsoCode'], stateIsoCode: state['isoCode'] });
            }

            if (this.skippedCountries.has(state['countryIsoCode'])) {
                continue;
            }

            if (!Object.prototype.hasOwnProperty.call(existingStatesByCountries, state['countryIsoCode'])) {
                throw new SfError(messages.getMessage('statecountry.configure.errors.cannotAddStatesCountryNotExists', [state['isoCode'], state['countryIsoCode']]));
            }

            if (this.actualFlags.conflictspolicy === 'rename' && Object.prototype.hasOwnProperty.call(statesByCountryByIntValue, state['countryIsoCode']) &&
                Object.prototype.hasOwnProperty.call(statesByCountryByIntValue[state['countryIsoCode']], state['integrationValue']) &&
                statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']]['isoCode'][0] !== state['isoCode']) {
                const stateToRename = statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']];
                const stateToRenameNewConfig: StateDataTableRow = {
                    isoCode: stateToRename['isoCode'][0],
                    countryIsoCode: state['countryIsoCode'],
                    integrationValue: `${stateToRename['integrationValue'][0]}_`,
                    label: `${stateToRename['label'][0]}_`,
                    active: `${stateToRename['active'][0]}`,
                    visible: 'false'
                };
                // eslint-disable-next-line no-await-in-loop
                await this.editExistingState(driver, stateToRenameNewConfig);
                this.statesToCheck[stateToRenameNewConfig['countryIsoCode']][stateToRename['isoCode'][0]] = stateToRenameNewConfig;
            } else if (Object.prototype.hasOwnProperty.call(statesByCountryByIntValue, state['countryIsoCode']) &&
                Object.prototype.hasOwnProperty.call(statesByCountryByIntValue[state['countryIsoCode']], state['integrationValue']) &&
                statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']]['isoCode'][0] !== state['isoCode']) {
                if (bar) {
                    bar.increment(1, { countryIsoCode: state['countryIsoCode'], stateIsoCode: state['isoCode'] });
                }
                continue;
            }

            if (!existingStatesByCountries[state['countryIsoCode']].has(state['isoCode'])) {
                // eslint-disable-next-line no-await-in-loop
                if (await this.addNewState(driver, state)) {
                    if (!Object.prototype.hasOwnProperty.call(this.statesToCheck, state['countryIsoCode'])) {
                        this.statesToCheck[state['countryIsoCode']] = {};
                    }

                    this.statesToCheck[state['countryIsoCode']][state['isoCode']] = state;
                } else {
                    throw new SfError(messages.getMessage('statecountry.configure.errors.cannotAddNewState', [state['isoCode'], state['countryIsoCode']]));
                }
            } else if (this.actualFlags.conflictspolicy === 'rename') {
                // eslint-disable-next-line no-await-in-loop
                if(await this.editExistingState(driver, state)) {
                    if (!Object.prototype.hasOwnProperty.call(this.statesToCheck, state['countryIsoCode'])) {
                        this.statesToCheck[state['countryIsoCode']] = {};
                    }

                    this.statesToCheck[state['countryIsoCode']][state['isoCode']] = state;
                } else {
                    throw new SfError(messages.getMessage('statecountry.configure.errors.cannotEditExistingState', [state['isoCode'], state['countryIsoCode']]));
                }
            }

            if (bar) {
                bar.increment(1, { countryIsoCode: state['countryIsoCode'], stateIsoCode: state['isoCode'] });
            }
        }

        if (bar) {
            bar.update(statesDataTable.rows.length, { countryIsoCode: 'Completed', stateIsoCode: 'Completed' });
            bar.stop();
        }

        return true;
    }

    private async addNewCountry(driver: WebDriver, country: CountryDataTableRow): Promise<boolean> {
        try {
            await driver.get(this.getNewCountryUrl());
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:nameSectionItem:editName', country['label']);
            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:codeSectionItem:editIsoCode', country['isoCode']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:intValSectionItem:editIntVal', country['integrationValue']);

            const isActive = country['active'].toString() === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id7:activeSectionItem:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurenew:j_id1:blockNew:j_id7:visibleSectionItem:editVisible');
            }

            const isVisible = country['visible'].toString() === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id7:visibleSectionItem:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurenew:j_id1:blockNew:j_id41:addButton');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfError(messages.getMessage('statecountry.configure.errors.cannotAddNewCountry', [country['isoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async editExistingCountry(driver: WebDriver, country: CountryDataTableRow): Promise<boolean> {
        try {
            await driver.get(this.getEditExistingCountryUrl(country['isoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id34:editName', country['label']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id40:editIntVal', country['integrationValue']);

            const isActive = country['active'].toString() === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id43:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id46:editVisible');
            }

            const isVisible = country['visible'].toString() === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id46:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurecountry:form:blockTopButtons:j_id6:saveButtonTop');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfError(messages.getMessage('statecountry.configure.errors.cannotEditExistingCountry', [country['isoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async addNewState(driver: WebDriver, state: StateDataTableRow): Promise<boolean> {
        try {
            await driver.get(this.getNewStateUrl(state['countryIsoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:nameSectionItem:editName', state['label']);
            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:codeSectionItem:editIsoCode', state['isoCode']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:intValSectionItem:editIntVal', state['integrationValue']);

            const isActive = state['active'].toString() === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id9:activeSectionItem:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurenew:j_id1:blockNew:j_id9:visibleSectionItem:editVisible');
            }

            const isVisible = state['visible'].toString() === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id9:visibleSectionItem:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurenew:j_id1:blockNew:j_id43:addButton');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfError(messages.getMessage('statecountry.configure.errors.cannotAddNewState', [state['isoCode'], state['countryIsoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async editExistingState(driver: WebDriver, state: StateDataTableRow): Promise<boolean> {
        try {
            await driver.get(this.getEditExistingStateUrl(state['countryIsoCode'], state['isoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id37:editName', state['label']);
            if (await SeleniumUtility.elementExists(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id40:editIsoCode')) {
                await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id40:editIsoCode', state['isoCode']);
            }
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id43:editIntVal', state['integrationValue']);

            const isActive = state['active'].toString() === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id46:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id49:editVisible');
            }

            const isVisible = state['visible'].toString() === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id49:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurecountry:form:blockEditCountry:j_id8:saveButtonTop');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfError(messages.getMessage('statecountry.configure.errors.cannotEditExistingState', [state['isoCode'], state['countryIsoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async checkConfigurationStatus(): Promise<boolean> {
        let res = false;
        const addressSettingsJson: AddressSettingsMetadata = await getAddressSettingsJson(null, this.org.getUsername());

        res = Object.keys(this.countriesToCheck).length ? Object.keys(this.countriesToCheck).reduce((acc: boolean, countryIsoCode: string) => {
            const cIdx = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].findIndex((country) => country['isoCode'][0] === countryIsoCode);
            return acc &&
                cIdx >= 0 && addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['label'][0] === this.countriesToCheck[countryIsoCode]['label'] &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['integrationValue'][0] === this.countriesToCheck[countryIsoCode]['integrationValue'] &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['active'][0].toString() === this.countriesToCheck[countryIsoCode]['active'].toString() &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['visible'][0].toString() === this.countriesToCheck[countryIsoCode]['visible'].toString();
        }, true) : res;

        res = res && Object.keys(this.statesToCheck).length ? Object.keys(this.statesToCheck).reduce((acc: boolean, countryIsoCode: string) => {
            const cIdx = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].findIndex((country) => country['isoCode'][0] === countryIsoCode);

            return acc && cIdx >= 0 && Object.keys(this.statesToCheck[countryIsoCode]).reduce((sAcc: boolean, stateIsoCode: string) => {
                const sIdx = Object.prototype.hasOwnProperty.call(addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx], 'states') ?
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'].findIndex((state) => state['isoCode'][0] === stateIsoCode) : -1;

                return sAcc && sIdx >= 0 && addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['label'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['label'] &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['integrationValue'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['integrationValue'] &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['active'][0].toString() === this.statesToCheck[countryIsoCode][stateIsoCode]['active'].toString() &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['visible'][0].toString() === this.statesToCheck[countryIsoCode][stateIsoCode]['visible'].toString();
            }, true);
        }, true) : res;

        return res;
    }
}
