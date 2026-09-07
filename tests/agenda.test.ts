import { describe, it, expect } from 'vitest';
import {
  gerarHorarios,
  diaLotado,
  janelaDeTrabalho,
  ocupaHorario,
  haSobreposicao,
  type AgendaDoPrestador
} from '../shared/agenda';

/**
 * Segunda-feira, 14/09/2026. Data fixa de propósito: teste de agenda que depende
 * de "hoje" passa a falhar sozinho conforme o calendário anda.
 */
const SEGUNDA = new Date(2026, 8, 14);
const SEXTA = new Date(2026, 8, 18);
const SABADO = new Date(2026, 8, 19);
/** Bem antes de qualquer horário do expediente, para nada cair na regra de passado. */
const MADRUGADA = new Date(2026, 8, 14, 1, 0);

const prestador: AgendaDoPrestador = {
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingDays: [1, 2, 3, 4, 5]
};

/** Constrói um agendamento a partir de hora/minuto do dia base. */
function agendamento(dia: Date, horaInicio: number, minutoInicio: number, duracaoMin: number, status = 'Confirmado') {
  const inicio = new Date(dia);
  inicio.setHours(horaInicio, minutoInicio, 0, 0);
  return { startAt: inicio.getTime(), endAt: inicio.getTime() + duracaoMin * 60000, status };
}

describe('ocupaHorario', () => {
  it('só libera o horário quando o agendamento foi cancelado', () => {
    expect(ocupaHorario('Cancelado')).toBe(false);
    expect(ocupaHorario('Pendente')).toBe(true);
    expect(ocupaHorario('Confirmado')).toBe(true);
  });

  it('trata Concluído como ocupado — o atendimento aconteceu', () => {
    expect(ocupaHorario('Concluído')).toBe(true);
  });

  it('trata status ausente como ocupado, para omissão não virar buraco na agenda', () => {
    expect(ocupaHorario(null)).toBe(true);
    expect(ocupaHorario(undefined)).toBe(true);
  });
});

describe('haSobreposicao', () => {
  it('acusa sobreposição parcial nos dois sentidos', () => {
    expect(haSobreposicao(10, 20, 15, 25)).toBe(true);
    expect(haSobreposicao(15, 25, 10, 20)).toBe(true);
  });

  it('não considera sobreposição quando um termina exatamente onde o outro começa', () => {
    expect(haSobreposicao(10, 20, 20, 30)).toBe(false);
    expect(haSobreposicao(20, 30, 10, 20)).toBe(false);
  });

  it('acusa sobreposição de um único milissegundo', () => {
    // É o caso que a antiga tolerância de 5 minutos escondia: a grade oferecia o
    // horário, o servidor recusava, e o cliente batia num erro sem saída.
    expect(haSobreposicao(10, 21, 20, 30)).toBe(true);
  });
});

describe('janelaDeTrabalho', () => {
  it('devolve o expediente padrão em dia útil', () => {
    expect(janelaDeTrabalho(SEGUNDA, prestador)).toEqual({ inicio: '09:00', fim: '18:00' });
  });

  it('fecha em dia fora dos dias de trabalho', () => {
    expect(janelaDeTrabalho(SABADO, prestador)).toBeNull();
  });

  it('aceita dias de trabalho serializados como string', () => {
    const comString: AgendaDoPrestador = { ...prestador, workingDays: '["1","2","3","4","5"]' };
    expect(janelaDeTrabalho(SEGUNDA, comString)).not.toBeNull();
    expect(janelaDeTrabalho(SABADO, comString)).toBeNull();
  });

  it('fecha em feriado nacional quando o prestador não atende em feriado', () => {
    const natal = new Date(2026, 11, 25);
    expect(janelaDeTrabalho(natal, { ...prestador, workingDays: [1, 2, 3, 4, 5, 6, 0] })).toBeNull();
  });

  it('abre em feriado quando o prestador declara que atende', () => {
    const natal = new Date(2026, 11, 25);
    const atendeFeriado = { ...prestador, workingDays: [1, 2, 3, 4, 5, 6, 0], workOnHolidays: true };
    expect(janelaDeTrabalho(natal, atendeFeriado)).not.toBeNull();
  });

  it('deixa a exceção de agenda mandar mais que o dia de trabalho', () => {
    const comExcecao: AgendaDoPrestador = {
      ...prestador,
      scheduleOverrides: { '2026-09-19': { start: '10:00', fim: '', end: '14:00', isClosed: false } as any }
    };
    expect(janelaDeTrabalho(SABADO, comExcecao)).toEqual({ inicio: '10:00', fim: '14:00' });
  });

  it('fecha o dia quando a exceção o marca como fechado', () => {
    const comFolga: AgendaDoPrestador = {
      ...prestador,
      scheduleOverrides: { '2026-09-14': { start: '00:00', end: '00:00', isClosed: true } }
    };
    expect(janelaDeTrabalho(SEGUNDA, comFolga)).toBeNull();
  });
});

