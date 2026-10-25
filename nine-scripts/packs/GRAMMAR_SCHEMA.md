# Grammar pack schema: one JSON object per language, file packs/grammar-<lang>.json

{
  "lang": "pl",
  "sections": [
    {
      "id": "nouns-gender",                 // kebab-case, unique within the language
      "title": "Nouns and gender",
      "level": 1,                           // 1 = beginner, 2 = elementary, 3 = intermediate; order sections from 1 to 3
      "summary": "One or two sentences on what this chapter covers and why it matters.",
      "rules": [                            // 6-10 rules per section
        {
          "title": "Short rule title",
          "body": "2-5 plain-English sentences explaining the rule. Mention the forms in the language inline. Max ~600 chars.",
          "examples": [                     // 2-4 per rule
            {"target": "sentence or form in the language", "roman": "transliteration or null (null for Latin-script languages)", "en": "English"}
          ]
        }
      ],
      "exercises": [                        // 24-32 per section, mixed types, ordered easy to hard
        {"id": "e01", "type": "mc",    "q": "Question text (may include a sentence with ___)", "options": ["a","b","c","d"], "answer": 0, "explain": "one sentence why"},
        {"id": "e02", "type": "fill",  "q": "Sentence with ___ (hint in brackets)", "answer": ["accepted answer", "another accepted spelling"], "roman": "transliteration of the answer or null", "explain": "one sentence why"},
        {"id": "e03", "type": "order", "words": ["words","of","the","sentence","shuffled"], "answer": "the sentence words of shuffled", "en": "its English meaning"},
        {"id": "e04", "type": "tf",    "q": "A statement about the language or a sentence that is right or wrong", "answer": true, "explain": "one sentence why"},
        {"id": "e05", "type": "match", "pairs": [["form in the language","its English or its label"], ["...","..."], ["...","..."], ["...","..."]]}   // 3-5 pairs
      ]
    }
  ]
}

Rules:
- 10 sections per language, each a real grammar chapter for that language (not the same list for every language). Cover at least: the writing system / pronunciation essentials, nouns (gender, plural, cases or measure words or articles as the language has), pronouns and possession, the present tense, the past tense, questions and negation, adjectives and comparison, numbers and counting, word order and particles/postpositions/prepositions, politeness and common sentence patterns. Add the language's signature topics (vowel harmony, cases, aspect, particles, counters, the root system, dual, definite/indefinite conjugation, consonant gradation, suffixed articles...).
- Exercises test the rules in that section, use common vocabulary, and are unambiguous: exactly one correct mc option; fill answers list every accepted spelling; order words rebuild exactly the answer (same words, same count, punctuation attached to words); tf statements are clearly true or false; match pairs are one-to-one.
- "explain" is short and teaches, not just "correct".
- Non-Latin scripts: the "roman" field on examples and fill answers; mc options and order words may be in native script, keep them short. Romanization conventions: zh Hanyu Pinyin with tone marks; ja Hepburn with macrons; ar simple Latin with ā ī ū, ʿ, ʾ; hi simple Latin with ā ī ū ṭ ḍ ṛ.
- Accuracy over quantity: everything stated must be true for the standard language. If a rule has many exceptions, say so briefly.
