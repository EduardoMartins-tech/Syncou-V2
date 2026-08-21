import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0A0713] text-white flex flex-col font-sans">
      <header className="border-b border-[#2D214F] bg-[#0A0713]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <Link to="/" className="text-sm text-[#9B8FC0] hover:text-white flex items-center gap-2 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
        </div>
      </header>

      <main className="flex-1 py-16 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">Termos de Serviço</h1>
              <p className="text-[#9B8FC0] text-sm md:text-base">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="prose prose-invert prose-violet max-w-none prose-headings:text-white prose-p:text-[#9B8FC0] prose-li:text-[#9B8FC0] prose-strong:text-white space-y-6 text-[#9B8FC0] leading-relaxed">
             
             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">1. Aceitação dos Termos</h2>
               <p>Ao acessar e utilizar a plataforma Syncou ("Plataforma", "Nós", "Nosso"), você ("Usuário", "Profissional", "Cliente") concorda integral e expressamente com os presentes Termos de Serviço. Caso não concorde com qualquer disposição aqui presente, você <strong className="text-white">não deve</strong> utilizar nossos serviços. O uso contínuo da Plataforma constitui aceitação irrefutável destes termos em sua totalidade e renúncia legal a qualquer contestação posterior contra o seu fornecedor.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">2. Natureza do Serviço e Proteção Legal</h2>
               <p>A Plataforma opera exclusivamente como uma infraestrutura tecnológica (SaaS) para facilitar o agendamento de horários entre Profissionais e seus respectivos Clientes. <strong className="text-white">A Plataforma é meramente um software intermediador e não é parte de nenhuma negociação, acordo, contrato ou transação do mundo real.</strong></p>
               <ul className="list-disc pl-5 space-y-2 marker:text-violet-500">
                 <li>Não garantimos, endossamos ou nos responsabilizamos pela qualidade, segurança, legalidade ou veracidade dos serviços oferecidos pelos Profissionais.</li>
                 <li>Não nos responsabilizamos por pagamentos não efetuados, cancelamentos de última hora, "no-shows" (faltas), reembolsos, inadimplência ou conflitos de qualquer natureza entre o Profissional e seu Cliente.</li>
                 <li>Em <strong className="text-white">nenhuma hipótese sob a lei aplicável</strong> a Plataforma, seus criadores originários, diretores ou afiliados serão responsabilizados por danos diretos, indiretos, incidentais, especiais, punitivos ou consequentes resultantes do uso do software. O Profissional assume total responsabilidade pelo seu próprio negócio.</li>
               </ul>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">3. Serviço Fornecido "As Is" (Como Está) e Isenção de Garantias</h2>
               <p>A Plataforma é fornecida no estado em que se encontra ("as is") e conforme a disponibilidade ("as available"), <strong className="text-white">isentando-se expressamente de todas e quaisquer garantias</strong> explícitas ou implícitas de comercialização, adequação a um propósito específico ou não-violação. O criador da ferramenta renuncia de forma plena a qualquer promessa de desempenho ininterrupto, livre de bugs, atrasos ou imprecisões na sincronização (como Google Calendar e outros módulos).</p>
               <p>O criador/desenvolvedor fica blindado e expressesamente eximido de arcar financeira ou legalmente com atrasos, perdas de agenda, lucros cessantes ou perda de clientela motivada por falha técnica na plataforma.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">4. Preservação de Dados e Tolerância a Falhas</h2>
               <p>Embora adotemos ferramentas para preservar as informações, <strong className="text-white">o Usuário é unicamente responsável por realizar seus próprios backups</strong> e anotações. Não haverá, sob pretexto algum, direito à indenização por exclusão acidental de dados, corrupção do banco de dados, pane no servidor ou interrupções provocadas por ataques cibernéticos ou força maior.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">5. Moderação, Conteúdo e Desligamento Unilateral</h2>
               <p>Reservamo-nos o mais absoluto direito de, a nosso exclusivo e livre critério, e a qualquer instante (sem necessidade de aviso prévio ou explicação ou prazo), apagar publicações, banir ips, suspender e deletar em definitivo a conta de qualquer usuário caso percebamos risco comercial, conduta indevida ou uso que julgarmos inadequado da infraestrutura cedida. O Usuário não terá direito de contestar tais suspensões por vias legais.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">6. Acordo Completo de Indenização</h2>
               <p>Ao se inscrever, você isenta permanentemente os gestores e desenvolvedores da Plataforma, concordando em não tomar nenhum tipo de atitude legal (<strong className="text-white">pleiteando e suportando até mesmo os custos de defesa e honorários advocatícios</strong> do "criador") nos casos de processo ou ameaça de processo gerado por sua decisão e escolha de usar nossos sistemas.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">7. Serviços e Atividades Proibidas</h2>
               <p>É estritamente proibido utilizar a Plataforma para agendar, intermediar ou promover serviços ilegais, antiéticos, perigosos ou que violem a legislação brasileira (incluindo, mas não se limitando a: prostituição, venda de substâncias ilícitas, contrabando, serviços médicos clandestinos, atividades que incitem ódio ou violência). A constatação de uso para finalidades ilícitas resultará em banimento imediato e denúncia às autoridades competentes, isentando a Plataforma de qualquer cumplicidade ou responsabilidade pelos atos do Usuário.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">8. Propriedade Intelectual</h2>
               <p>Todo o código, design, logotipos, textos e interfaces da Plataforma são de propriedade exclusiva de seus criadores. Você tem a permissão (licença revogável) de usar o software, mas não adquire nenhum direito de propriedade sobre ele. Fica proibida a cópia, engenharia reversa ou revenda não autorizada da nossa infraestrutura.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">9. Teto de Responsabilidade Financeira</h2>
               <p>Sem prejuízo das cláusulas de isenção já descritas, caso a Plataforma seja, por qualquer motivo legal, condenada a indenizar o Usuário, fica desde já pactuado que <strong className="text-white">a responsabilidade máxima agregada jamais ultrapassará o valor total pago pelo próprio Usuário à Plataforma nos últimos 12 meses</strong> (ou R$ 0,00 caso seja um usuário do plano gratuito).</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">10. Alteração dos Termos</h2>
               <p>Podemos modificar estes Termos a qualquer momento. Modificações substanciais podem ser avisadas na plataforma, mas o uso contínuo após as alterações significa que você concorda com a nova versão. É sua responsabilidade revisar esta página periodicamente.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">11. Inexistência de Vínculo</h2>
               <p>Não há qualquer relação de sociedade, franquia, representação comercial, joint-venture ou vínculo empregatício entre o Usuário e a Plataforma. O Profissional atua de forma autônoma e independente. A Plataforma é uma mera fornecedora de software ("SaaS").</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">12. Falhas em APIs e Serviços de Terceiros</h2>
               <p>Nossa plataforma integra-se com serviços externos (ex: APIs do Google Calendar, WhatsApp, provedores de email). Nós <strong className="text-white">não temos controle</strong> sobre esses serviços. Se o Google alterar suas regras, cobrar taxas ou derrubar integrações, ou se o WhatsApp bloquear números ou links, a Plataforma não poderá ser responsabilizada por nenhuma perda de funcionalidade, atraso ou dados perdidos resultantes das ações destes terceiros.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">13. Responsabilidade Tributária, Fiscal e Consumerista</h2>
               <p>O Profissional é o único, exclusivo e integral responsável por recolher todos os impostos devidos (ISS, IRPF, IRPJ, etc.), emitir Notas Fiscais, respeitar orçamentos, seguir as regras do seu respectivo conselho de classe (CRM, CRP, OAB, etc.) e cumprir o Código de Defesa do Consumidor (CDC) perante seus Clientes. A Plataforma <strong className="text-white">exime-se expressamente de qualquer responsabilidade solidária ou subsidiária</strong> em auditorias fiscais, processos do Procon ou litígios consumeristas.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">14. Fraudes, Pagamentos e "Chargebacks"</h2>
               <p>Em caso de adoção de sistemas de pagamentos na plataforma, a mesma atuaria como um mero integrador técnico. Qualquer estorno, chargeback (contestação de cartão de crédito), fraude cometida por clientes ou calote de comparecimento (no-show) é um risco intrínseco e exclusivo da operação comercial do próprio Profissional. Em nenhuma hipótese nos responsabilizamos por perdas financeiras desta natureza ou adiantaremos valores não confirmados.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">15. Capacidade Civilidade e Idade Mínima</h2>
               <p>O uso da Plataforma é rigidamente restrito a indivíduos maiores de 18 anos ou plenamente emancipados pela lei civil em sua jurisdição. Ao criar uma conta, o Usuário atesta sua plena capacidade de firmar contratos. Menores de idade não estão autorizados a utilizar a plataforma.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">16. Cláusula de Salvaguarda (Divisibilidade)</h2>
               <p>Se, porventura, algum juízo, código ou tribunal vier a declarar que alguma específica linha, parágrafo ou dispositivo destes Termos é nulo ou inexequível, as Partes concordam que isso não afetará a validade do restante do documento. A cláusula maculada será ignorada sob a ótica judicial e todas as demais condições excludentes de responsabilidade em favor do sistema ditarão as regras que sobreviverão.</p>
             </section>

             <section className="space-y-3">
               <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-[#2D214F] inline-block">17. Renúncia Irrevogável a Ações Coletivas</h2>
               <p>O Usuário concorda de modo irretratável que toda e qualquer insatisfação, disputa ou possível pleito de reparação será resolvido em esfera <strong className="text-white">individual e restrita</strong>. Fica extinto, por meio de livre aceitação desses termos, ao direito de encabeçar, aderir ou apoiar judicialmente ou extra-judicialmente Ações Civis Públicas, Ação Coletiva ou Litisconsórcio Ativo contra a Plataforma ou os seus desenvolvedores originários e prepostos.</p>
             </section>

             <section className="space-y-3 mt-10 pt-10 border-t border-[#2D214F]/50">
               <h2 className="text-2xl font-bold text-white mb-2 pb-2 inline-block">Política de Privacidade</h2>
               
               <h3 className="text-lg font-bold text-white mt-4">Coleta e Tratamento de Dados</h3>
               <p>Coletamos os dados estritamente necessários para o funcionamento lógico do agendamento (nomes, telefones, e-mails). O Profissional é o <strong className="text-white">Controlador</strong> dos dados de seus Clientes, e nós somos meros <strong className="text-white">Operadores</strong>.</p>
               
               <h3 className="text-lg font-bold text-white mt-4">Seus Deveres LGPD</h3>
               <p>O Profissional concorda em cumprir a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/18) perante seus Clientes. Qualquer infração gerada por contato indevido, vazamento ou mau uso das informações de Clientes do lado do Profissional é de responsabilidade <strong className="text-white">exclusiva e integral do Profissional</strong>. Nós ficamos expressamente desobrigados e isentos caso o Profissional incorra em ilícito penal ou cível ao manipular contatos.</p>

               <h3 className="text-lg font-bold text-white mt-4">Vazamentos e Ataques (Force Majeure)</h3>
               <p>Empregamos serviços em nuvem padronizados (como Google/Firebase) para manter a plataforma segura. No entanto, não nos responsabilizamos por perdas, vazamentos de dados ou brechas resultantes de ataques de hackers zero-day, falhas nos provedores globais, engenharia social no aparelho dos usuários ou de Força Maior. <strong className="text-white">Você trafega dados sensíveis por sua própria conta e risco.</strong></p>

               <h3 className="text-lg font-bold text-white mt-4">Foro e Resolução de Disputas</h3>
               <p>Todo e qualquer impasse será tentado primeiramente por vias amigáveis. Ao usar a plataforma, você abre mão de ações de classe ("Class Actions"). Se for ajuizada alguma demanda, fica eleito o termo do foro do criador para julgar eventual litígio. Mas reafirmamos: este documento atua como escudo irrevogável e confissão de renúncia a litígios contra a plataforma.</p>
             </section>

          </div>
        </motion.div>
      </main>
    </div>
  );
}
