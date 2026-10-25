# Vocabulary pack: packs/vocab-<LEVEL>.json  (LEVEL = A1, A2, B1, B2, C1) — one JSON array

Each element:
{
  "en": "apple",                          // the English word or expression (lemma; verbs as "to go"; phrasal verbs as "to give up")
  "ru": "яблоко",                         // Russian translation(s), the most natural, separated by " / " if more than one
  "ipa": "ˈæpl",                          // British IPA transcription without slashes
  "pos": "noun" | "verb" | "adjective" | "adverb" | "phrase" | "number" | "pronoun" | "preposition" | "conjunction" | "interjection" | "determiner",
  "topic": "Food & drink",                // one of the pack's 20 topics (exact spelling, same string every time)
  "def": "a round fruit with red or green skin",   // simple English definition, graded to the level (A1: 5-8 very easy words)
  "example": "I eat an apple every day.", // one short natural sentence at the level
  "example_ru": "Я ем яблоко каждый день.",
  "forms": "apples" | "go – went – gone" | "good – better – best" | null,   // plural / irregular forms when useful
  "note_ru": "..." | null                 // optional 1 sentence in Russian: usage tip, false friend, British/American, collocation
}

Rules
- Exactly 20 topics, 25 entries each, 500 total; every topic name used identically. Choose topics that fit the level (A1: concrete everyday; C1: abstract, idiomatic, academic, professional).
- No duplicate "en" within the pack; do not repeat words from lower levels (lists of lower levels are given in the brief when available; otherwise use judgement: A1 = the 500 most basic words, A2 the next 500, etc.).
- Russian translations must be correct, natural and in the standard form (nouns in nominative singular, verbs in the infinitive, adjectives masculine singular). Use ё where it belongs.
- IPA in British English (ˈ for stress, ː for length). 
- Examples must only use vocabulary at or below the level.
- Verbs: about 80-100 per level, with irregular forms in "forms".
