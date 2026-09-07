import PdfLibraryPanel from '../../components/PdfLibraryPanel';

export default function PdfLibraryPage() {
  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Biblioteca de PDFs</h1>
        <p className="text-gray-400 text-sm mt-1">
          Organize seus materiais por pastas, envie arquivos grandes em partes e abra tudo com a mesma conta no web e mobile.
        </p>
      </div>

      <PdfLibraryPanel />
    </div>
  );
}
