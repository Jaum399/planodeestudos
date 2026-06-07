import { X, Download, Share2 } from 'lucide-react';

interface CertificatePreviewProps {
  certificate: {
    _id: string;
    certificate_number: string;
    issue_date: string;
    course_title: string;
    user_name: string;
  };
  onClose: () => void;
  onDownload?: (certificateId: string) => void;
  onShare?: (certificate: any) => void;
}

export default function CertificatePreview({
  certificate,
  onClose,
  onDownload,
  onShare,
}: CertificatePreviewProps) {
  const issueDate = new Date(certificate.issue_date).toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-app-card border border-app-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-app-border sticky top-0 bg-app-card">
          <h2 className="text-white font-bold text-lg">Certificado de Conclusão</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Certificate Content */}
        <div className="p-8">
          {/* Certificate Visual */}
          <div className="border-4 border-primary-500/30 rounded-lg p-8 mb-8 bg-gradient-to-br from-primary-600/10 to-primary-900/20 text-center">
            <div className="text-primary-400 text-sm font-semibold mb-4 uppercase tracking-wider">
              Certificado de Conclusão
            </div>

            <h3 className="text-2xl text-white font-bold mb-6">
              {certificate.course_title}
            </h3>

            <div className="text-gray-300 text-sm mb-8">
              Este certificado atesta que
              <div className="text-white font-bold text-lg mt-2">
                {certificate.user_name}
              </div>
              completou com sucesso o curso acima mencionado.
            </div>

            {/* Certificate Details */}
            <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t border-primary-500/20">
              <div>
                <div className="text-xs text-gray-400 mb-1">Número do Certificado</div>
                <div className="text-sm text-white font-mono">{certificate.certificate_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Data de Emissão</div>
                <div className="text-sm text-white">{issueDate}</div>
              </div>
            </div>
          </div>

          {/* Certificate Information */}
          <div className="bg-app-bg/50 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Curso</div>
                <div className="text-sm text-white">{certificate.course_title}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Aluno</div>
                <div className="text-sm text-white">{certificate.user_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Emitido em</div>
                <div className="text-sm text-white">{issueDate}</div>
              </div>
            </div>
          </div>

          {/* Verification Info */}
          <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <div className="text-xs text-green-400 font-semibold mb-1">Certificado Válido</div>
            <div className="text-xs text-gray-300">
              Este certificado é válido e pode ser verificado usando o número: {certificate.certificate_number}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onDownload && (
              <button
                onClick={() => onDownload(certificate._id)}
                className="flex-1 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Baixar PDF
              </button>
            )}
            {onShare && (
              <button
                onClick={() => onShare(certificate)}
                className="flex-1 py-2 rounded-lg border border-primary-500/50 hover:bg-primary-500/10 text-primary-400 hover:text-primary-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Compartilhar
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-app-border hover:bg-app-bg/50 text-gray-300 font-semibold text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
