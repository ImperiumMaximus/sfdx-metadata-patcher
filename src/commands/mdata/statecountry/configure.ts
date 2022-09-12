import * as cliProgress from 'cli-progress';
import { WebDriver } from 'selenium-webdriver';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Org, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { Mdata } from '../../../mdata';
import { getAddressSettingsJson } from '../../../retrieveUtility';
import { ExcelUtility } from '../../../excelUtility';
import { LoggerLevel, TranslationDataTable } from '../../../typeDefs';
import { SeleniumUtility } from '../../../seleniumUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

export default class StateCountryConfigure extends SfdxCommand {
    public static description = messages.getMessage('statecountry.configure.description');

    public static examples = [
        `To configure the State / Country Picklist from an Excel file in the current default org
    $ sfdx mdata:statecountry:configure -f /path/to/state/country/to/configure.xlsx`

    ];

    protected static flagsConfig = {
        mappingpath: flags.string({
            char: 'f',
            description: messages.getMessage('statecountry.configure.flags.mappingpath'),
            required: true
        }),
        conflictspolicy: flags.string({
            char: 'c',
            default: 'skip',
            description: messages.getMessage('statecountry.configure.flags.conflicts'),
            options: [
                'skip',
                'rename'
            ]
        }),
        check: flags.boolean({
            char: 'v',
            default: true,
            description: messages.getMessage('statecountry.configure.flags.conflicts')
        }),
        mdatafile: flags.string({
            char: 'm',
            description: messages.getMessage('statecountry.configure.flags.mdatafile')
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

        const statesByCountries: AnyJson = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].reduce((acc: AnyJson, country: AnyJson) => {
            acc[country['isoCode'][0]] = [];
            if (Object.prototype.hasOwnProperty.call(country, 'states')) {
                acc[country['isoCode'][0]] = new Set(country['states'].map((state: AnyJson) => state['isoCode'][0]));
            }
            return acc;
        }, {});

        const countriesByIntValue: AnyJson = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].reduce((acc: AnyJson, country: AnyJson) => {
            acc[country['integrationValue'][0]] = country;
            return acc;
        }, {});

        const statesByCountryByIntValue: AnyJson = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries']
            .filter((country: AnyJson) => Object.prototype.hasOwnProperty.call(country, 'states'))
            .reduce((acc: AnyJson, country: AnyJson) => {
                acc[country['isoCode'][0]] = country['states'].reduce((sAcc: AnyJson, state: AnyJson) => {
                    sAcc[state['integrationValue']] = state;
                    return sAcc;
                }, {});
                return acc;
            }, {});

        const mappings = await ExcelUtility.importFromExcel(this.flags.mappingpath, ['Countries', 'States'], 1);

        const driver = await SeleniumUtility.getDriver(this.getStartUrl());
        if (!(await SeleniumUtility.waitUntilPageLoad(driver))) {
            throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotretrieveASMdata'));
        }

        await this.processCountries(mappings[0], statesByCountries, countriesByIntValue, driver);
        await this.processStates(mappings[1], statesByCountries, statesByCountryByIntValue, driver);

        await driver.quit();

        if (this.flags.check) {
            const r = await this.checkConfigurationStatus();
            if (r) {
                Mdata.log(messages.getMessage('statecountry.configure.infos.checkOkMessage'), LoggerLevel.INFO);
            } else {
                Mdata.log(messages.getMessage('statecountry.configure.errors.checkKoMessage'), LoggerLevel.ERROR);
            }
        }

        return null;
    }

    private getStartUrl(): string {
        return `${this.org.getConnection().instanceUrl}/secur/frontdoor.jsp?sid=${this.org.getConnection().accessToken}&retURL=/i18n/ConfigStateCountry.apexp?setupid=AddressCleanerOverview`;
    }

    private getNewCountryUrl(): string {
        return `${this.org.getConnection().instanceUrl}/i18n/ConfigureNewCountry.apexp?setupid=AddressCleanerOverview`;
    }

    private getEditExistingCountryUrl(countryIsoCode: string): string {
        return `${this.org.getConnection().instanceUrl}/i18n/ConfigureCountry.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview`;
    }

    private getNewStateUrl(countryIsoCode: string): string {
        return `${this.org.getConnection().instanceUrl}/i18n/ConfigureNewState.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview`;
    }

    private getEditExistingStateUrl(countryIsoCode: string, stateIsoCode: string): string {
        return `${this.org.getConnection().instanceUrl}/i18n/ConfigureState.apexp?countryIso=${countryIsoCode}&setupid=AddressCleanerOverview&stateIso=${stateIsoCode}`;
    }

