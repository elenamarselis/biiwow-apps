# Vocabulary pack schema (one JSON array per language, file packs/<lang>.json)

Each element:
{
  "id": "p_<lang>_<3-digit number>",          // p_pl_001 ... unique
  "type": "word" | "phrase",
  "topic": "<one of the 20 topics below, exact spelling>",
  "en": "English meaning, short (e.g. 'bread', 'to buy', 'How much is it?')",
  "target": "the item in the language, native script, correct spelling",
  "roman": "transliteration" or null,          // null for Latin-script languages (pl hu fi no tr)
  "literal": "word-for-word / morpheme-by-morpheme meaning when it differs from 'en'" or null,
  "note": "1-2 short sentences (max ~220 chars) on origin, spelling, script, loanword, compound structure or usage" or null,
  "pos": "noun" | "verb" | "adjective" | "adverb" | "phrase" | "number" | "pronoun" | "preposition" | "conjunction" | "interjection" | "particle",
  "gender": {"m": {"target": "...", "roman": "..."|null}, "f": {"target": "...", "roman": "..."|null}} or null,   // only where the language really has distinct masculine/feminine forms (people nouns, adjectives in Hindi/Polish/Arabic, pronouns)
  "conj": [{"label": "I" | "you (sg.)" | "he / she" | "we" | "you (pl.)" | "they" | "past" | "polite" | ...,
            "target": "...", "roman": "..."|null}, ...] or null,   // verbs only, 4-6 most useful forms
  "example": {"target": "one short natural sentence", "roman": "..."|null, "en": "its English"} or null
}

Topics (20, 25 items each = 500):
Greetings & politeness; Numbers & counting; Family & people; Food & drink; At the café and restaurant;
Travel & directions; Transport; Time, days & months; Colours & shapes; Body & health; At home; Clothes;
Work & study; Weather & nature; Shopping & money; Feelings; Verbs of daily life; Question words & small words;
Adjectives for describing; City & places

Quality rules:
- Accuracy over cleverness. Every target must be a real, common, correctly spelled word or phrase.
- 'literal' only when it adds something (compounds, idioms, grammatical structure). Otherwise null.
- 'note' must be true. Prefer facts you are sure of: how it is built, what the script shows, where it was borrowed from, a usage tip, a false friend. If unsure of an etymology, write a usage/spelling note instead or leave null. Never invent history.
- No duplicates (same target twice). Avoid these starter-pack items already present (see starter-pack.json for this lang).
- Verbs: give the dictionary form as 'target' and 4-6 forms in 'conj'. About 50-70 verbs per pack.
- Give 'gender' wherever the language has a real m/f pair for the item (Polish, Hindi, Arabic, Norwegian nouns for people; Hindi/Polish/Arabic adjectives). Languages without grammatical gender (hu fi tr ja zh) use it only for genuinely gendered vocabulary (e.g. Japanese boku/atashi, Chinese 他/她, Hungarian -nő words, Finnish -tar words, Turkish kral/kraliçe).
- 'example' on roughly a third of items, short.
- Romanization: zh = Hanyu Pinyin with tone marks; ja = Hepburn with macrons; ar = simple Latin with ā ī ū, ʿ for ʿayn, ʾ for hamza; hi = simple Latin with ā ī ū and ṭ ḍ ṛ ṇ ś ṣ.
- Arabic: Modern Standard Arabic, no vowel marks in 'target' except where they distinguish gendered endings.
- Chinese: simplified characters. Japanese: kanji with kana as normally written.


## Additional languages
- it (Italian), es (Spanish), fr (French), nl (Dutch): Latin script, `roman` null, the same 20 topics and rules as above. Gender pairs for people nouns and for adjectives (it/es/fr); Dutch de/het in the note.
- en (English, C2 level): the "target" is an advanced English word, expression, idiom or phrasal verb; "en" is a concise plain-English definition (not a translation); "roman" null; "literal" is the literal/original image for idioms and phrasal verbs (e.g. "to back down" literal "to move backwards and down"), else null; "note" explains origin, register (formal/informal/literary/British/American), typical collocations or a usage warning; "gender" null; "conj" is used for phrasal verbs to show patterns (e.g. {"label":"separable","target":"look it up"}, {"label":"past","target":"looked up"}) or for irregular verbs, else null. The 20 English topics are different:
Phrasal verbs: everyday life; Phrasal verbs: work & business; Idioms & fixed expressions; Formal & academic vocabulary; Describing people & character; Emotions & attitudes; Argument, debate & persuasion; Business, money & finance; Law, politics & society; Science & technology; Literature, media & the arts; Near-synonyms & nuance; Collocations that sound native; Latin & Greek roots; Adverbs & discourse markers; Humour, irony & register; Food, travel & lifestyle; Nature, environment & weather; Health, body & medicine; Rare but useful words
