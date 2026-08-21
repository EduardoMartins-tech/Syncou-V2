import fs from 'fs';
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(`        registerType: 'prompt',`, `        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',`);

fs.writeFileSync('vite.config.ts', code);
