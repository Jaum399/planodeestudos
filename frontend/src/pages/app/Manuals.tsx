const guides = [
  {
    title: 'Como estudar por revisão espaçada',
    summary: 'Estruture ciclos de revisão em 1, 3, 7 e 15 dias para consolidar memória de longo prazo.',
  },
  {
    title: 'Técnica de questões comentadas',
    summary: 'Faça blocos de 20 questões, revise erros e transforme erros recorrentes em flashcards.',
  },
  {
    title: 'Planejamento semanal de alto rendimento',
    summary: 'Combine 70% prática e 30% teoria, priorizando disciplinas com menor acurácia.',
  },
];

export default function ManualsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Manuais</h1>
        <p className="text-gray-400 text-sm mt-1">Guias práticos para melhorar método e consistência de estudo.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <div key={guide.title} className="card-glass rounded-2xl p-5 card-glow">
            <h3 className="text-white font-semibold mb-2">{guide.title}</h3>
            <p className="text-sm text-gray-300">{guide.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
