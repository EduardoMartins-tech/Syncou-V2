import { defineConfig } from 'vitest/config';

// Configuração própria (não a do Vite) de propósito: os testes cobrem regras puras em
// `shared/`, sem React nem PWA, então não precisam dos plugins do build — e o `include`
// restrito evita varrer os testes das skills instaladas em .agents/ e .claude/.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
