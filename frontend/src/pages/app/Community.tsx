import { useState } from 'react';

type Post = {
  id: string;
  author: string;
  text: string;
  likes: number;
};

const initialPosts: Post[] = [
  { id: '1', author: 'Ana', text: 'Fechei 60 questões hoje! 🎯', likes: 12 },
  { id: '2', author: 'Rafael', text: 'Alguém tem dica para revisão de cardio?', likes: 8 },
  { id: '3', author: 'Juliana', text: 'Comecei o Pomodoro e minha produtividade dobrou.', likes: 15 },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  function like(id: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Comunidade</h1>
        <p className="text-gray-400 text-sm mt-1">Feed colaborativo para motivação e troca de estratégias.</p>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="card-glass rounded-2xl p-5 card-glow">
            <p className="text-sm text-primary-300 font-medium mb-1">@{post.author}</p>
            <p className="text-sm text-gray-200">{post.text}</p>
            <button type="button" onClick={() => like(post.id)} className="mt-3 text-xs text-gray-400 hover:text-white">
              Curtir ({post.likes})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
