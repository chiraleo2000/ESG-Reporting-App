/**
 * Page Objects for ESG Reporting App
 * Implements Page Object Model pattern for maintainable E2E tests
 */
import { By, WebDriver } from 'selenium-webdriver';
import { BasePage } from './driver';

/**
 * Login Page Object
 */
export class LoginPage extends BasePage {
  // Locators
  private emailInput = By.css('input[type="email"], input[name="email"]');
  private passwordInput = By.css('input[type="password"], input[name="password"]');
  private loginButton = By.css('button[type="submit"]');
  private registerLink = By.css('a[href*="register"], button:contains("Register")');
  private errorMessage = By.css('.error, .alert-error, [role="alert"]');
  private logo = By.css('.logo, [data-testid="logo"], img[alt*="logo"]');

  async navigateToLogin(): Promise<void> {
    await this.navigate('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    await this.click(this.loginButton);
    await this.sleep(1000);
  }

  async isLoginPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/login');
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.getText(this.errorMessage);
    } catch {
      return null;
    }
  }

  async clickRegister(): Promise<void> {
    await this.click(this.registerLink);
  }
}

/**
 * Register Page Object
 */
export class RegisterPage extends BasePage {
  // Locators
  private nameInput = By.css('input[name="name"], input[placeholder*="name"]');
  private emailInput = By.css('input[type="email"], input[name="email"]');
  private passwordInput = By.css('input[type="password"], input[name="password"]');
  private organizationInput = By.css('input[name="organization"], input[placeholder*="organization"], input[placeholder*="company"]');
  private registerButton = By.css('button[type="submit"]');
  private loginLink = By.css('a[href*="login"]');
  private successMessage = By.css('.success, .alert-success');

  async navigateToRegister(): Promise<void> {
    await this.navigate('/register');
  }

  async register(name: string, email: string, password: string, organization: string): Promise<void> {
    await this.type(this.nameInput, name);
    await this.type(this.emailInput, email);
    await this.type(this.passwordInput, password);
    
    if (await this.elementExists(this.organizationInput, 2000)) {
      await this.type(this.organizationInput, organization);
    }
    
    await this.click(this.registerButton);
    await this.sleep(1500);
  }

  async isRegisterPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/register');
  }
}

/**
 * Dashboard Page Object
 */
export class DashboardPage extends BasePage {
  // Locators
  private welcomeText = By.css('h1, .welcome, [data-testid="welcome"]');
  private projectsSection = By.css('.projects, [data-testid="projects"]');
  private createProjectButton = By.css('button:contains("Create Project"), button:contains("New Project"), a[href*="project/new"]');
  private navMenu = By.css('nav, .navigation, .sidebar');
  private logoutButton = By.css('button:contains("Logout"), [data-testid="logout"]');
  private userMenu = By.css('.user-menu, [data-testid="user-menu"]');

  async navigateToDashboard(): Promise<void> {
    await this.navigate('/dashboard');
  }

  async isDashboardPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/dashboard') || url === this.baseUrl + '/';
  }

  async getWelcomeText(): Promise<string> {
    try {
      return await this.getText(this.welcomeText);
    } catch {
      return '';
    }
  }

  async clickCreateProject(): Promise<void> {
    await this.click(this.createProjectButton);
  }

  async logout(): Promise<void> {
    try {
      if (await this.elementExists(this.userMenu, 2000)) {
        await this.click(this.userMenu);
        await this.sleep(500);
      }
      await this.click(this.logoutButton);
    } catch {
      // Try direct logout
      await this.navigate('/logout');
    }
  }
}

/**
 * Projects Page Object
 */
export class ProjectsPage extends BasePage {
  // Locators
  private projectList = By.css('.project-list, [data-testid="project-list"], table');
  private createButton = By.css('button:contains("Create"), button:contains("New"), [data-testid="create-project"]');
  private projectCard = By.css('.project-card, [data-testid="project-card"], tr.project-row');
  private searchInput = By.css('input[type="search"], input[placeholder*="search"]');
  private filterDropdown = By.css('select.filter, [data-testid="filter"]');

  async navigateToProjects(): Promise<void> {
    await this.navigate('/projects');
  }

  async isProjectsPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/projects');
  }

  async clickCreate(): Promise<void> {
    await this.click(this.createButton);
  }

  async getProjectCount(): Promise<number> {
    try {
      const projects = await this.driver.findElements(this.projectCard);
      return projects.length;
    } catch {
      return 0;
    }
  }

  async searchProjects(query: string): Promise<void> {
    if (await this.elementExists(this.searchInput, 3000)) {
      await this.type(this.searchInput, query);
      await this.sleep(500);
    }
  }

  async clickProject(index: number = 0): Promise<void> {
    const projects = await this.driver.findElements(this.projectCard);
    if (projects.length > index) {
      await projects[index].click();
    }
  }
}

/**
 * Project Form Page Object
 */
