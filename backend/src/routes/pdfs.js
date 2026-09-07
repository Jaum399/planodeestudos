const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const pdfParse = require('pdf-parse');

const router = express.Router();
const MAX_PDF_SIZE_BYTES = 900 * 1024 * 1024;
const INLINE_PDF_SIZE_BYTES = 2 * 1024 * 1024;
const PDF_CHUNK_SIZE_BYTES = 2 * 1024 * 1024;
const FOLDER_COLORS = ['#7c3aed', '#2563eb', '#059669', '#ea580c', '#db2777', '#0891b2'];

router.use(authenticate, requireAccess);

function toItem(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, data_url, ...rest } = obj;
  return { ...rest, id: rest._id, has_inline_data: Boolean(data_url) };
}

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function isPdfDataUrl(value) {
  return /^data:application\/pdf;base64,/i.test(String(value || ''));
}

function normalizeChunkData(value) {
  return String(value || '').trim().replace(/^data:application\/pdf;base64,/i, '');
}

function isBase64Payload(value) {
  return /^[A-Za-z0-9+/=\r\n]+$/.test(String(value || ''));
}

async function resolveFolderId(folderId, userId) {
  if (!folderId) return null;
  const { pdfFolders } = getDatabase();
  const folder = await pdfFolders.findOne({ _id: folderId, user_id: userId });
  if (!folder) {
    const error = new Error('Pasta selecionada não encontrada');
    error.statusCode = 404;
    throw error;
  }
  return folder._id;
}

