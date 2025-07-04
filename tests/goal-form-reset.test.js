const { test, expect } = require('@playwright/test');

test.describe('Goal Form Reset', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the goals page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Click on Goals navigation
    await page.click('[data-testid="nav-goals"], a[href="/goals"]');
    await page.waitForLoadState('networkidle');
  });

  test('should reset form fields after saving a goal and reopening dialog', async ({ page }) => {
    // First, add a goal
    await page.click('button:has-text("Add Goal")');
    await page.waitForSelector('[role="dialog"]');
    
    // Fill in the form with test data
    await page.fill('input[placeholder*="Dream Vacation"]', 'Test Goal 1');
    await page.fill('input[placeholder="5000.00"]', '1000');
    await page.fill('input[placeholder="0.00"]', '100');
    
    // Set target date (next month)
    await page.click('button:has-text("Pick a date")');
    await page.waitForSelector('[role="dialog"] .react-calendar', { timeout: 5000 });
    
    // Click on a date in the next month
    const nextMonthButton = page.locator('button[aria-label*="Next"]').first();
    await nextMonthButton.click();
    
    // Click on the 15th of the month
    await page.click('button:has-text("15")');
    
    // Select an icon
    await page.click('[role="combobox"]:has-text("Select an icon")');
    await page.click('[role="option"]:has-text("House")');
    
    // Save the goal
    await page.click('button:has-text("Save"):not(:has-text("Add Another"))');
    
    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    
    // Verify the goal was added (should see it in the list)
    await expect(page.locator('text=Test Goal 1')).toBeVisible();
    
    // Now open the dialog again to add another goal
    await page.click('button:has-text("Add Goal")');
    await page.waitForSelector('[role="dialog"]');
    
    // Verify all fields are empty/reset
    const nameInput = page.locator('input[placeholder*="Dream Vacation"]');
    const targetAmountInput = page.locator('input[placeholder="5000.00"]');
    const currentAmountInput = page.locator('input[placeholder="0.00"]');
    const dateButton = page.locator('button:has-text("Pick a date")');
    const iconSelect = page.locator('[role="combobox"]:has-text("Select an icon")');
    
    await expect(nameInput).toHaveValue('');
    await expect(targetAmountInput).toHaveValue('');
    await expect(currentAmountInput).toHaveValue('');
    await expect(dateButton).toBeVisible(); // Should show "Pick a date" text
    await expect(iconSelect).toBeVisible(); // Should show "Select an icon" text
    
    // Verify the date picker shows "Pick a date" and not a previous date
    await expect(dateButton).toContainText('Pick a date');
    
    // Close the dialog
    await page.click('button:has-text("Cancel")');
  });

  test('should reset form fields when using "Save & Add Another"', async ({ page }) => {
    // Add a goal using "Save & Add Another"
    await page.click('button:has-text("Add Goal")');
    await page.waitForSelector('[role="dialog"]');
    
    // Fill in the form
    await page.fill('input[placeholder*="Dream Vacation"]', 'Test Goal 2');
    await page.fill('input[placeholder="5000.00"]', '2000');
    await page.fill('input[placeholder="0.00"]', '200');
    
    // Set target date
    await page.click('button:has-text("Pick a date")');
    await page.waitForSelector('[role="dialog"] .react-calendar', { timeout: 5000 });
    
    const nextMonthButton = page.locator('button[aria-label*="Next"]').first();
    await nextMonthButton.click();
    await page.click('button:has-text("20")');
    
    // Select an icon
    await page.click('[role="combobox"]:has-text("Select an icon")');
    await page.click('[role="option"]:has-text("Car")');
    
    // Click "Save & Add Another"
    await page.click('button:has-text("Save & Add Another")');
    
    // Wait a moment for the form to reset
    await page.waitForTimeout(500);
    
    // Verify all fields are empty/reset but dialog is still open
    const nameInput = page.locator('input[placeholder*="Dream Vacation"]');
    const targetAmountInput = page.locator('input[placeholder="5000.00"]');
    const currentAmountInput = page.locator('input[placeholder="0.00"]');
    const dateButton = page.locator('button:has-text("Pick a date")');
    
    await expect(nameInput).toHaveValue('');
    await expect(targetAmountInput).toHaveValue('');
    await expect(currentAmountInput).toHaveValue('');
    await expect(dateButton).toContainText('Pick a date');
    
    // Dialog should still be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Close the dialog
    await page.click('button:has-text("Cancel")');
  });

  test('should not reset form fields when editing an existing goal', async ({ page }) => {
    // First create a goal to edit
    await page.click('button:has-text("Add Goal")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[placeholder*="Dream Vacation"]', 'Goal to Edit');
    await page.fill('input[placeholder="5000.00"]', '3000');
    await page.fill('input[placeholder="0.00"]', '300');
    
    await page.click('button:has-text("Pick a date")');
    await page.waitForSelector('[role="dialog"] .react-calendar', { timeout: 5000 });
    
    const nextMonthButton = page.locator('button[aria-label*="Next"]').first();
    await nextMonthButton.click();
    await page.click('button:has-text("25")');
    
    await page.click('button:has-text("Save"):not(:has-text("Add Another"))');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    
    // Now edit the goal (assuming there's an edit button/icon)
    // This might need to be adjusted based on the actual UI
    const editButton = page.locator('[data-testid="edit-goal"], button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Verify the form is populated with the existing goal data
      await expect(page.locator('input[placeholder*="Dream Vacation"]')).toHaveValue('Goal to Edit');
      await expect(page.locator('input[placeholder="5000.00"]')).toHaveValue('3000');
      await expect(page.locator('input[placeholder="0.00"]')).toHaveValue('300');
      
      // Close without saving
      await page.click('button:has-text("Cancel")');
    }
  });
}); 