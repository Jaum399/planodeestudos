async function main() {
  const token = process.argv[2];
  if (!token) {
    throw new Error('Uso: node scripts/check-destination-api.js <token>');
  }

  const base = 'https://app-planodeestudos.vercel.app';
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const meRes = await fetch(`${base}/api/auth/me`, { headers });
  const me = await meRes.json();

  const decksRes = await fetch(`${base}/api/flashcard-decks`, { headers });
  const decks = await decksRes.json();

  const cardsRes = await fetch(`${base}/api/flashcards`, { headers });
  const cards = await cardsRes.json();

  console.log(JSON.stringify({
    authStatus: meRes.status,
    decksStatus: decksRes.status,
    cardsStatus: cardsRes.status,
    email: me?.user?.email || null,
    decks: Array.isArray(decks?.decks) ? decks.decks.length : null,
    cards: Array.isArray(cards?.cards) ? cards.cards.length : null,
    sampleDecks: Array.isArray(decks?.decks) ? decks.decks.slice(0, 10).map((d) => d.name) : [],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
