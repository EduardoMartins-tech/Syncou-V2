import fs from 'fs';
const file = 'src/components/DashboardLayout.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldMain = `      <main className="flex-1 p-6 md:p-10 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-[#130E20]/90 backdrop-blur-md border-b border-[#2D214F] p-4 -m-6 md:-m-10 mb-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="text-[#9B8FC0] hover:text-white p-2 rounded-md hover:bg-[#2D214F]/50 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}`;

const newMain = `      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-[#130E20]/90 backdrop-blur-md border-b border-[#2D214F] p-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="text-[#9B8FC0] hover:text-white p-2 rounded-md hover:bg-[#2D214F]/50 transition-colors relative z-50"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}`;

const oldEnd = `        <div className="max-w-5xl mx-auto w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>`;

const newEnd = `        <main className="flex-1 p-6 md:p-10 flex flex-col">
          <div className="max-w-5xl mx-auto w-full flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>`;

code = code.replace(oldMain, newMain);
code = code.replace(oldEnd, newEnd);
fs.writeFileSync(file, code);
console.log('Fixed main structure');
