const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { authenticate, requireAccess, isPrivilegedUser } = require('../middleware/auth');

const router = express.Router();

function nowIso() {
  return new Date().toISOString();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed'];
const MARKETPLACE_TYPES = ['all', 'public', 'private'];
const MARKETPLACE_CACHE_TTL_MS = 30 * 60 * 1000;
const marketplaceCache = new Map();

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOwnership(tags) {
  const source = `${tags?.ownership || ''} ${tags?.operator || ''} ${tags?.['operator:type'] || ''} ${tags?.name || ''}`.toLowerCase();
  if (/(public|sus|municip|estadual|federal|universit)/i.test(source)) return 'public';
  if (/(private|privad|particular)/i.test(source)) return 'private';
  return 'unknown';
}

function extractAddress(tags) {
  const parts = [
    tags?.['addr:street'],
    tags?.['addr:housenumber'],
    tags?.['addr:suburb'],
  ].filter(Boolean);
  return parts.join(', ');
}

function extractSpecialties(tags) {
  const source = [
    tags?.['healthcare:speciality'],
    tags?.speciality,
    tags?.specialties,
    tags?.description,
  ].filter(Boolean).join(';');

  return source
    .split(/[;,]/)
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => item.length > 1)
    .slice(0, 12);
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((v) => Number.isFinite(v))) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeRelevance(item, specialtyQuery, originLat, originLon) {
  const specialties = Array.isArray(item.specialties) ? item.specialties : [];
  const specialtyNeedle = String(specialtyQuery || '').trim().toLowerCase();
  const specialtyMatch = specialtyNeedle
    ? specialties.some((sp) => sp.includes(specialtyNeedle)) || item.name.toLowerCase().includes(specialtyNeedle)
    : false;

  const distance = distanceKm(originLat, originLon, item.lat, item.lon);
  const proximityScore = Number.isFinite(distance)
    ? Math.max(0, 45 - Math.min(distance, 45))
    : 10;

  const specialtyScore = specialtyNeedle
    ? (specialtyMatch ? 55 : 0)
    : 20;

  return {
    distance_km: Number.isFinite(distance) ? Number(distance.toFixed(2)) : null,
    relevance_score: Math.round(proximityScore + specialtyScore),
    specialty_match: specialtyMatch,
  };
}

