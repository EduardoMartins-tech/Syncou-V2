import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldMessage = `        const message = {
          notification: {
            title: 'Novo agendamento recebido!',
            body: \`\${clientName} agendou para \${new Date(Number(startAt)).toLocaleString('pt-BR')}\`
          },
          tokens: tokens,
        };`;

const newMessage = `        const message = {
          data: {
            title: 'Novo agendamento recebido!',
            body: \`\${clientName} agendou para \${new Date(Number(startAt)).toLocaleString('pt-BR')}\`
          },
          tokens: tokens,
        };`;

code = code.replace(oldMessage, newMessage);
fs.writeFileSync('server.ts', code);
