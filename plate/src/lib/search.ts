// Forgiving food search: plurals ("eggs" → egg, "tomatoes" → tomato, "berries" → berry),
// partial words ("straw" → strawberries), accents ("café" → cafe) and common British /
// American names ("aubergine" ↔ eggplant, "yoghurt" ↔ yogurt, "porridge" ↔ oatmeal).

const SYNONYMS: Record<string, string[]> = {
  aubergine: ['eggplant'], eggplant: ['aubergine'],
  courgette: ['zucchini'], zucchini: ['courgette'],
  prawn: ['shrimp'], shrimp: ['prawn'],
  yoghurt: ['yogurt'], yogurt: ['yoghurt'],
  porridge: ['oatmeal', 'oat'], oatmeal: ['porridge'],
  crisp: ['chip'], chip: ['crisp', 'fries'], fries: ['french fry', 'chip'],
  mince: ['ground'], minced: ['ground'],
  coriander: ['cilantro'], cilantro: ['coriander'],
  biscuit: ['cookie', 'cracker'], cookie: ['biscuit'],
  sweet: ['candy'], candy: ['sweet'],
  rocket: ['arugula'], arugula: ['rocket'],
  beetroot: ['beet'], beet: ['beetroot'],
  chickpea: ['garbanzo'], garbanzo: ['chickpea'],
  'spring onion': ['scallion'], scallion: ['spring onion'],
  soda: ['cola', 'soft drink'], fizzy: ['soda', 'cola'],
  tea: ['tea'], coffee: ['coffee', 'espresso', 'latte', 'cappuccino'],
  sausage: ['sausage', 'frankfurter'], hotdog: ['frankfurter'],
  jam: ['jam', 'preserve'], muesli: ['muesli', 'granola'],
};

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();
}

/** Very small English stemmer, enough for food names. */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (/(oes|shes|ches|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
  return w;
}

const tokens = (s: string) => normalize(s).split(' ').filter(Boolean).map(stem);

/** Variants of one query word: itself plus synonyms. */
function variants(word: string): string[][] {
  const out = [[word]];
  for (const syn of SYNONYMS[word] ?? []) out.push(tokens(syn));
  return out;
}

/**
 * Score how well `text` (name, brand, state…) matches `query`. 0 = no match.
 * Every query word must match the start of some word in the text (or a synonym must).
 */
export function matchScore(query: string, text: string): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const t = tokens(text);
  let score = 0;
  for (const w of q) {
    let best = 0;
    for (const variant of variants(w)) {
      // multi-word synonym: all its words must be present
      const ok = variant.every((vw) => t.some((tw) => tw.startsWith(vw) || (vw.length >= 4 && vw.startsWith(tw) && tw.length >= 3)));
      if (!ok) continue;
      const exact = variant.every((vw) => t.includes(vw));
      best = Math.max(best, exact ? 3 : 2);
    }
    if (!best) return 0;
    score += best;
  }
  // Prefer names that start with the query and shorter names (more generic).
  if (t[0] && q[0] && t[0].startsWith(q[0])) score += 2;
  score += Math.max(0, 1.5 - t.length * 0.1);
  return score;
}
