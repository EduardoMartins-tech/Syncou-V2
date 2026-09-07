import { describe, it, expect } from 'vitest';
import {
  bookingSchema,
  waitlistSchema,
  appointmentUpdateSchema,
  slugSchema,
  CAMPOS_PERFIL,
  maskClientName,
  telefonesDeTeste,
  mensagemDeConflito
} from '../shared/validacao';

const agendamentoValido = {
  providerId: 'prov-1',
  clientName: 'Maria Silva',
  clientWhatsApp: '(11) 97806-5974',
  clientPhone: '11978065974',
  services: ['srv-1'],
  startAt: 1789000000000,
  endAt: 1789003600000,
  totalPrice: 80,
  totalDuration: 60,
  captchaToken: 'token-valido'
};

describe('bookingSchema', () => {
  it('aceita um agendamento completo', () => {
    expect(bookingSchema.safeParse(agendamentoValido).success).toBe(true);
  });

  it('exige telefone — é a identidade do cliente', () => {
    // Quando era opcional, uma chamada direta à API sem telefone escapava do limite
    // de pendentes e da trava de um-nome-por-telefone.
    const { clientPhone, ...semTelefone } = agendamentoValido;
    expect(bookingSchema.safeParse(semTelefone).success).toBe(false);
  });

  it('recusa telefone curto demais ou com formatação', () => {
    expect(bookingSchema.safeParse({ ...agendamentoValido, clientPhone: '11978' }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...agendamentoValido, clientPhone: '(11) 97806-5974' }).success).toBe(false);
  });

  it('aceita telefone fixo com DDD e número com DDI', () => {
    expect(bookingSchema.safeParse({ ...agendamentoValido, clientPhone: '1133334444' }).success).toBe(true);
    expect(bookingSchema.safeParse({ ...agendamentoValido, clientPhone: '5511978065974' }).success).toBe(true);
  });

  it('ignora status vindo do corpo da requisição', () => {
    // Regressão: aceitar status permitia criar agendamento já 'Confirmado', pulando
    // a confirmação do prestador. O campo não existe mais no schema.
    const resultado = bookingSchema.safeParse({ ...agendamentoValido, status: 'Confirmado' });
    expect(resultado.success).toBe(true);
    expect(resultado.success && 'status' in resultado.data).toBe(false);
  });

  it('exige captcha presente e não literalmente "undefined"', () => {
    expect(bookingSchema.safeParse({ ...agendamentoValido, captchaToken: '' }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...agendamentoValido, captchaToken: 'undefined' }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...agendamentoValido, captchaToken: 'null' }).success).toBe(false);
  });

  it('exige pelo menos um serviço', () => {
    expect(bookingSchema.safeParse({ ...agendamentoValido, services: [] }).success).toBe(false);
  });
});

describe('waitlistSchema', () => {
  const esperaValida = {
    providerId: 'prov-1',
    clientName: 'Maria Silva',
    clientPhone: '11978065974',
    services: ['srv-1'],
    totalDuration: 60,
    wantedDate: '2026-09-14',
    captchaToken: 'token-valido'
  };

  it('aceita uma inscrição completa', () => {
    expect(waitlistSchema.safeParse(esperaValida).success).toBe(true);
  });

  it('recusa data fora do formato YYYY-MM-DD', () => {
    expect(waitlistSchema.safeParse({ ...esperaValida, wantedDate: '14/09/2026' }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...esperaValida, wantedDate: '2026-9-14' }).success).toBe(false);
  });

  it('exige telefone, igual ao agendamento', () => {
    const { clientPhone, ...semTelefone } = esperaValida;
    expect(waitlistSchema.safeParse(semTelefone).success).toBe(false);
  });
});

