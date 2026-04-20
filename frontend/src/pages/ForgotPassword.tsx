import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { authApi } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
      const msg = typeof raw === 'string' ? raw : undefined;
      setError(msg || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-700/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative">
        <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar ao login
        </Link>

        <div className="card-glass rounded-2xl p-8 card-glow">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <BrainCircuit size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">Mentudo</span>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-400" />
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Email enviado!</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Se o email <strong className="text-gray-300">{email}</strong> estiver cadastrado, você receberá o link de recuperação em breve.<br />
                <span className="text-gray-500 text-xs mt-1 block">Verifique também a caixa de spam.</span>
              </p>
              <Link
                to="/login"
                className="btn-primary text-sm px-6 py-2.5"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Esqueceu a senha?</h1>
              <p className="text-gray-400 text-sm mb-7">
                Informe seu email e enviaremos um link para criar uma nova senha.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">E-mail cadastrado</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="input-field pl-9"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full justify-center py-3.5 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </button>
              </form>

              <p className="text-center text-gray-500 text-sm mt-6">
                Lembrou a senha?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Fazer login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