async function fetchMarketplaceFacilities({ city, state }) {
  const cacheKey = `${city}|${state}`.toLowerCase();
  const now = Date.now();
  const memoryCached = marketplaceCache.get(cacheKey);
  if (memoryCached && now - memoryCached.at < MARKETPLACE_CACHE_TTL_MS) {
    return memoryCached.payload;
  }

  const { medHubMarketplaceCache } = getDatabase();
  const persisted = await medHubMarketplaceCache.findOne({ _id: cacheKey }).lean();
  if (persisted && persisted.fetched_at) {
    const age = now - new Date(persisted.fetched_at).getTime();
    if (Number.isFinite(age) && age < MARKETPLACE_CACHE_TTL_MS) {
      const payload = {
        centerLat: Number(persisted.center_lat),
        centerLon: Number(persisted.center_lon),
        items: Array.isArray(persisted.items) ? persisted.items : [],
        cacheSource: 'database',
      };
      marketplaceCache.set(cacheKey, { at: now, payload });
      return payload;
    }
  }

  const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
  const geocode = await fetchJsonWithTimeout(geocodeUrl, {
    headers: { 'User-Agent': 'Mentudo-MedHub/1.0 (marketplace medical search)' },
  });

  if (!Array.isArray(geocode) || geocode.length === 0) {
    return { centerLat: null, centerLon: null, items: [], cacheSource: 'live' };
  }

  const lat = Number(geocode[0].lat);
  const lon = Number(geocode[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { centerLat: null, centerLon: null, items: [], cacheSource: 'live' };
  }

  const overpassQuery = `
[out:json][timeout:25];
(
  nwr(around:35000,${lat},${lon})[amenity=hospital];
  nwr(around:35000,${lat},${lon})[amenity=clinic];
  nwr(around:35000,${lat},${lon})[healthcare=hospital];
  nwr(around:35000,${lat},${lon})[healthcare=clinic];
);
out tags center 250;
`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  let elements = [];
  for (const endpoint of endpoints) {
    try {
      const data = await fetchJsonWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mentudo-MedHub/1.0 (marketplace medical search)',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      }, 20000);
      if (Array.isArray(data?.elements) && data.elements.length > 0) {
        elements = data.elements;
        break;
      }
    } catch {
      // tenta próximo endpoint
    }
  }

  const mapped = elements
    .map((el) => {
      const tags = el.tags || {};
      const name = String(tags.name || '').trim();
      if (!name) return null;

      const kind = tags.amenity || tags.healthcare || 'healthcare';
      const ownership = normalizeOwnership(tags);
      const address = extractAddress(tags);
      const centerLat = Number(el?.center?.lat || el?.lat);
      const centerLon = Number(el?.center?.lon || el?.lon);

      return {
        id: `${el.type || 'node'}-${el.id}`,
        name,
        kind,
        ownership,
        city,
        state,
        address,
        lat: Number.isFinite(centerLat) ? centerLat : null,
        lon: Number.isFinite(centerLon) ? centerLon : null,
        specialties: extractSpecialties(tags),
        source: 'OpenStreetMap',
        source_url: `https://www.openstreetmap.org/${el.type || 'node'}/${el.id}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  await medHubMarketplaceCache.findOneAndUpdate(
    { _id: cacheKey },
    {
      $set: {
        _id: cacheKey,
        city,
        state,
        center_lat: lat,
        center_lon: lon,
        fetched_at: nowIso(),
        items: mapped,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const payload = {
    centerLat: lat,
    centerLon: lon,
    items: mapped,
    cacheSource: 'live',
  };
  marketplaceCache.set(cacheKey, { at: now, payload });
  return payload;
}

// ── Certification helpers ─────────────────────────────────────────────────────

const VALID_BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function validateCnpjChecksum(cnpj) {
  const d = String(cnpj).replace(/\D/g, '');
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  let sum = 0, pos = 5;
  for (let i = 0; i < 12; i++) { sum += parseInt(d[i]) * pos--; if (pos < 2) pos = 9; }
  let rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(d[12]) !== rem) return false;
  sum = 0; pos = 6;
  for (let i = 0; i < 13; i++) { sum += parseInt(d[i]) * pos--; if (pos < 2) pos = 9; }
  rem = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(d[13]) === rem;
}

function validateCrmFormat(number, state) {
  const n = String(number || '').replace(/\D/g, '');
  const s = String(state || '').toUpperCase().trim();
  return n.length >= 4 && n.length <= 7 && VALID_BR_STATES.includes(s);
}

async function verifyCnpjWithBrasilApi(cnpj) {
  try {
    const digits = String(cnpj).replace(/\D/g, '');
    const data = await fetchJsonWithTimeout(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      { headers: { 'User-Agent': 'MedHub-Certification/1.0' } },
      12000
    );
    return { found: true, data };
  } catch {
    return { found: false, data: null };
  }
}

async function verifyCrmWithCfm(crmNumber, crmState) {
  try {
    const number = String(crmNumber).replace(/\D/g, '');
    const state = String(crmState).toUpperCase().trim();
    const data = await fetchJsonWithTimeout(
      `https://portal.cfm.org.br/api-medicos/medico?crm=${number}&uf=${state}`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'MedHub-Certification/1.0' } },
      8000
    );
    return { found: true, data };
  } catch {
    return { found: false, data: null };
  }
}

async function requireMedHubCertification(req, res, next) {
  try {
    const hasMedHubPlan = req.user?.plan === 'premium_medhub' || isPrivilegedUser(req.user);
    if (!hasMedHubPlan) {
      return res.status(403).json({
        error: 'Seu plano atual não inclui acesso ao Centro Médico.',
        reason: 'medhub_plan_required',
      });
    }

    const { medHubCertifications } = getDatabase();
    const cert = await medHubCertifications.findOne({ _id: req.user.id }).lean();
    if (!cert || cert.status !== 'approved') {
      return res.status(403).json({
        error: 'Acesso restrito a profissionais e clínicas certificadas',
        reason: 'certification_required',
        certification_status: cert?.status || null,
      });
    }
    next();
  } catch (error) {
    console.error('MedHub certification check error:', error);
    return res.status(500).json({ error: 'Erro ao verificar certificação.' });
  }
}

// POST /api/medhub/public-signup
router.post('/public-signup', async (req, res) => {
  try {
    const {
      full_name,
      email,
      ddd,
      phone,
      clinic_name,
      cnpj,
      crm,
      source,
    } = req.body || {};

    if (!String(full_name || '').trim() || !String(email || '').trim()) {
      return res.status(400).json({ error: 'Nome completo e email são obrigatórios.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).toLowerCase().trim())) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const cleanedDdd = onlyDigits(ddd);
    const cleanedPhone = onlyDigits(phone);
    const cleanedCnpj = onlyDigits(cnpj);

    if (cleanedDdd && cleanedDdd.length !== 2) {
      return res.status(400).json({ error: 'DDD inválido.' });
    }
    if (cleanedPhone && (cleanedPhone.length < 8 || cleanedPhone.length > 9)) {
      return res.status(400).json({ error: 'Telefone inválido.' });
    }
    if (cleanedCnpj && cleanedCnpj.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido.' });
    }

    const { clinicLeads } = getDatabase();

    const lead = await clinicLeads.create({
      _id: uuidv4(),
      full_name: String(full_name).trim(),
      email: String(email).toLowerCase().trim(),
      ddd: cleanedDdd,
      phone: cleanedPhone,
      clinic_name: String(clinic_name || '').trim(),
      cnpj: cleanedCnpj,
      crm: String(crm || '').trim(),
      source: String(source || 'site').trim() || 'site',
      status: 'new',
      created_at: nowIso(),
    });

    return res.status(201).json({ ok: true, lead_id: lead._id });
  } catch (error) {
    console.error('MedHub public signup error:', error);
    return res.status(500).json({ error: 'Erro ao enviar cadastro da clínica.' });
  }
});

router.use(authenticate, requireAccess);

// ── Certification routes ──────────────────────────────────────────────────────

// GET /api/medhub/certification
router.get('/certification', async (req, res) => {
  try {
    const { medHubCertifications } = getDatabase();
    const cert = await medHubCertifications.findOne({ _id: req.user.id }).lean();
    if (!cert) return res.json({ certification: null });
    const { _id, ...rest } = cert;
    return res.json({ certification: { id: _id, ...rest } });
  } catch (error) {
    console.error('MedHub certification get error:', error);
    return res.status(500).json({ error: 'Erro ao buscar certificação.' });
  }
});

// POST /api/medhub/certification
router.post('/certification', async (req, res) => {
  try {
    const { type, cnpj, crm_number, crm_state, contact_phone, clinic_city, clinic_state, clinic_address } = req.body || {};
    if (!['clinic', 'doctor', 'both'].includes(type)) {
      return res.status(400).json({ error: 'Tipo deve ser "clinic", "doctor" ou "both".' });
    }

    const cleanPhone = onlyDigits(contact_phone);
    const cleanCity = String(clinic_city || '').trim();
    const cleanClinicState = String(clinic_state || '').toUpperCase().trim();
    const cleanAddress = String(clinic_address || '').trim();

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: 'Telefone profissional inválido. Informe DDD + número.' });
    }
    if (!cleanCity) {
      return res.status(400).json({ error: 'Cidade da clínica é obrigatória.' });
    }
    if (!VALID_BR_STATES.includes(cleanClinicState)) {
      return res.status(400).json({ error: 'UF da clínica inválida.' });
    }
    if (!cleanAddress) {
      return res.status(400).json({ error: 'Endereço da clínica é obrigatório.' });
    }

    const { medHubCertifications } = getDatabase();
    const userId = req.user.id;
    const now = nowIso();

    const existing = await medHubCertifications.findOne({ _id: userId }).lean();
    if (existing && existing.status === 'approved') {
      return res.status(409).json({ error: 'Certificação já aprovada. Use DELETE /certification para reiniciar.' });
    }
    if (existing && existing.status === 'verifying') {
      return res.status(409).json({ error: 'Verificação em andamento. Aguarde a conclusão.' });
    }

    const autoRejectionReasons = [];

    // ── CNPJ validation ────────────────────────────────────────────────────
    let cnpjCompanyName = null, cnpjSituation = null, cnpjActivity = null;
    let cnpjVerifiedAt = null, cnpjPassed = false;

    if (type === 'clinic' || type === 'both') {
      const cleanCnpj = onlyDigits(cnpj);
      if (!validateCnpjChecksum(cleanCnpj)) {
        return res.status(400).json({ error: 'CNPJ inválido. Verifique os dígitos informados.' });
      }

      const cnpjResult = await verifyCnpjWithBrasilApi(cleanCnpj);
      if (cnpjResult.found && cnpjResult.data) {
        const d = cnpjResult.data;
        cnpjCompanyName = d.razao_social || d.nome_fantasia || null;
        cnpjSituation = d.descricao_situacao_cadastral || null;
        cnpjActivity = d.cnae_fiscal_descricao || null;
        const isActive = String(cnpjSituation || '').toUpperCase().includes('ATIVA');
        if (!isActive) {
          autoRejectionReasons.push(`CNPJ com situação não ativa: ${cnpjSituation || 'inativa'}`);
          cnpjPassed = false;
        } else {
          cnpjVerifiedAt = now;
          cnpjPassed = true;
        }
      } else {
        autoRejectionReasons.push('CNPJ não confirmado em base pública governamental');
        cnpjPassed = false;
      }
    } else {
      cnpjPassed = true; // Não requerido
    }

    // ── CRM validation ─────────────────────────────────────────────────────
    let crmName = null, crmSpecialty = null, crmVerifiedAt = null, crmPassed = false;

    if (type === 'doctor' || type === 'both') {
      const cleanNumber = onlyDigits(crm_number);
      const cleanState = String(crm_state || '').toUpperCase().trim();
      if (!validateCrmFormat(cleanNumber, cleanState)) {
        return res.status(400).json({ error: 'CRM inválido. Informe número (4–7 dígitos) e UF corretamente.' });
      }

      const crmResult = await verifyCrmWithCfm(cleanNumber, cleanState);
      if (crmResult.found && crmResult.data) {
        const d = crmResult.data;
        crmName = d.nome || d.name || null;
        crmSpecialty = d.especialidade || d.specialty || null;
        crmVerifiedAt = now;
        crmPassed = true;
      } else {
        autoRejectionReasons.push('CRM não confirmado em base pública do CFM');
        crmPassed = false;
      }
    } else {
      crmPassed = true; // Não requerido
    }

    const overallStatus = (cnpjPassed && crmPassed) ? 'approved' : 'rejected';
    const rejectionReason = overallStatus === 'rejected'
      ? (autoRejectionReasons.join(' | ') || 'Dados profissionais não confirmados nas bases públicas.')
      : null;

    const certData = {
      _id: userId,
      type,
      contact_phone: cleanPhone,
      clinic_city: cleanCity,
      clinic_state: cleanClinicState,
      clinic_address: cleanAddress,
      cnpj: (type !== 'doctor') ? onlyDigits(cnpj) : null,
      cnpj_company_name: cnpjCompanyName,
      cnpj_situation: cnpjSituation,
      cnpj_activity: cnpjActivity,
      cnpj_verified_at: cnpjVerifiedAt,
      crm_number: (type !== 'clinic') ? onlyDigits(crm_number) : null,
      crm_state: (type !== 'clinic') ? String(crm_state || '').toUpperCase().trim() : null,
      crm_name: crmName,
      crm_specialty: crmSpecialty,
      crm_verified_at: crmVerifiedAt,
      status: overallStatus,
      rejection_reason: rejectionReason,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
      verified_at: overallStatus === 'approved' ? now : null,
    };

    await medHubCertifications.findOneAndUpdate(
      { _id: userId },
      { $set: certData },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      ok: true,
      status: overallStatus,
      cnpj_company_name: cnpjCompanyName,
      cnpj_situation: cnpjSituation,
      crm_name: crmName,
      crm_specialty: crmSpecialty,
      rejection_reason: rejectionReason,
      message: overallStatus === 'approved'
        ? 'Documentos verificados com sucesso. Acesso ao Centro Médico liberado.'
        : 'Dados rejeitados automaticamente por inconsistência nas bases públicas de CNPJ/CRM.',
    });
  } catch (error) {
    console.error('MedHub certification submit error:', error);
    return res.status(500).json({ error: 'Erro ao processar certificação.' });
  }
});

// DELETE /api/medhub/certification  (cancela e permite reenvio)
router.delete('/certification', async (req, res) => {
  try {
    const { medHubCertifications } = getDatabase();
    const cert = await medHubCertifications.findOne({ _id: req.user.id }).lean();
    if (!cert) return res.status(404).json({ error: 'Nenhuma certificação encontrada.' });
    if (cert.status === 'approved') {
      return res.status(409).json({ error: 'Certificação aprovada não pode ser removida.' });
    }
    await medHubCertifications.deleteOne({ _id: req.user.id });
    return res.json({ ok: true });
  } catch (error) {
    console.error('MedHub certification delete error:', error);
    return res.status(500).json({ error: 'Erro ao remover certificação.' });
  }
});

// GET /api/medhub/certification/admin/pending  (só usuário privilegiado)
router.get('/certification/admin/pending', async (req, res) => {
  if (!isPrivilegedUser(req.user)) return res.status(403).json({ error: 'Acesso negado.' });
  try {
    const { medHubCertifications } = getDatabase();
    const items = await medHubCertifications
      .find({ status: { $in: ['pending', 'verifying'] } })
      .sort({ created_at: -1 })
      .lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar certificações pendentes.' });
  }
});

// PATCH /api/medhub/certification/admin/:userId/status  (só usuário privilegiado)
router.patch('/certification/admin/:userId/status', async (req, res) => {
  if (!isPrivilegedUser(req.user)) return res.status(403).json({ error: 'Acesso negado.' });
  const { status, rejection_reason } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status deve ser "approved" ou "rejected".' });
  }
  try {
    const { medHubCertifications } = getDatabase();
    const now = nowIso();
    const cert = await medHubCertifications.findOneAndUpdate(
      { _id: req.params.userId },
      {
        $set: {
          status,
          rejection_reason: rejection_reason || null,
          updated_at: now,
          verified_at: status === 'approved' ? now : null,
        },
      },
      { new: true }
    ).lean();
    if (!cert) return res.status(404).json({ error: 'Certificação não encontrada.' });
    return res.json({ ok: true, certification: cert });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar certificação.' });
  }
});