describe('appointmentUpdateSchema', () => {
  it('aceita os quatro status canônicos', () => {
    for (const status of ['Pendente', 'Confirmado', 'Concluído', 'Cancelado']) {
      expect(appointmentUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('recusa status fora do conjunto canônico', () => {
    // Antes qualquer string era gravada, quebrando em silêncio todo filtro e contagem.
    expect(appointmentUpdateSchema.safeParse({ status: 'banana' }).success).toBe(false);
  });

  it('recusa as variantes legadas em inglês', () => {
    for (const status of ['scheduled', 'confirmed', 'cancelled', 'completed']) {
      expect(appointmentUpdateSchema.safeParse({ status }).success).toBe(false);
    }
  });

  it('aceita atualização só de horário, sem status', () => {
    expect(appointmentUpdateSchema.safeParse({ startAt: 1789000000000, endAt: 1789003600000 }).success).toBe(true);
  });
});

describe('slugSchema', () => {
  it('aceita slug simples e com hífen', () => {
    expect(slugSchema.safeParse('salao').success).toBe(true);
    expect(slugSchema.safeParse('maria-silva').success).toBe(true);
  });

  it('normaliza maiúsculas e espaços nas bordas', () => {
    const resultado = slugSchema.safeParse('  Maria-Silva  ');
    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data).toBe('maria-silva');
  });

  it('recusa espaço, barra, acento e hífen duplicado ou nas pontas', () => {
    for (const invalido of ['maria silva', 'maria/silva', 'salão', 'maria--silva', '-maria', 'maria-']) {
      expect(slugSchema.safeParse(invalido).success).toBe(false);
    }
  });

  it('recusa slug curto demais ou longo demais', () => {
    expect(slugSchema.safeParse('ab').success).toBe(false);
    expect(slugSchema.safeParse('a'.repeat(41)).success).toBe(false);
  });

  it('recusa nomes reservados que colidiriam com rotas do app', () => {
    for (const reservado of ['api', 'dashboard', 'login', 'admin']) {
      expect(slugSchema.safeParse(reservado).success).toBe(false);
    }
  });
});

describe('CAMPOS_PERFIL', () => {
  it('não permite alterar plano nem papel pelo corpo da requisição', () => {
    expect(CAMPOS_PERFIL).not.toHaveProperty('plan');
    expect(CAMPOS_PERFIL).not.toHaveProperty('role');
    expect(CAMPOS_PERFIL).not.toHaveProperty('email');
    expect(CAMPOS_PERFIL).not.toHaveProperty('passwordHash');
  });
});

describe('maskClientName', () => {
  it('preserva a inicial de cada palavra e esconde o resto', () => {
    expect(maskClientName('Maria Silva')).toBe('M*** S***');
    expect(maskClientName('maria')).toBe('M***');
  });

  it('não revela o tamanho do nome', () => {
    // Asteriscos fixos: acompanhar o tamanho real entregaria a contagem de letras.
    expect(maskClientName('Ana')).toBe(maskClientName('Anastácia'));
  });

  it('lida com espaços extras e string vazia sem quebrar', () => {
    expect(maskClientName('  João  da  Silva  ')).toBe('J*** D*** S***');
    expect(maskClientName('')).toBe('***');
  });
});

describe('telefonesDeTeste', () => {
  it('separa por vírgula ignorando espaços e valores vazios', () => {
    expect(telefonesDeTeste('11978065974, 1133334444')).toEqual(['11978065974', '1133334444']);
    expect(telefonesDeTeste('')).toEqual([]);
    expect(telefonesDeTeste(undefined)).toEqual([]);
  });
});

describe('mensagemDeConflito', () => {
  const isentos: string[] = [];

  it('libera quando o telefone ainda não tem cadastro', () => {
    expect(mensagemDeConflito(null, 'Maria', '11978065974', isentos)).toBeNull();
  });

  it('libera quando o nome informado é igual ao cadastrado', () => {
    expect(mensagemDeConflito({ name: 'Maria Silva' }, 'Maria Silva', '11978065974', isentos)).toBeNull();
  });

  it('bloqueia quando o nome difere do cadastrado', () => {
    expect(mensagemDeConflito({ name: 'Maria Silva' }, 'Outra Pessoa', '11978065974', isentos)).not.toBeNull();
  });

  it('nunca revela o nome cadastrado na mensagem', () => {
    // O endpoint é público: devolver o nome inteiro entregava dado pessoal a quem
    // apenas chutou um telefone.
    const msg = mensagemDeConflito({ name: 'Maria Silva' }, 'Outra Pessoa', '11978065974', isentos)!;
    expect(msg).toContain('M*** S***');
    expect(msg).not.toContain('Maria');
    expect(msg).not.toContain('Silva');
  });

  it('libera qualquer nome para telefone marcado como de teste', () => {
    const comIsento = ['11978065974'];
    expect(mensagemDeConflito({ name: 'Maria Silva' }, 'Outra Pessoa', '11978065974', comIsento)).toBeNull();
  });

  it('mantém a trava para telefone que não está na lista de isentos', () => {
    const comIsento = ['1133334444'];
    expect(mensagemDeConflito({ name: 'Maria Silva' }, 'Outra Pessoa', '11978065974', comIsento)).not.toBeNull();
  });
});
