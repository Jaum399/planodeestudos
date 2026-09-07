import { useEffect, useState } from 'react';
import { Award, Download, Share2 } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

interface Certificate {
  _id: string;
  certificate_number: string;
  issue_date: string;
  course_title: string;
  user_name: string;
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/certificates');
      const data = await response.json();
      setCertificates(data.certificates || []);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar certificados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certId: string) => {
    try {
      const response = await fetch(`/api/certificates/${certId}/download`, {
        method: 'POST',
      });
      const data = await response.json();

      // In a real implementation, this would trigger a PDF download
      console.log('Download initiated:', data);
      alert('PDF gerado com sucesso! (Implementar download real com pdfkit)');
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShare = (cert: Certificate) => {
    const text = `Acabei de completar o curso "${cert.course_title}" e recebi meu certificado! 🎓`;
    const shareUrl = `${window.location.origin}/app/certificates/${cert._id}/verify`;

    if (navigator.share) {
      navigator.share({
        title: 'Certificado de Conclusão',
        text,
        url: shareUrl,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${text}\n\nVerificar: ${shareUrl}`);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Meus Certificados</h1>
        <p className="text-gray-400 text-sm mt-1">
          Certificados de conclusão dos cursos que você completou
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Carregando certificados...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-400">{error}</div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12">
          <Award size={48} className="text-gray-600 mx-auto mb-4" />
          <div className="text-gray-400">
            Nenhum certificado ainda. Complete um curso para receber seu certificado!
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert._id}
              className="bg-app-card border border-app-border rounded-xl overflow-hidden hover:border-primary-500/50 transition-all hover:shadow-lg hover:shadow-primary-900/20 cursor-pointer group"
              onClick={() => setSelectedCert(cert)}
            >
              {/* Certificate Visual */}
              <div className="aspect-video bg-gradient-to-br from-primary-600/20 to-primary-900/20 flex items-center justify-center relative overflow-hidden">
                <Award size={64} className="text-primary-400/50 group-hover:text-primary-400 transition-colors" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-primary-400 transition-opacity" />
              </div>

              {/* Certificate Info */}
              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 group-hover:text-primary-400 transition-colors">
                    {cert.course_title}
                  </h3>
                  <p className="text-gray-400 text-xs mb-3">
                    Emitido em {new Date(cert.issue_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Certificate Number */}
                <div className="bg-app-bg/50 rounded-lg p-3 mb-4 border border-app-border/50">
                  <div className="text-xs text-gray-400 mb-1">Número do Certificado</div>
                  <div className="text-xs text-white font-mono truncate">{cert.certificate_number}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(cert._id);
                    }}
                    className="flex-1 py-2 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Download size={14} />
                    Baixar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(cert);
                    }}
                    className="flex-1 py-2 rounded-lg border border-app-border hover:bg-app-bg/50 text-gray-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Share2 size={14} />
                    Compartilhar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <CertificatePreview
          certificate={selectedCert}
          onClose={() => setSelectedCert(null)}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    </div>
  );
}
