# Portuguese Steps — content brief (biiwow app teaching Portuguese to Russian speakers)

Format: packs/VOCAB_SCHEMA.md and packs/GRAMMAR_SCHEMA.md in this folder. Validators: `node packs/vcheck.js <LEVEL>` and `node packs/gcheck.js <LEVEL>`.

## Portuguese-specific rules
Standard: European Portuguese (Portugal), spelling of the 1990 Acordo Ortográfico, IPA of Lisbon. When Brazilian Portuguese uses a different word, spelling or pronunciation, say so in note_ru ("в Бразилии: ônibus", "в Бразилии: trem"). Nouns WITH the article o/a ("o livro", "a casa"); give irregular plurals in forms ("pl. os pães"). Verbs in the infinitive; irregular verbs give key forms ("eu tenho, ele tem; eu tive; tido"). Adjectives give feminine and plural when irregular. note_ru: false friends with Russian and Spanish, ser vs estar, Portugal vs Brazil.

## Vocabulary topics per level (exactly these 20 topic names, 25 entries each)

### A1
- Greetings & basics
- Numbers & quantity
- Family & people
- Food & drink
- Home & furniture
- Daily routine
- Time & calendar
- Colours & clothes
- Body & health
- Weather & nature
- City & transport
- Shopping & money
- Work & school
- Hobbies & free time
- Animals
- Basic verbs
- Adjectives
- Small words
- Verbs with prepositions 1
- Idioms & expressions 1

### A2
- Describing people & personality
- Feelings & emotions
- Cooking & restaurants
- Health & the doctor
- Travel & holidays
- Transport & directions
- Housing & furniture
- Work & jobs
- Education
- Technology & phone
- Services
- Sport
- Nature
- Entertainment
- Celebrations
- Everyday verbs 2
- Communication verbs
- Adjectives & adverbs
- Verbs with prepositions 2
- Idioms & expressions 2

### B1
- Relationships & social life
- Character & behaviour
- Emotions & reactions
- Home, DIY & household
- Food & diet
- Health & lifestyle
- Travel, tourism & accommodation
- Transport & driving
- Work, careers & office
- Money, banking & shopping
- Education & study skills
- Science, nature & environment
- Technology & the internet
- Media, news & culture
- Law, crime & society
- Verbs: abstract & formal
- Collocations with fazer/dar/ter/pôr
- Adjectives: evaluation & description
- Verbs with prepositions 3
- Idioms & expressions 3

### B2
- Society & social issues
- Politics & government
- Economy, business & marketing
- Work & professional life
- Science & research
- Technology & innovation
- Environment & climate
- Health & medicine
- Psychology & the mind
- Education & academic life
- Arts, literature & film
- Media & communication
- Travel, culture & globalisation
- Crime, justice & ethics
- Verbs: precise & formal
- Adjectives: nuance
- Word formation (prefixes/suffixes)
- Linking & hedging language
- Verbs with prepositions 4
- Idioms & expressions 4

### C1
- Academic & formal verbs
- Academic & formal nouns
- Describing trends & data
- Argument & opinion
- Character & relationships (advanced)
- Emotions & attitudes (advanced)
- Business, finance & the economy
- Law, politics & international affairs
- Science, technology & the future
- Environment & sustainability
- Health, wellbeing & medicine
- Culture, arts & media
- Language, literature & humour
- Collocations: adjective + noun
- Adjectives: precise description
- Adverbs & discourse markers
- Word formation (advanced)
- Register: formal vs colloquial & Brazilian Portuguese
- Verbs with prepositions 5
- Idioms & expressions 5

### C2
- Literary & archaic vocabulary
- Rhetoric, debate & persuasion
- Law, contracts & bureaucracy
- Economics & finance (specialist)
- Medicine & the body (specialist)
- Science & engineering (specialist)
- History, politics & society (specialist)
- Philosophy, religion & ethics
- Psychology & cognition (specialist)
- Arts, architecture & design
- Nature, geography & weather (rare words)
- Humour, irony & slang (Portugal and Brazil)
- Proverbs & sayings
- Synonyms & shades of meaning
- Prefixes, suffixes & derivation (advanced)
- Verbs: rare & expressive
- Adjectives: rare & expressive
- Interjections & intensifiers
- Verbs with prepositions 6
- Idioms & expressions 6

Level guide: A1 the 500 most basic words; A2 the next 500 (no A1 words); B1 intermediate; B2 upper-intermediate; C1 advanced, academic, professional; C2 rare, literary, specialised. "Verbs with prepositions N" = verb + preposition patterns (pos "verb"); "Idioms & expressions N" = fixed expressions and idioms (pos "phrase"). Never reuse a word that exists in a lower level pack in this folder; the validator rejects it.

## Grammar sections per level (10 sections, in this order; ids kebab-case)

### A1
1. Pronunciation and spelling (nasal vowels ã/õ, -ão, lh/nh, ç, reduced vowels in Portugal; Brazilian differences)
2. Nouns: gender and plural (-ão → -ões/-ães/-ãos); articles o/a/os/as, um/uma
3. Ser, estar and haver (há)
4. Present tense of regular -ar, -er, -ir verbs; forms of address (tu, você, o senhor/a senhora)
5. Irregular verbs in the present (ter, ir, fazer, poder, querer, dizer, ver, vir, dar, saber)
6. Prepositions contracted with articles (do, na, pelo, ao, num)
7. Adjectives: agreement and position; possessives (o meu, a minha)
8. Questions and negation
9. Gostar de; estar a + infinitive (Portugal) vs estar + gerúndio (Brazil)
10. Numbers, time, dates; ir + infinitive for the future

