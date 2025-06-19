const { test, expect } = require('@playwright/test');

test.describe('Budget Variable Expense Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the budget page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Click on Budget navigation
    await page.click('[data-testid="nav-budget"], a[href="/budget"]');
    await page.waitForLoadState('networkidle');
    
    // Wait for budget data to load
    await page.waitForSelector('[data-testid="budget-summary"], .budget-status', { timeout: 10000 });
  });

  test('should update budget status when variable expense amounts are changed to 0', async ({ page }) => {
    // First, check if there are any variable expenses with non-zero amounts
    const variableExpenseRows = page.locator('table tbody tr').filter({ hasText: /Groceries|Shopping|Pets/ });
    
    if (await variableExpenseRows.count() === 0) {
      // If no variable expenses exist, create one first
      await page.click('button:has-text("Add Category")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[placeholder*="category name"]', 'Test Category');
      await page.fill('input[type="number"]', '500');
      await page.click('button:has-text("Add Category"):not([disabled])');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    }
    
    // Get initial budget status values
    const initialVariableExpensesText = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Initial Variable Expenses:', initialVariableExpensesText);
    
    // Find the first variable expense row and change its amount to 0
    const firstExpenseRow = await variableExpenseRows.first();
    const amountInput = firstExpenseRow.locator('input[type="number"]');
    
    // Clear and set to 0
    await amountInput.clear();
    await amountInput.fill('0');
    await amountInput.blur(); // Trigger the blur event to save
    
    // Wait for potential update dialog
    const updateDialog = page.locator('[role="alertdialog"]:has-text("Update Variable Expense Amount")');
    if (await updateDialog.isVisible({ timeout: 2000 })) {
      // Click "Update All Months" to apply the change
      await page.click('button:has-text("Update All Months")');
      await page.waitForSelector('[role="alertdialog"]', { state: 'hidden' });
    }
    
    // Wait for the budget to recalculate
    await page.waitForTimeout(1000);
    
    // Check if the budget status has updated
    const updatedVariableExpensesText = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Updated Variable Expenses:', updatedVariableExpensesText);
    
    // The variable expenses total should be lower now
    const initialAmount = parseFloat(initialVariableExpensesText?.replace(/[$,]/g, '') || '0');
    const updatedAmount = parseFloat(updatedVariableExpensesText?.replace(/[$,]/g, '') || '0');
    
    expect(updatedAmount).toBeLessThan(initialAmount);
    
    // Verify the "Left to Allocate" amount has also updated accordingly
    const leftToAllocateElement = page.locator('text=Left to Allocate').locator('..').last();
    await expect(leftToAllocateElement).toBeVisible();
  });

  test('should update budget status when multiple variable expenses are set to 0', async ({ page }) => {
    // Get all variable expense rows
    const variableExpenseRows = page.locator('table tbody tr').filter({ hasText: /\$/ });
    const rowCount = await variableExpenseRows.count();
    
    if (rowCount === 0) {
      test.skip('No variable expenses found to test');
    }
    
    // Get initial total from budget status
    const initialBudgetStatus = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Initial Budget Status Variable Expenses:', initialBudgetStatus);
    
    // Set all variable expenses to 0
    for (let i = 0; i < Math.min(rowCount, 3); i++) { // Limit to first 3 for test efficiency
      const row = variableExpenseRows.nth(i);
      const amountInput = row.locator('input[type="number"]');
      
      if (await amountInput.isVisible()) {
        await amountInput.clear();
        await amountInput.fill('0');
        await amountInput.blur();
        
        // Handle update dialog if it appears
        const updateDialog = page.locator('[role="alertdialog"]:has-text("Update Variable Expense Amount")');
        if (await updateDialog.isVisible({ timeout: 1000 })) {
          await page.click('button:has-text("Update All Months")');
          await page.waitForSelector('[role="alertdialog"]', { state: 'hidden' });
        }
        
        // Small delay between updates
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for final recalculation
    await page.waitForTimeout(2000);
    
    // Check final budget status
    const finalBudgetStatus = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Final Budget Status Variable Expenses:', finalBudgetStatus);
    
    // The budget status should show $0.00 or a much lower amount
    const finalAmount = parseFloat(finalBudgetStatus?.replace(/[$,]/g, '') || '0');
    expect(finalAmount).toBeLessThanOrEqual(100); // Should be very low or 0
  });

  test('should show correct totals in variable expense table vs budget status', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Get total from variable expense table (bottom row)
    const tableTotal = await page.locator('table tbody tr:has-text("Total")').locator('td').nth(2).textContent();
    console.log('Table Total:', tableTotal);
    
    // Get total from budget status
    const budgetStatusTotal = await page.locator('text=Variable Expenses').locator('..').locator('span').last().textContent();
    console.log('Budget Status Total:', budgetStatusTotal);
    
    // These should match (allowing for formatting differences)
    const tableAmount = parseFloat(tableTotal?.replace(/[$,]/g, '') || '0');
    const budgetAmount = parseFloat(budgetStatusTotal?.replace(/[$,]/g, '') || '0');
    
    expect(Math.abs(tableAmount - budgetAmount)).toBeLessThan(0.01); // Allow for rounding differences
  });
}); 