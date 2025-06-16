// exploration-agent.js
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const log = [];
  const screenshotDir = './screenshots';
  fs.mkdirSync(screenshotDir, { recursive: true });

  const visit = async (stepName, action) => {
    log.push(`STEP: ${stepName}`);
    try {
      await action();
      const screenshotPath = `${screenshotDir}/${stepName.replace(/\s+/g, '_')}.png`;
      await page.screenshot({ path: screenshotPath });
      log.push(`✔ Success: ${stepName}`);
    } catch (err) {
      log.push(`✖ Failed: ${stepName} - ${err.message}`);
    }
  };

  await visit('Go to site', async () => {
    await page.goto('https://unbrokenpockets.com/landing');
  });

  await visit('Click Sign In', async () => {
    await page.getByRole('button', { name: 'Sign In' }).click();
  });

  await visit('Login', async () => {
    await page.getByRole('textbox', { name: 'Email' }).fill('admin@unbrokenpockets.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('Password05@@10');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(3000);
  });

  const pagesToTest = [
    { label: 'Dashboard', role: 'link' },
    { label: 'Budget', role: 'link' },
    { label: 'Transactions', role: 'link' },
    { label: 'Recurring', role: 'link' },
    { label: 'Goals', role: 'link' },
    { label: 'Investments', role: 'link' },
    { label: 'Reports', role: 'link' },
    { label: 'Accounts', role: 'link' },
  ];

  for (const pageLink of pagesToTest) {
    await visit(`Visit ${pageLink.label}`, async () => {
      await page.getByRole(pageLink.role, { name: pageLink.label }).click();
      await page.waitForTimeout(2000);
    });
  }

  await visit('Try Opening Calendar View in Recurring', async () => {
    await page.getByRole('link', { name: 'Recurring' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('tab', { name: 'Calendar View' }).click();
  });

  await visit('Try Opening Add Transaction Modal and Fill', async () => {
    await page.getByRole('link', { name: 'Transactions' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Record Transaction' }).click();
    await page.getByRole('button', { name: 'Variable Expense' }).click();
    await page.getByRole('combobox', { name: 'Select Variable Expense *' }).click();
    await page.getByRole('option').first().click();
    await page.getByPlaceholder('0.00').fill('123.45');
    await page.getByRole('combobox', { name: 'Account *' }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await page.waitForTimeout(2000);
    const isVisible = await page.getByText('$123.45').isVisible();
    if (!isVisible) throw new Error('Transaction not visible');
  });

  await visit('Try Opening Add Recurring Item Flow and Fill', async () => {
    await page.getByRole('link', { name: 'Recurring' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.getByRole('textbox', { name: 'Item Name *' }).fill('Test Bill');
    await page.getByRole('combobox', { name: 'Type *' }).click();
    await page.getByRole('option', { name: 'Fixed Expense' }).click();
    await page.getByRole('combobox', { name: 'Category *' }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('textbox', { name: 'Amount ($) *' }).fill('50.00');
    await page.getByRole('combobox', { name: 'Frequency *' }).click();
    await page.getByRole('option', { name: 'Monthly' }).click();
    await page.getByRole('button', { name: 'Next Due Date *' }).click();
    await page.getByRole('gridcell').first().click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);
    const recurringVisible = await page.getByText('Test Bill').isVisible();
    if (!recurringVisible) throw new Error('Recurring item not visible');
  });

  fs.writeFileSync('./exploration_log.txt', log.join('\n'));

  console.log('🧪 Exploration complete. Log written to exploration_log.txt');
  console.log(log.join('\n'));

  await browser.close();
})();