    private async processCountries(countriesDataTable: TranslationDataTable, existingStatesByCountries: AnyJson, countriesByIntValue: AnyJson, driver: WebDriver): Promise<boolean> {
        let bar: cliProgress.SingleBar;

        if (!this.flags.json && countriesDataTable.rows.length) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('statecountry.configure.infos.countryProgressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(countriesDataTable.rows.length, 0, { countryIsoCode: countriesDataTable.rows[0]['isoCode'] });
        }

        for (const country of countriesDataTable.rows) {
            if (bar) {
                bar.update({ countryIsoCode: country['isoCode'] });
            }

            if (this.flags.conflictspolicy === 'rename' && Object.prototype.hasOwnProperty.call(countriesByIntValue, country['integrationValue']) &&
                countriesByIntValue[country['integrationValue']]['isoCode'][0] !== country['isoCode']) {
                const countryToRename = countriesByIntValue[country['integrationValue']];
                await this.editExistingCountry(driver, {
                    isoCode: countryToRename['isoCode'][0],
                    integrationValue: `${countryToRename['integrationValue'][0]}_`,
                    label: `${countryToRename['label'][0]}_`,
                    visible: false
                });
            } else if (Object.prototype.hasOwnProperty.call(countriesByIntValue, country['integrationValue']) &&
                countriesByIntValue[country['integrationValue']]['isoCode'][0] !== country['isoCode']) {
                if (bar) {
                    bar.increment(1, { countryIsoCode: country['isoCode'] });
                }
                continue;
            }

            if (!Object.prototype.hasOwnProperty.call(existingStatesByCountries, country['isoCode'])) {
                if (await this.addNewCountry(driver, country)) {
                    this.countriesToCheck[country['isoCode']] = country;
                } else {
                    throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotAddNewCountry', [country['isoCode']]));
                }
            } else if (this.flags.conflictspolicy === 'rename') {
                if (await this.editExistingCountry(driver, country)) {
                    this.countriesToCheck[country['isoCode']] = country;
                } else {
                    throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotEditExistingCountry', [country['isoCode']]));
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

    private async processStates(statesDataTable: TranslationDataTable, existingStatesByCountries: AnyJson, statesByCountryByIntValue: AnyJson, driver: WebDriver): Promise<boolean> {
        let bar: cliProgress.SingleBar;

        if (!this.flags.json && statesDataTable.rows.length) {
            bar = new cliProgress.SingleBar({
                format: messages.getMessage('statecountry.configure.infos.stateProgressBarFormat')
            }, cliProgress.Presets.shades_classic);
            bar.start(statesDataTable.rows.length, 0, { countryIsoCode: statesDataTable.rows[0]['countryIsoCode'], stateIsoCode: statesDataTable.rows[0]['isoCode'] });
        }

        for (const state of statesDataTable.rows) {
            if (bar) {
                bar.update({ countryIsoCode: state['countryIsoCode'], stateIsoCode: state['isoCode'] });
            }

            if (!Object.prototype.hasOwnProperty.call(existingStatesByCountries, state['countryIsoCode'])) {
                throw new SfdxError(messages.getMessage('statecountry.configure.erros.cannotAddStatesCountryNotExists', [state['isoCode'], state['countryIsoCode']]));
            }

            if (this.flags.conflictspolicy === 'rename' && Object.prototype.hasOwnProperty.call(statesByCountryByIntValue, state['countryIsoCode']) &&
                Object.prototype.hasOwnProperty.call(statesByCountryByIntValue[state['countryIsoCode']], state['integrationValue']) &&
                statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']]['isoCode'][0] !== state['isoCode']) {
                const stateToRename = statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']];
                await this.editExistingState(driver, {
                    isoCode: stateToRename['isoCode'][0],
                    countryIsoCode: state['countryIsoCode'],
                    integrationValue: `${stateToRename['integrationValue'][0]}_`,
                    label: `${stateToRename['label'][0]}_`,
                    visible: false
                });
            } else if (Object.prototype.hasOwnProperty.call(statesByCountryByIntValue, state['countryIsoCode']) &&
                Object.prototype.hasOwnProperty.call(statesByCountryByIntValue[state['countryIsoCode']], state['integrationValue']) &&
                statesByCountryByIntValue[state['countryIsoCode']][state['integrationValue']]['isoCode'][0] !== state['isoCode']) {
                if (bar) {
                    bar.increment(1, { countryIsoCode: state['countryIsoCode'], stateIsoCode: state['isoCode'] });
                }
                continue;
            }

            if (!existingStatesByCountries[state['countryIsoCode']].has(state['isoCode'])) {
                if (await this.addNewState(driver, state)) {
                    if (!Object.prototype.hasOwnProperty.call(this.statesToCheck, state['countryIsoCode'])) {
                        this.statesToCheck[state['countryIsoCode']] = {};
                    }

                    this.statesToCheck[state['countryIsoCode']][state['isoCode']] = state;
                } else {
                    throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotAddNewState', [state['isoCode'], state['countryIsoCode']]));
                }
            } else if (this.flags.conflictspolicy === 'rename') {
                if(await this.editExistingState(driver, state)) {
                    if (!Object.prototype.hasOwnProperty.call(this.statesToCheck, state['countryIsoCode'])) {
                        this.statesToCheck[state['countryIsoCode']] = {};
                    }

                    this.statesToCheck[state['countryIsoCode']][state['isoCode']] = state;
                } else {
                    throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotEditExistingState', [state['isoCode'], state['countryIsoCode']]));
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

    private async addNewCountry(driver: WebDriver, country: object): Promise<boolean> {
        try {
            await driver.get(this.getNewCountryUrl());
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:nameSectionItem:editName', country['label']);
            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:codeSectionItem:editIsoCode', country['isoCode']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurenew:j_id1:blockNew:j_id7:intValSectionItem:editIntVal', country['integrationValue']);

            const isActive = country['active'] === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id7:activeSectionItem:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurenew:j_id1:blockNew:j_id7:visibleSectionItem:editVisible');
            }

            const isVisible = country['visible'] === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id7:visibleSectionItem:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurenew:j_id1:blockNew:j_id41:addButton');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotAddNewCountry', [country['isoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async editExistingCountry(driver: WebDriver, country: object): Promise<boolean> {
        try {
            await driver.get(this.getEditExistingCountryUrl(country['isoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id34:editName', country['label']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id40:editIntVal', country['integrationValue']);

            const isActive = country['active'] === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id43:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id46:editVisible');
            }

            const isVisible = country['visible'] === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id33:j_id46:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurecountry:form:blockTopButtons:j_id6:saveButtonTop');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotEditExistingCountry', [country['isoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async addNewState(driver: WebDriver, state: object): Promise<boolean> {
        try {
            await driver.get(this.getNewStateUrl(state['countryIsoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:nameSectionItem:editName', state['label']);
            await SeleniumUtility.fillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:codeSectionItem:editIsoCode', state['isoCode']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurenew:j_id1:blockNew:j_id9:intValSectionItem:editIntVal', state['integrationValue']);

            const isActive = state['active'] === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id9:activeSectionItem:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurenew:j_id1:blockNew:j_id9:visibleSectionItem:editVisible');
            }

            const isVisible = state['visible'] === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurenew:j_id1:blockNew:j_id9:visibleSectionItem:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurenew:j_id1:blockNew:j_id43:addButton');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotAddNewState', [state['isoCode'], state['countryIsoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async editExistingState(driver: WebDriver, state: object): Promise<boolean> {
        try {
            await driver.get(this.getEditExistingStateUrl(state['countryIsoCode'], state['isoCode']));
            await SeleniumUtility.waitUntilPageLoad(driver);

            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id37:editName', state['label']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id40:editIsoCode', state['isoCode']);
            await SeleniumUtility.clearAndFillTextInput(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id43:editIntVal', state['integrationValue']);

            const isActive = state['active'] === 'true';
            const activeChanged = await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id46:editActive', isActive);

            if (activeChanged) {
                await SeleniumUtility.waitToBeStaleness(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id49:editVisible');
            }

            const isVisible = state['visible'] === 'true';
            if (isActive && isVisible) {
                await SeleniumUtility.setCheckboxValue(driver, 'configurecountry:form:blockEditCountry:j_id9:j_id49:editVisible', isVisible);
            }

            await SeleniumUtility.clickButton(driver, 'configurecountry:form:blockEditCountry:j_id8:saveButtonTop');

            await SeleniumUtility.waitUntilPageLoad(driver);

            const currentUrl = await driver.getCurrentUrl();

            if (!currentUrl.endsWith('success=true')) {
                throw new SfdxError(messages.getMessage('statecountry.configure.errors.cannotEditExistingState', [state['isoCode'], state['countryIsoCode']]));
            }
        } catch (err) {
            return false;
        }

        return true;
    }

    private async checkConfigurationStatus(): Promise<boolean> {
        let res = false;
        const addressSettingsJson = await getAddressSettingsJson(null, this.org.getUsername());

        res = Object.keys(this.countriesToCheck).length ? Object.keys(this.countriesToCheck).reduce((acc: boolean, countryIsoCode: string) => {
            const cIdx = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].findIndex((country: AnyJson) => country['isoCode'][0] === countryIsoCode);
            return acc &&
                cIdx >= 0 && addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['label'][0] === this.countriesToCheck[countryIsoCode]['label'] &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['integrationValue'][0] === this.countriesToCheck[countryIsoCode]['integrationValue'] &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['active'][0] === this.countriesToCheck[countryIsoCode]['active'] &&
                addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['visible'][0] === this.countriesToCheck[countryIsoCode]['visible'];
        }, true) : res;


        res = Object.keys(this.statesToCheck).length ? Object.keys(this.statesToCheck).reduce((acc: boolean, countryIsoCode: string) => {
            const cIdx = addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'].findIndex((country: AnyJson) => country['isoCode'][0] === countryIsoCode);

            return acc && cIdx >= 0 && Object.keys(this.statesToCheck[countryIsoCode]).reduce((sAcc: boolean, stateIsoCode: string) => {
                const sIdx = Object.prototype.hasOwnProperty.call(addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx], 'states') ?
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'].findIndex((state: AnyJson) => state['isoCode'][0] === stateIsoCode) : -1;

                return sAcc && sIdx >= 0 && addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['label'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['label'] &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['integrationValue'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['integrationValue'] &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['active'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['active'] &&
                    addressSettingsJson['AddressSettings']['countriesAndStates'][0]['countries'][cIdx]['states'][sIdx]['visible'][0] === this.statesToCheck[countryIsoCode][stateIsoCode]['visible'];
            }, true);
        }, true) : res;

        return res;
    }
}
