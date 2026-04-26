import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PublicPreferenceControls from '../components/PublicPreferenceControls';

const areas = [
  '', 'Faculdade', 'Residência Médica', 'OAB', 'ENEM & Vestibulares',
  'Concursos Públicos', 'Revalida', 'Pós-Graduação', 'Militares',
  'Línguas', 'Magistratura', 'Engenharia', 'Direito', 'Medicina',
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [area, setArea] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (cpf.replace(/\D/g, '').length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (whatsapp.trim() && whatsapp.replace(/\D/g, '').length < 10) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password, cpf, area, whatsapp);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
      const msg = typeof raw === 'string' ? raw : undefined;
      setError(msg || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-700/10 rounded-full blur-[100px]" />
      </div>

      <PublicPreferenceControls className="absolute top-4 right-4 z-10" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar ao início
        </Link>

        <div className="card-glass rounded-2xl p-8 card-glow">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl public-brand">Mentudo</span>
          </div>

          <h1 className="text-2xl font-bold text-white public-heading mb-1">Crie sua conta</h1>
          <p className="text-gray-400 text-sm public-subheading mb-7">Comece gratuitamente hoje mesmo</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-gray-400 text-xs font-medium mb-1.5">Nome completo</label>
              <input
                id="register-name"
                name="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="input-field"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="block text-gray-400 text-xs font-medium mb-1.5">E-mail</label>
              <input
                id="register-email"
                name="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-gray-400 text-xs font-medium mb-1.5">Senha</label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field pr-10"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-cpf" className="block text-gray-400 text-xs font-medium mb-1.5">CPF (obrigatório)</label>
              <input
                id="register-cpf"
                name="billingDocument"
                type="text"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="input-field"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="register-area" className="block text-gray-400 text-xs font-medium mb-1.5">Área de estudo (opcional)</label>
              <select
                id="register-area"
                name="area"
                value={area}
                onChange={e => setArea(e.target.value)}
                className="input-field"
              >
                {areas.map(a => (
                  <option key={a} value={a} className="bg-app-card">
                    {a || 'Selecione sua área...'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="register-whatsapp" className="block text-gray-400 text-xs font-medium mb-1.5">WhatsApp (opcional)</label>
              <input
                id="register-whatsapp"
                name="whatsapp"
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="(31) 99999-9999"
                className="input-field"
                autoComplete="tel"
              />
              <p className="text-[11px] text-gray-600 mt-1">Usado para alertas importantes de provas e trabalhos.</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3.5 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta grátis'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-5">
            Ao criar uma conta, você concorda com nossos{' '}
            <a href="#" className="text-primary-400 hover:underline">Termos de Uso</a> e{' '}
            <a href="#" className="text-primary-400 hover:underline">Política de Privacidade</a>.
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
