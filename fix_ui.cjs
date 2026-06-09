const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/ui.jsx',
  'src/components/ui/DatePicker.jsx',
  'src/components/ui/CustomDropdown.jsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Labels
    code = code.replace(/text-\[#6B7280\] dark:text-\[#94A3B8\]/g, 'text-gray-700 dark:text-gray-300');
    code = code.replace(/text-\[11px\] h-4/g, 'text-[13px] font-semibold mb-2');

    // Inputs
    code = code.replace(/rounded-xl/g, 'rounded-md');
    code = code.replace(/rounded-2xl/g, 'rounded-lg');
    code = code.replace(/dark:border-gray-800/g, 'dark:border-gray-600');
    code = code.replace(/border-gray-200\/50/g, 'border-gray-300');
    code = code.replace(/dark:bg-\[#0F172A\]/g, 'dark:bg-transparent');
    code = code.replace(/bg-white dark:bg-\[#172030\]/g, 'bg-white dark:bg-[#1E293B]');

    fs.writeFileSync(filePath, code);
    console.log(`Updated ${file}`);
  }
});
