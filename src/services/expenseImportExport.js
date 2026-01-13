// Expense Import/Export Service
import * as XLSX from 'xlsx';

/**
 * Export expense categories and subcategories to Excel
 * @param {Array} expenseCategories - Array of expense category objects
 * @param {String} profileName - Name of the profile for the filename
 */
export const exportExpensesToExcel = (expenseCategories, profileName = 'Profile') => {
  const data = [];

  // Flatten hierarchical structure for Excel
  expenseCategories.forEach((category) => {
    category.subcategories.forEach((subcategory) => {
      const monthlyEquiv = subcategory.frequency === 'Annual'
        ? (subcategory.monthlyAmount || 0) / 12
        : (subcategory.monthlyAmount || 0);

      data.push({
        Category: category.name,
        Subcategory: subcategory.name,
        'Expense Type': subcategory.expenseType || 'Variable Discretionary',
        Frequency: subcategory.frequency || 'Monthly',
        Amount: subcategory.monthlyAmount || 0,
        'Monthly Equivalent': monthlyEquiv,
        'Annual Amount': monthlyEquiv * 12,
        Notes: subcategory.notes || '',
      });
    });
  });

  if (data.length === 0) {
    alert('No expenses to export');
    return;
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `Solas_Expenses_${profileName}_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
};

/**
 * Import expenses from Excel file
 * @param {File} file - Excel file to import
 * @returns {Promise<Array>} - Promise resolving to array of expense categories
 */
export const importExpensesFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        // Parse Excel file
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);

        if (rows.length === 0) {
          reject(new Error('No data found in Excel file'));
          return;
        }

        // Rebuild hierarchical structure
        const categoryMap = new Map();

        rows.forEach((row) => {
          const categoryName = row['Category'] || row['category'];
          const subcategoryName = row['Subcategory'] || row['subcategory'] || row['Subcategory Name'];
          const expenseType = row['Expense Type'] || row['expenseType'] || 'Variable Discretionary';
          const frequency = row['Frequency'] || row['frequency'] || 'Monthly';
          const amount = parseFloat(
            row['Amount'] || row['amount'] || row['Monthly Amount'] || row['monthly_amount'] || row['monthlyAmount'] || 0
          );
          const notes = row['Notes'] || row['notes'] || '';

          if (!categoryName || !subcategoryName) {
            console.warn('Skipping row with missing category or subcategory:', row);
            return;
          }

          // Get or create category
          let category = categoryMap.get(categoryName);
          if (!category) {
            category = {
              id: crypto.randomUUID(),
              name: categoryName,
              subcategories: [],
            };
            categoryMap.set(categoryName, category);
          }

          // Add subcategory
          category.subcategories.push({
            id: crypto.randomUUID(),
            name: subcategoryName,
            monthlyAmount: amount,
            expenseType,
            frequency,
            notes,
          });
        });

        // Convert map to array
        const expenseCategories = Array.from(categoryMap.values());

        resolve(expenseCategories);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Export a template Excel file for users to fill in
 */
export const exportExpenseTemplate = () => {
  const templateData = [
    {
      Category: 'Entertainment',
      Subcategory: 'Eating out',
      'Expense Type': 'Variable Discretionary',
      Frequency: 'Monthly',
      Amount: 5000,
      'Monthly Equivalent': 5000,
      'Annual Amount': 60000,
      Notes: 'Restaurants and cafes',
    },
    {
      Category: 'Entertainment',
      Subcategory: 'Going for drinks',
      'Expense Type': 'Luxury',
      Frequency: 'Monthly',
      Amount: 2000,
      'Monthly Equivalent': 2000,
      'Annual Amount': 24000,
      Notes: '',
    },
    {
      Category: 'Entertainment',
      Subcategory: 'Movies',
      'Expense Type': 'Variable Discretionary',
      Frequency: 'Monthly',
      Amount: 800,
      'Monthly Equivalent': 800,
      'Annual Amount': 9600,
      Notes: 'Cinema tickets',
    },
    {
      Category: 'Housing',
      Subcategory: 'Rent/Mortgage',
      'Expense Type': 'Fixed Non-Discretionary',
      Frequency: 'Monthly',
      Amount: 15000,
      'Monthly Equivalent': 15000,
      'Annual Amount': 180000,
      Notes: '',
    },
    {
      Category: 'Housing',
      Subcategory: 'Utilities',
      'Expense Type': 'Fixed Non-Discretionary',
      Frequency: 'Monthly',
      Amount: 2000,
      'Monthly Equivalent': 2000,
      'Annual Amount': 24000,
      Notes: 'Water, electricity, gas',
    },
    {
      Category: 'Housing',
      Subcategory: 'Property Insurance',
      'Expense Type': 'Fixed Non-Discretionary',
      Frequency: 'Annual',
      Amount: 12000,
      'Monthly Equivalent': 1000,
      'Annual Amount': 12000,
      Notes: 'Paid annually',
    },
    {
      Category: 'Transport',
      Subcategory: 'Fuel',
      'Expense Type': 'Variable Discretionary',
      Frequency: 'Monthly',
      Amount: 3000,
      'Monthly Equivalent': 3000,
      'Annual Amount': 36000,
      Notes: '',
    },
    {
      Category: 'Savings & Investments',
      Subcategory: 'Retirement Contribution',
      'Expense Type': 'Wealth Building',
      Frequency: 'Monthly',
      Amount: 5000,
      'Monthly Equivalent': 5000,
      'Annual Amount': 60000,
      Notes: 'Monthly retirement savings',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Add instructions as a comment or in a separate sheet
  const instructions = [
    {
      Instruction: 'How to use this template:',
    },
    {
      Instruction: '1. Fill in your categories and subcategories',
    },
    {
      Instruction: '2. Enter monthly amounts (annual will be calculated automatically)',
    },
    {
      Instruction: '3. Save the file',
    },
    {
      Instruction: '4. Import it back into Solas',
    },
    {
      Instruction: '5. You can add as many categories and subcategories as you need',
    },
    {
      Instruction: 'Note: Delete these example rows and add your own expenses',
    },
  ];

  const instructionsWs = XLSX.utils.json_to_sheet(instructions);

  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  const filename = 'Solas_Expense_Template.xlsx';
  XLSX.writeFile(wb, filename);
};