// Todas as rotas abaixo pertencem a funcionalidades da Clínica Médica
// e exigem certificação aprovada (CNPJ/CRM), sem afetar outras abas do app.
router.use(requireMedHubCertification);

// GET /api/medhub/marketplace
router.get('/marketplace', async (req, res) => {
  try {
    const city = String(req.query.city || 'Sao Paulo').trim();
    const state = String(req.query.state || 'SP').trim();
    const typeRaw = String(req.query.type || 'all').trim().toLowerCase();
    const type = MARKETPLACE_TYPES.includes(typeRaw) ? typeRaw : 'all';
    const specialty = String(req.query.specialty || '').trim();
    const latRaw = Number(req.query.lat);
    const lonRaw = Number(req.query.lon);
    const pageRaw = Number(req.query.page || 1);
    const pageSizeRaw = Number(req.query.pageSize || 12);
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 100) : 12;
    const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1;

    const facilitiesData = await fetchMarketplaceFacilities({ city, state });
    const originLat = Number.isFinite(latRaw) ? latRaw : facilitiesData.centerLat;
    const originLon = Number.isFinite(lonRaw) ? lonRaw : facilitiesData.centerLon;

    const ranked = facilitiesData.items
      .filter((item) => {
        if (type !== 'all' && item.ownership !== type) return false;
        if (specialty) {
          const needle = specialty.toLowerCase();
          const inSpecialties = Array.isArray(item.specialties)
            ? item.specialties.some((sp) => String(sp).toLowerCase().includes(needle))
            : false;
          const inName = String(item.name || '').toLowerCase().includes(needle);
          if (!inSpecialties && !inName) return false;
        }
        return true;
      })
      .map((item) => {
        const relevance = computeRelevance(item, specialty, originLat, originLon);
        return {
          ...item,
          ...relevance,
        };
      })
      .sort((a, b) => {
        if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
        const da = Number.isFinite(a.distance_km) ? a.distance_km : Number.MAX_SAFE_INTEGER;
        const db = Number.isFinite(b.distance_km) ? b.distance_km : Number.MAX_SAFE_INTEGER;
        return da - db;
      });

    const total = ranked.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = ranked.slice(start, start + pageSize);

    return res.json({
      items,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      },
      filters: { city, state, type, specialty },
      source: {
        provider: 'OpenStreetMap (Nominatim + Overpass)',
        note: 'Base pública colaborativa de estabelecimentos de saúde.',
      },
      ranking: {
        mode: 'proximity_specialty',
        origin: {
          lat: Number.isFinite(originLat) ? Number(originLat.toFixed(6)) : null,
          lon: Number.isFinite(originLon) ? Number(originLon.toFixed(6)) : null,
        },
        cache: facilitiesData.cacheSource,
      },
    });
  } catch (error) {
    console.error('MedHub marketplace error:', error);
    return res.status(500).json({ error: 'Erro ao carregar marketplace médico.' });
  }
});

