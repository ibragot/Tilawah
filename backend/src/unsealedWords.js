function stripDiacritics(text) {
  return String(text || '')
    .replace(/[\u0610-\u061A]/g, '')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[\u0670]/g, '')
    .replace(/[\u06D6-\u06DC]/g, '')
    .replace(/[\u06DF-\u06E4]/g, '')
    .replace(/[\u06E7-\u06E8]/g, '')
    .replace(/[\u06EA-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .trim();
}

const unsealedWords = {
  'الله': {
    totalOccurrences: 2699,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both — appears in every surah except At-Tawbah',
    whyThisWord: `Allah chose this name — الله — over every other divine name because it is the only name that cannot be pluralized, cannot be given a feminine form, and cannot be applied to anything other than Him. Al-Rahman can be imitated, Al-Malik can be shared — but الله belongs to nothing and no one else. It is believed by scholars to be derived from the root أله meaning to be bewildered, lost in awe — the name itself describes the human response to the one it names.`,
    coreMeaning: `The one whose existence is so absolute that contemplating it leaves the mind unable to go further.`,
    acrossQuran: [
      { verseKey: '2:255', quote: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence', context: 'Here الله opens the greatest verse in the Quran not as a subject but as a declaration — unlike Al-Fatihah where it appears as the object of praise, here it appears as the subject of an entire cosmology.' },
      { verseKey: '59:22', quote: 'He is Allah, other than whom there is no deity, Knower of the unseen and the witnessed', context: 'Here الله precedes a cascade of 9 divine names — unlike most verses where it stands alone, here it functions as a heading, as if saying: everything that follows is what this name contains.' },
      { verseKey: '3:18', quote: 'Allah witnesses that there is no deity except Him, and so do the angels and those of knowledge', context: 'Here الله appears as a witness to His own oneness — a grammatical construction that has no parallel in any human language, where the subject testifies about itself in a court that includes all of creation.' },
    ],
    whatChanges: `When you know that this name cannot be imitated, pluralized, or shared, every time you read it you realize you are encountering something the Arabic language itself had to reserve entirely for one purpose.`,
  },
  'رحمن': {
    totalOccurrences: 57,
    mostCommonSurah: 'Ar-Rahman',
    makkiOrMadani: 'Mostly Makki — used when Allah introduces Himself to those who had not yet accepted Him',
    whyThisWord: `Allah chose الرحمن over الرحيم in this position because Rahman carries a meaning of overwhelming, all-encompassing mercy that floods everything — it is mercy as a permanent state of being. The scholars Ibn Al-Qayyim described it as the mercy that is intrinsic to Allah's nature, while Raheem is the mercy that reaches the believer specifically. Rahman is the ocean. Raheem is the wave that reaches you.`,
    coreMeaning: `Mercy so vast and inherent that it preceded creation itself — Allah was Rahman before there was anyone to show mercy to.`,
    acrossQuran: [
      { verseKey: '19:45', quote: 'إِنِّي أَخَافُ أَنْ يَمَسَّكَ عَذَابٌ مِنَ الرَّحْمَٰنِ', context: 'Here Rahman appears in a warning — unlike Al-Fatihah where it appears as pure mercy framing praise, here it appears as mercy warning before consequence.' },
      { verseKey: '25:60', quote: 'وَإِذَا قِيلَ لَهُمُ اسْجُدُوا لِلرَّحْمَٰنِ قَالُوا وَمَا الرَّحْمَٰنُ', context: 'Here Rahman appears as a contested name — unlike Al-Fatihah where it is confessed by the believer, here it is questioned by the denier.' },
      { verseKey: '55:1', quote: 'الرَّحْمَٰنُ عَلَّمَ الْقُرْآنَ', context: 'Here Rahman opens an entire surah as its sole subject — unlike Al-Fatihah where it appears within praise, here it stands as the headline of revelation itself.' },
    ],
    whatChanges: `Knowing that Rahman describes mercy as Allah's permanent state of being — not a response to your actions — means you are always inside His mercy even before you ask.`,
  },
  'الرحمن': {
    totalOccurrences: 57,
    mostCommonSurah: 'Ar-Rahman',
    makkiOrMadani: 'Mostly Makki — used when Allah introduces Himself to those who had not yet accepted Him',
    whyThisWord: `Allah chose الرحمن over الرحيم in this position because Rahman carries a meaning of overwhelming, all-encompassing mercy that floods everything — it is mercy as a permanent state of being. The scholars Ibn Al-Qayyim described it as the mercy that is intrinsic to Allah's nature, while Raheem is the mercy that reaches the believer specifically. Rahman is the ocean. Raheem is the wave that reaches you.`,
    coreMeaning: `Mercy so vast and inherent that it preceded creation itself — Allah was Rahman before there was anyone to show mercy to.`,
    acrossQuran: [
      { verseKey: '19:45', quote: 'إِنِّي أَخَافُ أَنْ يَمَسَّكَ عَذَابٌ مِنَ الرَّحْمَٰنِ', context: 'Here Rahman appears in a warning — unlike Al-Fatihah where it appears as pure mercy framing praise, here it appears as mercy warning before consequence.' },
      { verseKey: '25:60', quote: 'وَإِذَا قِيلَ لَهُمُ اسْجُدُوا لِلرَّحْمَٰنِ قَالُوا وَمَا الرَّحْمَٰنُ', context: 'Here Rahman appears as a contested name — unlike Al-Fatihah where it is confessed by the believer, here it is questioned by the denier.' },
      { verseKey: '55:1', quote: 'الرَّحْمَٰنُ عَلَّمَ الْقُرْآنَ', context: 'Here Rahman opens an entire surah as its sole subject — unlike Al-Fatihah where it appears within praise, here it stands as the headline of revelation itself.' },
    ],
    whatChanges: `Knowing that Rahman describes mercy as Allah's permanent state of being — not a response to your actions — means you are always inside His mercy even before you ask.`,
  },
  'رحيم': {
    totalOccurrences: 114,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both — appears equally across Makki and Madani surahs',
    whyThisWord: `Allah chose الرحيم — the intensive form of mercy — specifically to describe the mercy that is directed and targeted at the believer personally. While Rahman is mercy as an ocean, Raheem is mercy as a current that finds you. The root رحم is also the Arabic word for womb — the scholars say this is not coincidental: just as a womb protects, nourishes, and sustains without the child doing anything to deserve it, Raheem describes a mercy that holds you before you have earned it.`,
    coreMeaning: `Targeted, personal mercy — the mercy that crosses the distance between Allah and you specifically.`,
    acrossQuran: [
      { verseKey: '2:173', quote: 'But whoever is forced by necessity, neither desiring nor transgressing, there is no sin upon him. Indeed Allah is Forgiving and Merciful', context: 'Here Raheem appears after legal concession — unlike Al-Fatihah where it appears as a foundational divine attribute, here it appears as mercy operating through law.' },
      { verseKey: '9:117', quote: 'Allah has already forgiven the Prophet and the Muhajireen and the Ansar — indeed He is to them Kind and Merciful', context: 'Here Raheem appears after a historical forgiveness event — unlike Al-Fatihah where it appears universally, here it appears in a concrete communal moment.' },
      { verseKey: '26:9', quote: 'And indeed your Lord — He is the Exalted in Might, the Merciful', context: 'Here Raheem is paired with Al-Aziz — unlike Al-Fatihah where mercy appears as pure introduction, here mercy appears beside might as a balancing pair.' },
    ],
    whatChanges: `Knowing that Raheem shares its root with the word for womb changes every recitation of Bismillah — you are not just invoking mercy, you are invoking the mercy that surrounds you the way a mother surrounds a child.`,
  },
  'الرحيم': {
    totalOccurrences: 114,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both — appears equally across Makki and Madani surahs',
    whyThisWord: `Allah chose الرحيم — the intensive form of mercy — specifically to describe the mercy that is directed and targeted at the believer personally. While Rahman is mercy as an ocean, Raheem is mercy as a current that finds you. The root رحم is also the Arabic word for womb — the scholars say this is not coincidental: just as a womb protects, nourishes, and sustains without the child doing anything to deserve it, Raheem describes a mercy that holds you before you have earned it.`,
    coreMeaning: `Targeted, personal mercy — the mercy that crosses the distance between Allah and you specifically.`,
    acrossQuran: [
      { verseKey: '2:173', quote: 'إِنَّ اللَّهَ غَفُورٌ رَحِيمٌ', context: 'Here Raheem appears after legal concession — unlike Al-Fatihah where it appears as a foundational divine attribute, here it appears as mercy operating through law.' },
      { verseKey: '9:117', quote: 'إِنَّهُ بِهِمْ رَءُوفٌ رَحِيمٌ', context: 'Here Raheem appears after a historical forgiveness event — unlike Al-Fatihah where it appears universally, here it appears in a concrete communal moment.' },
      { verseKey: '26:9', quote: 'وَإِنَّ رَبَّكَ لَهُوَ الْعَزِيزُ الرَّحِيمُ', context: 'Here Raheem is paired with Al-Aziz — unlike Al-Fatihah where mercy appears as pure introduction, here mercy appears beside might as a balancing pair.' },
    ],
    whatChanges: `Knowing that Raheem shares its root with the word for womb changes every recitation of Bismillah — you are not just invoking mercy, you are invoking the mercy that surrounds you the way a mother surrounds a child.`,
  },
  'ملك': {
    totalOccurrences: 213,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose ملك — sovereignty/kingship — over سلطان and حكم because Mulk describes ownership so complete that nothing exists outside it.`,
    coreMeaning: `Ownership so complete it includes the right to create, destroy, and determine the fate of everything owned.`,
    acrossQuran: [
      { verseKey: '67:1', quote: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ', context: 'Here Mulk opens a surah — unlike 1:4 where ownership is tied to Judgment Day, here it describes constant universal sovereignty.' },
      { verseKey: '3:26', quote: 'قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ', context: 'Here Mulk is distributed and withdrawn — unlike 1:4 where it is judicial ownership, here it is political and historical control.' },
      { verseKey: '36:83', quote: 'بِيَدِهِ مَلَكُوتُ كُلِّ شَيْءٍ', context: 'Here the same root expands to the dominion of all things — unlike 1:4 where the scope is a specific Day, here scope is everything always.' },
    ],
    whatChanges: `Knowing this root signals absolute dominion makes Maliki Yawmid-Din feel like explicit legal authority, not just a title.`,
  },
  'مالك': {
    totalOccurrences: 213,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose مالك in this verse to emphasize full authority, ownership, and judgment over consequences.`,
    coreMeaning: `The possessor of total authority whose ownership includes accountability and outcome.`,
    acrossQuran: [
      { verseKey: '67:1', quote: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ', context: 'Here root m-l-k appears as cosmic dominion — unlike 1:4 where it specifies legal authority on the Day of Judgment.' },
      { verseKey: '3:26', quote: 'قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ', context: 'Here the same root highlights giving and taking worldly kingship — unlike 1:4 where it is final judicial kingship.' },
      { verseKey: '36:83', quote: 'بِيَدِهِ مَلَكُوتُ كُلِّ شَيْءٍ', context: 'Here the root expands into total dominion over all things — unlike 1:4 where focus is accountability on one decisive Day.' },
    ],
    whatChanges: `Knowing this root spans ownership and judgment makes the verse feel like a courtroom declaration, not only a devotional phrase.`,
  },
  'دين': {
    totalOccurrences: 92,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose دين because it carries religion, judgment, and repayment together, which converge on the Day of Reckoning.`,
    coreMeaning: `The meeting point of way-of-life, judgment, and repayment.`,
    acrossQuran: [
      { verseKey: '109:6', quote: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ', context: 'Here deen means way of religion — unlike 1:4 where deen means judgment and repayment.' },
      { verseKey: '12:76', quote: 'مَا كَانَ لِيَأْخُذَ أَخَاهُ فِي دِينِ الْمَلِكِ', context: 'Here deen means legal code — unlike 1:4 where deen means ultimate divine reckoning.' },
      { verseKey: '82:17', quote: 'وَمَا أَدْرَاكَ مَا يَوْمُ الدِّينِ', context: 'Here deen is repeated rhetorically to magnify awe — unlike 1:4 where it is stated as a direct ownership claim.' },
    ],
    whatChanges: `Knowing deen carries both religion and repayment makes Yawmid-Din feel like the day all lived beliefs are finally settled.`,
  },
  'الدين': {
    totalOccurrences: 92,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose الدين because it carries religion, judgment, and repayment together, which converge on the Day of Reckoning.`,
    coreMeaning: `The meeting point of way-of-life, judgment, and repayment.`,
    acrossQuran: [
      { verseKey: '109:6', quote: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ', context: 'Here deen means way of religion — unlike 1:4 where deen means judgment and repayment.' },
      { verseKey: '12:76', quote: 'مَا كَانَ لِيَأْخُذَ أَخَاهُ فِي دِينِ الْمَلِكِ', context: 'Here deen means legal code — unlike 1:4 where deen means ultimate divine reckoning.' },
      { verseKey: '82:17', quote: 'وَمَا أَدْرَاكَ مَا يَوْمُ الدِّينِ', context: 'Here deen is repeated rhetorically to magnify awe — unlike 1:4 where it is stated as a direct ownership claim.' },
    ],
    whatChanges: `Knowing deen carries both religion and repayment makes Yawmid-Din feel like the day all lived beliefs are finally settled.`,
  },
  'حياة': {
    totalOccurrences: 76,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose حياة — life — from a root meaning to be alive and to be modest simultaneously. The scholars say this is not coincidental: the same root gives both حي (alive) and حياء (modesty), suggesting that true life in the Quranic sense includes the restraint that comes from awareness of being seen by Allah.`,
    coreMeaning: `Life as awareness — not mere biological existence but the state of being alive to Allah, oriented toward Him, and restrained by that awareness.`,
    acrossQuran: [
      { verseKey: '2:28', quote: 'How can you disbelieve in Allah when you were lifeless and He brought you to life', context: 'Here Hayah is given — you did not generate your own life — making ownership of life not yours but Allah\'s loan to you.' },
      { verseKey: '6:122', quote: 'Is one who was dead and We gave him life and made for him a light by which to walk among the people like one who is in darkness', context: 'Here Hayah is given twice — physical birth and spiritual awakening — showing two lives available and that one can walk in darkness while biologically alive.' },
      { verseKey: '29:64', quote: 'And this worldly life is not but amusement and diversion but indeed the home of the Hereafter is the eternal life', context: 'Here two Hayahs are contrasted — the worldly and the eternal — and the eternal is called Al-Hayawan, the most intense form of the root, suggesting that what we call life now is a diminished version of what life actually is.' },
    ],
    whatChanges: `Knowing Hayah shares its root with modesty means that a person who is truly alive in the Quranic sense is also the most aware of being watched — and that spiritual deadness and shamelessness are the same condition described two ways.`,
  },
  'موت': {
    totalOccurrences: 165,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose موت — death — from a root meaning stillness and cessation of movement. Mawt is the stopping of what was moving. But the Quran uses the same root for the earth before rain — the dead land — and for the land after rain — brought back to life. Death in the Quran is never a final state but a transition between states, and the word itself carries this meaning: what is still now will move again.`,
    coreMeaning: `A stillness between movements — not an ending but a pause in existence that will be broken, as certainly as dead land is broken by rain.`,
    acrossQuran: [
      { verseKey: '3:185', quote: 'Every soul will taste death and you will only be given your full compensation on the Day of Resurrection', context: 'Here Mawt is tasted — experienced as a sensation — unlike its use as a biological event, here it is something the Nafs goes through consciously, making death not something that happens to the body while the soul watches but something the soul itself experiences.' },
      { verseKey: '67:2', quote: 'He who created death and life to test you as to which of you is best in deed', context: 'Here Mawt is created before Hayah — death listed first — which scholars say is deliberate: death was created first to frame life as the test it is, making mortality not an accident but the designed condition of the examination.' },
      { verseKey: '62:8', quote: 'Say indeed the death from which you flee will surely meet you then you will be returned to the Knower of the unseen and the witnessed', context: 'Here Mawt pursues — it meets you, you cannot outrun it — unlike most uses where it simply occurs, here it is almost personal, an appointment that keeps itself regardless of your schedule.' },
    ],
    whatChanges: `Knowing Mawt is the same root as the dead land brought back by rain means death is embedded in a cycle that the Quran describes repeatedly — and that the resurrection is not supernatural intervention but the same pattern Allah already runs every spring.`,
  },
  'عمل': {
    totalOccurrences: 359,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose عمل — deed/action — over فعل (fiil — an act, neutral) because Amal carries intentionality. A Fiil is anything that occurs. An Amal is something done with will and purpose. Every use of Amal in the Quran refers to intentional human action — and scholars say this is why deeds are weighed on the Day of Judgment: only intentional acts have moral weight. The Quran is a book about Amal because it is a book about what you choose.`,
    coreMeaning: `Intentional action — not anything that happens but what you chose to do, carrying the weight of your will in every instance.`,
    acrossQuran: [
      { verseKey: '18:110', quote: 'So whoever hopes for the meeting with his Lord let him do righteous work and not associate in the worship of his Lord anyone', context: 'Here Amal Salih — righteous deed — is the bridge between hope and meeting Allah, unlike its use as a general category, here it is the specific mechanism that connects the human desire for Allah with its fulfillment.' },
      { verseKey: '99:7', quote: 'So whoever does an atom\'s weight of good will see it', context: 'Here the smallest possible Amal is counted — an atom\'s weight — unlike uses where grand deeds are discussed, here the Quran goes to the minimum, suggesting nothing is too small to record and nothing is too small to matter.' },
      { verseKey: '9:105', quote: 'And say do your deeds for Allah will see your deeds and so will His messenger and the believers', context: 'Here Amal is witnessed — by Allah, the Prophet ﷺ, and the community — unlike private acts, here even public deeds are placed under divine observation, collapsing the distinction between what is seen and unseen into a single category of accountability.' },
    ],
    whatChanges: `Knowing Amal means intentional action — not anything that happens — means you are only accountable for what you chose, and that the Quran's entire moral framework rests on the assumption that human beings genuinely choose, making your choices the most consequential thing about you.`,
  },
  'علم': {
    totalOccurrences: 854,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both — the most repeated concept in the Quran after Allah Himself',
    whyThisWord: `Allah chose علم — knowledge — as the first word revealed in the entire Quran: Iqra bismi Rabbik alladhi Khalaq — and the root Ilm appears in the fifth verse: He taught the human what he did not know. The Quran opened with knowledge because Islam's entire framework rests on it: you cannot worship what you do not know, cannot avoid what you cannot recognize, cannot be accountable for what you were never taught. The first revelation was not a command to pray but a command to read.`,
    coreMeaning: `The foundation of all accountability — you cannot be held responsible for what you do not know, and the Quran's first word was the command to acquire it.`,
    acrossQuran: [
      { verseKey: '2:31', quote: 'And He taught Adam the names of all things then He presented them to the angels', context: 'Here Ilm is the first human advantage over the angels — Adam was taught what they were not — making knowledge not just useful but the defining quality that made human stewardship of the earth appropriate.' },
      { verseKey: '58:11', quote: 'Allah will raise those who have believed among you and those who were given knowledge by degrees', context: 'Here Ilm elevates — those with knowledge are raised in rank — unlike its use as a prerequisite for worship, here it is itself rewarded, making the pursuit of knowledge not preparation for something else but an act of worship with its own station.' },
      { verseKey: '96:5', quote: 'Taught man that which he knew not', context: 'Here Ilm is the final statement of the first revelation — Allah taught what humans did not know — making the entire relationship between creator and creation fundamentally pedagogical: Allah is the teacher, the human is the student, and the Quran is the curriculum.' },
    ],
    whatChanges: `Knowing Ilm is the most repeated concept in the Quran and the subject of the first revelation means that seeking knowledge is not preparation for being a Muslim — it is one of the most Islamic acts possible.`,
  },
  'هدى': {
    totalOccurrences: 316,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose هدى — guidance — from a root meaning to lead gently, to show the way with care. Huda is not the guidance of a command — it is the guidance of a gentle hand pointing the direction. The scholars distinguish between two types in the Quran: Hidayat Al-Dilalah — showing the path, which Allah gives to all humans through prophets and the Quran — and Hidayat Al-Tawfiq — actually placing you on the path and keeping you there, which Allah gives only to those who choose to walk it.`,
    coreMeaning: `Gentle leading — guidance not as a command issued but as a hand extended, and the human's response to that hand determining which type of guidance follows.`,
    acrossQuran: [
      { verseKey: '2:2', quote: 'This is the book about which there is no doubt — a guidance for those conscious of Allah', context: 'Here Huda is conditional — for those with Taqwa — unlike the assumption that the Quran guides everyone equally, here the same book guides some and not others based on what the reader brings to it.' },
      { verseKey: '28:56', quote: 'Indeed you do not guide whom you like but Allah guides whom He wills', context: 'Here Huda is entirely in Allah\'s hands — even the Prophet ﷺ cannot guide — unlike its use as something humans transmit, here the final act of placing someone on the path belongs only to Allah, separating human effort from divine result.' },
      { verseKey: '92:12', quote: 'Indeed upon Us is guidance', context: 'Here Huda is Allah\'s personal responsibility — upon Us — making guidance not something Allah might give if asked but something He has taken upon Himself as an obligation toward creation, making every human being the object of an active divine effort.' },
    ],
    whatChanges: `Knowing there are two types of Huda — showing the path and placing you on it — means that reading the Quran gives you the first but only your response to it earns you the second, making every choice to act on what you read a request for the deeper guidance.`,
  },
  'فرقان': {
    totalOccurrences: 7,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose فرقان — the criterion — from a root meaning to separate and distinguish. Al-Furqan is the ability to separate truth from falsehood, light from darkness, real from fake. Allah called the Quran Al-Furqan because its primary function is not just to inform but to give the reader the capacity to distinguish — to cut through confusion and see clearly. The Day of Badr is also called Yawm Al-Furqan because it separated the believers from the disbelievers in a way that could never be undone.`,
    coreMeaning: `The separator — not just a source of truth but the faculty that allows you to tell truth from falsehood in every situation you face.`,
    acrossQuran: [
      { verseKey: '2:53', quote: 'And recall when We gave Musa the scripture and the criterion that perhaps you would be guided', context: 'Here Furqan is given to Musa ﷺ — unlike its use for the Quran, here it applies to the Torah, showing that every divine book was a Furqan for its time, and that the capacity to distinguish is what every prophet brought.' },
      { verseKey: '8:29', quote: 'O you who believe if you fear Allah He will grant you a criterion and remove from you your misdeeds', context: 'Here Furqan is the reward for Taqwa — an inner faculty given to the God-conscious — unlike its use for a revealed book, here it is a personal capacity that Allah places inside the believer, making discernment a spiritual gift rather than just an intellectual skill.' },
      { verseKey: '3:4', quote: 'Before as guidance for the people and He revealed the criterion', context: 'Here Furqan is paired with Huda — guidance and criterion together — suggesting they are two different things: Huda shows you the right path and Furqan helps you recognize it when you see it, making both necessary and neither sufficient alone.' },
    ],
    whatChanges: `Knowing Furqan means the separator — the faculty of distinction — means engaging with the Quran is not just acquiring information but developing a capacity: the ability to cut through confusion in your own life the way a blade cuts through cloth.`,
  },
  'بركة': {
    totalOccurrences: 32,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose بركة — blessing — from a root meaning the chest of a camel touching the ground and staying there. Baraka is not a momentary good — it is blessing that settles, stays, and keeps giving. A blessed meal feeds more people than it should. A blessed hour accomplishes more than an hour should contain. A blessed life produces more than its circumstances explain. The root image is of something that kneels down and remains — blessing as permanence and abundance that defies ordinary accounting.`,
    coreMeaning: `Settled, staying abundance — blessing that remains and multiplies beyond what the external circumstances can explain.`,
    acrossQuran: [
      { verseKey: '7:96', quote: 'And if only the people of the cities had believed and feared Allah We would have opened upon them blessings from the sky and the earth', context: 'Here Baraka flows from belief and Taqwa — unlike its use as a divine gift, here it is conditional, making the absence of Baraka in a community not random misfortune but a readable sign about the community\'s relationship with Allah.' },
      { verseKey: '3:96', quote: 'Indeed the first house established for the people was that at Makkah blessed and a guidance for the worlds', context: 'Here Baraka is a permanent quality of a place — unlike its use for moments or people, here an entire location carries Baraka built into its nature, making pilgrimage to it not tourism but contact with concentrated blessing.' },
      { verseKey: '44:3', quote: 'Indeed We sent it down during a blessed night', context: 'Here Baraka belongs to a night — Laylat Al-Qadr — unlike its use for places or people, here time itself carries Baraka, showing that blessing is not limited to matter but saturates moments, making some hours objectively more valuable than others.' },
    ],
    whatChanges: `Knowing Baraka means blessing that kneels and stays — not a momentary good — means asking for Baraka is not asking for a single gift but for the quality that makes everything you have keep giving beyond what it normally would.`,
  },
  'شكر': {
    totalOccurrences: 75,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose شكر — gratitude — over حمد (Hamd — praise-gratitude) because Shukr is specifically the gratitude given in response to a gift received, while Hamd is gratitude that also exists when no specific gift is being acknowledged. Shukr requires an occasion — something was given. And the scholars note that Shukr can be given to anyone who gives you something, while Hamd belongs only to Allah. Together they cover the full spectrum: Hamd for who Allah is, Shukr for what He does.`,
    coreMeaning: `Gratitude triggered by a specific gift — the recognition of a giver in what you received, and the response that honors both the gift and the one who gave it.`,
    acrossQuran: [
      { verseKey: '14:7', quote: 'And remember when your Lord proclaimed if you are grateful I will surely increase you but if you deny indeed My punishment is severe', context: 'Here Shukr is the mechanism of increase — unlike its use as a moral quality, here it is a law of provision: gratitude triggers more, and its opposite triggers punishment, making thankfulness not just virtuous but strategically rational.' },
      { verseKey: '2:152', quote: 'So remember Me and I will remember you and be grateful to Me and do not deny Me', context: 'Here Shukr is placed alongside Dhikr as the two responses Allah asks for — remember Me and thank Me — suggesting that the complete relationship with Allah has two modes: acknowledgment of who He is and gratitude for what He gives.' },
      { verseKey: '76:3', quote: 'Indeed We guided him to the way whether he be grateful or ungrateful', context: 'Here Shukr is irrelevant to the giving — Allah gave guidance regardless — unlike uses where gratitude triggers increase, here the gift precedes the response, showing that Allah gives before He is thanked, making gratitude a response to generosity that was never conditional on it.' },
    ],
    whatChanges: `Knowing Shukr requires a specific gift — unlike Hamd which exists without one — means true gratitude is practiced by noticing: identifying what was given, who gave it, and making the connection between the two explicit in your heart.`,
  },
  'ظلم': {
    totalOccurrences: 315,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose ظلم — oppression/wrongdoing — from a root meaning darkness and placing something where it does not belong. Dhulm is the act of putting something in the wrong place — giving a right to someone who does not deserve it, taking from someone what belongs to them, or placing yourself in a position that belongs only to Allah. Shirk — associating partners with Allah — is described in the Quran as the greatest Dhulm, because it places the quality of divinity where it does not belong.`,
    coreMeaning: `Misplacement — putting things where they do not belong, whether that is worship, rights, power, or trust.`,
    acrossQuran: [
      { verseKey: '31:13', quote: 'Indeed association with Allah is great injustice', context: 'Here Dhulm is Shirk — the greatest misplacement — unlike its use for interpersonal oppression, here it is a cosmic wrongdoing, placing divinity where it does not belong, making idolatry not just theologically wrong but the deepest possible injustice.' },
      { verseKey: '10:44', quote: 'Indeed Allah does not wrong the people at all but it is the people who wrong themselves', context: 'Here Dhulm is self-directed — humans wrong themselves — unlike oppression as something done to others, here the Quran reveals that most human wrongdoing ultimately harms the one who commits it, collapsing the distance between wrongdoer and victim into a single person.' },
      { verseKey: '57:17', quote: 'Know that Allah gives life to the earth after its lifelessness — We have made clear to you the signs that perhaps you will understand', context: 'Here the absence of Dhulm — justice and right placement — is described through the revival of dead land, suggesting that when things are in their right place, life follows as naturally as spring follows rain.' },
    ],
    whatChanges: `Knowing Dhulm means misplacement — not just cruelty — means every injustice is a disorder, something put in the wrong place, and justice is not punishment but restoration of the right order of things.`,
  },
  'خوف': {
    totalOccurrences: 124,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose خوف — fear — over رهبة (rahba — terror/awe) and وجل (wajal — the trembling of the heart) because Khawf is the moderate fear that motivates action without paralyzing. It is the fear a traveler has of a difficult road — enough to prepare, not enough to stay home. The Quran uses Rahba for the fear of Allah that is specifically overwhelming awe, and Wajal for the trembling of the heart at His mention. Khawf is the operational fear — the one that makes you change your behavior.`,
    coreMeaning: `Motivating fear — enough to change your course but not enough to stop you from moving, the fear that produces preparation rather than paralysis.`,
    acrossQuran: [
      { verseKey: '2:38', quote: 'Whoever follows My guidance there will be no fear upon them nor will they grieve', context: 'Here Khawf is removed for the guided — unlike its use as a motivator toward Allah, here its absence is the reward of following Him, showing that the goal of fear-based worship is to arrive at a state beyond fear.' },
      { verseKey: '3:175', quote: 'That is only Satan who frightens his supporters — so do not fear them but fear Me if you are believers', context: 'Here two Khawfs are contrasted — fear of people versus fear of Allah — and the Quran commands replacing one with the other, making fear not something to eliminate but something to redirect.' },
      { verseKey: '46:13', quote: 'Indeed those who say our Lord is Allah and then remain steadfast — no fear will there be concerning them nor will they grieve', context: 'Here Khawf is absent for the steadfast — not the brilliant or the pious but specifically those who remain firm — suggesting that the removal of fear is the reward of Istiqama, steadfastness, more than any other quality.' },
    ],
    whatChanges: `Knowing Khawf is the motivating moderate fear — not terror — means the Quran's repeated command to fear Allah is not asking you to be terrified but to be the kind of person whose awareness of Allah changes what they do next.`,
  },
  'امل': {
    totalOccurrences: 28,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose رجاء — hope — over أمل (amal — wishful longing) because Raja is hope that is grounded in the character of the one hoped in — you hope from Allah because of who He is, not just because you want something. Amal is hope that can be directed at anything, even what will not deliver. Raja is theologically anchored: the scholars say you cannot truly have Raja in Allah without also having Khawf, and you cannot have Khawf without Raja — they are the two wings of the believing heart, and a bird with only one wing cannot fly.`,
    coreMeaning: `Anchored hope — not wishful thinking but expectation grounded in the known character of the one you hope from.`,
    acrossQuran: [
      { verseKey: '18:110', quote: 'So whoever hopes for the meeting with his Lord let him do righteous work', context: 'Here Raja is connected to action — hope expressed through deed — unlike passive wishing, here the one who truly hopes for Allah prepares for the meeting, making Raja not a feeling but a posture that produces behavior.' },
      { verseKey: '33:21', quote: 'There has certainly been for you in the Messenger of Allah an excellent pattern for anyone whose hope is in Allah and the Last Day', context: 'Here Raja defines who the Prophet ﷺ is a model for — those who hope in Allah — unlike general emulation, here following the Prophet is specifically the practice of those whose hope is correctly placed, making the Sunnah the road of the hopeful.' },
      { verseKey: '65:5', quote: 'That is the command of Allah which He has sent down to you — and whoever fears Allah He will remove for him his misdeeds and make great for him his reward', context: 'Here Raja\'s counterpart Khawf produces the reward that hope anticipates — the two working together — confirming the scholars\' teaching that neither is complete without the other.' },
    ],
    whatChanges: `Knowing Raja is anchored hope — grounded in who Allah is — means that hopelessness about Allah's mercy is not humility but a theological error: it misidentifies who Allah is, and the Quran corrects it by describing Him.`,
  },
  'كرم': {
    totalOccurrences: 47,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose كرم — generosity/nobility — from a root describing the most valued kind of grape vine: one that produces abundantly without being forced. Karam is generosity that flows naturally, without calculation, without waiting to be asked. Allah is Al-Karim — the Generous — not because He gives when asked but because giving is His nature, the way the vine produces fruit because that is what it is. The scholars say Karam has two dimensions: generosity with wealth and nobility of character, and in Arabic these are the same word because they were understood as the same quality.`,
    coreMeaning: `Natural, uncalculated generosity — giving that flows from character rather than calculation, abundant without being forced.`,
    acrossQuran: [
      { verseKey: '27:40', quote: 'This is from the favor of my Lord to test me whether I will be grateful or ungrateful', context: 'Here Karam manifests as a test — the generous gift is simultaneously an examination — unlike passive giving, here Allah\'s generosity has a purpose, making every blessing not just a gift but a question: what will you do with what you have been given?' },
      { verseKey: '82:6', quote: 'O mankind what has deceived you concerning your Lord the Most Generous', context: 'Here Al-Karim is used in a question of rebuke — what deceived you about the Generous One — suggesting that ingratitude is not just morally wrong but logically baffling: how does one wrong the one whose defining quality is giving?' },
      { verseKey: '56:77', quote: 'Indeed it is a noble Quran', context: 'Here Karim describes the Quran itself — noble, generous — unlike its use for Allah or people, here the book shares the quality, suggesting that the Quran gives without being exhausted, is noble without being diminished by being read, and produces more than it costs.' },
    ],
    whatChanges: `Knowing Karam is natural generosity — like a vine that produces because that is its nature — means that when you ask Allah for something you are not petitioning a reluctant authority but approaching the one for whom giving is as natural as breathing is for you.`,
  },
  'قدر': {
    totalOccurrences: 132,
    mostCommonSurah: 'Al-Baqarah',
    makkiOrMadani: 'Both',
    whyThisWord: `Allah chose قدر — divine decree/measure — from a root meaning to measure precisely and to have power over. Qadar is both the measuring and the power that executes the measure. Every event in creation has a Qadar — a precise measure that was set before it occurred — and nothing falls outside it. But the scholars distinguish between Qadar as pre-knowledge (what Allah knew would happen) and Qadar as decree (what Allah caused to happen), and the relationship between these two and human free will has generated more Islamic scholarship than almost any other concept.`,
    coreMeaning: `Precise divine measure — every event calibrated to an exact specification before creation, by the One who both measured it and has the power to execute the measure.`,
    acrossQuran: [
      { verseKey: '54:49', quote: 'Indeed all things We created with predestination', context: 'Here Qadar applies to all things — without exception — unlike theological discussions that try to limit it, here the Quran is absolute: everything has a measure, making the question not whether Qadar exists but how to live within it.' },
      { verseKey: '97:1', quote: 'Indeed We sent it down during the Night of Decree', context: 'Here Laylat Al-Qadar is the night of the Quran\'s revelation — Qadar as the measure of an entire night — suggesting that this one night contains more Qadar than a thousand months, making divine decree not uniformly distributed but concentrated at specific moments.' },
      { verseKey: '65:3', quote: 'Indeed Allah has set a measure for all things', context: 'Here Qadar is universal — a measure for all things — appearing immediately after the promise of provision for those who trust Allah, making Qadar not a fatalistic concept but a reassurance: the things you cannot control have already been measured, so your job is only what is within your measure.' },
    ],
    whatChanges: `Knowing Qadar means precise measure — not vague fate — means that nothing in your life is random, and that the comfort of Qadar is not passivity but the peace of knowing that what you could not control was not out of control.`,
  },
};

module.exports = {
  stripDiacritics,
  unsealedWords,
};
