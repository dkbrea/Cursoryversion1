// Fixed code for monthly debt payment calculation
export const monthlyDebtPaymentFix = `
// Now move forward through the year
while (isBefore(tempDate, yearEnd)) {
  // Check if this payment falls in the current month
  if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
    // Show debt payments for all months of the year, regardless of creation date
    // This ensures consistent budget forecasting across the entire year
    debtAmountInMonth += debt.minimumPayment;
  }
  
  // Move to next month's payment
  tempDate = addMonths(tempDate, 1);
  // Adjust for months with fewer days
  if (getDate(tempDate) !== paymentDay) {
    tempDate.setDate(Math.min(paymentDay, getDate(endOfMonth(tempDate))));
  }
}
`;

// Fixed code for annual debt payment calculation
export const annualDebtPaymentFix = `
// For annual payments, check all months in the year
for (let month = 0; month < 12; month++) {
  // If this is the month we're forecasting
  if (getMonth(monthStart) === month) {
    // Get the payment date for this month/year
    const paymentDateThisYear = new Date(currentYear, month, Math.min(paymentDay, getDate(endOfMonth(new Date(currentYear, month)))));
    
    // Show debt payments for all months of the year, regardless of creation date
    // This ensures consistent budget forecasting across the entire year
    if (isWithinInterval(paymentDateThisYear, { start: monthStart, end: monthEnd })) {
      debtAmountInMonth += debt.minimumPayment;
    }
  }
}
`;
