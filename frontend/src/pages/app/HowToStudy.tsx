const tips = [
  {
    title: '1. Ciclos curtos com revisão ativa',
    detail: 'Estude em blocos de 25-40 minutos e revise com perguntas e recuperação ativa.',
  },
  {
    title: '2. Questões todos os dias',
    detail: 'Priorize volume diário de questões para transformar teoria em desempenho de prova.',
  },
  {
    title: '3. Erros viram flashcards',
    detail: 'Cada erro recorrente deve virar cartão de revisão espaçada.',
  },
  {
    title: '4. Replaneje semanalmente',
    detail: 'No fim da semana, ajuste foco para disciplinas com pior acurácia.',
  },
];

export default function HowToStudyPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Como estudar</h1>
        <p className="text-gray-400 text-sm mt-1">Roteiro rápido de execução para estudar com consistência.</p>
      </div>

      <div className="space-y-3">
        {tips.map((tip) => (
          <div key={tip.title} className="card-glass rounded-2xl p-5 card-glow">
            <h3 className="text-white font-semibold mb-2">{tip.title}</h3>
            <p className="text-sm text-gray-300">{tip.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