router.get('/', async (req, res) => {
  try {
    const { pdfFolders, pdfDocuments } = getDatabase();
    const [folders, documents] = await Promise.all([
      pdfFolders.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean(),
      pdfDocuments.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean(),
    ]);

    res.json({
      folders: folders.map(toItem),
      documents: documents.map(toItem),
      limits: {
        maxPdfSizeBytes: MAX_PDF_SIZE_BYTES,
        inlinePdfSizeBytes: INLINE_PDF_SIZE_BYTES,
        chunkSizeBytes: PDF_CHUNK_SIZE_BYTES,
      },
    });
  } catch (error) {
    console.error('PDF library list error:', error);
    res.status(500).json({ error: 'Erro ao carregar biblioteca de PDFs' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const { name } = req.body;
    const folderName = cleanText(name, 60);
    if (!folderName) {
      return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
    }

    const { pdfFolders } = getDatabase();
    const existingCount = await pdfFolders.countDocuments({ user_id: req.user.id });
    const now = new Date().toISOString();

    const folder = new pdfFolders({
      _id: randomUUID(),
      user_id: req.user.id,
      name: folderName,
      color: FOLDER_COLORS[existingCount % FOLDER_COLORS.length],
      created_at: now,
      updated_at: now,
    });

    await folder.save();
    res.status(201).json({ folder: toItem(folder) });
  } catch (error) {
    console.error('PDF folder create error:', error);
    res.status(500).json({ error: 'Erro ao criar pasta' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    const { pdfFolders, pdfDocuments } = getDatabase();
    const folder = await pdfFolders.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!folder) {
      return res.status(404).json({ error: 'Pasta não encontrada' });
    }

    await Promise.all([
      pdfDocuments.updateMany({ user_id: req.user.id, folder_id: req.params.id }, { $set: { folder_id: null, updated_at: new Date().toISOString() } }),
      pdfFolders.deleteOne({ _id: req.params.id, user_id: req.user.id }),
    ]);

    res.json({ message: 'Pasta removida com sucesso' });
  } catch (error) {
    console.error('PDF folder delete error:', error);
    res.status(500).json({ error: 'Erro ao remover pasta' });
  }
});

router.post('/uploads/init', async (req, res) => {
  try {
    const { title, folder_id, file_name, mime_type, size_bytes } = req.body || {};
    const cleanTitle = cleanText(title || file_name?.replace(/\.pdf$/i, ''), 120);
    const cleanFileName = cleanText(file_name || 'arquivo.pdf', 160);
    const fileSize = Number(size_bytes || 0);

    if (!cleanTitle) {
      return res.status(400).json({ error: 'Título do PDF é obrigatório' });
    }

    if (mime_type !== 'application/pdf') {
      return res.status(400).json({ error: 'Envie um arquivo PDF válido' });
    }

    if (fileSize <= 0 || fileSize > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({ error: 'O PDF deve ter no máximo 900MB' });
    }

    const folderId = await resolveFolderId(folder_id, req.user.id);
    const { pdfDocuments } = getDatabase();
    const now = new Date().toISOString();
    const totalChunks = Math.max(1, Math.ceil(fileSize / PDF_CHUNK_SIZE_BYTES));

    const document = new pdfDocuments({
      _id: randomUUID(),
      user_id: req.user.id,
      folder_id: folderId,
      title: cleanTitle,
      file_name: cleanFileName.toLowerCase().endsWith('.pdf') ? cleanFileName : `${cleanFileName}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: fileSize,
      data_url: '',
      storage_mode: 'chunked',
      upload_status: 'uploading',
      total_chunks: totalChunks,
      created_at: now,
      updated_at: now,
    });

    await document.save();

    res.status(201).json({
      upload: {
        documentId: document._id,
        chunkSizeBytes: PDF_CHUNK_SIZE_BYTES,
        totalChunks: totalChunks,
        maxPdfSizeBytes: MAX_PDF_SIZE_BYTES,
      },
    });
  } catch (error) {
    console.error('PDF init upload error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao iniciar envio do PDF' });
  }
});

router.post('/uploads/:id/chunks', async (req, res) => {
  try {
    const { chunk_index, total_chunks, chunk_data } = req.body || {};
    const chunkIndex = Number(chunk_index);
    const totalChunks = Number(total_chunks);
    const chunkPayload = normalizeChunkData(chunk_data);

    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(totalChunks) || totalChunks <= 0) {
      return res.status(400).json({ error: 'Metadados do chunk inválidos' });
    }

    if (!chunkPayload || !isBase64Payload(chunkPayload)) {
      return res.status(400).json({ error: 'Chunk inválido para PDF' });
    }

    const { pdfDocuments, pdfChunks } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Upload de PDF não encontrado' });
    }

    if (chunkIndex >= totalChunks) {
      return res.status(400).json({ error: 'Índice do chunk fora do intervalo' });
    }

    const now = new Date().toISOString();
    await pdfChunks.updateOne(
      { _id: `${document._id}:${chunkIndex}` },
      {
        $set: {
          _id: `${document._id}:${chunkIndex}`,
          document_id: document._id,
          user_id: req.user.id,
          chunk_index: chunkIndex,
          chunk_data: chunkPayload,
          created_at: now,
        },
      },
      { upsert: true }
    );

    await pdfDocuments.updateOne(
      { _id: document._id, user_id: req.user.id },
      { $set: { total_chunks: totalChunks, updated_at: now } }
    );

    const uploadedChunks = await pdfChunks.countDocuments({ document_id: document._id, user_id: req.user.id });
    res.json({ uploadedChunks, totalChunks });
  } catch (error) {
    console.error('PDF chunk upload error:', error);
    res.status(500).json({ error: 'Erro ao enviar parte do PDF' });
  }
});

router.post('/uploads/:id/complete', async (req, res) => {
  try {
    const { pdfDocuments, pdfChunks } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Upload de PDF não encontrado' });
    }

    const uploadedChunks = await pdfChunks.countDocuments({ document_id: document._id, user_id: req.user.id });
    if (uploadedChunks !== Number(document.total_chunks || 0)) {
      return res.status(400).json({ error: 'Upload incompleto. Envie todas as partes do PDF.' });
    }

    const updated = await pdfDocuments.findOneAndUpdate(
      { _id: document._id, user_id: req.user.id },
      { $set: { upload_status: 'ready', updated_at: new Date().toISOString() } },
      { new: true }
    );

    res.json({ document: toItem(updated) });
  } catch (error) {
    console.error('PDF upload complete error:', error);
    res.status(500).json({ error: 'Erro ao concluir envio do PDF' });
  }
});

router.post('/documents', async (req, res) => {
  try {
    const { title, folder_id, file_name, mime_type, size_bytes, data_url } = req.body;
    const cleanTitle = cleanText(title || file_name?.replace(/\.pdf$/i, ''), 120);
    const cleanFileName = cleanText(file_name || 'arquivo.pdf', 160);
    const fileSize = Number(size_bytes || 0);

    if (!cleanTitle) {
      return res.status(400).json({ error: 'Título do PDF é obrigatório' });
    }

    if (!isPdfDataUrl(data_url) || mime_type !== 'application/pdf') {
      return res.status(400).json({ error: 'Envie um arquivo PDF válido' });
    }

    if (fileSize <= 0 || fileSize > MAX_PDF_SIZE_BYTES) {
      return res.status(400).json({ error: 'O PDF deve ter no máximo 900MB' });
    }

    if (fileSize > INLINE_PDF_SIZE_BYTES) {
      return res.status(400).json({ error: 'Arquivo grande demais para envio direto. Use o upload em partes.' });
    }

    const folderId = await resolveFolderId(folder_id, req.user.id);
    const { pdfDocuments } = getDatabase();
    const now = new Date().toISOString();
    const document = new pdfDocuments({
      _id: randomUUID(),
      user_id: req.user.id,
      folder_id: folderId,
      title: cleanTitle,
      file_name: cleanFileName.toLowerCase().endsWith('.pdf') ? cleanFileName : `${cleanFileName}.pdf`,
      mime_type: 'application/pdf',
      size_bytes: fileSize,
      data_url,
      storage_mode: 'inline',
      upload_status: 'ready',
      total_chunks: 0,
      created_at: now,
      updated_at: now,
    });

    await document.save();
    res.status(201).json({ document: toItem(document) });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao salvar PDF' });
  }
});

router.get('/documents/:id/file', async (req, res) => {
  try {
    const { pdfDocuments, pdfChunks } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id }).lean();
    if (!document) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    if (document.upload_status && document.upload_status !== 'ready') {
      return res.status(409).json({ error: 'O PDF ainda está sendo enviado.' });
    }

    const safeFileName = String(document.file_name || 'arquivo.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    if (document.size_bytes > 0) {
      res.setHeader('Content-Length', String(document.size_bytes));
    }

    if (document.storage_mode === 'chunked' || !document.data_url) {
      const chunks = await pdfChunks.find({ document_id: document._id, user_id: req.user.id }).sort({ chunk_index: 1 }).lean();
      if (chunks.length !== Number(document.total_chunks || 0)) {
        return res.status(409).json({ error: 'O PDF está incompleto no servidor.' });
      }

      for (const chunk of chunks) {
        res.write(Buffer.from(String(chunk.chunk_data || ''), 'base64'));
      }
      return res.end();
    }

    const base64Payload = String(document.data_url || '').split(',')[1] || '';
    if (!base64Payload) {
      return res.status(409).json({ error: 'Conteúdo do PDF indisponível.' });
    }

    return res.end(Buffer.from(base64Payload, 'base64'));
  } catch (error) {
    console.error('PDF file download error:', error);
    res.status(500).json({ error: 'Erro ao abrir o PDF' });
  }
});

router.post('/documents/:id/extract-text', async (req, res) => {
  try {
    const { pdfDocuments, pdfChunks } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id }).lean();
    if (!document) return res.status(404).json({ error: 'PDF não encontrado' });
    if (document.upload_status && document.upload_status !== 'ready') {
      return res.status(409).json({ error: 'O PDF ainda está sendo enviado.' });
    }

    let pdfBuffer;
    if (document.storage_mode === 'chunked' || !document.data_url) {
      const chunks = await pdfChunks.find({ document_id: document._id, user_id: req.user.id }).sort({ chunk_index: 1 }).lean();
      if (chunks.length !== Number(document.total_chunks || 0)) {
        return res.status(409).json({ error: 'O PDF está incompleto no servidor.' });
      }
      pdfBuffer = Buffer.concat(chunks.map((chunk) => Buffer.from(String(chunk.chunk_data || ''), 'base64')));
    } else {
      const payload = String(document.data_url || '').split(',')[1] || '';
      pdfBuffer = Buffer.from(payload, 'base64');
    }

    const parsed = await pdfParse(pdfBuffer);
    const text = String(parsed.text || '').replace(/\s+/g, ' ').trim().slice(0, 120000);
    if (text.length < 40) return res.status(422).json({ error: 'Não foi possível encontrar texto suficiente neste PDF.' });
    return res.json({ text, pages: parsed.numpages || 0 });
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return res.status(422).json({ error: 'Não foi possível extrair o texto deste PDF.' });
  }
});

router.put('/documents/:id', async (req, res) => {
  try {
    const { title, folder_id } = req.body;
    const { pdfDocuments } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id });

    if (!document) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    const nextFolderId = folder_id === undefined ? document.folder_id : await resolveFolderId(folder_id, req.user.id);

    const updated = await pdfDocuments.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      {
        $set: {
          title: cleanText(title || document.title, 120),
          folder_id: nextFolderId,
          updated_at: new Date().toISOString(),
        },
      },
      { new: true }
    );

    res.json({ document: toItem(updated) });
  } catch (error) {
    console.error('PDF update error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Erro ao atualizar PDF' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const { pdfDocuments, pdfChunks } = getDatabase();
    const document = await pdfDocuments.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    await Promise.all([
      pdfDocuments.deleteOne({ _id: req.params.id, user_id: req.user.id }),
      pdfChunks.deleteMany({ document_id: req.params.id, user_id: req.user.id }),
    ]);

    res.json({ message: 'PDF removido com sucesso' });
  } catch (error) {
    console.error('PDF delete error:', error);
    res.status(500).json({ error: 'Erro ao remover PDF' });
  }
});

module.exports = router;
