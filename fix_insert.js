import fs from 'fs';
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const oldInsert = `    const id = generateId();
    
    await pool.query(
      'INSERT INTO appointments (id, provider_id, client_name, client_whatsapp, client_phone, client_email, services, total_price, total_duration, buffer_time, booking_source, status, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      [id, providerId, clientName, clientWhatsApp, clientPhone, clientEmail, JSON.stringify(services || []), totalPrice, totalDuration, bufferTime || 0, bookingSource, status || 'Pendente', startAt, endAt]
    );`;

const newInsert = `    const id = generateId();
    
    try {
      await pool.query(
        'INSERT INTO appointments (id, provider_id, client_name, client_whatsapp, client_phone, client_email, services, total_price, total_duration, buffer_time, booking_source, status, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [id, providerId, clientName, clientWhatsApp, clientPhone, clientEmail, JSON.stringify(services || []), totalPrice, totalDuration, bufferTime || 0, bookingSource, status || 'Pendente', startAt, endAt]
      );
    } catch (insertError: any) {
      if (insertError.code === '23P01') {
        return res.status(409).json({ error: 'Este horário acabou de ser reservado, escolha outro horário disponível' });
      }
      throw insertError;
    }`;

if (code.includes(oldInsert)) {
  code = code.replace(oldInsert, newInsert);
  fs.writeFileSync(file, code);
  console.log('Insert logic updated');
} else {
  console.log('Old insert logic not found');
}
