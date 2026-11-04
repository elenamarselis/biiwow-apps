# Grammar pack for a "Steps" language app: packs/grammar-<LEVEL>.json (LEVEL = A1 … C2) — one JSON object

The app teaches a TARGET language (Serbian, Hungarian or Spanish) to Russian speakers. The app's interface is in Russian or English, so every explanation exists twice: the "_en" fields hold the ENGLISH explanation, the "_ru" fields the RUSSIAN explanation. Exercise material (questions, options, answers, words to order, match pairs) is in the TARGET language.

{
  "level": "A1",
  "sections": [
    {
      "id": "nouns-gender",                         // kebab-case, unique in the pack
      "title_en": "Gender of nouns", "title_ru": "Род существительных",
      "summary_en": "1-2 sentences", "summary_ru": "1-2 предложения",
      "rules": [                                    // 6-10 per section
        {"title_en": "...", "title_ru": "...",
         "body_en": "2-5 plain sentences in English about the target-language rule, max ~600 chars", "body_ru": "the same explanation in natural Russian (not a word-for-word translation), max ~700 chars",
         "examples": [{"en": "La casa es grande.", "ru": "Дом большой."}]}     // 2-4 per rule; "en" = the TARGET-language example, "ru" = its Russian translation
      ],
      "exercises": [                                // 24-32 per section, mixed types, easy to hard, ids e01…
        {"id":"e01","type":"mc","q":"___ casa es grande.","options":["La","El","Los","Las"],"answer":0,"explain_en":"...","explain_ru":"..."},
        {"id":"e02","type":"fill","q":"Ellos ___ (ser) de Madrid.","answer":["son"],"explain_en":"...","explain_ru":"..."},
        {"id":"e03","type":"order","words":["es","mi","Este","amigo."],"answer":"Este es mi amigo.","ru":"Это мой друг."},
        {"id":"e04","type":"tf","q":"'La problema' is correct.","answer":false,"explain_en":"...","explain_ru":"..."},
        {"id":"e05","type":"match","pairs":[["yo","soy"],["tú","eres"],["él","es"]]}    // 3-6 pairs, right-hand values distinct; target–target or target–Russian
      ]
    }
  ]
}

Rules
- 10 sections per level, covering what a learner at that CEFR level must master in THIS language (the brief lists the sections).
- Unambiguous exercises: exactly one correct mc option; fill answers list every accepted spelling (with and without diacritics is NOT accepted: diacritics must be correct); order words rebuild exactly the answer (same words and count, punctuation attached to words); tf statements clearly true or false; the tf question may quote target-language text inside an English or Russian sentence.
- Explanations teach, in both languages, and point out contrasts with Russian where helpful.
- Correct spelling and diacritics throughout (Serbian Latin: č ć š ž đ; Hungarian: á é í ó ö ő ú ü ű; Spanish: á é í ó ú ñ ü ¿ ¡).
