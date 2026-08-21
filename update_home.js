import fs from 'fs';
const file = 'src/pages/DashboardHome.tsx';
let code = fs.readFileSync(file, 'utf8');

const banner = `    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      {!currentUser?.googleAccessToken && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-full text-amber-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-amber-400 font-medium">Sincronização pendente</h3>
              <p className="text-amber-400/80 text-sm mt-0.5">Conecte sua conta do Google para sincronizar seus agendamentos automaticamente.</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/app/settings'} variant="outline" className="w-full sm:w-auto bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400">
            Conectar agora
          </Button>
        </motion.div>
      )}

      <motion.div`;

code = code.replace(`    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">\n      <motion.div`, banner);
fs.writeFileSync(file, code);
