import fs from 'fs';
const file = 'src/components/Logo.tsx';
const code = `import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      className={\`\${className} text-purple-500 transition-transform duration-300 hover:scale-110 active:scale-95\`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Syncou Logo"
    >
      <path
        d="M35,25 C55,10 85,25 85,50 C85,70 70,80 50,85 C40,87.5 30,80 30,70 C30,60 40,55 50,55 C65,55 70,45 70,38 C70,28 50,23 38,32 C34,35 30,32 30,27 Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M65,75 C45,90 15,75 15,50 C15,30 30,20 50,15 C60,12.5 70,20 70,30 C70,40 60,45 50,45 C35,45 30,55 30,62 C30,72 50,77 62,68 C66,65 70,68 70,73 Z"
        fill="currentColor"
        opacity="0.75"
      />
      <circle cx="50" cy="50" r="7" fill="#ffffff" className="animate-pulse shadow-xl" />
    </svg>
  );
};
`;
fs.writeFileSync(file, code);
