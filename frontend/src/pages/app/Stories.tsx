import { Sparkles } from 'lucide-react';

const stories = [
  {
    title: 'A regra dos 2 minutos',
    body: 'Se uma tarefa leva menos de 2 minutos, faça agora. Aplicada ao estudo: se surgir uma dúvida rápida, anote imediatamente. Não deixe para depois — a memória de curto prazo descarta o que não usa.',
    tag: 'Produtividade',
  },
  {
    title: 'Efeito espaçamento',
    body: 'Revisar o mesmo conteúdo em intervalos crescentes (1d → 3d → 7d → 15d) ativa a consolidação da memória de longo prazo muito mais do que reler em sequência. É ciência, não opinião.',
    tag: 'Memória',
  },
  {
    title: 'O mito da multitarefa',
    body: 'Estudar com música com letra, WhatsApp aberto ou TV ligada pode reduzir a retenção em até 40%. O cérebro não processa dois fluxos atencionais simultâneos — ele alterna, e cada troca tem custo cognitivo.',
    tag: 'Foco',
  },
  {
    title: 'Teste a si mesmo',
    body: 'Reler é passivo. Autoexplicar (falar ou escrever sem olhar o material) ativa recuperação ativa — o mecanismo mais poderoso de fixação. Feche o livro e tente resumir o que acabou de ler.',
    tag: 'Técnica',
  },
  {
    title: 'Sono como ferramenta de estudo',
    body: 'Durante o sono, o hipocampo transfere memórias para o córtex. Dormir menos de 6h após estudar reduz drasticamente a retenção. Planejar sono é planejar aprendizado.',
    tag: 'Neurociência',
  },
  {
    title: 'A curva do esquecimento de Ebbinghaus',
    body: 'Sem revisão, esquecemos ~80% do que aprendemos em 24h. A primeira revisão deve ocorrer dentro desse janela. É por isso que revisar no dia seguinte vale mais do que reler na hora.',
    tag: 'Memória',
  },
];

const tagColors: Record<string, string> = {
  Produtividade: 'from-blue-700 to-blue-500',
  Memória: 'from-violet-700 to-violet-500',
  Foco: 'from-amber-700 to-amber-500',
  Técnica: 'from-emerald-700 to-emerald-500',
  Neurociência: 'from-fuchsia-700 to-fuchsia-500',
};

export default function StoriesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles size={22} className="text-primary-400" />
          Histórias de Estudo
        </h1>
        <p className="text-gray-400 text-sm mt-1">Insights curtos de ciência do aprendizado para ler em 1 minuto.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => {
          const gradient = tagColors[story.tag] || 'from-primary-700 to-primary-500';
          return (
            <div key={story.title} className="card-glass rounded-2xl p-5 card-glow flex flex-col gap-3 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white font-medium`}>
                  {story.tag}
                </span>
                <Sparkles size={13} className="text-primary-500/50" />
              </div>
              <h3 className="text-white font-semibold text-sm">{story.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed flex-1">{story.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
