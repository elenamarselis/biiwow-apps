# Grammar pack: packs/grammar-<LEVEL>.json — one JSON object, bilingual (English + Russian)

{
  "level": "A1",
  "sections": [
    {
      "id": "to-be-present",                       // kebab-case, unique in the pack
      "title_en": "The verb 'to be'", "title_ru": "Глагол to be",
      "summary_en": "1-2 sentences", "summary_ru": "1-2 предложения",
      "rules": [                                   // 6-10 per section
        {"title_en": "...", "title_ru": "...",
         "body_en": "2-5 plain sentences, max ~600 chars", "body_ru": "the same explanation in natural Russian (not a word-for-word translation), max ~700 chars",
         "examples": [{"en": "I am a student.", "ru": "Я студент."}]}       // 2-4 per rule
      ],
      "exercises": [                               // 24-32 per section, mixed, easy to hard, ids e01...
        {"id":"e01","type":"mc","q":"She ___ a doctor.","options":["is","are","am","be"],"answer":0,"explain_en":"...","explain_ru":"..."},
        {"id":"e02","type":"fill","q":"They ___ (be) from Spain.","answer":["are"],"explain_en":"...","explain_ru":"..."},
        {"id":"e03","type":"order","words":["is","my","This","friend."],"answer":"This is my friend.","ru":"Это мой друг."},
        {"id":"e04","type":"tf","q":"'I is happy' is correct English.","answer":false,"explain_en":"...","explain_ru":"..."},
        {"id":"e05","type":"match","pairs":[["I","am"],["you","are"],["he","is"]]}      // 3-6 pairs, right-hand values distinct
      ]
    }
  ]
}

Rules
- 10 sections per level covering what a learner at that CEFR level must master (A1: to be, present simple, articles, plurals, pronouns, there is/are, can, prepositions of place/time, questions, past simple of be/regular...; A2: past simple irregular, present continuous vs simple, future will/going to, comparatives, countable/uncountable, modals must/should, present perfect intro, adverbs of frequency...; B1: present perfect vs past simple, past continuous, first/second conditional, passive, reported speech intro, relative clauses, gerund/infinitive, used to, modals of deduction...; B2: third/mixed conditionals, passive advanced, reported speech full, past perfect, wish/if only, narrative tenses, articles advanced, phrasal verb grammar, linking words...; C1: inversion, cleft sentences, advanced modals, participle clauses, subjunctive, hedging, emphasis, ellipsis/substitution, complex noun phrases, discourse markers).
- Everything bilingual: titles, summaries, rule bodies and explanations in BOTH English and Russian. Exercise questions, options and answers are in English (the thing being learned); "order" exercises give the Russian meaning in "ru"; match pairs may be English–English or English–Russian.
- Unambiguous exercises: exactly one correct mc option; fill answers list every accepted spelling; order words rebuild exactly the answer (same words and count, punctuation attached to words); tf statements clearly true or false.
- Explanations teach ("Present simple adds -s in the third person"), in both languages.
