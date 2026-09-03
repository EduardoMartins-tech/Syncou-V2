import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-xl relative z-10 p-2 sm:p-4">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground tracking-tight">
                Redefinição de Senha Desativada
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nesta versão local de demonstração, a redefinição de senha está temporariamente desativada em virtude da ausência de um servidor de e-mail integrado.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <Button
                onClick={() => navigate('/')}
                variant="cta"
                className="w-full font-bold h-11 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
