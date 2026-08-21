import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0914] flex flex-col items-center justify-center p-4 text-center overflow-hidden relative">
      {/* Visual background lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-md"
      >
        <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-violet-600 mb-2 drop-shadow-sm selection:bg-violet-500/30">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 selection:bg-violet-500/30">
          Ops! Página não encontrada.
        </h2>
        <p className="text-[#9B8FC0] text-base md:text-lg mb-8 leading-relaxed selection:bg-violet-500/30">
          Parece que você se perdeu no espaço. O link que você tentou acessar pode estar quebrado ou a página não existe mais.
        </p>
        <Link to="/" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all">
            <Home className="w-5 h-5 mr-3" />
            Voltar para o Início
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
