import * as os from 'os';
import * as webdriver from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as chromedriver from 'chromedriver';
import { stalenessOf } from 'selenium-webdriver/lib/until';

export class SeleniumUtility {

    public static async getDriver(startUrl: string): Promise<webdriver.WebDriver> {
        const cService = new chrome.ServiceBuilder(chromedriver.path).build();

        const cOpts = new chrome.Options();
        cOpts.excludeSwitches('enable-automation');
        cOpts.addArguments('--no-sandbox', '--headless', '--disable-dev-shm-usage', '--disable-gpu');

        const driver = chrome.Driver.createSession(cOpts, cService);

        await driver.manage().setTimeouts({ implicit: 30000, pageLoad: 30000, script: 30000 });
        await driver.get(startUrl);

        return driver;
    }

    public static async waitUntilPageLoad(driver: webdriver.WebDriver): Promise<boolean> {
        return driver.wait(() =>
            driver.executeScript('return document.readyState').then(readyState => readyState === 'complete'));
    }

    public static async clearAndFillTextInput(driver: webdriver.WebDriver, name: string, value: string) {
        await driver.findElement(webdriver.By.name(name)).sendKeys(webdriver.Key.chord(os.platform() === 'darwin' ? webdriver.Key.COMMAND : webdriver.Key.CONTROL, 'a'),
            webdriver.Key.CANCEL,
            value);
    }

    public static async fillTextInput(driver: webdriver.WebDriver, name: string, value: string) {
        await driver.findElement(webdriver.By.name(name)).sendKeys(value);
    }

    public static async setCheckboxValue(driver: webdriver.WebDriver, name: string, value: boolean): Promise<boolean> {
        if (!(await this.elementExists(driver, name))) {
            return false;
        }

        const checkbox = await driver.findElement(webdriver.By.name(name));

        if ((await checkbox.isSelected()) !== value) {
            await driver.wait(() =>
                driver.executeScript('arguments[0].click()', checkbox).then(() => true));
            return true;
        }

        return false;
    }

    public static async waitToBeStaleness(driver: webdriver.WebDriver, name: string) {
        const element = await driver.findElement(webdriver.By.name(name));
        await driver.wait(stalenessOf(element));
    }

    public static async clickButton(driver: webdriver.WebDriver, name: string) {
        await driver.wait(() =>
            driver.executeScript('arguments[0].click()', driver.findElement(webdriver.By.name(name))).then(() => true));
    }

    public static async elementExists(driver: webdriver.WebDriver, name: string) {
        return driver.findElement(webdriver.By.name(name)).then(el => !!el).catch(() => false);
    }
}
