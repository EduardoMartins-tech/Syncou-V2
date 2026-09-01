const ALERT_WORTHY_EVENTS = ['API_NOT_FOUND', 'CAPTCHA_FAILED'];
const REPEATED_ALERT_EVENTS = ['RATE_LIMIT_EXCEEDED', 'AUTH_MISSING_TOKEN', 'AUTH_INVALID_TOKEN'];
const suspiciousIpTracker = new Map<string, number[]>();

export function logSecurityEvent(eventType: string, req: any, details: any = {}) {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = 'unknown-ip';
  
  if (forwarded) {
    if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
      ip = forwarded[0];
    }
  } else {
    ip = req.socket?.remoteAddress || req.ip || 'unknown-ip';
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event_type: eventType,
    ip: ip,
    method: req.method,
    path: req.originalUrl || req.path,
    details: details
  }));

  if (process.env.DISCORD_WEBHOOK_URL) {
    let shouldAlert = false;
    let alertReason = eventType;

    if (ALERT_WORTHY_EVENTS.includes(eventType)) {
      shouldAlert = true;
    } else if (REPEATED_ALERT_EVENTS.includes(eventType)) {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      let timestamps = suspiciousIpTracker.get(ip) || [];
      timestamps = timestamps.filter(ts => now - ts < tenMinutes);
      timestamps.push(now);
      
      if (timestamps.length >= 3) {
        shouldAlert = true;
        alertReason = `REPEATED_SUSPICIOUS_ACTIVITY (${eventType})`;
        suspiciousIpTracker.delete(ip);
      } else {
        suspiciousIpTracker.set(ip, timestamps);
      }
    }

    if (shouldAlert) {
      const safePayload = {
        content: `🚨 **Alerta de Segurança**\n**Evento**: \`${alertReason}\`\n**IP**: \`${ip}\`\n**Rota**: \`${req.method} ${req.originalUrl || req.path}\`\n**Data**: \`${new Date().toISOString()}\``
      };
      
      fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload)
      }).catch(err => {
        console.error('Falha ao enviar webhook do Discord:', err.message);
      });
    }
  }
}
