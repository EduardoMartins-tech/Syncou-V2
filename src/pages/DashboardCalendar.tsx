import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messagesConfig = {
  allDay: 'Dia todo',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há agendamentos neste período.',
  showMore: (total: number) => `+ mais ${total}`
};

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = format(toolbar.date, 'MMMM yyyy', { locale: ptBR });
    return <span className="text-lg font-semibold text-foreground capitalize">{date}</span>;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goToCurrent}
          className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-accent text-foreground transition-colors ease-snappy focus-ring"
        >
          Hoje
        </button>
        <div className="flex items-center bg-muted rounded-md overflow-hidden">
          <button
            onClick={goToBack}
            className="p-2 hover:bg-accent text-foreground transition-colors ease-snappy focus-ring"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-accent text-foreground transition-colors ease-snappy focus-ring"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        {label()}
      </div>
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg max-w-full overflow-x-auto">
        {['month', 'week', 'day', 'agenda'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ease-snappy focus-ring ${
              toolbar.view === viewName
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {messagesConfig[viewName as keyof typeof messagesConfig] as string}
          </button>
        ))}
      </div>
    </div>
  );
};

interface Appointment {
  id: string;
  clientName: string;
  clientWhatsApp: string;
  clientPhone?: string;
  services: string[];
  totalPrice: number;
  totalDuration: number;
  status: string;
  startAt: number;
  endAt: number;
  bookingSource: string;
  cancelReason?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  bufferTime: number;
  price: number;
  active: boolean;
  title?: string;
}

