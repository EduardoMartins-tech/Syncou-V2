import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Check, ChevronLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, addMinutes, isAfter, startOfDay, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useNotification } from '../hooks/useNotification';

interface Provider {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  whatsapp?: string;
  workOnHolidays?: boolean;
  scheduleOverrides?: Record<string, { start: string; end: string; isClosed: boolean }>;
}

interface Service {
  id: string;
  name: string;
  title?: string;
  description: string;
  duration: number;
  bufferTime?: number;
  price: number;
}

const FERIADOS_NACIONAIS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalhador
  '09-07', // Independência do Brasil
  '10-12', // Nossa Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25'  // Natal
];

// Função pura para poder rodar por dia e descobrir quais estão lotados no calendário,
// não só para a data selecionada. Antes essa lógica vivia presa ao estado do componente.
function gerarHorarios(
  data: Date,
  agendamentos: any[],
  provider: Provider,
  duracaoComRespiro: number
): string[] {
  if (!data || duracaoComRespiro <= 0) return [];

  let workingStart = provider.workingHoursStart || '09:00';
  let workingEnd = provider.workingHoursEnd || '18:00';
  let isClosed = false;

  const dateKey = format(data, 'yyyy-MM-dd');
  const monthDay = format(data, 'MM-dd');

  if (FERIADOS_NACIONAIS.includes(monthDay) && !provider.workOnHolidays) {
    isClosed = true;
  }

  if (provider.scheduleOverrides && provider.scheduleOverrides[dateKey]) {
    const override = provider.scheduleOverrides[dateKey];
    if (override.isClosed) {
      isClosed = true;
    } else {
      workingStart = override.start;
      workingEnd = override.end;
    }
  } else {
    let diasDeTrabalho: number[] = [1, 2, 3, 4, 5];
    if (Array.isArray(provider.workingDays)) {
      diasDeTrabalho = provider.workingDays.map(Number);
    } else if (typeof provider.workingDays === 'string') {
      try { diasDeTrabalho = JSON.parse(provider.workingDays).map(Number); } catch (e) {}
    }
    if (!diasDeTrabalho.includes(data.getDay())) isClosed = true;
  }

  if (isClosed) return [];

  const [startHour, startMin] = workingStart.split(':').map(Number);
  const [endHour, endMin] = workingEnd.split(':').map(Number);

  let start = setMinutes(setHours(data, startHour), startMin);
  const end = setMinutes(setHours(data, endHour), endMin);
  const slots: string[] = [];
  const now = new Date();

  while (isAfter(end, start)) {
    const slotTime = start.getTime();
    const slotEndAt = slotTime + (duracaoComRespiro * 60000);

    const isPast = isSameDay(data, now) && isAfter(now, start);
    const exceedsClosingTime = slotEndAt > end.getTime();

    if (!isPast && !exceedsClosingTime) {
      // Sobreposição estrita, igual à validação do servidor e à constraint do banco.
      const isOccupied = agendamentos.some(app => {
        const ocupaHorario = app.status !== 'Cancelado';
        return ocupaHorario && app.startAt < slotEndAt && app.endAt > slotTime;
      });

      if (!isOccupied) slots.push(format(start, 'HH:mm'));
    }

    start = addMinutes(start, 30);
  }

  return slots;
}

