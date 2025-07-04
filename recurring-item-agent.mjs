// recurring-item-agent.js
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://unbrokenpockets.com/landing');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('admin@unbrokenpockets.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('Password05@@10');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(3000);

  await page.getByRole('link', { name: 'Recurring' }).click();
  await page.waitForTimeout(1000);

  // Delete any existing "Test Bill" entries
  const testBillCells = await page.locator('td', { hasText: 'Test Bill' }).all();
  for (const cell of testBillCells) {
    const row = cell.locator('..');
    const deleteButton = row.locator('button[title="Delete"], button:has-text("Delete")');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.getByRole('button', { name: /Confirm|Yes|Delete/, exact: false }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.getByRole('button', { name: 'Add Item' }).click();
  await page.getByRole('textbox', { name: 'Item Name *' }).fill('Test Bill');
  await page.getByRole('combobox', { name: 'Type *' }).click();
  await page.getByRole('option', { name: 'Fixed Expense', exact: true }).click();
  await page.getByRole('combobox', { name: 'Category *' }).click();
  await page.getByRole('option').first().click();
  await page.getByRole('textbox', { name: 'Amount ($) *' }).fill('50.00');
  await page.getByRole('combobox', { name: 'Frequency *' }).click();
  await page.getByRole('option', { name: /^Monthly$/, exact: false }).first().click();
  await page.getByRole('button', { name: 'Next Due Date *' }).click();
  await page.getByRole('gridcell').first().click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(2000);

  const recurringVisible = await page.getByRole('cell', { name: 'Test Bill' }).first().isVisible();
  if (!recurringVisible) throw new Error('Recurring item not visible');

  console.log('✅ Recurring item created and verified');
  await browser.close();
})();
