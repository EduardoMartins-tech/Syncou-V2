import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-ledger-ink font-ledger-sans flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center max-w-md"
      >
        <p className="font-ledger-mono text-xs tracking-widest text-ledger-oxblood uppercase mb-6 -rotate-1 inline-block border border-ledger-oxblood/60 px-2 py-1">
          Ficha não encontrada
        </p>
        <h1 className="font-ledger-display text-7xl md:text-8xl font-bold text-ledger-parchment mb-4">
          404
        </h1>
        <p className="text-ledger-stone text-base md:text-lg mb-9 leading-relaxed">
          Essa página não está no livro. O link que você tentou acessar pode estar quebrado ou não existe mais.
        </p>
        <Link to="/" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-ledger-brass text-ledger-brass-foreground hover:bg-ledger-brass/90 px-8 py-6 text-lg font-semibold">
            <Home className="w-5 h-5 mr-3" />
            Voltar para o Início
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
