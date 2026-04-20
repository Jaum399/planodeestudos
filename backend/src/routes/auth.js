const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, getAccessStatus, withUserPrivileges, isPrivilegedUser } = require('../middleware/auth');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { normalizeWhatsapp } = require('../utils/whatsapp');

const router = express.Router();

function sanitizeUser(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { password: _p, __v, ...safe } = obj;
  const privilegedUser = withUserPrivileges(safe);
  return {
    ...privilegedUser,
    id: privilegedUser._id,
    access: getAccessStatus(privilegedUser),
  };
}

function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(cpf) {
  const value = normalizeCpf(cpf);
  if (!value || value.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(value)) return false;

  const calcDigit = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) total += Number(base[i]) * (factor - i);
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcDigit(value.slice(0, 9), 10);
  const d2 = calcDigit(value.slice(0, 10), 11);
  return d1 === Number(value[9]) && d2 === Number(value[10]);
}

function isValidCnpj(value) {
  const cnpj = String(value || '').replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base, factors) => {
    let total = 0;
    for (let i = 0; i < factors.length; i += 1) {
      total += Number(base[i]) * factors[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

function isValidBillingDocument(value) {
  const normalized = String(value || '').replace(/\D/g, '');
  if (normalized.length === 11) return isValidCpf(normalized);
  if (normalized.length === 14) return isValidCnpj(normalized);
  return false;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, area, whatsapp, billingDocument } = req.body;

    if (!name || !email || !password || !billingDocument) {
      return res.status(400).json({ error: 'Nome, email, senha e CPF são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    if (whatsapp && !normalizedWhatsapp) {
      return res.status(400).json({ error: 'WhatsApp inválido. Use DDD + número.' });
    }
    const normalizedCpf = normalizeCpf(billingDocument);
    if (!isValidCpf(normalizedCpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }

    const { users } = getDatabase();
    const existing = await users.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado. O teste grátis de 7 dias é válido apenas para novos clientes.' });
    }
    const existingCpf = await users.findOne({ billingDocument: normalizedCpf });
    if (existingCpf) {
      return res.status(409).json({ error: 'Este CPF já está cadastrado. O teste grátis de 7 dias é válido apenas para novos clientes.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const normalizedEmail = email.toLowerCase().trim();
    const privilegedSeed = isPrivilegedUser({ email: normalizedEmail });
    const newUser = new users({
      _id: uuidv4(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      whatsapp: normalizedWhatsapp,
      billingDocument: normalizedCpf,
      plan: privilegedSeed ? 'premium' : 'free',
      area: area || '',
      goal: '',
      weekly_goal_hours: 20,
      trial_started_at: now,
      trial_ends_at: privilegedSeed ? null : trialEnd,
      subscriptionStatus: privilegedSeed ? 'active' : null,
      created_at: now,
      updated_at: now,
    });
    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    // Envio de email de boas-vindas (fire-and-forget — não bloqueia o registro)
    sendWelcomeEmail(newUser).catch(err => console.warn('[Email] Boas-vindas falhou:', err.message));
    res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { users } = getDatabase();
    const user = await users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const access = getAccessStatus(req.user);
  res.json({ user: { ...req.user, access } });
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req, res) => {
  try {
    const { name, area, goal, weekly_goal_hours, billingDocument, whatsapp } = req.body;
    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    const normalizedBillingDocument = billingDocument !== undefined ? String(billingDocument).replace(/\D/g, '') : undefined;
    if (whatsapp !== undefined && whatsapp !== '' && !normalizedWhatsapp) {
      return res.status(400).json({ error: 'WhatsApp inválido. Use DDD + número.' });
    }
    if (billingDocument !== undefined && normalizedBillingDocument && !isValidBillingDocument(normalizedBillingDocument)) {
      return res.status(400).json({ error: 'CPF/CNPJ inválido. Confira os dígitos informados.' });
    }
    const { users } = getDatabase();
    const updated = await users.findOneAndUpdate(
      { _id: req.user.id },
      { $set: {
        name: name || req.user.name,
        area: area !== undefined ? area : req.user.area,
        goal: goal !== undefined ? goal : req.user.goal,
        weekly_goal_hours: weekly_goal_hours || req.user.weekly_goal_hours,
        billingDocument: billingDocument !== undefined ? normalizedBillingDocument : req.user.billingDocument,
        whatsapp: whatsapp !== undefined ? normalizedWhatsapp : req.user.whatsapp,
        updated_at: new Date().toISOString(),
      }},
      { new: true }
    );
    res.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const { users } = getDatabase();
    const user = await users.findOne({ _id: req.user.id });
    const isValid = await bcrypt.compare(current_password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await users.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { password: hashedPassword, updated_at: new Date().toISOString() } }
    );
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const { users } = getDatabase();
    const user = await users.findOne({ email: email.toLowerCase().trim() });

    // Sempre retorna sucesso para não revelar se email existe (prevenção de enumeração)
    if (!user) return res.json({ message: 'Se este email estiver cadastrado, você receberá um link de recuperação em breve.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    await users.findOneAndUpdate(
      { _id: user._id },
      { $set: { reset_token: token, reset_token_expires: expires, updated_at: new Date().toISOString() } }
    );

    sendPasswordResetEmail(user, token).catch(err => console.warn('[Email] Reset falhou:', err.message));

    res.json({ message: 'Se este email estiver cadastrado, você receberá um link de recuperação em breve.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const { users } = getDatabase();
    const user = await users.findOne({ reset_token: token });

    if (!user || !user.reset_token_expires || new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ error: 'Token inválido ou expirado. Solicite um novo link.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await users.findOneAndUpdate(
      { _id: user._id },
      { $set: { password: hashedPassword, reset_token: null, reset_token_expires: null, updated_at: new Date().toISOString() } }
    );

    res.json({ message: 'Senha alterada com sucesso! Faça login com a nova senha.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

module.exports = router;