describe('gerarHorarios', () => {
  it('gera a grade de 30 em 30 minutos respeitando o fim do expediente', () => {
    const horarios = gerarHorarios(SEGUNDA, [], prestador, 60, MADRUGADA);
    expect(horarios[0]).toBe('09:00');
    expect(horarios[1]).toBe('09:30');
    // Serviço de 60min: o último início possível é 17:00, para terminar às 18:00.
    expect(horarios[horarios.length - 1]).toBe('17:00');
  });

  it('não oferece horário que estoura o expediente', () => {
    const horarios = gerarHorarios(SEGUNDA, [], prestador, 120, MADRUGADA);
    expect(horarios).not.toContain('17:00');
    expect(horarios[horarios.length - 1]).toBe('16:00');
  });

  it('remove o horário tomado por um agendamento', () => {
    const ocupado = [agendamento(SEGUNDA, 10, 0, 60)];
    const horarios = gerarHorarios(SEGUNDA, ocupado, prestador, 60, MADRUGADA);
    expect(horarios).not.toContain('10:00');
    expect(horarios).not.toContain('09:30');
    expect(horarios).toContain('11:00');
  });

  it('mantém livre o horário de um agendamento cancelado', () => {
    const cancelado = [agendamento(SEGUNDA, 10, 0, 60, 'Cancelado')];
    expect(gerarHorarios(SEGUNDA, cancelado, prestador, 60, MADRUGADA)).toContain('10:00');
  });

  it('bloqueia o horário de um agendamento Concluído', () => {
    // Regressão: a grade filtrava os Concluído e oferecia o horário, mas o servidor
    // recusava — as duas pontas discordavam sobre o que ocupa a agenda.
    const concluido = [agendamento(SEGUNDA, 10, 0, 60, 'Concluído')];
    expect(gerarHorarios(SEGUNDA, concluido, prestador, 60, MADRUGADA)).not.toContain('10:00');
  });

  it('não aplica tolerância: atendimento que invade 1 minuto do horário bloqueia', () => {
    // Regressão da tolerância de 5 minutos que só existia no frontend.
    const invade = [agendamento(SEGUNDA, 9, 31, 60)]; // 09:31 → 10:31
    const horarios = gerarHorarios(SEGUNDA, invade, prestador, 30, MADRUGADA);
    expect(horarios).not.toContain('10:30');
    expect(horarios).toContain('11:00');
  });

  it('libera o horário que apenas encosta no fim do anterior', () => {
    const encosta = [agendamento(SEGUNDA, 9, 0, 60)]; // 09:00 → 10:00
    expect(gerarHorarios(SEGUNDA, encosta, prestador, 60, MADRUGADA)).toContain('10:00');
  });

  it('não oferece horário já passado no dia de hoje', () => {
    const meioDia = new Date(2026, 8, 14, 12, 0);
    const horarios = gerarHorarios(SEGUNDA, [], prestador, 60, meioDia);
    expect(horarios).not.toContain('09:00');
    expect(horarios).not.toContain('11:30');
    expect(horarios).toContain('12:30');
  });

  it('devolve vazio em dia sem expediente', () => {
    expect(gerarHorarios(SABADO, [], prestador, 60, MADRUGADA)).toEqual([]);
  });

  it('devolve vazio quando nenhum serviço foi escolhido', () => {
    expect(gerarHorarios(SEGUNDA, [], prestador, 0, MADRUGADA)).toEqual([]);
  });

  it('respeita a janela reduzida de uma exceção de agenda', () => {
    const comExcecao: AgendaDoPrestador = {
      ...prestador,
      scheduleOverrides: { '2026-09-18': { start: '14:00', end: '16:00', isClosed: false } }
    };
    expect(gerarHorarios(SEXTA, [], comExcecao, 60, MADRUGADA)).toEqual(['14:00', '14:30', '15:00']);
  });
});

describe('diaLotado', () => {
  it('não marca como lotado um dia em que o prestador nem atende', () => {
    // Folga já é tratada pelo calendário como dia desabilitado; marcar de novo como
    // "lotado" diria ao cliente que houve procura onde não houve expediente.
    expect(diaLotado(SABADO, [], prestador, 60, MADRUGADA)).toBe(false);
  });

  it('não marca como lotado um dia com horário livre', () => {
    const ocupado = [agendamento(SEGUNDA, 10, 0, 60)];
    expect(diaLotado(SEGUNDA, ocupado, prestador, 60, MADRUGADA)).toBe(false);
  });

  it('marca como lotado o dia sem nenhum horário livre', () => {
    const diaInteiro = [agendamento(SEGUNDA, 9, 0, 540)]; // 09:00 → 18:00
    expect(diaLotado(SEGUNDA, diaInteiro, prestador, 60, MADRUGADA)).toBe(true);
  });

  it('depende da duração do serviço: o mesmo dia comporta o curto e não o longo', () => {
    // 09:00→16:00 ocupado deixa exatamente 2h livres no fim do expediente.
    const ocupado = [agendamento(SEGUNDA, 9, 0, 420)];
    expect(diaLotado(SEGUNDA, ocupado, prestador, 60, MADRUGADA)).toBe(false);
    expect(diaLotado(SEGUNDA, ocupado, prestador, 150, MADRUGADA)).toBe(true);
  });
});
