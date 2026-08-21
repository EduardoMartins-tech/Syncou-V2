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
import { format, isSameDay, addMinutes, isAfter, startOfDay, addDays, getHours, setHours, setMinutes } from 'date-fns';
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
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: services, 2: datetime, 3: checkout, 4: success
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [clientName, setClientName] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Fetch appointments for selected date
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!provider || !selectedDate) return;
      setIsFetchingAppointments(true);
      try {
        const startDay = startOfDay(selectedDate).getTime();
        const endDay = setMinutes(setHours(selectedDate, 23), 59).getTime(); // 23:59:59 approximately, or use endOfDay
        
        // This should hit an open/public endpoint for a provider's unavailable chunks
        // To keep it simple, we just pretend there's no overlapping bookings for now directly
        const res = await fetch(`/api/provider/${provider.slug}/appointments?startAt=${startDay}&endAt=${endDay}`);
        if(res.ok) {
           const fetched = await res.json();
           setAppointments(fetched.filter((app: any) => app.status === 'Pendente' || app.status === 'Confirmado' || app.status === 'scheduled' || app.status === 'confirmed' || !app.status));
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
  }, [provider, selectedDate, step]);

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

  if (loading) return <div className="min-h-screen bg-[#0B0914] flex items-center justify-center text-[#9B8FC0]">Localizando profissional...</div>;
  if (!provider) return <div className="min-h-screen bg-[#0B0914] flex items-center justify-center text-white font-bold text-xl">Profissional não encontrado</div>;

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

  // Improved slot generation: check for overlaps, duration and overrides
  const generateSlots = () => {
    if (!selectedDate || selectedServices.size === 0 || !provider) return [];
    
    let workingStart = provider.workingHoursStart || "09:00";
    let workingEnd = provider.workingHoursEnd || "18:00";
    let isClosed = false;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');

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
    const monthDay = format(selectedDate, 'MM-dd');
    
    if (holidays.includes(monthDay) && !provider.workOnHolidays) {
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
    }

    if (isClosed) return [];
    
    const [startHour, startMin] = workingStart.split(':').map(Number);
    const [endHour, endMin] = workingEnd.split(':').map(Number);
    
    let start = setMinutes(setHours(selectedDate, startHour), startMin);
    const end = setMinutes(setHours(selectedDate, endHour), endMin);
    const slots = [];
    const now = new Date();

    while (isAfter(end, start)) {
      const slotTime = start.getTime();
      const slotEndAt = slotTime + (totalDurationWithBuffer * 60000);
      
      // Basic check: is the slot in the past?
      const isPast = isSameDay(selectedDate, now) && isAfter(now, start);
      
      // Slot must finish before or exactly at the provider's closing time
      const exceedsClosingTime = slotEndAt > end.getTime();
      
      if (!isPast && !exceedsClosingTime) {
        // Check for overlaps with existing appointments
        // Added a 5 minute overlap tolerance (5 * 60000 ms) so that if an appointment 
        // ends up to 5 mins into a slot (e.g. 17:31 ending at 17:30 slot), it won't block the next slot.
        const tolerance = 5 * 60000;
        
        const isOccupied = appointments.some(app => {
          // An appointment overlaps if it starts before our slot ends AND ends after our slot starts
          const isValidStatus = app.status === 'Pendente' || app.status === 'Confirmado' || app.status === 'scheduled' || app.status === 'confirmed' || !app.status;
          return isValidStatus && app.startAt < (slotEndAt - tolerance) && app.endAt > (slotTime + tolerance);
        });

        if (!isOccupied) {
          slots.push(format(start, 'HH:mm'));
        }
      }
      
      start = addMinutes(start, 30);
    }
    return slots;
  };

  const slots = generateSlots();

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
      <div className="min-h-screen flex items-center justify-center bg-[#0B0914]">
        <div className="text-[#9B8FC0] font-medium">Provider não encontrado...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0914] text-[#E2D9F3] font-sans pb-24 selection:bg-violet-500/30">
      {/* Header Sticky */}
      {step < 4 && (
        <header className="bg-[#0B0914]/80 backdrop-blur-md border-b border-[#2D214F] sticky top-0 z-10 px-4 py-3 flex items-center shadow-sm">
          {step > 1 && (
             <Button variant="ghost" size="icon" className="mr-2 h-8 w-8 text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50" onClick={() => setStep(step - 1 as any)}>
               <ChevronLeft className="w-4 h-4" />
             </Button>
          )}
          <div className="flex items-center gap-3">
             <Avatar className="w-8 h-8 ring-1 ring-[#2D214F]">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-[#1A1333] text-[#E2D9F3] text-xs">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <div>
               <p className="text-sm font-medium text-white leading-tight">{provider.displayName}</p>
               <p className="text-[10px] text-[#9B8FC0] font-medium tracking-wide uppercase">Agendamento Online</p>
             </div>
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
             <Avatar className="w-24 h-24 mx-auto mb-5 border-4 border-[#0B0914] shadow-sm ring-1 ring-[#2D214F]">
               <AvatarImage src={provider.avatarUrl} />
               <AvatarFallback className="bg-[#1A1333] text-white text-3xl font-light">{provider.displayName.charAt(0)}</AvatarFallback>
             </Avatar>
             <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">{provider.displayName}</h1>
             <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 uppercase tracking-widest text-[10px] mb-4 border border-emerald-500/20 shadow-sm font-medium">Disponível</Badge>
             {provider.bio && <p className="text-[#9B8FC0] text-sm max-w-md mx-auto leading-relaxed">{provider.bio}</p>}
          </div>

          <h2 className="font-medium text-lg mb-4 text-white tracking-tight">Selecione os Serviços</h2>
          <div className="space-y-3">
            {services.map(svc => {
              const isSelected = selectedServices.has(svc.id);
              return (
                <Card 
                  key={svc.id} 
                  className={`cursor-pointer transition-all duration-200 border bg-[#130E20] ${isSelected ? 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500' : 'border-[#2D214F] shadow-sm hover:border-[#4B3B7A] hover:bg-[#1A1333]'}`}
                  onClick={() => toggleService(svc.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-[#E2D9F3]'}`}>{svc.title || svc.name}</h3>
                      {svc.description && <p className="text-sm text-[#9B8FC0] mt-1 leading-relaxed">{svc.description}</p>}
                      <div className="flex items-center gap-3 text-xs font-medium text-[#9B8FC0] mt-3">
                        <span className="flex items-center bg-[#1A1333] border border-[#2D214F] px-2.5 py-1 rounded-md text-[#E2D9F3]"><Clock className="w-3 h-3 mr-1.5"/> {svc.duration} min</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="font-medium text-white tracking-tight">R$ {svc.price.toFixed(2)}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'bg-[#1A1333] border-[#2D214F] text-transparent'}`}>
                        {isSelected ? <Check className="w-3.5 h-3.5"/> : <Plus className="w-3.5 h-3.5 text-[#5B4F81]"/>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {selectedServices.size > 0 && (
             <div className="fixed bottom-0 left-0 w-full bg-[#0B0914] border-t border-[#2D214F] p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-bottom-full">
               <div className="max-w-xl mx-auto flex items-center justify-between">
                 <div>
                   <p className="text-xs text-[#9B8FC0] font-medium tracking-wide">{selectedServices.size} serviços • {totalDuration} min</p>
                   <p className="text-lg font-semibold text-white tracking-tight">Total: R$ {totalPrice.toFixed(2)}</p>
                 </div>
                 <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 h-12 rounded-lg font-medium shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all" onClick={() => setStep(2)}>
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
           <h2 className="font-medium text-xl mb-6 text-white tracking-tight">Escolha o horário</h2>
           
           <Card className="mb-8 border-[#2D214F] shadow-sm overflow-hidden bg-[#130E20]">
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
                className="mx-auto rounded-xl text-white pointer-events-auto p-4"
                locale={ptBR}
              />
           </Card>

           {selectedDate && (
             <div>
               <h3 className="font-medium text-[#9B8FC0] mb-4 flex justify-between items-end text-sm">
                 <span>Horários disponíveis em <br/><span className="text-white text-base">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span></span>
               </h3>
               {isFetchingAppointments ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                   {[...Array(8)].map((_, i) => (
                     <div key={i} className="h-11 w-full rounded-lg bg-[#2D214F]/50 animate-pulse border border-[#2D214F]" />
                   ))}
                 </div>
               ) : slots.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                   {slots.map(time => (
                      <Button 
                        key={time} 
                        variant={selectedTime === time ? 'default' : 'outline'}
                        className={`h-11 rounded-lg font-medium transition-all ${selectedTime === time ? 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-md ring-1 ring-violet-500' : 'bg-[#1A1333] border-[#2D214F] text-[#E2D9F3] hover:border-[#4B3B7A] hover:bg-[#2D214F]/50 shadow-sm'}`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-10 bg-[#130E20] rounded-xl border border-[#2D214F] border-dashed">
                   <p className="text-[#5B4F81] text-sm">Nenhum horário disponível para este dia.</p>
                 </div>
               )}
             </div>
           )}

          <div className="fixed bottom-0 left-0 w-full bg-[#0B0914] border-t border-[#2D214F] p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium">Voltar</Button>
              <Button disabled={!selectedTime} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 rounded-lg shadow-sm font-medium transition-all" onClick={() => setStep(3)}>
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
           <h2 className="font-medium text-xl mb-6 text-white tracking-tight">Reserve seu horário</h2>
           
           <Card className="border-[#2D214F] shadow-sm mb-8 bg-[#130E20] overflow-hidden">
             <div className="bg-[#1A1333]/80 border-b border-[#2D214F] px-5 py-3 flex items-center justify-between">
               <span className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">Resumo</span>
               <button className="text-sm font-medium text-white hover:underline decoration-[#5B4F81] underline-offset-4" onClick={() => setStep(1)}>Editar</button>
             </div>
             <CardContent className="p-5 space-y-4 text-sm">
               <div className="flex justify-between items-start">
                 <span className="text-[#9B8FC0] font-medium">Data e Hora</span>
                 <span className="text-white font-medium text-right bg-[#2D214F]/50 px-2 py-1 rounded-md">{format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</span>
               </div>
               <div className="flex justify-between items-start">
                 <span className="text-[#9B8FC0] font-medium pt-1">Serviços ({selectedServices.size})</span>
                 <span className="text-[#E2D9F3] text-right leading-relaxed max-w-[200px]">{selectedServicesList.map(s => s.title || s.name).join(', ')}</span>
               </div>
               <div className="flex justify-between pt-4 mt-2 border-t border-[#2D214F] items-center">
                 <span className="text-white font-semibold text-base">Total</span>
                 <span className="text-white font-semibold text-lg tracking-tight">R$ {totalPrice.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>

           <form id="booking-form" onSubmit={handleBooking} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#E2D9F3] font-medium">Seu nome completo</Label>
                <Input id="name" required value={clientName} onChange={e => setClientName(e.target.value)} className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] text-base h-12 placeholder:text-[#5B4F81] focus-visible:ring-violet-500 shadow-sm rounded-lg" placeholder="Ex: Maria Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-[#E2D9F3] font-medium">WhatsApp</Label>
                <Input id="whatsapp" required value={clientWhatsApp} onChange={e => setClientWhatsApp(maskWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] text-base h-12 placeholder:text-[#5B4F81] focus-visible:ring-violet-500 shadow-sm rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#E2D9F3] font-medium">E-mail <span className="text-[#5B4F81] font-normal">(opcional)</span></Label>
                <Input id="email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] text-base h-12 placeholder:text-[#5B4F81] focus-visible:ring-violet-500 shadow-sm rounded-lg" placeholder="seu@email.com" />
              </div>
           </form>

          <div className="fixed bottom-0 left-0 w-full bg-[#0B0914] border-t border-[#2D214F] p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto mb-3 text-[11px] text-[#5B4F81] text-center px-2 leading-tight">
              Este site é protegido por reCAPTCHA e a <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B8FC0]">Política de Privacidade</a> e os <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B8FC0]">Termos de Serviço</a> do Google se aplicam.
            </div>
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium">Voltar</Button>
              <Button type="submit" form="booking-form" disabled={isSubmitting} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.2)] font-medium transition-all">
                {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
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
           <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.15)] ring-4 ring-emerald-500/5">
             <Check className="w-8 h-8" strokeWidth={3} />
           </div>
           <h2 className="text-3xl font-semibold tracking-tight text-white mb-3">Reserva Confirmada</h2>
           <p className="text-[#9B8FC0] mb-8 leading-relaxed">
             Sua solicitação foi enviada para <span className="font-medium text-white">{provider?.displayName}</span>.<br/>
             Você receberá detalhes no WhatsApp <span className="font-medium text-white">{clientWhatsApp}</span>.
           </p>
           
           <Card className="bg-[#130E20] border border-[#2D214F] shadow-sm mb-8 text-left rounded-xl overflow-hidden">
             <CardContent className="p-6 text-sm space-y-4">
               <div className="flex justify-between items-center border-b border-[#2D214F] pb-4">
                 <span className="text-[#9B8FC0] font-medium">Data e Hora</span> 
                 <span className="text-white font-semibold">{format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</span>
               </div>
               <div className="flex justify-between items-center border-b border-[#2D214F] pb-4">
                 <span className="text-[#9B8FC0] font-medium">Profissional</span> 
                 <span className="text-white font-semibold">{provider?.displayName}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="text-[#9B8FC0] font-medium">Valor Total</span> 
                 <span className="text-white font-bold text-lg">R$ {totalPrice.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>

           {provider?.whatsapp && (
             <Button className="w-full rounded-lg h-12 mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all shadow-[0_0_15px_rgba(5,150,105,0.2)]" onClick={handleWhatsAppConfirm}>
               Acompanhar pelo WhatsApp
             </Button>
           )}

           <Button variant="outline" className="w-full rounded-lg h-12 border-[#2D214F] bg-[#1A1333] text-[#E2D9F3] hover:bg-[#2D214F] hover:text-white font-medium shadow-sm transition-all" onClick={() => window.location.reload()}>
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
