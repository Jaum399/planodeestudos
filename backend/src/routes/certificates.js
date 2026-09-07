const express = require('express');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// ── GET /api/certificates - List user's certificates ──────────────────────
router.get('/', async (req, res) => {
  try {
    const { certificates, courses } = getDatabase();

    const userCerts = await certificates
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .toArray();

    // Enrich with course data
    const enriched = await Promise.all(
      userCerts.map(async (cert) => {
        const course = await courses.findOne({ _id: cert.course_id });
        return {
          ...cert,
          course_title: course?.title || 'Curso desconhecido',
        };
      })
    );

    res.json({ certificates: enriched });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Erro ao listar certificados' });
  }
});

// ── GET /api/certificates/:id - Get certificate details ───────────────────
router.get('/:id', async (req, res) => {
  try {
    const { certificates, courses, users } = getDatabase();
    const { id } = req.params;

    const cert = await certificates.findOne({ _id: id });
    if (!cert) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }

    // Verify ownership
    if (cert.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const course = await courses.findOne({ _id: cert.course_id });
    const user = await users.findOne({ _id: cert.user_id });

    res.json({
      certificate: {
        ...cert,
        course_title: course?.title || '',
        user_name: user?.name || '',
      },
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ error: 'Erro ao buscar certificado' });
  }
});

// ── POST /api/certificates/:id/download - Generate PDF ────────────────────
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { certificates } = getDatabase();

    const cert = await certificates.findOne({ _id: id });
    if (!cert || cert.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Certificado não encontrado' });
    }

    // For now, return certificate info (PDF generation can be added later with pdfkit)
    // This placeholder allows frontend to implement PDF generation
    res.json({
      certificate_number: cert.certificate_number,
      issue_date: cert.issue_date,
      message: 'PDF gerado com sucesso',
      // pdf_url: cert.pdf_url, // Will be populated after pdfkit integration
    });
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ error: 'Erro ao gerar certificado' });
  }
});

// ── GET /api/certificates/:id/verify - Verify certificate authenticity ────
router.get('/:id/verify', async (req, res) => {
  try {
    const { certificateNumber } = req.query;
    const { certificates } = getDatabase();

    const cert = await certificates.findOne({
      certificate_number: certificateNumber,
      status: 'valid',
    });

    if (!cert) {
      return res.json({ valid: false, message: 'Certificado não encontrado ou inválido' });
    }

    res.json({
      valid: true,
      certificate_number: cert.certificate_number,
      issue_date: cert.issue_date,
      status: cert.status,
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Erro ao validar certificado' });
  }
});

module.exports = router;