const CustomAgendaEvent = ({ event }: any) => {
  const isConfirmed = event.isConfirmed;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfirmed ? 'bg-primary' : 'bg-amber-500'}`} />
      <span className="font-medium text-foreground">{event.title}</span>
    </div>
  );
};

export function DashboardCalendar() {
  const { getAuthHeaders, currentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [view, setView] = useState<View>(Views.WEEK);

  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const [reschedulingLoading, setReschedulingLoading] = useState(false);

  const fetchAll = async () => {
    try {
      const [aptRes, srvRes] = await Promise.all([
        fetch('/api/appointments', { headers: getAuthHeaders() }),
        fetch('/api/services', { headers: getAuthHeaders() })
      ]);

      if (aptRes.ok) setAppointments(await aptRes.json());
      if (srvRes.ok) setServices(await srvRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const getAptServicesText = (aptServices: string[]) => {
    if (!aptServices || !Array.isArray(aptServices)) return 'serviços selecionados';
    const matchedNames = aptServices
      .map(id => services.find(s => s.id === id)?.name || services.find(s => s.id === id)?.title)
      .filter(Boolean);
    return matchedNames.length > 0 ? matchedNames.join(', ') : 'serviços selecionados';
  };

  const events = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'scheduled' || !a.status)
    .map(apt => {
      const isConfirmed = apt.status === 'confirmed' || apt.status === 'Confirmado';
      return {
        id: apt.id,
        title: `${apt.clientName} - ${getAptServicesText(apt.services)}`,
        start: new Date(apt.startAt),
        end: new Date(apt.endAt || apt.startAt + apt.totalDuration * 60000),
        resource: apt,
        isConfirmed
      };
    });

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.isConfirmed ? 'var(--primary)' : '#F59E0B';
    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '5px',
      opacity: 0.95,
      color: 'white',
      border: '0px',
      display: 'block',
      padding: '2px 5px',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    return {
      style
    };
  };

  const handleSelectEvent = (event: any) => {
    setSelectedApt(event.resource);
    setIsRescheduling(false);
  };

  const closeDetail = () => {
    setSelectedApt(null);
    setIsRescheduling(false);
  };

  const openWhatsApp = (apt: Appointment) => {
    const rawNumber = apt.clientPhone || apt.clientWhatsApp || '';
    let digitsOnly = rawNumber.replace(/\D/g, '');
    if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith('55')) {
      digitsOnly = '55' + digitsOnly;
    }

    const servicesText = getAptServicesText(apt.services);
    const dateObj = new Date(apt.startAt);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let message = `Olá ${apt.clientName}, tudo bem? Estou entrando em contato sobre o seu agendamento de ${servicesText} no dia ${formattedDate} às ${formattedTime}...`;
    if (currentUser?.whatsappMessageTemplate) {
      message = currentUser.whatsappMessageTemplate
        .replace(/{NOME}/g, apt.clientName)
        .replace(/{SERVICOS}/g, servicesText)
        .replace(/{DATA}/g, formattedDate)
        .replace(/{HORA}/g, formattedTime);
    }
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirm = async () => {
    if (!selectedApt) return;
    setConfirmingStatus(true);
    try {
      const res = await fetch(`/api/appointments/${selectedApt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: 'Confirmado' })
      });
      if (!res.ok) throw new Error('Failed');
      notifySuccess('Agendamento confirmado!');
      await fetchAll();
      closeDetail();
    } catch (err) {
      notifyError('Erro ao confirmar agendamento.');
    } finally {
      setConfirmingStatus(false);
    }
  };

  const startReschedule = () => {
    if (!selectedApt) return;
    const currentStart = new Date(selectedApt.startAt);
    setRescheduleDate(currentStart.toISOString().split('T')[0]);
    setRescheduleTime(currentStart.toTimeString().slice(0, 5));
    setIsRescheduling(true);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt || !rescheduleDate || !rescheduleTime) return;
    setReschedulingLoading(true);
    try {
      const startAtTime = new Date(`${rescheduleDate}T${rescheduleTime}:00`).getTime();
      const endAtTime = startAtTime + selectedApt.totalDuration * 60000;

      const res = await fetch(`/api/appointments/${selectedApt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: selectedApt.status, startAt: startAtTime, endAt: endAtTime })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao remarcar');
      }
      notifySuccess('Agendamento remarcado com sucesso!');
      await fetchAll();
      closeDetail();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao remarcar agendamento.');
    } finally {
      setReschedulingLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-between items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Calendário</h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os seus agendamentos.</p>
        </div>
      </motion.div>

      <Card className="bg-card border-border shadow-sm overflow-visible">
        <CardContent className="p-6">
          <style dangerouslySetInnerHTML={{__html: `
            .rbc-calendar {
              min-height: 700px;
              color: var(--foreground);
              font-family: inherit;
              border: none;
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border: none;
              background: transparent;
            }

            /* Headers */
            .rbc-header {
              padding: 12px 4px;
              border-bottom: none;
              background-color: transparent;
              color: var(--muted-foreground);
              font-weight: 500;
              font-size: 0.8rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
              border-left: none !important;
            }
            .rbc-header.rbc-today {
              color: var(--foreground);
              background: transparent;
            }
            .rbc-header.rbc-today > span {
              display: inline-block;
              background: var(--primary);
              color: var(--primary-foreground);
              border-radius: 50%;
              width: 32px;
              height: 32px;
              line-height: 32px;
              text-align: center;
              margin-top: 4px;
            }

            /* Month Grid Lines & Borders */
            .rbc-month-row {
              border-top: 1px solid var(--border);
            }
            .rbc-day-bg {
              border-left: 1px solid var(--border);
            }
            .rbc-day-bg:first-child {
              border-left: none;
            }

            /* Week/Day Grid Lines */
            .rbc-time-content {
              border-top: none;
            }
            .rbc-time-header-content {
              border-left: 1px solid var(--border);
            }
            .rbc-time-content > * + * > * {
              border-left: 1px solid var(--border);
            }
            .rbc-timeslot-group {
              border-bottom: 1px solid var(--border);
              min-height: 60px;
            }
            .rbc-time-slot {
              border-top: none;
            }

            /* Today & Other states */
            .rbc-today {
              background-color: var(--accent);
            }
            .rbc-off-range-bg {
              background-color: transparent;
            }

            /* Day/Week Gutter */
            .rbc-time-gutter {
              background-color: transparent;
            }
            .rbc-time-gutter .rbc-timeslot-group {
              border-bottom: none;
            }
            .rbc-time-gutter .rbc-time-slot {
              color: var(--muted-foreground);
              font-size: 0.75rem;
              padding-right: 12px;
              display: flex;
              align-items: flex-start;
              justify-content: flex-end;
              border: none;
              transform: translateY(-8px);
            }
            .rbc-allday-cell {
              display: none;
            }

            /* Events */
            .rbc-event {
              padding: 4px 8px;
              border-radius: 4px;
              box-shadow: none !important;
              border: none !important;
              transition: filter 0.2s;
              margin-bottom: 2px;
            }
            .rbc-event:hover {
              filter: brightness(1.1);
              z-index: 10 !important;
            }
            .rbc-event.rbc-selected {
              filter: brightness(0.92);
            }
            .rbc-event-content {
              font-size: 0.8rem;
              font-weight: 500;
              line-height: 1.2;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            /* Month View Event Fix */
            .rbc-month-view .rbc-event {
              border-radius: 4px;
              padding: 2px 6px;
            }

            /* Event Labels in Month View */
            .rbc-date-cell {
              padding: 8px;
              text-align: center;
              font-size: 0.85rem;
              color: var(--foreground);
              font-weight: 400;
            }
            .rbc-date-cell.rbc-now {
              font-weight: bold;
            }
            .rbc-date-cell.rbc-now > a {
              display: inline-block;
              background-color: var(--primary);
              color: var(--primary-foreground);
              width: 28px;
              height: 28px;
              line-height: 28px;
              border-radius: 50%;
            }
            .rbc-date-cell.rbc-off-range {
              color: var(--muted-foreground);
              opacity: 0.6;
            }

            /* Current Time Indicator */
            .rbc-current-time-indicator {
              background-color: var(--destructive);
              height: 2px;
              z-index: 3;
            }
            .rbc-current-time-indicator::before {
              content: '';
              display: block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: var(--destructive);
              position: absolute;
              left: -6px;
              top: -5px;
            }

            /* Agenda View */
            .rbc-agenda-view {
              background: transparent;
            }
            .rbc-agenda-view table.rbc-agenda-table {
              border: none;
              border-spacing: 0;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr {
              transition: background-color 0.2s;
              background-color: transparent !important;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
              background-color: var(--muted) !important;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td {
              border-left: none;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr > td {
              border-top: 1px solid var(--border);
            }
            .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
              border-bottom: 2px solid var(--border);
              padding: 16px;
              text-align: left;
              font-weight: 500;
              color: var(--muted-foreground);
              background-color: transparent;
              text-transform: uppercase;
              font-size: 0.8rem;
              letter-spacing: 0.5px;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
              padding: 16px;
              color: var(--foreground);
              background-color: transparent !important;
            }
            .rbc-agenda-date-cell {
              font-weight: 500;
              color: var(--primary);
            }
            .rbc-agenda-time-cell {
              font-size: 0.85rem;
              color: var(--muted-foreground);
              font-weight: 400;
            }
            .rbc-agenda-event-cell {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .rbc-agenda-event-cell::before {
              content: '';
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: currentColor; /* Will be overridden by inline style if possible, or just default */
            }
          `}} />
          {isFetching ? (
            <div className="h-[700px] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                messages={messagesConfig}
                culture="pt-BR"
                eventPropGetter={eventStyleGetter}
                view={view}
                onView={(newView) => setView(newView)}
                onSelectEvent={handleSelectEvent}
                min={new Date(0, 0, 0, 6, 0, 0)} // Start at 6 AM
                max={new Date(0, 0, 0, 22, 0, 0)} // End at 10 PM
                components={{
                  toolbar: CustomToolbar,
                  agenda: {
                    event: CustomAgendaEvent,
                  }
                }}
              />
              <div className="flex flex-wrap justify-start sm:justify-end items-center gap-4 pt-4 border-t border-border text-sm font-medium">
                <span className="text-muted-foreground/70 mr-2">Legenda:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md transition duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-primary flex items-center">
                    Confirmado (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md transition duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-amber-700 dark:text-amber-400 flex items-center">
                    Pendente (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => !e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => !e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedApt} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
          {selectedApt && !isRescheduling && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {selectedApt.clientName}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Detalhes do agendamento.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 w-fit ${
                  (selectedApt.status === 'confirmed' || selectedApt.status === 'Confirmado')
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20'
                }`}>
                  {(selectedApt.status === 'confirmed' || selectedApt.status === 'Confirmado')
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmado</>
                    : <><Clock className="w-3.5 h-3.5" /> Pendente</>}
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-mono">
                    {new Date(selectedApt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às {new Date(selectedApt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{getAptServicesText(selectedApt.services)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                  <span className="font-mono text-primary bg-primary/5 px-2 py-1 rounded">
                    R$ {selectedApt.totalPrice?.toFixed(2) || '0.00'}
                  </span>
                  <button
                    onClick={() => openWhatsApp(selectedApt)}
                    className="text-[#25D366] hover:text-[#128C7E] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 px-2 py-1 rounded transition-colors ease-snappy inline-flex items-center gap-1.5 font-medium focus-ring"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    {selectedApt.clientWhatsApp || selectedApt.clientPhone || 'Sem número'}
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={startReschedule} className="text-muted-foreground hover:text-foreground hover:bg-muted">
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Remarcar
                </Button>
                {!(selectedApt.status === 'confirmed' || selectedApt.status === 'Confirmado') && (
                  <Button type="button" loading={confirmingStatus} onClick={handleConfirm} className="font-semibold">
                    Confirmar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {selectedApt && isRescheduling && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <RefreshCcw className="w-5 h-5 text-primary" />
                  Remarcar Agendamento
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Escolha a nova data e horário para o agendamento de <b className="text-foreground">{selectedApt.clientName}</b>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConfirmReschedule} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calRescheduleDate" className="text-muted-foreground">Nova Data</Label>
                    <Input
                      id="calRescheduleDate"
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="bg-muted border-border text-foreground focus-visible:ring-primary block h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calRescheduleTime" className="text-muted-foreground">Novo Horário</Label>
                    <Input
                      id="calRescheduleTime"
                      type="time"
                      required
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="bg-muted border-border text-foreground focus-visible:ring-primary block h-11"
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4 flex sm:justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsRescheduling(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted">
                    Voltar
                  </Button>
                  <Button type="submit" loading={reschedulingLoading} className="font-semibold">
                    Confirmar Remarcação
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
