import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("window.location.href = '/app/settings'", "navigate('/dashboard/settings#google-calendar')");

if (!code.includes("useNavigate")) {
  code = code.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport { useNavigate } from 'react-router-dom';");
}

if (!code.includes("const navigate = useNavigate();")) {
  code = code.replace("const { currentUser, getAuthHeaders } = useAuth();", "const { currentUser, getAuthHeaders } = useAuth();\n  const navigate = useNavigate();");
}

fs.writeFileSync(file, code);