// GET /api/medhub/leads
router.get('/leads', async (req, res) => {
  try {
    const { clinicLeads } = getDatabase();
    const status = String(req.query.status || '').trim();
    const search = String(req.query.q || '').trim();
    const pageRaw = Number(req.query.page || 1);
    const pageSizeRaw = Number(req.query.pageSize || req.query.limit || 20);
    const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 200) : 20;
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();

    const baseFilter = {};
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      baseFilter.$or = [
        { full_name: regex },
        { email: regex },
        { clinic_name: regex },
        { phone: regex },
        { cnpj: regex },
      ];
    }

    if (startDate || endDate) {
      const range = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!Number.isNaN(parsedStart.getTime())) {
          parsedStart.setHours(0, 0, 0, 0);
          range.$gte = parsedStart.toISOString();
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!Number.isNaN(parsedEnd.getTime())) {
          parsedEnd.setHours(23, 59, 59, 999);
          range.$lte = parsedEnd.toISOString();
        }
      }
      if (range.$gte || range.$lte) {
        baseFilter.created_at = range;
      }
    }

    const listFilter = { ...baseFilter };
    if (status && LEAD_STATUSES.includes(status)) {
      listFilter.status = status;
    }

    const total = await clinicLeads.countDocuments(listFilter);
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const items = await clinicLeads
      .find(listFilter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const countRows = await clinicLeads.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const totals = { new: 0, contacted: 0, qualified: 0, closed: 0 };
    countRows.forEach((row) => {
      if (row && LEAD_STATUSES.includes(row._id)) {
        totals[row._id] = Number(row.count || 0);
      }
    });

    return res.json({
      items,
      totals,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
      },
    });
  } catch (error) {
    console.error('MedHub leads list error:', error);
    return res.status(500).json({ error: 'Erro ao listar leads do Centro Médico.' });
  }
});

