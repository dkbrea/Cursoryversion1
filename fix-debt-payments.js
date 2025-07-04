const fs = require('fs');
const path = require('path');

// Path to the budget manager file
const budgetManagerPath = path.join(__dirname, 'src', 'components', 'budget', 'budget-manager.tsx');

// Read the file
let content = fs.readFileSync(budgetManagerPath, 'utf8');

// Fix monthly debt payment calculation - remove creation date check
content = content.replace(
  /\/\/ Check if this payment falls in the current month\s+if \(isWithinInterval\(tempDate, { start: monthStart, end: monthEnd }\)\) {\s+\/\/ Only count if the debt existed by this payment date\s+if \(isAfter\(tempDate, debtCreationDate\) \|\| isSameDay\(tempDate, debtCreationDate\)\) {\s+debtAmountInMonth \+= debt\.minimumPayment;\s+}\s+}/g,
  `// Check if this payment falls in the current month
              if (isWithinInterval(tempDate, { start: monthStart, end: monthEnd })) {
                // Show debt payments for all months of the year, regardless of creation date
                // This ensures consistent budget forecasting across the entire year
                debtAmountInMonth += debt.minimumPayment;
              }`
);

// Fix annual debt payment calculation - remove creation date check
content = content.replace(
  /\/\/ Only count if the debt existed by this payment date\s+if \(\(isAfter\(paymentDateThisYear, debtCreationDate\) \|\| isSameDay\(paymentDateThisYear, debtCreationDate\)\) && \s+isWithinInterval\(paymentDateThisYear, { start: monthStart, end: monthEnd }\)\) {/g,
  `// Show debt payments for all months of the year, regardless of creation date
                // This ensures consistent budget forecasting across the entire year
                if (isWithinInterval(paymentDateThisYear, { start: monthStart, end: monthEnd })) {`
);

// Write the modified content back to the file
fs.writeFileSync(budgetManagerPath, content, 'utf8');

console.log('Debt payment calculations fixed successfully!');
