const mongoose = require('mongoose');
const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.trim();

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function required(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`Argumento obrigatório ausente: --${key}`);
  return value;
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_err) {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Falha em ${url}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }

  return body;
}

function mapDeckToTarget(deck, targetUserId) {
  const now = new Date().toISOString();
  return {
    _id: `ms-deck-${deck.id}`,
    user_id: targetUserId,
    name: String(deck.title || `Deck ${deck.id}`).trim(),
    color: '#1f8a70',
    description: deck.description || '',
    created_at: deck.created_at || now,
    updated_at: deck.updated_at || now,
  };
}

function mapFlashcardToTarget(card, deck, targetUserId) {
  const now = new Date().toISOString();
  const userReview = card.userReview || {};

  // Mapeamento aproximado de progresso para o formato do AppMentoria.
  const reviewCount = Number(userReview.step || 0);
  const intervalDays = Number(userReview.interval || 1) || 1;
  const easeFactor = Number(userReview.ease_factor || 2.5) || 2.5;

  return {
    _id: `ms-card-${card.id}`,
    user_id: targetUserId,
    deck_id: `ms-deck-${deck.id}`,
    subject: String(deck.title || 'Geral').trim(),
    question: String(card.front || '').trim(),
    answer: String(card.back || '').trim(),
    difficulty: 0,
    next_review: String(userReview.review_on || card.next_review_date || now).split('T')[0],
    review_count: reviewCount,
    ease_factor: easeFactor,
    interval_days: intervalDays,
    created_at: card.created_at || now,
    updated_at: card.updated_at || now,
  };
}

async function main() {
  const args = parseArgs(process.argv);

  const importFile = String(args['import-file'] || '').trim();
  const sourceToken = importFile ? String(args['source-token'] || '').trim() : required(args, 'source-token');
  const dryRun = Boolean(args['dry-run']);
  const exportFile = String(args['export-file'] || '').trim();

  const targetUri = dryRun ? String(args['to-uri'] || '').trim() : required(args, 'to-uri');
  const targetEmail = dryRun
    ? String(args['to-email'] || '').trim().toLowerCase()
    : required(args, 'to-email').toLowerCase();

  let account = null;
  let sourceDecks = [];

  if (importFile) {
    console.log(`Carregando dados do arquivo: ${importFile}`);
    const raw = fs.readFileSync(importFile, 'utf8');
    const parsed = JSON.parse(raw);
    account = parsed?.source_account || null;
    sourceDecks = Array.isArray(parsed?.decks) ? parsed.decks : [];
  } else {
    console.log('Iniciando extração do MEDsimple...');
    account = await fetchJson('https://api.medsimpleoficial.com.br/account', sourceToken);
    const decksResponse = await fetchJson('https://api.medsimpleoficial.com.br/decks', sourceToken);

    const decksRaw = Array.isArray(decksResponse?.data) ? decksResponse.data : [];
    sourceDecks = [];

    for (const deck of decksRaw) {
      const detail = await fetchJson(`https://api.medsimpleoficial.com.br/decks/${deck.id}`, sourceToken);
      const deckData = detail?.data || detail;
      sourceDecks.push(deckData);
    }
  }

  const sourceFlashcardsCount = sourceDecks.reduce((acc, deck) => acc + (Array.isArray(deck.flashcards) ? deck.flashcards.length : 0), 0);

  if (exportFile) {
    const payload = {
      exported_at: new Date().toISOString(),
      source_account: {
        id: account?.id || null,
        name: account?.name || null,
        email: account?.email || null,
      },
      totals: {
        decks: sourceDecks.length,
        flashcards: sourceFlashcardsCount,
      },
      decks: sourceDecks,
    };
    fs.writeFileSync(exportFile, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Export JSON salvo em: ${exportFile}`);
  }

  console.log(`Origem usuário: ${account?.name || '(sem nome)'} <${account?.email || 'sem email'}>`);
  console.log(`Decks encontrados: ${sourceDecks.length}`);
  console.log(`Flashcards encontrados: ${sourceFlashcardsCount}`);

  if (dryRun) {
    console.log('Dry-run concluído (sem escrita no destino).');
    return;
  }

  const conn = await mongoose.createConnection(targetUri).asPromise();
  try {
    const db = conn.db;
    const users = db.collection('users');
    const flashcardDecks = db.collection('flashcarddecks');
    const flashcards = db.collection('flashcards');

    const targetUser = await users.findOne({ email: targetEmail });
    if (!targetUser) {
      throw new Error(`Usuário de destino não encontrado por e-mail: ${targetEmail}`);
    }

    let upsertedDecks = 0;
    let upsertedFlashcards = 0;

    for (const sourceDeck of sourceDecks) {
      const mappedDeck = mapDeckToTarget(sourceDeck, targetUser._id);
      await flashcardDecks.updateOne(
        { _id: mappedDeck._id },
        { $set: mappedDeck },
        { upsert: true }
      );
      upsertedDecks += 1;

      const sourceCards = Array.isArray(sourceDeck.flashcards) ? sourceDeck.flashcards : [];
      for (const sourceCard of sourceCards) {
        const mappedCard = mapFlashcardToTarget(sourceCard, sourceDeck, targetUser._id);
        await flashcards.updateOne(
          { _id: mappedCard._id },
          { $set: mappedCard },
          { upsert: true }
        );
        upsertedFlashcards += 1;
      }
    }

    console.log('Migração concluída com sucesso.');
    console.log(`Decks upsertados: ${upsertedDecks}`);
    console.log(`Flashcards upsertados: ${upsertedFlashcards}`);
  } finally {
    await conn.close();
  }
}

main().catch((error) => {
  console.error('Falha na migração:', error.message);
  process.exit(1);
});
