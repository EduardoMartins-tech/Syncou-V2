import fs from 'fs';
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR\(255\);/;
if (code.match(regex)) {
  code = code.replace(regex, `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
      
      CREATE EXTENSION IF NOT EXISTS btree_gist;
      
      -- Remove and re-add constraint to ensure it's up to date
      ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlapping_appointments;
      ALTER TABLE appointments ADD CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        provider_id WITH =,
        int8range(start_at, end_at) WITH &&
      ) WHERE (status IN ('Pendente', 'Confirmado', 'scheduled', 'confirmed', 'pendente', 'confirmado'));
`);
  fs.writeFileSync(file, code);
  console.log("Migration modified");
} else {
  console.log("Not found");
}
