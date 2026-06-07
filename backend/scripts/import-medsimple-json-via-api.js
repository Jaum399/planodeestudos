const fs = require('fs');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [k, inline] = token.slice(2).split('=');
    if (inline !== undefined) {
      args[k] = inline;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[k] = true;
      continue;
    }
    args[k] = next;
    i += 1;
  }
  return args;
}

function required(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`Argumento obrigatório ausente: --${key}`);
  return value;
}

async function apiRequest(baseUrl, token, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_err) {
    payload = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(payload).slice(0, 300)}`);
  }

  return payload;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = String(args['base-url'] || 'https://app-planodeestudos.vercel.app').replace(/\/+$/, '');
  const token = required(args, 'token');
  const importFile = required(args, 'import-file');

  const raw = fs.readFileSync(importFile, 'utf8');
  const data = JSON.parse(raw);

  const sourceDecks = Array.isArray(data?.decks) ? data.decks : [];
  if (sourceDecks.length === 0) {
    throw new Error('Arquivo sem decks para importar.');
  }

  const me = await apiRequest(baseUrl, token, 'GET', '/api/auth/me');
  const userEmail = me?.user?.email || '(desconhecido)';
  console.log(`Destino autenticado: ${userEmail}`);

  const decksResponse = await apiRequest(baseUrl, token, 'GET', '/api/flashcard-decks');
  const existingDecks = Array.isArray(decksResponse?.decks) ? decksResponse.decks : [];

  const cardsResponse = await apiRequest(baseUrl, token, 'GET', '/api/flashcards');
  const existingCards = Array.isArray(cardsResponse?.cards) ? cardsResponse.cards : [];

  const deckByName = new Map();
  for (const d of existingDecks) {
    deckByName.set(normalizeText(d.name), d);
  }

  const cardKeySet = new Set();
  for (const c of existingCards) {
    const key = `${normalizeText(c.deck_id || '')}|${normalizeText(c.question)}|${normalizeText(c.answer)}`;
    cardKeySet.add(key);
  }

  let createdDecks = 0;
  let createdCards = 0;
  let skippedCards = 0;

  for (const sourceDeck of sourceDecks) {
    const deckName = String(sourceDeck.title || 'Sem título').trim();
    const deckKey = normalizeText(deckName);

    let targetDeck = deckByName.get(deckKey);
    if (!targetDeck) {
      const created = await apiRequest(baseUrl, token, 'POST', '/api/flashcard-decks', {
        name: deckName,
        color: '#1f8a70',
        description: sourceDeck.description || '',
      });
      targetDeck = created.deck;
      deckByName.set(deckKey, targetDeck);
      createdDecks += 1;
    }

    const sourceCards = Array.isArray(sourceDeck.flashcards) ? sourceDeck.flashcards : [];
    for (const sourceCard of sourceCards) {
      const question = String(sourceCard.front || '').trim();
      const answer = String(sourceCard.back || '').trim();
      if (!question || !answer) {
        skippedCards += 1;
        continue;
      }

      const uniqueKey = `${normalizeText(targetDeck.id || targetDeck._id)}|${normalizeText(question)}|${normalizeText(answer)}`;
      if (cardKeySet.has(uniqueKey)) {
        skippedCards += 1;
        continue;
      }

      await apiRequest(baseUrl, token, 'POST', '/api/flashcards', {
        subject: deckName,
        question,
        answer,
        deck_id: targetDeck.id || targetDeck._id,
      });

      cardKeySet.add(uniqueKey);
      createdCards += 1;
    }
  }

  console.log('Importação finalizada.');
  console.log(`Decks criados: ${createdDecks}`);
  console.log(`Flashcards criados: ${createdCards}`);
  console.log(`Flashcards pulados (duplicado/vazio): ${skippedCards}`);
  console.log('Nota: progresso detalhado de revisão (interval/ease/review_count) não é exposto pela API pública e não foi migrado 1:1.');
}

main().catch((error) => {
  console.error('Falha na importação via API:', error.message);
  process.exit(1);
});
