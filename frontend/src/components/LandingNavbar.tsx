import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import PublicPreferenceControls from './PublicPreferenceControls';

export default function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-app-bg/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M3 18L8 7L13 14L16 10L21 18H3Z" fill="white" strokeWidth="0.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white public-brand font-bold text-lg tracking-tight">Mentudo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link public-nav-link">Recursos</a>
            <a href="#pricing" className="nav-link public-nav-link">Preços</a>
            <a href="#testimonials" className="nav-link public-nav-link">Depoimentos</a>
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <PublicPreferenceControls compact />
            <button onClick={() => navigate('/login')} className="btn-secondary text-sm py-2 px-4">
              Entrar
            </button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-5">
              Começar grátis
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-app-surface border-t border-white/5 px-4 py-4 space-y-3 animate-fade-in">
          <a href="#features" className="block nav-link public-nav-link py-2" onClick={() => setIsOpen(false)}>Recursos</a>
          <a href="#pricing" className="block nav-link public-nav-link py-2" onClick={() => setIsOpen(false)}>Preços</a>
          <a href="#testimonials" className="block nav-link public-nav-link py-2" onClick={() => setIsOpen(false)}>Depoimentos</a>
          <PublicPreferenceControls compact className="pt-2" />
          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate('/login')} className="btn-secondary text-sm py-2 flex-1 justify-center">
              Entrar
            </button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 flex-1 justify-center">
              Cadastrar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
