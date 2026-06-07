const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database');

const PRIVILEGED_EMAILS = new Set([
  'jmsfagundes@gmail.com',
  'ttavaresmed@gmail.com',
]);

function isPrivilegedUser(user) {
  return PRIVILEGED_EMAILS.has(String(user?.email || '').trim().toLowerCase());
}

function withUserPrivileges(user) {
  if (!isPrivilegedUser(user)) return user;

  return {
    ...user,
    isPrivileged: true,
    plan: 'premium_medhub',
    subscriptionStatus: 'active',
  };
}

/**
 * Calcula o status de acesso do usuário:
 * - premium: assinatura ativa confirmada via webhook de pagamento
 * - grace: assinatura vencida mas dentro dos 3 dias de carência
 * - blocked: pagamento pendente/não iniciado OU carência encerrada
 */
function getAccessStatus(user) {
  if (isPrivilegedUser(user)) {
    return { blocked: false, type: 'premium' };
  }

  const now = new Date();

  // Assinatura ativa — confirmada via webhook do provedor de pagamento
  if (
    (user.plan === 'mensal' || user.plan === 'premium' || user.plan === 'premium_medhub') &&
    user.subscriptionStatus === 'active'
  ) {
    return { blocked: false, type: 'premium' };
  }

  // Assinatura vencida — verificar carência de 3 dias
  if (user.subscriptionStatus === 'past_due' || user.subscriptionStatus === 'unpaid') {
    if (user.grace_period_ends_at) {
      const graceEnd = new Date(user.grace_period_ends_at);
      if (now <= graceEnd) {
        const daysLeft = Math.max(1, Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)));
        return { blocked: false, type: 'grace', daysLeft };
      }
    }
    return { blocked: true, reason: 'payment_overdue' };
  }

  // Sem pagamento confirmado: acesso bloqueado até assinatura ativa.
  return { blocked: true, type: 'free', reason: 'payment_required' };
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { users } = getDatabase();
    const user = await users.findOne({ _id: decoded.userId });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const obj = user.toObject ? user.toObject() : { ...user };
    const { password: _p, __v, ...safeUser } = obj;
    const privilegedUser = withUserPrivileges(safeUser);
    req.user = { ...privilegedUser, id: privilegedUser._id, access: getAccessStatus(privilegedUser) };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/** Bloqueia rotas se o usuário não tiver acesso ativo */
async function requireAccess(req, res, next) {
  const access = req.user?.access;
  if (access?.blocked) {
    return res.status(403).json({
      error: 'Acesso bloqueado',
      reason: access.reason,
    });
  }
  next();
}

module.exports = { authenticate, requireAccess, getAccessStatus, isPrivilegedUser, withUserPrivileges };
