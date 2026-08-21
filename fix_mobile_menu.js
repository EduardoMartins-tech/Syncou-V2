import fs from 'fs';
const file = 'src/components/DashboardLayout.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldHeaderMenu = `        {/* Mobile Header */}
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

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-0 z-10 bg-[#0B0914] pt-20 px-6 flex flex-col h-screen overflow-y-auto"
            >
              <div className="flex-1 flex flex-col space-y-4 pb-20">
                <nav className="space-y-2 mt-4">
                  {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className="block">
                      <Button 
                        variant="ghost" 
                        className={\`w-full justify-start text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium h-12 text-lg \${location.pathname === item.path ? 'bg-[#2D214F] text-white shadow-sm' : ''}\`}
                      >
                        <item.icon className="mr-4 w-5 h-5" strokeWidth={2} />
                        {item.name}
                      </Button>
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto pt-8 border-t border-[#2D214F]">
                  <div className="flex items-center gap-3 mb-6 bg-[#130E20] p-4 rounded-xl border border-[#2D214F]">
                    <Avatar className="w-12 h-12 ring-2 ring-[#2D214F] shadow-sm">
                      <AvatarImage src={currentUser?.avatarUrl || ''} />
                      <AvatarFallback className="bg-[#1A1333] text-white font-medium">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="font-medium text-white truncate">{currentUser?.displayName}</p>
                      <p className="text-sm text-[#9B8FC0] truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-[#2D214F] text-[#E2D9F3] hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 font-medium h-12" 
                    onClick={logout}
                  >
                    <LogOut className="mr-3 w-5 h-5" strokeWidth={2} />
                    Sair
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>`;

const newHeaderMenu = `        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-[#0B0914]/80 backdrop-blur-xl border-b border-[#2D214F] p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
            <span className="font-bold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className={\`p-2.5 rounded-xl transition-all duration-300 relative z-50 flex items-center justify-center \${mobileMenuOpen ? 'bg-[#2D214F]/50 text-white' : 'bg-[#130E20] border border-[#2D214F] text-[#9B8FC0] hover:text-white hover:border-[#4B3B7A]'}\`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-30 bg-[#0B0914]/98 backdrop-blur-2xl pt-24 px-6 flex flex-col h-screen overflow-y-auto"
            >
              <div className="flex-1 flex flex-col pb-8">
                <nav className="space-y-3 mt-4">
                  {navItems.map((item, i) => (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
                    >
                      <Link to={item.path} className="block">
                        <Button 
                          variant="ghost" 
                          className={\`w-full justify-start font-medium h-14 text-lg rounded-xl transition-all \${location.pathname === item.path ? 'bg-[#8B5CF6]/10 text-violet-300 shadow-sm border border-violet-500/20' : 'text-[#9B8FC0] hover:text-white hover:bg-[#1A1333]'}\`}
                        >
                          <item.icon className={\`mr-4 w-6 h-6 \${location.pathname === item.path ? 'text-violet-400' : 'text-[#9B8FC0]'}\`} strokeWidth={2} />
                          {item.name}
                        </Button>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-auto pt-8 border-t border-[#2D214F]/50"
                >
                  <div className="flex items-center gap-4 mb-6 bg-[#130E20] p-4 rounded-2xl border border-[#2D214F]">
                    <Avatar className="w-12 h-12 ring-2 ring-[#2D214F] ring-offset-2 ring-offset-[#130E20]">
                      <AvatarImage src={currentUser?.avatarUrl || ''} />
                      <AvatarFallback className="bg-[#8B5CF6] text-white font-medium">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden flex-1">
                      <p className="font-semibold text-white truncate text-base">{currentUser?.displayName}</p>
                      <p className="text-sm text-[#9B8FC0] truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-[#2D214F] bg-[#1A1333] text-[#E2D9F3] hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 font-medium h-14 rounded-xl transition-all" 
                    onClick={logout}
                  >
                    <LogOut className="mr-3 w-5 h-5 text-red-400/80" strokeWidth={2} />
                    Sair da conta
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>`;

code = code.replace(oldHeaderMenu, newHeaderMenu);
fs.writeFileSync(file, code);
console.log('Fixed mobile menu visuals');
