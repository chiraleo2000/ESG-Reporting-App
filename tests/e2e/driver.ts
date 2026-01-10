/**
 * Selenium WebDriver Factory
 * Creates and manages WebDriver instances for E2E testing
 */
import { Builder, WebDriver, By, until, WebElement } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { TEST_CONFIG } from './setup';

export class DriverFactory {
  private static driver: WebDriver | null = null;

  /**
   * Create a new WebDriver instance
   */
  static async createDriver(): Promise<WebDriver> {
    const options = new chrome.Options();
    
    if (TEST_CONFIG.HEADLESS) {
      options.addArguments('--headless=new');
    }
    
    options.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--disable-infobars',
      '--ignore-certificate-errors'
    );

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set implicit wait
    await this.driver.manage().setTimeouts({
      implicit: 10000,
      pageLoad: 30000,
      script: 30000,
    });

    return this.driver;
  }

  /**
   * Get the current WebDriver instance
   */
  static getDriver(): WebDriver {
    if (!this.driver) {
      throw new Error('WebDriver not initialized. Call createDriver() first.');
    }
    return this.driver;
  }

  /**
   * Quit the WebDriver instance
   */
  static async quitDriver(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }
}

/**
 * Page Object Base Class
 */
export class BasePage {
  protected driver: WebDriver;
  protected baseUrl: string;

  constructor(driver: WebDriver, baseUrl: string = TEST_CONFIG.FRONTEND_URL) {
    this.driver = driver;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to a path
   */
  async navigate(path: string = ''): Promise<void> {
    await this.driver.get(`${this.baseUrl}${path}`);
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: By, timeout: number = 10000): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(locator), timeout);
  }

  /**
   * Wait for element to be clickable
   */
  async waitForClickable(locator: By, timeout: number = 10000): Promise<WebElement> {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  /**
   * Click an element
   */
  async click(locator: By): Promise<void> {
    const element = await this.waitForClickable(locator);
    await element.click();
  }

  /**
   * Type text into an input
   */
  async type(locator: By, text: string): Promise<void> {
    const element = await this.waitForElement(locator);
    await element.clear();
    await element.sendKeys(text);
  }

  /**
   * Get element text
   */
  async getText(locator: By): Promise<string> {
    const element = await this.waitForElement(locator);
    return element.getText();
  }

  /**
   * Check if element exists
   */
  async elementExists(locator: By, timeout: number = 5000): Promise<boolean> {
    try {
      await this.driver.wait(until.elementLocated(locator), timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for URL to contain text
   */
  async waitForUrl(urlPart: string, timeout: number = 10000): Promise<void> {
    await this.driver.wait(until.urlContains(urlPart), timeout);
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(filename: string): Promise<string> {
    const screenshot = await this.driver.takeScreenshot();
    return screenshot;
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
