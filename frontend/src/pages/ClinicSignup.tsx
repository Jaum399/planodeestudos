import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { medhubPublicApi } from '../services/api';

type Step = 1 | 2;

export default function ClinicSignup() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [ddd, setDdd] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [crm, setCrm] = useState('');

  function nextStep() {
    setError('');
    if (!fullName.trim() || !email.trim()) {
      setError('Preencha nome completo e email para continuar.');
      return;
    }
    setStep(2);
  }

  function previousStep() {
    setError('');
    setStep(1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await medhubPublicApi.signupClinic({
        full_name: fullName,
        email,
        ddd,
        phone,
        clinic_name: clinicName,
        cnpj,
        crm,
        source: 'landing_medhub',
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível enviar o cadastro agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f5f9] text-[#0f1d3a]">
      <header className="w-full border-b border-[#dbe3ef] bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#0f1d3a] font-bold text-3xl">
            <HeartPulse size={26} className="text-[#0d6efd]" />
            <span>MedSimples</span>
          </Link>
          <a
            href="https://wa.me/5531971481340"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-lg bg-[#0d6efd] text-white font-semibold hover:opacity-90"
          >
            Fale conosco
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-14">
        <div className="bg-white border border-[#dbe3ef] rounded-2xl p-6 md:p-8 shadow-sm">
          {!success ? (
            <>
              <h1 className="text-4xl font-extrabold text-center mb-3">Cadastre sua clínica</h1>
              <p className="text-center text-[#4a5f82] mb-8">
                Preencha os dados abaixo para iniciar seu cadastro no MedSimples.
              </p>

              <div className="flex items-center justify-center gap-3 mb-8 text-sm font-semibold">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${step === 1 ? 'bg-[#0d6efd] text-white' : 'bg-[#b7c7e4] text-[#0f1d3a]'}`}>1</div>
                <span className={step === 1 ? 'text-[#0f1d3a]' : 'text-[#7f93b6]'}>Dados pessoais</span>
                <div className="w-10 h-[2px] bg-[#c7d4e9]" />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${step === 2 ? 'bg-[#0d6efd] text-white' : 'bg-[#d7e0ef] text-[#7f93b6]'}`}>2</div>
                <span className={step === 2 ? 'text-[#0f1d3a]' : 'text-[#7f93b6]'}>Dados profissionais</span>
              </div>

              <form onSubmit={submit} className="space-y-4">
                {step === 1 && (
                  <>
                    <div>
                      <label className="block text-sm mb-1 text-[#22385d]">Nome completo</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[#22385d]">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm mb-1 text-[#22385d]">DDD</label>
                        <input
                          type="text"
                          value={ddd}
                          onChange={(e) => setDdd(e.target.value)}
                          placeholder="11"
                          className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm mb-1 text-[#22385d]">Telefone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="912345678"
                          className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full rounded-xl bg-[#0d6efd] text-white font-semibold py-3 mt-2"
                    >
                      Próximo
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <label className="block text-sm mb-1 text-[#22385d]">Nome da clínica</label>
                      <input
                        type="text"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="Clínica Exemplo"
                        className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[#22385d]">CNPJ</label>
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[#22385d]">CRM</label>
                      <input
                        type="text"
                        value={crm}
                        onChange={(e) => setCrm(e.target.value)}
                        placeholder="CRM/SP 123456"
                        className="w-full rounded-xl border border-[#ced8ea] px-4 py-3 outline-none focus:border-[#0d6efd]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={previousStep}
                        className="rounded-xl border border-[#ced8ea] text-[#1c355b] font-semibold py-3"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl bg-[#0d6efd] text-white font-semibold py-3 disabled:opacity-70"
                      >
                        {loading ? 'Cadastrando...' : 'Cadastrar'}
                      </button>
                    </div>
                  </>
                )}
              </form>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-3xl font-bold mb-3">Cadastro recebido com sucesso</h2>
              <p className="text-[#4a5f82] mb-6">
                Nossa equipe vai entrar em contato para ativar seu ambiente no Centro Médico.
              </p>
              <Link to="/" className="inline-block rounded-xl bg-[#0d6efd] text-white font-semibold px-6 py-3">
                Voltar para o site
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
