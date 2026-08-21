export const syncWithGoogleCalendar = async (appointmentData: any, googleAccessToken: string) => {
  const { title, clientPhone, startAt, endAt, timeZone = "America/Sao_Paulo" } = appointmentData;

  const startDateTime = new Date(startAt).toISOString();
  const endDateTime = new Date(endAt).toISOString();

  const event = {
    summary: title,
    description: `Agendamento realizado via Syncou. Contacto do cliente: ${clientPhone || 'Não informado'}`,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone,
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
};
