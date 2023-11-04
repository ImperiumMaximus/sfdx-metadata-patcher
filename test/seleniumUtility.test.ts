import { expect } from 'chai';
// import { testSetup } from '@salesforce/core/lib/testSetup';
// import { stubMethod } from '@salesforce/ts-sinon';
import { Messages } from '@salesforce/core';
import { By, WebDriver } from 'selenium-webdriver';
import { SeleniumUtility } from '../src/seleniumUtility';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
// const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

// const $$ = testSetup();

describe('seleniumUtility', () => {
    let driver: WebDriver;

    afterEach(async () => {
        await driver.quit();
    })

    it('creates a new webdriver', async () => {
        driver = await SeleniumUtility.getDriver('https://www.google.com/');
        expect((await driver.getCurrentUrl())).to.equal('https://www.google.com/');
    })

    it('waits until a page loads', async () => {
        driver = await SeleniumUtility.getDriver('https://www.google.com/');
        expect((await SeleniumUtility.waitUntilPageLoad(driver))).to.equal(true);
    })

    it('fills text in an input', async () => {
        driver = await SeleniumUtility.getDriver('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_text');
        await SeleniumUtility.waitUntilPageLoad(driver);
        await driver.switchTo().frame(driver.findElement(By.id('iframeResult')));
        await SeleniumUtility.fillTextInput(driver, 'fname', 'test selenium');
        expect(await driver.findElement(By.name('fname')).getAttribute('value')).to.equal('test selenium');
    })

    it('clears text and fills an input', async () => {
        driver = await SeleniumUtility.getDriver('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_text');
        await SeleniumUtility.waitUntilPageLoad(driver);
        await driver.switchTo().frame(driver.findElement(By.id('iframeResult')));
        await SeleniumUtility.fillTextInput(driver, 'fname', 'test selenium');
        await SeleniumUtility.clearAndFillTextInput(driver, 'fname', 'text clear and fill');
        expect(await driver.findElement(By.name('fname')).getAttribute('value')).to.equal('text clear and fill');
    })

    it('controls checkboxes state', async () => {
        driver = await SeleniumUtility.getDriver('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_checkbox');
        await SeleniumUtility.waitUntilPageLoad(driver);
        await driver.switchTo().frame(driver.findElement(By.id('iframeResult')));
        expect(await SeleniumUtility.setCheckboxValue(driver, 'vehicle1', true)).to.be.true;
        expect(await driver.findElement(By.name('vehicle1')).isSelected()).to.be.true;
        expect(await SeleniumUtility.setCheckboxValue(driver, 'vehicle1', true)).to.be.false;
        expect(await driver.findElement(By.name('vehicle1')).isSelected()).to.be.true;
        expect(await SeleniumUtility.setCheckboxValue(driver, 'vehicle1', false)).to.be.true;
        expect(await driver.findElement(By.name('vehicle1')).isSelected()).to.be.false;
    })

    it('clicks a button', async () => {
        driver = await SeleniumUtility.getDriver('https://www.google.com');
        await SeleniumUtility.waitUntilPageLoad(driver);
        await SeleniumUtility.clickButton(driver, 'btnI');
        expect(await driver.getCurrentUrl()).to.equal('https://www.google.com/doodles');
    });

    it('checks if an element exists', async () => {
        driver = await SeleniumUtility.getDriver('https://www.google.com');
        await SeleniumUtility.waitUntilPageLoad(driver);
        expect(await SeleniumUtility.elementExists(driver, 'q')).to.be.true;
        expect(await SeleniumUtility.elementExists(driver, 'definitely_not_existing')).to.be.false;

    });
});
