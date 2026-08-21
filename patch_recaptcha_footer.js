import fs from 'fs';
let code = fs.readFileSync('src/pages/ProviderPage.tsx', 'utf8');

const oldFooter = `          <div className="fixed bottom-0 left-0 w-full bg-[#0B0914] border-t border-[#2D214F] p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium">Voltar</Button>
              <Button type="submit" form="booking-form" disabled={isSubmitting} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.2)] font-medium transition-all">
                {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </div>`;

const newFooter = `          <div className="fixed bottom-0 left-0 w-full bg-[#0B0914] border-t border-[#2D214F] p-4 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)] z-20">
            <div className="max-w-xl mx-auto mb-3 text-[11px] text-[#5B4F81] text-center px-2 leading-tight">
              Este site é protegido por reCAPTCHA e a <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B8FC0]">Política de Privacidade</a> e os <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B8FC0]">Termos de Serviço</a> do Google se aplicam.
            </div>
            <div className="max-w-xl mx-auto flex justify-between">
              <Button variant="ghost" type="button" onClick={() => setStep(2)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium">Voltar</Button>
              <Button type="submit" form="booking-form" disabled={isSubmitting} className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.2)] font-medium transition-all">
                {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </div>`;

code = code.replace(oldFooter, newFooter);
fs.writeFileSync('src/pages/ProviderPage.tsx', code);