// PATCH /api/medhub/leads/:id/status
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const leadId = String(req.params.id || '').trim();
    const status = String(req.body?.status || '').trim();

    if (!leadId) {
      return res.status(400).json({ error: 'Lead inválido.' });
    }

    if (!LEAD_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const { clinicLeads } = getDatabase();
    const updated = await clinicLeads.findOneAndUpdate(
      { _id: leadId },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Lead não encontrado.' });
    }

    return res.json({ item: updated });
  } catch (error) {
    console.error('MedHub leads status update error:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do lead.' });
  }
});

function defaultWorkspace(userId) {
  return {
    _id: userId,
    ai_slots: [],
    tiss_guides: [
      { id: 'g1', patient: 'Maria Souza', operator: 'Unimed', amount: 320, status: 'sent' },
      { id: 'g2', patient: 'João Lima', operator: 'Bradesco', amount: 480, status: 'draft' },
    ],
    protocols: [
      { id: 'p1', name: 'Atendimento inicial adulto', active: true },
      { id: 'p2', name: 'Retorno de acompanhamento', active: true },
    ],
    credentialing: [
      { id: 'c1', operator: 'Unimed', stage: 'analysis' },
      { id: 'c2', operator: 'Amil', stage: 'documents' },
    ],
    tele_queue: [],
    visibility_stats: { patients: 18, operators: 4 },
    prescriptions: [],
    record_notes: [],
    updated_at: nowIso(),
  };
}

