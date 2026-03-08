type CityEntry = {
  canonical: string;
  aliases: string[];
};

const CITY_ENTRIES: CityEntry[] = [
  { canonical: "Tel Aviv", aliases: ["תל אביב", "Tel Aviv-Yafo", "תל אביב יפו"] },
  { canonical: "Jerusalem", aliases: ["ירושלים"] },
  { canonical: "Haifa", aliases: ["חיפה"] },
  { canonical: "Rishon LeZion", aliases: ["ראשון לציון"] },
  { canonical: "Petah Tikva", aliases: ["פתח תקווה"] },
  { canonical: "Ashdod", aliases: ["אשדוד"] },
  { canonical: "Netanya", aliases: ["נתניה"] },
  { canonical: "Beer Sheva", aliases: ["באר שבע", "Be'er Sheva"] },
  { canonical: "Bnei Brak", aliases: ["בני ברק"] },
  { canonical: "Holon", aliases: ["חולון"] },
  { canonical: "Ramat Gan", aliases: ["רמת גן"] },
  { canonical: "Ashkelon", aliases: ["אשקלון"] },
  { canonical: "Rehovot", aliases: ["רחובות"] },
  { canonical: "Bat Yam", aliases: ["בת ים"] },
  { canonical: "Herzliya", aliases: ["הרצליה"] },
  { canonical: "Kfar Saba", aliases: ["כפר סבא"] },
  { canonical: "Hadera", aliases: ["חדרה"] },
  { canonical: "Nazareth", aliases: ["נצרת"] },
  { canonical: "Lod", aliases: ["לוד"] },
  { canonical: "Ramla", aliases: ["רמלה"] },
  { canonical: "Modiin-Maccabim-Reut", aliases: ["מודיעין", "מודיעין מכבים רעות"] },
  { canonical: "Ra'anana", aliases: ["רעננה"] },
  { canonical: "Givatayim", aliases: ["גבעתיים"] },
  { canonical: "Eilat", aliases: ["אילת"] },
  { canonical: "Nahariya", aliases: ["נהריה"] },
  { canonical: "Acre", aliases: ["עכו"] },
  { canonical: "Afula", aliases: ["עפולה"] },
  { canonical: "Karmiel", aliases: ["כרמיאל"] },
  { canonical: "Safed", aliases: ["צפת"] },
  { canonical: "Tiberias", aliases: ["טבריה"] },
  { canonical: "Beit Shemesh", aliases: ["בית שמש"] },
  { canonical: "Yavne", aliases: ["יבנה"] },
  { canonical: "Ness Ziona", aliases: ["נס ציונה"] },
  { canonical: "Rosh HaAyin", aliases: ["ראש העין"] },
  { canonical: "Hod HaSharon", aliases: ["הוד השרון"] },
  { canonical: "Pardes Hanna-Karkur", aliases: ["פרדס חנה", "פרדס חנה כרכור"] },
  { canonical: "Ramat Hasharon", aliases: ["רמת השרון"] },
  { canonical: "Or Yehuda", aliases: ["אור יהודה"] },
  { canonical: "Yehud-Monosson", aliases: ["יהוד", "יהוד מונוסון"] },
  { canonical: "Kiryat Gat", aliases: ["קריית גת"] },
  { canonical: "Kiryat Ata", aliases: ["קריית אתא"] },
  { canonical: "Kiryat Motzkin", aliases: ["קריית מוצקין"] },
  { canonical: "Kiryat Bialik", aliases: ["קריית ביאליק"] },
  { canonical: "Kiryat Yam", aliases: ["קריית ים"] },
  { canonical: "Kiryat Ono", aliases: ["קריית אונו"] },
  { canonical: "Maalot-Tarshiha", aliases: ["מעלות תרשיחא"] },
  { canonical: "Sderot", aliases: ["שדרות"] },
  { canonical: "Migdal HaEmek", aliases: ["מגדל העמק"] },
  { canonical: "Nof HaGalil", aliases: ["נוף הגליל"] },
  { canonical: "Arad", aliases: ["ערד"] },
  { canonical: "Dimona", aliases: ["דימונה"] },
  { canonical: "Tirat Carmel", aliases: ["טירת כרמל"] },
  { canonical: "Shoham", aliases: ["שוהם"] },
  { canonical: "Zikhron Ya'akov", aliases: ["זכרון יעקב"] },
  { canonical: "Mevasseret Zion", aliases: ["מבשרת ציון"] },
  { canonical: "Caesarea", aliases: ["קיסריה"] },
  { canonical: "Umm al-Fahm", aliases: ["אום אל-פחם"] },
  { canonical: "Sakhnin", aliases: ["סחנין"] },
  { canonical: "Tamra", aliases: ["טמרה"] },
  { canonical: "Rahat", aliases: ["רהט"] },
];

export const CITIES: string[] = CITY_ENTRIES.map((entry) => entry.canonical).sort(
  (a, b) => a.localeCompare(b),
);

const aliasToCanonical = new Map<string, string>();
const canonicalToHebrew = new Map<string, string>();
for (const entry of CITY_ENTRIES) {
  aliasToCanonical.set(entry.canonical.toLowerCase(), entry.canonical);

  const hebrewAlias = entry.aliases.find((alias) => /[\u0590-\u05FF]/.test(alias));
  if (hebrewAlias) {
    canonicalToHebrew.set(entry.canonical, hebrewAlias);
  }

  for (const alias of entry.aliases) {
    aliasToCanonical.set(alias.toLowerCase(), entry.canonical);
  }
}

const SEARCH_LIMIT = 10;

export function isValidCity(value: string): boolean {
  return aliasToCanonical.has(value.trim().toLowerCase());
}

export function normalizeCity(value: string): string | null {
  return aliasToCanonical.get(value.trim().toLowerCase()) ?? null;
}

export function getCityDisplayLabel(canonicalCity: string): string {
  const hebrew = canonicalToHebrew.get(canonicalCity);
  if (!hebrew) {
    return canonicalCity;
  }

  return `${canonicalCity} / ${hebrew}`;
}

export function searchCities(query: string): string[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return CITIES.slice(0, SEARCH_LIMIT);
  }

  const matches = CITY_ENTRIES.filter((entry) => {
    if (entry.canonical.toLowerCase().includes(normalized)) {
      return true;
    }

    return entry.aliases.some((alias) => alias.toLowerCase().includes(normalized));
  }).map((entry) => entry.canonical);

  return [...new Set(matches)].slice(0, SEARCH_LIMIT);
}

export function findCityInText(text: string): string | null {
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) {
    return null;
  }

  for (const [alias, canonical] of aliasToCanonical.entries()) {
    if (normalizedText.includes(alias)) {
      return canonical;
    }
  }

  return null;
}
