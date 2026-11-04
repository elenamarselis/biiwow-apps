# Vocabulary pack for a "Steps" language app: packs/vocab-<LEVEL>.json (LEVEL = A1, A2, B1, B2, C1, C2) — one JSON array

The app teaches a TARGET language (Serbian, Hungarian or Spanish) to Russian speakers. For compatibility with the app code the target-language word is stored in the field named "en".

Each element:
{
  "en": "kuća",                        // the TARGET-language word or expression (lemma). Verbs in the infinitive. Spanish nouns WITH the article ("la casa", "el libro"); Serbian and Hungarian nouns without article.
  "alt": "кућа",                       // Serbian only: the same word in Cyrillic. Omit the field for Hungarian and Spanish.
  "ru": "дом",                         // Russian translation(s), natural, " / " between alternatives
  "ipa": "kûtɕa",                      // IPA transcription without slashes (Serbian: mark pitch accent only when it matters; Hungarian: mark long vowels with ː; Spanish: European pronunciation)
  "pos": "noun" | "verb" | "adjective" | "adverb" | "phrase" | "number" | "pronoun" | "preposition" | "conjunction" | "interjection" | "determiner",
  "topic": "Dom i stan",               // one of the pack's 20 topics, written in ENGLISH (e.g. "Home & furniture"), the exact same string every time
  "def": "zgrada u kojoj ljudi žive",  // short definition IN THE TARGET LANGUAGE, graded to the level (A1: 4-8 very easy words; C2: precise)
  "example": "Moja kuća je mala.",     // one natural sentence in the target language at the level
  "example_ru": "Мой дом маленький.",
  "forms": "ž., mn. kuće" | null,      // grammar forms that a learner needs: Serbian: gender + plural ("m., mn. gradovi"), verb aspect pair and 1st person ("pisati, pišem; svrš. napisati"); Hungarian: accusative, plural, 3rd-person possessive ("házat, házak, háza"), verbs: 3rd person sg present + past ("ír, írt"); Spanish: plural / feminine form / irregular conjugation ("yo tengo, tú tienes…"). null when nothing is needed.
  "note_ru": "..." | null              // optional 1 sentence in Russian: usage tip, false friend with Russian, register, regional variant, collocation
}

Rules
- Exactly 20 topics, 25 entries each, 500 total; every topic name used identically (in English). Topics fit the level (A1: concrete everyday; C2: abstract, idiomatic, academic, professional, nuanced).
- Every level includes one topic of phrasal/prepositional verbs or verb+preposition patterns (name it "Phrasal verbs …" / "Verbs with prepositions …") and one topic of idioms and fixed expressions (name it "Idioms & expressions …"). The app groups those into separate chapters by the words "Phrasal verbs", "Idioms" and "expressions" in the topic name.
- No duplicate "en" within the pack; do not repeat words from lower levels (the validator checks the lower-level pack files that exist in the folder).
- Russian translations correct and natural; use ё. Nouns in nominative singular, verbs in the infinitive, adjectives masculine singular.
- Examples use only vocabulary at or below the level. Spelling and diacritics must be correct (Serbian Latin: č ć š ž đ; Hungarian: á é í ó ö ő ú ü ű; Spanish: á é í ó ú ñ ü and ¿¡).
- Verbs: about 80-100 per level.
