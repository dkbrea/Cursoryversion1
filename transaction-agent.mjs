// transaction-agent.js
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

  await page.getByRole('link', { name: 'Transactions' }).click();
  await page.waitForTimeout(1500);

  // Delete any existing "Test Bill" transactions
  const testTxCells = await page.locator('td', { hasText: 'Test Bill' }).all();
  for (const cell of testTxCells) {
    const row = cell.locator('..');
    const deleteButton = row.locator('button[title="Delete"], button:has-text("Delete")');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.getByRole('button', { name: /Confirm|Yes|Delete/, exact: false }).click();
      await page.waitForTimeout(1000);
    }
  }

  // Add new transaction using the recurring item "Test Bill"
  await page.getByRole('button', { name: 'Record Transaction' }).click();
  await page.waitForSelector('form');

  await page.getByRole('button', { name: 'Fixed Expense' }).click();
  await page.getByLabel('Select Fixed Expense *').click();
  await page.getByRole('option', { name: 'Test Bill' }).first().click();

  // Scroll entire dialog to bottom to ensure all fields are visible
  await page.locator('[role="dialog"]').evaluate(el => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(1000);

  // Ensure amount field is visible and extract its value
  const amountField = page.locator('input[placeholder="$ 0"], input[type="number"]').first();
  await amountField.scrollIntoViewIfNeeded();
  const amountValue = await amountField.inputValue();
  console.log('🔍 Auto-filled Amount:', amountValue);

  // Scroll and select the account dropdown
  const accountField = page.getByLabel('Account *');
  await accountField.scrollIntoViewIfNeeded();
  await accountField.click();

  const accountOptions = page.locator('[role="option"]');
  const count = await accountOptions.count();
  for (let i = 0; i < count; i++) {
    const option = accountOptions.nth(i);
    const text = await option.textContent();
    if (text.toLowerCase().includes('(checking)')) {
      await option.scrollIntoViewIfNeeded();
      await option.click();
      break;
    }
  }

  await page.getByRole('button', { name: 'Save Transaction' }).click();

  // Wait for transaction to register
  await page.waitForTimeout(5000);

  // Confirm the transaction was created
  await page.waitForSelector('td', { hasText: 'Test Bill' });
  const exists = await page.getByRole('cell', { name: 'Test Bill' }).first().isVisible();
  if (exists) {
    console.log('✅ Transaction created and verified');
  } else {
    console.error('❌ Transaction not found');
  }

  await browser.close();
})();
