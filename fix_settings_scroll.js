import fs from 'fs';
const file = 'src/pages/DashboardSettings.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("useLocation")) {
  code = code.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useLocation } from 'react-router-dom';");
}

if (!code.includes("const location = useLocation();")) {
  code = code.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n  const location = useLocation();");
}
if (!code.includes("const location = useLocation();") && !code.includes("useNavigate")) {
  code = code.replace("export function DashboardSettings() {", "import { useLocation } from 'react-router-dom';\nexport function DashboardSettings() {\n  const location = useLocation();");
}

const scrollEffect = `
  useEffect(() => {
    if (location.hash === '#google-calendar') {
      setTimeout(() => {
        const el = document.getElementById('google-calendar');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500); // Wait a bit for layout to settle
    }
  }, [location.hash]);
`;

if (!code.includes("location.hash === '#google-calendar'")) {
  code = code.replace("const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();", "const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();\n" + scrollEffect);
}

code = code.replace(
  '<Card className="bg-[#130E20] border-[#2D214F] shadow-sm mt-8">',
  '<Card id="google-calendar" className="bg-[#130E20] border-[#2D214F] shadow-sm mt-8 scroll-mt-24">'
);

fs.writeFileSync(file, code);
