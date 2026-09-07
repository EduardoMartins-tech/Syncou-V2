/**
 * Schemas de validação e regras de apresentação de dado sensível.
 *
 * Separado de `server.ts` para poder ser testado sem subir o servidor: importar
 * `server.ts` roda migrations, conecta no Postgres e abre porta.
 */

import { z } from 'zod';
import { APPOINTMENT_STATUSES } from './agenda';

/**
 * Telefone é a identidade do cliente (não existe login de cliente), por isso é
 * obrigatório: quando era opcional, uma chamada direta à API sem telefone escapava
 * tanto do limite de pendentes quanto da trava de um-nome-por-telefone.
 * O frontend envia apenas dígitos; a faixa cobre de fixo com DDD a número com DDI.
 */
export const telefoneSchema = z.string().trim()
  .regex(/^\d{10,15}$/, 'Telefone inválido. Informe DDD + número, apenas dígitos.');

export const captchaSchema = z.string().trim()
  .min(1, 'Captcha obrigatório')
  .refine(val => val !== 'undefined' && val !== 'null', 'Falha na verificação de segurança (Captcha ausente ou inválido).');

export const bookingSchema = z.object({
  providerId: z.string().min(1, 'O ID do provedor é obrigatório'),
  clientName: z.string().min(2, 'O nome do cliente é obrigatório'),
  clientWhatsApp: z.string().optional().nullable(),
  clientPhone: telefoneSchema,
  clientEmail: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  services: z.array(z.any()).min(1, 'Pelo menos um serviço é obrigatório'),
  startAt: z.union([z.string(), z.number()]),
  endAt: z.union([z.string(), z.number()]),
  totalPrice: z.number().nonnegative(),
  totalDuration: z.number().positive(),
  bufferTime: z.number().nonnegative().optional(),
  bookingSource: z.string().optional(),
  // `status` de propósito fora do schema: quem agenda pela página pública não escolhe
  // o status. Aceitá-lo aqui permitia criar agendamento já 'Confirmado'.
  captchaToken: captchaSchema
});

export const waitlistSchema = z.object({
  providerId: z.string().min(1, 'O ID do provedor é obrigatório'),
  clientName: z.string().trim().min(2, 'O nome do cliente é obrigatório'),
  clientPhone: telefoneSchema,
  services: z.array(z.any()).min(1, 'Pelo menos um serviço é obrigatório'),
  totalDuration: z.number().positive().optional(),
  wantedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  captchaToken: captchaSchema
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  cancelReason: z.string().max(500).optional().nullable(),
  startAt: z.union([z.string(), z.number()]).optional().nullable(),
  endAt: z.union([z.string(), z.number()]).optional().nullable()
});

export const waitlistUpdateSchema = z.object({
  status: z.enum(['Aguardando', 'Avisado'])
});

export const clientNotesSchema = z.object({
  notes: z.string().max(2000).optional().nullable()
});

/** Slug vai para a URL pública (/p/:slug); estes nomes colidiriam com rotas do app. */
export const SLUG_RESERVADO = ['api', 'p', 'dashboard', 'login', 'admin', 'termos', 'assets', 'static'];

export const slugSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'O link deve ter pelo menos 3 caracteres.')
  .max(40, 'O link deve ter no máximo 40 caracteres.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífen (sem acento, espaço ou barra).')
  .refine(v => !SLUG_RESERVADO.includes(v), 'Este link é reservado. Escolha outro.');

/** Colunas do perfil que o próprio usuário altera. 'plan' e 'role' ficam fora de
 *  propósito, para não virarem escalada de privilégio pelo corpo da requisição. */
export const CAMPOS_PERFIL: Record<string, string> = {
  slug: 'slug',
  displayName: 'display_name',
  bio: 'bio',
  workingHoursStart: 'working_hours_start',
  workingHoursEnd: 'working_hours_end',
  workingDays: 'working_days',
  whatsapp: 'whatsapp',
  scheduleOverrides: 'schedule_overrides',
  avatarUrl: 'avatar_url',
  whatsappMessageTemplate: 'whatsapp_message_template',
  workOnHolidays: 'work_on_holidays'
};

/**
 * Mascara o nome do cliente antes de expor em endpoint público.
 * "Maria Silva" -> "M*** S***": a inicial basta para o cliente legítimo se reconhecer,
 * sem entregar o nome nem o tamanho dele a quem apenas chutou um telefone.
 */
export function maskClientName(name: string): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map(parte => parte.charAt(0).toUpperCase() + '***')
    .join(' ');
}

/** Telefones isentos da trava de um-nome-por-telefone, para teste em produção. */
export function telefonesDeTeste(valorDaVariavel?: string): string[] {
  return (valorDaVariavel || '').split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * Decide o conflito de identidade a partir do cadastro já encontrado.
 * Recebe o cliente existente em vez de consultar o banco, para ser testável.
 * Devolve a mensagem a exibir, ou null quando pode seguir.
 */
export function mensagemDeConflito(
  clienteExistente: { name: string } | null | undefined,
  nomeInformado: string,
  telefone: string,
  telefonesIsentos: string[]
): string | null {
  if (telefonesIsentos.includes(telefone)) return null;
  if (!clienteExistente) return null;
  if (clienteExistente.name === nomeInformado) return null;
  return `Esse telefone já está cadastrado como "${maskClientName(clienteExistente.name)}". Use o mesmo nome do cadastro anterior ou entre em contato com o profissional.`;
}
