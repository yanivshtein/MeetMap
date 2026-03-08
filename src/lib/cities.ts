const CITY_VALUES = [
  "Tel Aviv",
  "Jerusalem",
  "Haifa",
  "Rishon LeZion",
  "Petah Tikva",
  "Ashdod",
  "Netanya",
  "Beer Sheva",
  "Bnei Brak",
  "Holon",
  "Ramat Gan",
  "Ashkelon",
  "Rehovot",
  "Bat Yam",
  "Herzliya",
  "Kfar Saba",
  "Hadera",
  "Nazareth",
  "Lod",
  "Ramla",
  "Modiin-Maccabim-Reut",
  "Ra'anana",
  "Givatayim",
  "Eilat",
  "Nahariya",
  "Acre",
  "Afula",
  "Karmiel",
  "Safed",
  "Tiberias",
  "Beit Shemesh",
  "Yavne",
  "Ness Ziona",
  "Rosh HaAyin",
  "Hod HaSharon",
  "Pardes Hanna-Karkur",
  "Ramat Hasharon",
  "Or Yehuda",
  "Yehud-Monosson",
  "Kiryat Gat",
  "Kiryat Ata",
  "Kiryat Motzkin",
  "Kiryat Bialik",
  "Kiryat Yam",
  "Kiryat Ono",
  "Maalot-Tarshiha",
  "Sderot",
  "Migdal HaEmek",
  "Nof HaGalil",
  "Arad",
  "Dimona",
  "Tirat Carmel",
  "Shoham",
  "Zikhron Ya'akov",
  "Mevasseret Zion",
  "Caesarea",
  "Umm al-Fahm",
  "Sakhnin",
  "Tamra",
  "Rahat",
] as const;

export const CITIES: string[] = [...CITY_VALUES].sort((a, b) =>
  a.localeCompare(b),
);

const CITY_SET = new Set(CITIES.map((city) => city.toLowerCase()));
const SEARCH_LIMIT = 10;

export function isValidCity(value: string): boolean {
  return CITY_SET.has(value.trim().toLowerCase());
}

export function searchCities(query: string): string[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return CITIES.slice(0, SEARCH_LIMIT);
  }

  return CITIES.filter((city) => city.toLowerCase().includes(normalized)).slice(
    0,
    SEARCH_LIMIT,
  );
}
