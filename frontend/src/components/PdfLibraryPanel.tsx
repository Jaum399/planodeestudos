import { useEffect, useState, ChangeEvent } from 'react';
import { Download, FileText, FolderPlus, Trash2, Folder, ChevronRight } from 'lucide-react';
import { pdfApi } from '../services/api';

type PdfFolder = {
  id: string;
  name: string;
  color: string;
};

type PdfDocument = {
  id: string;
  title: string;
  file_name: string;
  size_bytes: number;
  folder_id?: string | null;
};

type PdfUploadLimits = {
  maxPdfSizeBytes: number;
  inlinePdfSizeBytes: number;
  chunkSizeBytes: number;
};

function getReadableError(err: unknown, fallback: string): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 413) {
    return 'Arquivo grande para envio direto. Use upload em partes ou selecione um PDF menor.';
  }

  const responseData = (err as { response?: { data?: unknown } })?.response?.data;

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const errorField = (responseData as { error?: unknown }).error;
    if (typeof errorField === 'string' && errorField.trim()) {
      return errorField;
    }
  }

  const message = (err as { message?: unknown })?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

export default function PdfLibraryPanel() {
  const [pdfFolders, setPdfFolders] = useState<PdfFolder[]>([]);
  const [pdfDocuments, setPdfDocuments] = useState<PdfDocument[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState('');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [uploadLimits, setUploadLimits] = useState<PdfUploadLimits>({
    maxPdfSizeBytes: 900 * 1024 * 1024,
    inlinePdfSizeBytes: 2 * 1024 * 1024,
    chunkSizeBytes: 2 * 1024 * 1024,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPdfLibrary() {
      setPdfLoading(true);
      setPdfError('');
      try {
        const { data } = await pdfApi.list();
        if (!cancelled) {
          setPdfFolders(data?.folders || []);
          setPdfDocuments(data?.documents || []);
          setUploadLimits({
            maxPdfSizeBytes: Number(data?.limits?.maxPdfSizeBytes || 900 * 1024 * 1024),
            inlinePdfSizeBytes: Number(data?.limits?.inlinePdfSizeBytes || 2 * 1024 * 1024),
            chunkSizeBytes: Number(data?.limits?.chunkSizeBytes || 2 * 1024 * 1024),
          });
        }
      } catch {
        if (!cancelled) {
          setPdfError('Nao foi possivel carregar sua biblioteca de PDFs.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }

    loadPdfLibrary();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPdfLibrary = async () => {
    const { data } = await pdfApi.list();
    setPdfFolders(data?.folders || []);
    setPdfDocuments(data?.documents || []);
    setUploadLimits({
      maxPdfSizeBytes: Number(data?.limits?.maxPdfSizeBytes || 900 * 1024 * 1024),
      inlinePdfSizeBytes: Number(data?.limits?.inlinePdfSizeBytes || 2 * 1024 * 1024),
      chunkSizeBytes: Number(data?.limits?.chunkSizeBytes || 2 * 1024 * 1024),
    });
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      await pdfApi.createFolder(name);
      setNewFolderName('');
      await refreshPdfLibrary();
    } catch (err: unknown) {
      setPdfError(getReadableError(err, 'Erro ao criar pasta de PDFs.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const encodeChunkToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      const part = bytes.subarray(i, i + step);
      binary += String.fromCharCode(...part);
    }
    return btoa(binary);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });

  const readBlobAsArrayBuffer = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Erro ao ler parte do arquivo'));
    reader.readAsArrayBuffer(blob);
  });

  const handleUploadPdf = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setPdfError('Selecione um arquivo PDF valido.');
      e.target.value = '';
      return;
    }

    if (file.size > uploadLimits.maxPdfSizeBytes) {
      setPdfError('PDF acima do limite permitido para upload.');
      e.target.value = '';
      return;
    }

    setPdfBusy(true);
    setPdfError('');

    try {
      const folderId = currentFolderId || null;

      if (file.size <= uploadLimits.inlinePdfSizeBytes) {
        const dataUrl = await readFileAsDataUrl(file);
        await pdfApi.uploadDocument({
          title: file.name.replace(/\.pdf$/i, ''),
          folder_id: folderId,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          data_url: dataUrl,
        });
      } else {
        const { data } = await pdfApi.initUpload({
          title: file.name.replace(/\.pdf$/i, ''),
          folder_id: folderId,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        });

        const documentId = data?.upload?.documentId as string;
        const chunkSizeBytes = Number(data?.upload?.chunkSizeBytes || uploadLimits.chunkSizeBytes || 2 * 1024 * 1024);
        const totalChunks = Math.ceil(file.size / chunkSizeBytes);

        for (let i = 0; i < totalChunks; i += 1) {
          const start = i * chunkSizeBytes;
          const end = Math.min(file.size, start + chunkSizeBytes);
          const blob = file.slice(start, end);
          const buffer = await readBlobAsArrayBuffer(blob);
          const chunkBase64 = encodeChunkToBase64(buffer);
          await pdfApi.uploadChunk(documentId, {
            chunk_index: i,
            total_chunks: totalChunks,
            chunk_data: chunkBase64,
          });
        }

        await pdfApi.completeUpload(documentId);
      }

      await refreshPdfLibrary();
      e.target.value = '';
    } catch (err: unknown) {
      setPdfError(getReadableError(err, 'Erro ao enviar PDF.'));
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDeletePdf = async (id: string) => {
    setPdfBusy(true);
    setPdfError('');
    try {
      await pdfApi.deleteDocument(id);
      await refreshPdfLibrary();
    } catch {
      setPdfError('Nao foi possivel remover o PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setPdfBusy(true);
    setPdfError('');
    try {
      await pdfApi.deleteFolder(id);
      if (selectedFolderId === id) setSelectedFolderId('');
      await refreshPdfLibrary();
    } catch {
      setPdfError('Nao foi possivel remover a pasta.');
    } finally {
      setPdfBusy(false);
    }
  };

  const openPdf = async (id: string) => {
    try {
      const { data } = await pdfApi.getDocumentBlob(id);
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setPdfError('Nao foi possivel abrir o PDF.');
    }
  };

  const downloadPdf = async (doc: PdfDocument) => {
    try {
      const { data } = await pdfApi.getDocumentBlob(doc.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || `${doc.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError('Nao foi possivel baixar o PDF.');
    }
  };

  const currentFolderDocuments = pdfDocuments.filter((doc) => {
    if (currentFolderId === '') {
      return !doc.folder_id;
    }
    return doc.folder_id === currentFolderId;
  });

  return (
    <div className="card-glass rounded-2xl p-6 card-glow">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <FileText size={16} className="text-primary-400" /> Biblioteca de PDFs
      </h2>

      {pdfError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{pdfError}</div>
      )}

      <div className="space-y-4">
        {/* Breadcrumb */}
        {currentFolderId && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <button
              onClick={() => setCurrentFolderId('')}
              className="text-primary-400 hover:text-primary-300 transition"
            >
              Raiz
            </button>
            <ChevronRight size={14} />
            <span className="text-gray-300">{pdfFolders.find(f => f.id === currentFolderId)?.name}</span>
          </div>
        )}

        {/* Create folder input */}
        <div className="grid md:grid-cols-[1fr_auto] gap-2">
          <input
            className="input-field"
            placeholder="Nome da nova pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            disabled={pdfBusy || !newFolderName.trim()}
            className="btn-secondary text-sm px-4 disabled:opacity-60"
          >
            <FolderPlus size={14} /> Criar pasta
          </button>
        </div>

        {/* Upload button */}
        <label className="btn-primary text-sm justify-center cursor-pointer w-full">
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleUploadPdf}
            className="hidden"
            disabled={pdfBusy}
          />
          <FileText size={14} /> {pdfBusy ? 'Enviando...' : 'Enviar PDF para esta pasta'}
        </label>

        {/* Folders grid */}
        {pdfLoading ? (
          <p className="text-sm text-gray-500">Carregando biblioteca...</p>
        ) : (
          <>
            {!currentFolderId && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">PASTAS</p>
                {pdfFolders.length === 0 ? (
                  <p className="text-sm text-gray-600 py-4">Nenhuma pasta criada. Crie uma para organizar seus PDFs.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {pdfFolders.map((folder) => (
                      <div key={folder.id} className="group relative">
                        <button
                          onClick={() => setCurrentFolderId(folder.id)}
                          className="w-full rounded-lg border border-primary-500/30 bg-gradient-to-b from-primary-500/10 to-primary-500/5 hover:from-primary-500/20 hover:to-primary-500/15 p-3 flex flex-col items-center justify-center gap-2 transition group-hover:border-primary-500/60"
                        >
                          <Folder size={24} className="text-primary-400 group-hover:text-primary-300" />
                          <span className="text-xs text-white font-semibold text-center truncate w-full">{folder.name}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="absolute -top-2 -right-2 bg-red-500/20 border border-red-500/40 rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 hidden group-hover:block"
                          title="Remover pasta"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Documents in current folder */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">ARQUIVOS {currentFolderId && '(NESTA PASTA)'}</p>
              {currentFolderDocuments.length === 0 ? (
                <p className="text-sm text-gray-600 py-4">Nenhum PDF nesta pasta.</p>
              ) : (
                <div className="space-y-2">
                  {currentFolderDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-lg border border-app-border bg-app-card/40 p-3 flex items-center justify-between gap-3 hover:bg-app-card/60 transition"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <FileText size={16} className="text-primary-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{doc.title}</p>
                          <p className="text-xs text-gray-500">{(doc.size_bytes / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => openPdf(doc.id)}
                          className="btn-secondary text-xs px-3 py-1"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPdf(doc)}
                          className="text-gray-500 hover:text-primary-400 transition p-1"
                          title="Baixar"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePdf(doc.id)}
                          className="text-gray-500 hover:text-red-400 transition p-1"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