### A2
1. Pretérito perfeito simples: regular and irregular verbs
2. Pretérito imperfeito; imperfeito vs perfeito
3. Object pronouns (o, a, lhe) and their position: ênclise in Portugal vs próclise in Brazil
4. Reflexive verbs (levantar-se, chamar-se, sentir-se)
5. Comparatives and superlatives (mais … do que, melhor, pior, o maior, -íssimo)
6. Imperative, affirmative and negative, for tu and você
7. Futuro simples and polite condicional
8. Demonstratives (este, esse, aquele; isto, isso, aquilo) and contractions (deste, naquele)
9. Por vs para; prepositions of time and place
10. Indefinites (algum, nenhum, todo, tudo, cada, outro) and já, ainda, ainda não

### B1
1. Presente do conjuntivo: forms
2. Conjuntivo uses 1: will, emotion, doubt (quero que, espero que, talvez)
3. Conjuntivo uses 2: conjunctions (para que, embora, antes que, a não ser que)
4. Pretérito perfeito composto (tenho feito) and mais-que-perfeito composto (tinha feito)
5. The personal infinitive (para eles fazerem)
6. Futuro do conjuntivo (quando puder, se tiver tempo)
7. Conditional sentences: se + presente, se + imperfeito do conjuntivo
8. Relative pronouns: que, quem, onde, o qual, cujo
9. Passive voice (ser + particípio), se-passive (vendem-se casas), double participles (aceitado/aceite)
10. Indirect speech: statements, questions, commands

### B2
1. Imperfeito do conjuntivo and the sequence of tenses
2. Mais-que-perfeito do conjuntivo; unreal conditionals in the past (se tivesse sabido, teria …)
3. Conjuntivo in relative clauses and after indefinites (procuro alguém que saiba, quem quer que)
4. Mesoclisis and advanced pronoun position (dar-te-ei, dir-se-ia); Portugal vs Brazil
5. Verbal periphrases (andar a, acabar de, ficar a, vir a, chegar a, deixar de, voltar a)
6. Futuro composto and condicional composto; probability (deve ter saído, terá sido)
7. Concession and condition (ainda que, mesmo que, desde que, caso, contanto que)
8. Personal infinitive vs conjuntivo (é importante fazermos / que façamos)
9. Gerund and participle clauses (Chegando a casa…, Terminado o trabalho…)
10. Text organisation: connectors (contudo, todavia, no entanto, portanto, aliás) and discourse markers

### C1
1. Mais-que-perfeito simples (fizera) in written language
2. Conjuntivo nuances: verbs that change meaning with indicative vs conjuntivo; oxalá, quem me dera
3. Impersonal constructions and the indeterminate subject (se, a gente, uma pessoa, 3rd person plural)
4. Advanced prepositions and prepositional verbs (assistir a, implicar, namorar com in Portugal vs Brazil)
5. Emphasis and focus (é que, foi … que, o que … é)
6. Nominalisation and formal style; the infinitive with article (o fazer, o dizer)
7. Contracted pronouns (lho, mo, to) and pronouns with the personal infinitive
8. Diminutives and augmentatives (-inho, -zinho, -ão, -ona) and their emotional meaning
9. Word formation: prefixes, suffixes, compounds and their plural (guarda-chuvas)
10. Register and variation: Portugal vs Brazil in grammar and vocabulary, tu/você/o senhor, colloquial forms

### C2
1. Literary tenses and forms: mais-que-perfeito simples, mesoclisis, archaic forms in literature
2. Conjuntivo in fixed formulas (seja como for, custe o que custar, que eu saiba, haja o que houver)
3. Modality and evidentiality (dever, poder, haver de, ao que parece, alegadamente)
4. Syntax of complex sentences: correlatives (quanto mais … mais, tanto … como, de tal modo … que)
5. Pronominal edge cases: clitic climbing, pronouns with auxiliary verbs, lhe vs o in Brazil
6. Word formation advanced: derivation, parasynthesis (entristecer, amanhecer), neologisms
7. Orthography and punctuation: 1990 spelling agreement, hyphens, accents, crase (à, àquele)
8. Prepositional regime (aspirar a, simpatizar com, obedecer a, preferir … a)
9. Discourse and pragmatics: politeness, indirectness, irony, diminutives of politeness
10. Variation and advanced errors: Portugal, Brazil and Africa; a gente vamos, haver vs ter, pronoun placement

Each grammar section: 6-10 rules with 2-4 examples each; 24-32 exercises mixing mc, fill, order, tf, match (about 35/30/15/10/10%), easy to hard; Russian explanations (always containing Russian words) that point out contrasts with Russian; vary the position of the correct mc option; options of an mc item must differ by more than capitalisation.

## How to work
Write in parts with the Write tool into a unique subfolder of your scratchpad (random suffix; the scratchpad is shared with other agents). After EACH part, concatenate what exists into the pack file with a small node script, so partial work is never lost. Run the validator until it prints OK (vocab) or no ERRORS (grammar), and re-run it right before you report, because other levels are written in parallel.
