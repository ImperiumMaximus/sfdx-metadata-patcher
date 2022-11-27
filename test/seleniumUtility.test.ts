import { expect, test } from '@salesforce/command/lib/test';
// import { testSetup } from '@salesforce/core/lib/testSetup';
// import { stubMethod } from '@salesforce/ts-sinon';
import { Messages } from '@salesforce/core';
import { SeleniumUtility } from '../src/seleniumUtility';
import { By, WebDriver } from 'selenium-webdriver';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
//const messages = Messages.loadMessages('sfdx-metadata-patcher', 'mdata');

// const $$ = testSetup();

describe('seleniumUtility', () => {
    let driver: WebDriver;
    
    afterEach(async () => {
        await driver.quit();
    })

    test
        .it('creates a new webdriver', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.google.com/');
            expect((await driver.getCurrentUrl())).to.equal('https://www.google.com/');
        })

    test
        .it('waits until a page loads', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.google.com/');
            expect((await SeleniumUtility.waitUntilPageLoad(driver))).to.equal(true);
        })
    
    test
        .it('fills text in an input', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_text');
            await SeleniumUtility.waitUntilPageLoad(driver);
            await driver.switchTo().frame(driver.findElement(By.id('iframeResult')));
            await SeleniumUtility.fillTextInput(driver, 'fname', 'test selenium');
            expect(await driver.findElement(By.name('fname')).getAttribute('value')).to.equal('test selenium');
        })

    test
        .it('clears text and fills an input', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.w3schools.com/tags/tryit.asp?filename=tryhtml5_input_type_text');
            await SeleniumUtility.waitUntilPageLoad(driver);
            await driver.switchTo().frame(driver.findElement(By.id('iframeResult')));
            await SeleniumUtility.fillTextInput(driver, 'fname', 'test selenium');
            await SeleniumUtility.clearAndFillTextInput(driver, 'fname', 'text clear and fill');
            expect(await driver.findElement(By.name('fname')).getAttribute('value')).to.equal('text clear and fill');
        })

    test
        .it('controls checkboxes state', async _ => {
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

    test
        .it('clicks a button', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.google.com');
            await SeleniumUtility.waitUntilPageLoad(driver);
            await SeleniumUtility.clickButton(driver, 'btnI');
            expect(await driver.getCurrentUrl()).to.equal('https://www.google.com/doodles');
        });
    
    test
        .it('checks if an element exists', async _ => {
            driver = await SeleniumUtility.getDriver('https://www.google.com');
            await SeleniumUtility.waitUntilPageLoad(driver);
            expect(await SeleniumUtility.elementExists(driver, 'q')).to.be.true;
            expect(await SeleniumUtility.elementExists(driver, 'definitely_not_existing')).to.be.false;

        });
});