function sanitizeWorkspaceInput(input) {
  const safe = input || {};
  return {
    ai_slots: Array.isArray(safe.ai_slots) ? safe.ai_slots.slice(0, 100).map((x) => String(x || '')) : [],
    tiss_guides: Array.isArray(safe.tiss_guides)
      ? safe.tiss_guides.slice(0, 500).map((g) => ({
          id: String(g.id || ''),
          patient: String(g.patient || ''),
          operator: String(g.operator || ''),
          amount: Number(g.amount || 0),
          status: ['draft', 'sent', 'paid'].includes(g.status) ? g.status : 'draft',
        }))
      : [],
    protocols: Array.isArray(safe.protocols)
      ? safe.protocols.slice(0, 300).map((p) => ({
          id: String(p.id || ''),
          name: String(p.name || ''),
          active: Boolean(p.active),
        }))
      : [],
    credentialing: Array.isArray(safe.credentialing)
      ? safe.credentialing.slice(0, 300).map((c) => ({
          id: String(c.id || ''),
          operator: String(c.operator || ''),
          stage: ['documents', 'analysis', 'approved'].includes(c.stage) ? c.stage : 'documents',
        }))
      : [],
    tele_queue: Array.isArray(safe.tele_queue)
      ? safe.tele_queue.slice(0, 500).map((t) => ({
          id: String(t.id || ''),
          patient: String(t.patient || ''),
          date: String(t.date || ''),
          status: ['scheduled', 'live', 'finished'].includes(t.status) ? t.status : 'scheduled',
        }))
      : [],
    visibility_stats: {
      patients: Number(safe.visibility_stats?.patients || 0),
      operators: Number(safe.visibility_stats?.operators || 0),
    },
    prescriptions: Array.isArray(safe.prescriptions)
      ? safe.prescriptions.slice(0, 500).map((r) => ({
          id: String(r.id || ''),
          patient: String(r.patient || ''),
          drug: String(r.drug || ''),
          created_at: String(r.created_at || nowIso()),
        }))
      : [],
    record_notes: Array.isArray(safe.record_notes)
      ? safe.record_notes.slice(0, 500).map((n) => ({
          id: String(n.id || ''),
          patient: String(n.patient || ''),
          note: String(n.note || ''),
          created_at: String(n.created_at || nowIso()),
        }))
      : [],
  };
}

// GET /api/medhub/workspace
router.get('/workspace', async (req, res) => {
  try {
    const { medHubWorkspaces } = getDatabase();
    let workspace = await medHubWorkspaces.findOne({ _id: req.user.id }).lean();

    if (!workspace) {
      const initial = defaultWorkspace(req.user.id);
      await medHubWorkspaces.create(initial);
      workspace = initial;
    }

    return res.json({ workspace });
  } catch (error) {
    console.error('MedHub workspace get error:', error);
    return res.status(500).json({ error: 'Erro ao carregar workspace do Centro Médico' });
  }
});

// PUT /api/medhub/workspace
router.put('/workspace', async (req, res) => {
  try {
    const payload = sanitizeWorkspaceInput(req.body?.workspace || req.body || {});
    const { medHubWorkspaces } = getDatabase();

    const updated = await medHubWorkspaces.findOneAndUpdate(
      { _id: req.user.id },
      {
        $set: {
          _id: req.user.id,
          ...payload,
          updated_at: nowIso(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ workspace: updated });
  } catch (error) {
    console.error('MedHub workspace save error:', error);
    return res.status(500).json({ error: 'Erro ao salvar workspace do Centro Médico' });
  }
});

module.exports = router;