export class ProjectFormPage extends BasePage {
  // Locators
  private nameInput = By.css('input[name="name"], input[placeholder*="name"]');
  private descriptionInput = By.css('textarea[name="description"], textarea[placeholder*="description"]');
  private companyInput = By.css('input[name="companyName"], input[name="company"], input[placeholder*="company"]');
  private sectorSelect = By.css('select[name="sector"], [data-testid="sector-select"]');
  private yearInput = By.css('input[name="reportingYear"], input[type="number"]');
  private standardsCheckbox = By.css('input[type="checkbox"][name*="standard"]');
  private submitButton = By.css('button[type="submit"]');
  private cancelButton = By.css('button:contains("Cancel"), a[href*="projects"]');

  async fillProjectForm(data: {
    name: string;
    description?: string;
    companyName: string;
    sector?: string;
    reportingYear?: number;
  }): Promise<void> {
    await this.type(this.nameInput, data.name);
    
    if (data.description && await this.elementExists(this.descriptionInput, 2000)) {
      await this.type(this.descriptionInput, data.description);
    }
    
    await this.type(this.companyInput, data.companyName);
    
    if (data.sector && await this.elementExists(this.sectorSelect, 2000)) {
      await this.click(this.sectorSelect);
      await this.sleep(300);
      const sectorOption = By.css(`option[value="${data.sector}"]`);
      if (await this.elementExists(sectorOption, 2000)) {
        await this.click(sectorOption);
      }
    }
  }

  async submitForm(): Promise<void> {
    await this.click(this.submitButton);
    await this.sleep(1000);
  }

  async cancel(): Promise<void> {
    await this.click(this.cancelButton);
  }
}

/**
 * Activities Page Object
 */
export class ActivitiesPage extends BasePage {
  // Locators
  private activityList = By.css('.activity-list, [data-testid="activity-list"], table');
  private createButton = By.css('button:contains("Add Activity"), button:contains("Create"), [data-testid="add-activity"]');
  private activityRow = By.css('.activity-row, tr.activity, [data-testid="activity-row"]');
  private scopeFilter = By.css('select[name="scope"], [data-testid="scope-filter"]');
  private calculateButton = By.css('button:contains("Calculate"), [data-testid="calculate"]');

  async navigateToActivities(projectId?: string): Promise<void> {
    if (projectId) {
      await this.navigate(`/projects/${projectId}/activities`);
    } else {
      await this.navigate('/activities');
    }
  }

  async isActivitiesPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/activities');
  }

  async clickCreate(): Promise<void> {
    await this.click(this.createButton);
  }

  async getActivityCount(): Promise<number> {
    try {
      const activities = await this.driver.findElements(this.activityRow);
      return activities.length;
    } catch {
      return 0;
    }
  }

  async calculateEmissions(): Promise<void> {
    await this.click(this.calculateButton);
    await this.sleep(2000);
  }
}

/**
 * Reports Page Object
 */
export class ReportsPage extends BasePage {
  // Locators
  private reportList = By.css('.report-list, [data-testid="report-list"], table');
  private generateButton = By.css('button:contains("Generate"), [data-testid="generate-report"]');
  private reportRow = By.css('.report-row, tr.report, [data-testid="report-row"]');
  private standardSelect = By.css('select[name="standard"], [data-testid="standard-select"]');
  private downloadButton = By.css('button:contains("Download"), [data-testid="download"]');

  async navigateToReports(): Promise<void> {
    await this.navigate('/reports');
  }

  async isReportsPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/reports');
  }

  async clickGenerate(): Promise<void> {
    await this.click(this.generateButton);
  }

  async getReportCount(): Promise<number> {
    try {
      const reports = await this.driver.findElements(this.reportRow);
      return reports.length;
    } catch {
      return 0;
    }
  }

  async selectStandard(standard: string): Promise<void> {
    if (await this.elementExists(this.standardSelect, 3000)) {
      await this.click(this.standardSelect);
      const option = By.css(`option[value="${standard}"]`);
      await this.click(option);
    }
  }
}

/**
 * Settings Page Object
 */
export class SettingsPage extends BasePage {
  // Locators
  private profileSection = By.css('.profile, [data-testid="profile-section"]');
  private nameInput = By.css('input[name="name"]');
  private emailInput = By.css('input[name="email"]');
  private saveButton = By.css('button:contains("Save"), button[type="submit"]');
  private themeToggle = By.css('[data-testid="theme-toggle"], .theme-toggle');

  async navigateToSettings(): Promise<void> {
    await this.navigate('/settings');
  }

  async isSettingsPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes('/settings');
  }

  async updateProfile(name: string): Promise<void> {
    await this.type(this.nameInput, name);
    await this.click(this.saveButton);
    await this.sleep(1000);
  }

  async toggleTheme(): Promise<void> {
    if (await this.elementExists(this.themeToggle, 3000)) {
      await this.click(this.themeToggle);
    }
  }
}