export function ProviderPage() {
  const { slug } = useParams();
  const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isFetchingAppointments, setIsFetchingAppointments] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());

  // Lista de espera
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: services, 2: datetime, 3: checkout, 4: success
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Busca o mês visível inteiro, não só o dia selecionado: é o que permite marcar
  // dia lotado no calendário. Com folga nas bordas porque a grade mostra dias dos
  // meses vizinhos. Trocar de dia dentro do mesmo mês não refaz a requisição.
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!provider) return;
      setIsFetchingAppointments(true);
      try {
        const inicio = startOfDay(subDays(startOfMonth(visibleMonth), 7)).getTime();
        const fim = setMinutes(setHours(addDays(endOfMonth(visibleMonth), 7), 23), 59).getTime();

        const res = await fetch(`/api/provider/${provider.slug}/appointments?startAt=${inicio}&endAt=${fim}`);
        if(res.ok) {
           // O servidor já exclui os cancelados. Filtrar de novo aqui derrubava os
           // 'Concluído', fazendo a grade oferecer horário que o servidor recusa.
           setAppointments(await res.json());
        } else {
           setAppointments([]);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
      } finally {
        setIsFetchingAppointments(false);
      }
    };

    if (step === 2 || step === 3) {
      fetchAppointments();
    }
  }, [provider, visibleMonth, step]);

  // Fetch data
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await fetch(`/api/provider/${slug}`);
        if(res.ok) {
           const { user, services } = await res.json();
           setProvider(user);
           setServices(services.filter((s:any) => s.active));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProvider();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Localizando profissional...</div>;
  if (!provider) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-bold text-xl">Profissional não encontrado</div>;

  const toggleService = (id: string) => {
    const next = new Set(selectedServices);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedServices(next);
  };

  const selectedServicesList = services.filter(s => selectedServices.has(s.id));
  const totalDuration = selectedServicesList.reduce((acc, s) => acc + s.duration, 0);
  const totalBufferTime = selectedServicesList.reduce((acc, s) => acc + (s.bufferTime || 0), 0);
  const totalDurationWithBuffer = totalDuration + totalBufferTime;
  const totalPrice = selectedServicesList.reduce((acc, s) => acc + s.price, 0);

  const slots = (selectedDate && selectedServices.size > 0)
    ? gerarHorarios(selectedDate, appointments, provider, totalDurationWithBuffer)
    : [];

  // Dias do mês visível que estão sem nenhum horário livre. Sem isso o cliente clica
  // dia a dia às cegas — e pode entrar na lista de espera de um dia sem perceber que
  // o seguinte estava vago. Depende dos serviços escolhidos: um vão de 30min serve
  // pra corte simples e não serve pra combo de 2h.
  const diasLotados = new Set<string>();
  if (selectedServices.size > 0 && appointments.length > 0) {
    const diasDoMes = eachDayOfInterval({ start: startOfMonth(visibleMonth), end: endOfMonth(visibleMonth) });
    for (const dia of diasDoMes) {
      if (isBeforeToday(dia)) continue;
      const horariosDoDia = gerarHorarios(dia, appointments, provider, totalDurationWithBuffer);
      // Só marca como lotado se o dia teria horários não fosse a ocupação —
      // dia de folga já é tratado pelo `disabled` do calendário.
      if (horariosDoDia.length === 0 && gerarHorarios(dia, [], provider, totalDurationWithBuffer).length > 0) {
        diasLotados.add(format(dia, 'yyyy-MM-dd'));
      }
    }
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedDate || !selectedTime || selectedServices.size === 0) return;
    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startAt = setMinutes(setHours(selectedDate, hours), minutes).getTime();
      const endAt = startAt + (totalDurationWithBuffer * 60000);

      if (!executeRecaptcha) {
        notifyError('ReCAPTCHA não está pronto. Tente novamente em instantes.');
        setIsSubmitting(false);
        return;
      }

      const captchaToken = await executeRecaptcha('booking');
      
      const bookingPayload = {
         providerId: provider.id,
         clientName,
         clientWhatsApp,
         clientPhone: clientWhatsApp.replace(/\D/g, ''),
         clientEmail,
         services: Array.from(selectedServices),
         totalPrice,
         totalDuration,
         bufferTime: totalBufferTime,
         bookingSource: 'public_link',
         status: 'Pendente',
         startAt,
         endAt,
         captchaToken
      };
      
      const res = await fetch(`/api/provider/${provider.slug}/book`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify(bookingPayload)
      });
      
      if(!res.ok) {
        let errorMsg = 'Falha no agendamento';
        try {
          const errorData = await res.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch(e) {
          // If not json, try text
          const text = await res.text().catch(() => '');
          if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
      }

      setStep(4);
    } catch(err: any) {
      console.error(err);
      notifyError(err.message || 'Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedDate || selectedServices.size === 0) return;

    const telefone = waitlistPhone.replace(/\D/g, '');
    if (telefone.length < 10) {
      notifyError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setIsJoiningWaitlist(true);
    try {
      if (!executeRecaptcha) {
        notifyError('ReCAPTCHA não está pronto. Tente novamente em instantes.');
        return;
      }
      const captchaToken = await executeRecaptcha('waitlist');

      const res = await fetch(`/api/provider/${provider.slug}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          clientName: waitlistName,
          clientPhone: telefone,
          services: Array.from(selectedServices),
          totalDuration: totalDurationWithBuffer,
          wantedDate: format(selectedDate, 'yyyy-MM-dd'),
          captchaToken
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível entrar na lista de espera.');
      }

      setJoinedWaitlist(true);
      setIsWaitlistOpen(false);
      notifySuccess('Pronto! Você está na lista de espera.');
    } catch (err: any) {
      notifyError(err.message || 'Erro ao entrar na lista de espera.');
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const maskWhatsApp = (v: string) => {
    v = v.replace(/\D/g, '');
    if (v.length > 2) v = `(${v.substring(0, 2)}) ` + v.substring(2);
    if (v.length > 10) v = v.substring(0, 10) + '-' + v.substring(10, 14);
    return v;
  };

  const handleWhatsAppConfirm = () => {
    if (!provider?.whatsapp || !selectedDate || !selectedTime) return;
    const servicesText = selectedServicesList.map(s => s.title || s.name).join(', ');
    const dateText = format(selectedDate, "dd/MM/yyyy");
    const message = `Olá! Acabei de agendar ${servicesText} para o dia ${dateText} às ${selectedTime}. Meu nome é ${clientName}.`;
    let phoneNum = provider.whatsapp.replace(/\D/g, '');
    if (phoneNum.length === 10 || phoneNum.length === 11) phoneNum = '55' + phoneNum;
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-medium">Provider não encontrado...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* Header Sticky */}
      {step < 4 && (
        <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-4 py-3 flex items-center shadow-sm">
          {step > 1 && (
             <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50" onClick={() => setStep(step - 1 as any)}>
               <ChevronLeft className="w-4 h-4" />
             </Button>
          )}
          <div className="flex items-center gap-3">
             <Avatar className="w-8 h-8 ring-1 ring-border">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-muted text-foreground text-xs">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <div>
               <p className="text-sm font-medium text-foreground leading-tight">{provider.displayName}</p>
               <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase font-mono">Agendamento Online</p>
             </div>
          </div>
          <div className="flex gap-1.5 ml-auto" aria-label={`Etapa ${step} de 3`}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ease-snappy ${
                  s <= step ? 'w-6 bg-primary' : 'w-3 bg-muted'
                }`}
              />
            ))}
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.main 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-xl mx-auto px-4 py-10"
          >
          <div className="text-center mb-10">
             <Avatar className="w-24 h-24 mx-auto mb-5 border-4 border-background shadow-sm ring-1 ring-border">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-muted text-foreground text-3xl font-light">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">{provider.displayName}</h1>
             <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 uppercase tracking-widest text-[10px] mb-4 border border-emerald-500/20 shadow-sm font-medium font-mono">Disponível</Badge>
             {provider.bio && <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">{provider.bio}</p>}
          </div>

          <h2 className="font-bold text-lg mb-4 text-foreground tracking-tight">Selecione os Serviços</h2>
          <div className="space-y-3">
            {services.map(svc => {
              const isSelected = selectedServices.has(svc.id);
              return (
                <Card
                  key={svc.id}
                  className={`cursor-pointer transition duration-200 ease-snappy border bg-card rounded-xl ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border shadow-sm hover:border-primary/40 hover:bg-muted hover:-translate-y-0.5 hover:shadow-md'}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>{svc.title || svc.name}</h3>
                      {svc.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{svc.description}</p>}
                      <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground mt-3">
                        <span className="flex items-center bg-muted border border-border px-2.5 py-1 rounded-xl text-foreground font-mono"><Clock className="w-3 h-3 mr-1.5"/> {svc.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="font-mono font-medium text-foreground tracking-tight tabular-nums">R$ {svc.price.toFixed(2)}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-border text-transparent'}`}>
                        {isSelected ? <Check className="w-3.5 h-3.5"/> : <Plus className="w-3.5 h-3.5 text-muted-foreground"/>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedServices.size > 0 && (
             <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-bottom-full">
               <div className="max-w-xl mx-auto flex items-center justify-between">
                 <div>
                   <p className="text-xs text-muted-foreground font-medium tracking-wide">{selectedServices.size} serviços • {totalDuration} min</p>
                   <p className="font-mono text-lg font-semibold text-foreground tracking-tight tabular-nums">Total: R$ {totalPrice.toFixed(2)}</p>
                 </div>
                 <Button variant="cta" className="px-8 h-12 font-semibold transition" onClick={() => setStep(2)}>
                   Continuar <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               </div>
             </div>
          )}
        </motion.main>
      )}

      {step === 2 && (
        <motion.main 
          key="step2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="max-w-xl mx-auto px-4 py-8"
        >
           <h2 className="font-bold text-xl mb-6 text-foreground tracking-tight">Escolha o horário</h2>

           <Card className="mb-8 border-border shadow-sm overflow-hidden bg-card rounded-xl">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => { if(date) setSelectedDate(date)}}
                disabled={(date) => {
                  if (isBeforeToday(date)) return true;
                  
                  // National holidays logic (Brazil)
                  const holidays = [
                    '01-01', // Confraternização Universal
                    '04-21', // Tiradentes
                    '05-01', // Dia do Trabalhador
                    '09-07', // Independência do Brasil
                    '10-12', // Nossa Sra. Aparecida
                    '11-02', // Finados
                    '11-15', // Proclamação da República
                    '12-25'  // Natal
                  ];
                  const monthDay = format(date, 'MM-dd');
                  if (holidays.includes(monthDay) && !provider?.workOnHolidays) {
                     return true;
                  }

                  const dateKey = format(date, 'yyyy-MM-dd');
                  if (provider?.scheduleOverrides && provider.scheduleOverrides[dateKey]) {
                    return false;
                  }
                  
                  let safeWorkingDays = [1, 2, 3, 4, 5];
                  if (Array.isArray(provider?.workingDays)) {
                     safeWorkingDays = provider.workingDays.map(Number);
                  } else if (typeof provider?.workingDays === 'string') {
                     try {
                       safeWorkingDays = JSON.parse(provider.workingDays).map(Number);
                     } catch(e) {}
                  }
                  
                  return !safeWorkingDays.includes(date.getDay());
                }}
                month={visibleMonth}
                onMonthChange={setVisibleMonth}
                modifiers={{ lotado: (date: Date) => diasLotados.has(format(date, 'yyyy-MM-dd')) }}
                modifiersClassNames={{ lotado: 'line-through opacity-50' }}
                className="mx-auto text-foreground pointer-events-auto p-4"
                locale={ptBR}
              />
              {diasLotados.size > 0 && (
                <p className="text-xs text-muted-foreground text-center pb-4 px-4">
                  Dias <span className="line-through opacity-70">riscados</span> estão sem horário livre para os serviços escolhidos — dá pra entrar na lista de espera.
                </p>
              )}
           </Card>

           {selectedDate && (
             <div>
               <h3 className="font-medium text-muted-foreground mb-4 flex justify-between items-end text-sm">
                 <span>Horários disponíveis em <br/><span className="text-foreground text-base font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span></span>
               </h3>
               {isFetchingAppointments ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                   {[...Array(8)].map((_, i) => (
                     <div key={i} className="h-11 w-full rounded-xl bg-muted animate-pulse border border-border" />
                   ))}
                 </div>
               ) : slots.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                   {slots.map(time => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className={`h-11 font-mono font-medium tabular-nums transition ${selectedTime === time ? 'shadow-md ring-1 ring-primary' : 'bg-card border-border text-foreground hover:border-primary/40 hover:bg-muted shadow-sm'}`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-10 bg-card rounded-xl border border-border border-dashed">
                   <p className="text-muted-foreground/70 text-sm">Nenhum horário disponível para este dia.</p>
                 </div>
               )}

               {/* Lista de espera. No vazio é a única saída; com horários na tela é um
                   link discreto, pra quem vê vagas mas nenhuma que sirva. */}
               {!isFetchingAppointments && (
                 joinedWaitlist ? (
                   <p className="mt-4 text-sm text-center text-emerald-700 dark:text-emerald-400">
                     Você está na lista de espera. Se abrir vaga, o profissional entra em contato.
                   </p>
                 ) : slots.length === 0 ? (
                   <Button
                     variant="outline"
                     className="mt-4 w-full h-11 bg-card border-border text-foreground hover:bg-muted"
                     onClick={() => setIsWaitlistOpen(true)}
                   >
                     Entrar na lista de espera deste dia
                   </Button>
                 ) : (
                   <button
                     type="button"
                     onClick={() => setIsWaitlistOpen(true)}
                     className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors ease-snappy"
                   >
                     Não achou um horário bom? Entrar na lista de espera
                   </button>
                 )
               )}
             </div>
           )}

           {isWaitlistOpen && (
             <form onSubmit={handleJoinWaitlist} className="mt-4 bg-card border border-border rounded-xl p-4 space-y-3">
               <div>
                 <p className="font-semibold text-foreground text-sm">Lista de espera</p>
                 <p className="text-xs text-muted-foreground mt-0.5">
                   Se abrir vaga em {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : 'nesse dia'}, o profissional te chama no WhatsApp.
                 </p>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="wlName" className="text-muted-foreground text-xs">Nome</Label>
                 <Input id="wlName" required value={waitlistName} onChange={e => setWaitlistName(e.target.value)} placeholder="Ex: Maria Silva" className="bg-background border-border text-foreground h-11 rounded-xl" />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="wlPhone" className="text-muted-foreground text-xs">WhatsApp</Label>
                 <Input id="wlPhone" required value={waitlistPhone} onChange={e => setWaitlistPhone(maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="bg-background border-border text-foreground h-11 rounded-xl" />
               </div>
               <div className="flex gap-2 justify-end pt-1">
                 <Button type="button" variant="ghost" onClick={() => setIsWaitlistOpen(false)} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
                 <Button type="submit" disabled={isJoiningWaitlist}>
                   {isJoiningWaitlist ? 'Enviando...' : 'Entrar na lista'}
                 </Button>
               </div>
             </form>
           )}

          <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium">Voltar</Button>
              <Button variant="cta" disabled={!selectedTime} className="px-8 font-medium transition" onClick={() => setStep(3)}>
                Avançar
              </Button>
            </div>
          </div>
        </motion.main>
      )}

      {step === 3 && (
        <motion.main 
          key="step3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="max-w-xl mx-auto px-4 py-8"
        >
           <h2 className="font-bold text-xl mb-6 text-foreground tracking-tight">Reserve seu horário</h2>

           <Card className="border-border shadow-sm mb-8 bg-card overflow-hidden rounded-xl">
             <div className="bg-muted border-b border-border px-5 py-3 flex items-center justify-between">
               <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">Resumo</span>
               <button className="text-sm font-medium text-foreground hover:underline decoration-muted-foreground underline-offset-4" onClick={() => setStep(1)}>Editar</button>
             </div>
             <CardContent className="p-5 space-y-4 text-sm">
               <div className="flex justify-between items-start">
                 <span className="text-muted-foreground font-medium">Data e Hora</span>
                 <span className="font-mono text-foreground font-medium text-right bg-muted px-2 py-1 rounded-xl tabular-nums">{format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</span>
               </div>
               <div className="flex justify-between items-start">
                 <span className="text-muted-foreground font-medium pt-1">Serviços ({selectedServices.size})</span>
                 <span className="text-foreground text-right leading-relaxed max-w-[200px]">{selectedServicesList.map(s => s.title || s.name).join(', ')}</span>
               </div>
               <div className="flex justify-between pt-4 mt-2 border-t border-border items-center">
                 <span className="text-foreground font-semibold text-base">Total</span>
                 <span className="font-mono text-foreground font-semibold text-lg tracking-tight tabular-nums">R$ {totalPrice.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>

           <form id="booking-form" onSubmit={handleBooking} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">Seu nome completo</Label>
                <Input id="name" required value={clientName} onChange={e => setClientName(e.target.value)} className="bg-background border-border text-foreground text-base h-12 placeholder:text-muted-foreground focus-visible:ring-primary shadow-sm rounded-xl" placeholder="Ex: Maria Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-foreground font-medium">WhatsApp</Label>
                <Input id="whatsapp" required value={clientWhatsApp} onChange={e => setClientWhatsApp(maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="bg-background border-border text-foreground text-base h-12 placeholder:text-muted-foreground focus-visible:ring-primary shadow-sm rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">E-mail <span className="text-muted-foreground/60 font-normal">(opcional)</span></Label>
                <Input id="email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="bg-background border-border text-foreground text-base h-12 placeholder:text-muted-foreground focus-visible:ring-primary shadow-sm rounded-xl" placeholder="seu@email.com" />
              </div>
           </form>

          <div className="fixed bottom-0 left-0 w-full bg-background border-t border-border p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto mb-3 text-[11px] text-muted-foreground/70 text-center px-2 leading-tight">
              Este site é protegido por reCAPTCHA e a <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">Política de Privacidade</a> e os <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">Termos de Serviço</a> do Google se aplicam.
            </div>
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium">Voltar</Button>
              <Button type="submit" variant="cta" form="booking-form" loading={isSubmitting} className="px-8 font-medium transition">
                Confirmar Reserva
              </Button>
            </div>
          </div>
        </motion.main>
      )}

      {step === 4 && (
        <motion.main 
          key="step4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md mx-auto px-4 py-20 text-center"
        >
           <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ring-4 ring-emerald-500/5">
             <Check className="w-8 h-8" strokeWidth={3} />
           </div>
           <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">Reserva Confirmada</h2>
           <p className="text-muted-foreground mb-8 leading-relaxed">
             Sua solicitação foi enviada para <span className="font-medium text-foreground">{provider?.displayName}</span>.<br/>
             Você receberá detalhes no WhatsApp <span className="font-medium text-foreground">{clientWhatsApp}</span>.
           </p>

           <Card className="bg-card border border-border shadow-sm mb-8 text-left rounded-xl overflow-hidden">
             <CardContent className="p-6 text-sm space-y-4">
               <div className="flex justify-between items-center border-b border-border pb-4">
                 <span className="text-muted-foreground font-medium">Data e Hora</span>
                 <span className="font-mono text-foreground font-semibold tabular-nums">{format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</span>
               </div>
               <div className="flex justify-between items-center border-b border-border pb-4">
                 <span className="text-muted-foreground font-medium">Profissional</span>
                 <span className="text-foreground font-semibold">{provider?.displayName}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="text-muted-foreground font-medium">Valor Total</span>
                 <span className="font-mono text-foreground font-bold text-lg tabular-nums">R$ {totalPrice.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>

           {provider?.whatsapp && (
             <Button className="w-full h-12 mb-4 bg-emerald-600 hover:bg-emerald-600/90 text-white font-medium shadow-sm transition" onClick={handleWhatsAppConfirm}>
               Acompanhar pelo WhatsApp
             </Button>
           )}

           <Button variant="outline" className="w-full h-12 border-border bg-muted text-foreground hover:bg-border hover:text-foreground font-medium shadow-sm transition" onClick={() => window.location.reload()}>
             Fazer nova reserva
           </Button>
        </motion.main>
      )}
      </AnimatePresence>
    </div>
  );
}

function isBeforeToday(date: Date) {
  return isAfter(startOfDay(new Date()), date);
}
