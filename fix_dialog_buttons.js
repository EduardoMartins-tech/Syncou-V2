import fs from 'fs';
const file = 'src/pages/DashboardSettings.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldFooter = `<DialogFooter className="flex sm:justify-end gap-2 mt-4">`;
const newFooter = `<DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">`;

if (code.includes(oldFooter)) {
  code = code.replace(oldFooter, newFooter);
  fs.writeFileSync(file, code);
  console.log('Fixed dialog footer layout');
}
