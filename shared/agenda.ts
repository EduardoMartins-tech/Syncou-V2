/**
 * Regras de agenda em um lugar só.
 *
 * Este módulo existe porque a mesma regra vivia escrita em três lugares com valores
 * diferentes (constraint do banco, validação do servidor e grade da página pública),
 * e a grade chegava a oferecer horário que o servidor recusava. Tudo aqui é puro:
 * sem acesso a banco, sem React, sem relógio implícito — por isso dá para testar.
 */

import { format, isSameDay, addMinutes, isAfter, setHours, setMinutes } from 'date-fns';

/** Conjunto canônico de status. Qualquer outro valor é inválido. */
export const APPOINTMENT_STATUSES = ['Pendente', 'Confirmado', 'Concluído', 'Cancelado'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

export const FERIADOS_NACIONAIS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalhador
  '09-07', // Independência do Brasil
  '10-12', // Nossa Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25'  // Natal
];

/** Intervalo entre horários oferecidos, em minutos. */
export const PASSO_DE_HORARIO = 30;

/**
 * Definição única de "este agendamento ocupa o horário".
 *
 * Só 'Cancelado' libera. 'Concluído' ocupa: o atendimento aconteceu, o horário foi
 * usado. Status ausente conta como ocupado — registro antigo sem status não pode
 * virar buraco na agenda por omissão.
 */
export function ocupaHorario(status?: string | null): boolean {
  return status !== 'Cancelado';
}

/** Sobreposição estrita, igual à constraint do banco: encostar não é sobrepor. */
export function haSobreposicao(aInicio: number, aFim: number, bInicio: number, bFim: number): boolean {
  return aInicio < bFim && aFim > bInicio;
}

export interface AgendaDoPrestador {
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[] | string;
  workOnHolidays?: boolean;
  scheduleOverrides?: Record<string, { start: string; end: string; isClosed: boolean }> | null;
}

export interface AgendamentoOcupado {
  startAt: number;
  endAt: number;
  status?: string | null;
}

function diasDeTrabalhoDe(provider: AgendaDoPrestador): number[] {
  if (Array.isArray(provider.workingDays)) return provider.workingDays.map(Number);
  if (typeof provider.workingDays === 'string') {
    try { return JSON.parse(provider.workingDays).map(Number); } catch { /* usa o padrão */ }
  }
  return [1, 2, 3, 4, 5];
}

/** Se o prestador atende nesse dia, devolve a janela de trabalho; senão, null. */
export function janelaDeTrabalho(data: Date, provider: AgendaDoPrestador): { inicio: string; fim: string } | null {
  const dateKey = format(data, 'yyyy-MM-dd');
  const override = provider.scheduleOverrides ? provider.scheduleOverrides[dateKey] : undefined;

  // Uma exceção de agenda manda mais que feriado e mais que dia de trabalho:
  // é o prestador dizendo explicitamente o que vale naquela data.
  if (override) {
    if (override.isClosed) return null;
    return { inicio: override.start, fim: override.end };
  }

  if (FERIADOS_NACIONAIS.includes(format(data, 'MM-dd')) && !provider.workOnHolidays) return null;
  if (!diasDeTrabalhoDe(provider).includes(data.getDay())) return null;

  return {
    inicio: provider.workingHoursStart || '09:00',
    fim: provider.workingHoursEnd || '18:00'
  };
}

/**
 * Horários livres de um dia, no formato 'HH:mm'.
 *
 * `agora` é parâmetro em vez de `new Date()` interno para o teste conseguir fixar o
 * tempo — a regra de "horário no passado" depende dele.
 */
export function gerarHorarios(
  data: Date,
  agendamentos: AgendamentoOcupado[],
  provider: AgendaDoPrestador,
  duracaoComRespiro: number,
  agora: Date = new Date()
): string[] {
  if (!data || duracaoComRespiro <= 0) return [];

  const janela = janelaDeTrabalho(data, provider);
  if (!janela) return [];

  const [horaInicio, minutoInicio] = janela.inicio.split(':').map(Number);
  const [horaFim, minutoFim] = janela.fim.split(':').map(Number);

  let inicio = setMinutes(setHours(data, horaInicio), minutoInicio);
  const fimDoExpediente = setMinutes(setHours(data, horaFim), minutoFim);
  const horarios: string[] = [];

  while (isAfter(fimDoExpediente, inicio)) {
    const inicioMs = inicio.getTime();
    const fimMs = inicioMs + duracaoComRespiro * 60000;

    const jaPassou = isSameDay(data, agora) && isAfter(agora, inicio);
    const estouraExpediente = fimMs > fimDoExpediente.getTime();

    if (!jaPassou && !estouraExpediente) {
      const ocupado = agendamentos.some(a =>
        ocupaHorario(a.status) && haSobreposicao(a.startAt, a.endAt, inicioMs, fimMs)
      );
      if (!ocupado) horarios.push(format(inicio, 'HH:mm'));
    }

    inicio = addMinutes(inicio, PASSO_DE_HORARIO);
  }

  return horarios;
}

/** Um dia está lotado quando teria horários se a agenda estivesse vazia, mas não tem nenhum livre. */
export function diaLotado(
  data: Date,
  agendamentos: AgendamentoOcupado[],
  provider: AgendaDoPrestador,
  duracaoComRespiro: number,
  agora: Date = new Date()
): boolean {
  if (gerarHorarios(data, [], provider, duracaoComRespiro, agora).length === 0) return false;
  return gerarHorarios(data, agendamentos, provider, duracaoComRespiro, agora).length === 0;
}
