import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center max-w-md"
      >
        <p className="font-mono text-xs tracking-widest text-primary uppercase mb-6 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
          Erro 404
        </p>
        <h1 className="text-7xl md:text-8xl font-extrabold text-foreground mb-4 tracking-tight">
          404
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-9 leading-relaxed">
          Essa página não existe. O link que você tentou acessar pode estar quebrado ou não existe mais.
        </p>
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="cta" className="w-full sm:w-auto px-8 py-6 text-lg font-semibold">
            <Home className="w-5 h-5 mr-3" />
            Voltar para o Início
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
