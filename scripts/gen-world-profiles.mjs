/**
 * Generates world-profiles.js: 100 women test profiles with HQ Unsplash portraits.
 * Run: node scripts/gen-world-profiles.mjs
 */
import { writeFileSync } from "fs";
import { join } from "path";

const UNSPLASH = (id, extra = "") =>
  `https://images.unsplash.com/photo-${id}?w=1080&q=85&auto=format&fit=crop&crop=faces${extra}`;

/** Curated portrait photo IDs (women, high quality). Cycled for 100 profiles. */
const PORTRAITS = [
  "1494790108377-be9c29b29330", "1524504388940-b1c1722653e1", "1534528741775-53994a69daeb",
  "1517841906550-978fd25e4963", "1438761681033-6461ffad8d80", "1544005313-94ddf0286df2",
  "1554151228-14d9def656e4", "1573496359142-b8d87734a5a2", "1580489944761-15a19d654956",
  "1619895862022-09128b456148", "1529626455594-4ff08082cfb6", "1508214751196-bcfd4ca60f91",
  "1519699047934-ecad63a72f47", "1531746020798-e695fec0ad08", "1488426862026-00ef85e63146",
  "1487412720507-e7ab37603c6f", "1506794778202-cad84cf45f1d", "1500917293891-ef795e08e601",
  "1546961329-78bef0414d7b", "1570295999919-56ceb5eee211", "1567538806974-f5ed600d12c5",
  "1557864691-49fa79af8700", "1531123418700-1c631130c234", "1525134479667-28a384047f9c",
  "1488716820095-4bcfdd3bde98", "1513950491594-b4d4b8fda3e3", "1509960141776-d190c905ea1d",
  "1515886657613-9f3515b0c78f", "1522337360788-8a7132dd7d77", "1531123237250-c148fb330b40",
  "1542596844312-68177de654bb", "1552374196-cfe3e797bfdc", "1566492031773-4f4e44671857",
  "1571019613454-1cb2f99b2d8b", "1583394838333-acd7b84fccb0", "1594744803320-790dc88e36b9",
  "1601414021426-81e816981a3a", "1607746881032-4317a0bce6b6", "1614201897009-59c8b9a1e4b1",
  "1621596983776-5e0e5b5e5c5a", "1633332754792-ef228b38bca0", "1643726964555-df7081645d67",
  "1463453091187-7a22d0da93e9", "1502823403499-6a5850d5961e", "1524504388940-b1c1722653e1",
  "1539577195318-6eec6f69d878", "1544716277-ca5e3f4abd8c", "1554151228-14d9def656e4",
  "1560250097-0b93528c311a", "1573497014922-22f9104d6353", "1580618672325-06ec3a2d686e",
  "1595152431459-42c6ea2f2b0a", "1601454967363-7a8b2a2d2aab", "1618932260654-eee8297a8b83",
];

const LIFESTYLE = [
  "1515886657613-9f3515b0c78f", "1469334031218-e98da07f7c21", "1496442227776-8d4d0e62e6e9",
  "1502602898657-9a279301a088", "1515378799643-6cf0c0a14a01", "1522335783445-6a9f01e3a237",
  "1534528741775-53994a69daeb", "1542596844312-68177de654bb", "1558618666-fcd25c85cd64",
  "1565299624946-b28f40a0ae38", "1574623453956-475e0b6f0c0a", "1582719478250-c89cae4dc85b",
];

const COLORS = [
  "#FFD1E1", "#FFE9A8", "#E6DBFF", "#D8ECFF", "#CFF5E7", "#FFD9B0", "#FFE6CF",
  "#F3EEFF", "#FFF0F6", "#EEFAF4", "#FFF8E6", "#FCE7F3", "#E0F2FE", "#FDF2F8",
];

const EMOJIS = ["🌸", "✨", "💫", "🌷", "🦋", "☀️", "🌺", "💜", "🌿", "🫧", "🌙", "💖"];

const PROFILES = [
  ["Japan", "Tokyo", "Yuki Tanaka", 35.6762, 139.6503],
  ["South Korea", "Seoul", "Min-Ji Park", 37.5665, 126.978],
  ["China", "Shanghai", "Wei Chen", 31.2304, 121.4737],
  ["Taiwan", "Taipei", "Lin Mei-Hua", 25.033, 121.5654],
  ["Thailand", "Bangkok", "Nattaya Srisai", 13.7563, 100.5018],
  ["Vietnam", "Hanoi", "Lan Nguyen", 21.0285, 105.8542],
  ["Philippines", "Manila", "Isabella Reyes", 14.5995, 120.9842],
  ["Indonesia", "Jakarta", "Putri Wulandari", -6.2088, 106.8456],
  ["Malaysia", "Kuala Lumpur", "Aisha Rahman", 3.139, 101.6869],
  ["Singapore", "Singapore", "Sophie Lim", 1.3521, 103.8198],
  ["India", "Mumbai", "Priya Sundara", 19.076, 72.8777],
  ["Pakistan", "Karachi", "Zara Malik", 24.8607, 67.0011],
  ["Bangladesh", "Dhaka", "Anika Chowdhury", 23.8103, 90.4125],
  ["Sri Lanka", "Colombo", "Dilani Perera", 6.9271, 79.8612],
  ["Nepal", "Kathmandu", "Sunita Gurung", 27.7172, 85.324],
  ["UAE", "Dubai", "Layla Al-Hassan", 25.2048, 55.2708],
  ["Saudi Arabia", "Riyadh", "Noor Al-Farsi", 24.7136, 46.6753],
  ["Israel", "Tel Aviv", "Maya Cohen", 32.0853, 34.7818],
  ["Lebanon", "Beirut", "Rania Khoury", 33.8938, 35.5018],
  ["Turkey", "Istanbul", "Elif Yilmaz", 41.0082, 28.9784],
  ["Iran", "Tehran", "Sara Hosseini", 35.6892, 51.389],
  ["France", "Paris", "Camille Dubois", 48.8566, 2.3522],
  ["Italy", "Milan", "Giulia Romano", 45.4642, 9.19],
  ["Spain", "Barcelona", "Lucia Fernandez", 41.3851, 2.1734],
  ["Portugal", "Lisbon", "Beatriz Costa", 38.7223, -9.1393],
  ["Germany", "Berlin", "Hannah Weber", 52.52, 13.405],
  ["Netherlands", "Amsterdam", "Emma van Dijk", 52.3676, 4.9041],
  ["Belgium", "Brussels", "Charlotte Janssens", 50.8503, 4.3517],
  ["Switzerland", "Zurich", "Lara Meier", 47.3769, 8.5417],
  ["Austria", "Vienna", "Anna Hofer", 48.2082, 16.3738],
  ["Sweden", "Stockholm", "Elsa Lindstrom", 59.3293, 18.0686],
  ["Norway", "Oslo", "Ingrid Solberg", 59.9139, 10.7522],
  ["Denmark", "Copenhagen", "Freja Nielsen", 55.6761, 12.5683],
  ["Finland", "Helsinki", "Aino Virtanen", 60.1699, 24.9384],
  ["Poland", "Warsaw", "Zofia Kowalska", 52.2297, 21.0122],
  ["Czech Republic", "Prague", "Tereza Novak", 50.0755, 14.4378],
  ["Hungary", "Budapest", "Eszter Horvath", 47.4979, 19.0402],
  ["Greece", "Athens", "Elena Papadopoulos", 37.9838, 23.7275],
  ["Romania", "Bucharest", "Ioana Popescu", 44.4268, 26.1025],
  ["Ukraine", "Kyiv", "Oksana Shevchenko", 50.4501, 30.5234],
  ["Russia", "Moscow", "Anastasia Volkov", 55.7558, 37.6173],
  ["United Kingdom", "London", "Olivia Bennett", 51.5074, -0.1278],
  ["Ireland", "Dublin", "Siobhan Murphy", 53.3498, -6.2603],
  ["Iceland", "Reykjavik", "Katrin Arnadottir", 64.1466, -21.9426],
  ["United States", "New York", "Naomi Vale", 40.7128, -74.006],
  ["Canada", "Toronto", "Chloe MacLeod", 43.6532, -79.3832],
  ["Mexico", "Mexico City", "Valentina Morales", 19.4326, -99.1332],
  ["Brazil", "Sao Paulo", "Isabela Ferreira", -23.5505, -46.6333],
  ["Argentina", "Buenos Aires", "Martina Lopez", -34.6037, -58.3816],
  ["Colombia", "Bogota", "Camila Restrepo", 4.711, -74.0721],
  ["Chile", "Santiago", "Antonia Silva", -33.4489, -70.6693],
  ["Peru", "Lima", "Luciana Vargas", -12.0464, -77.0428],
  ["Venezuela", "Caracas", "Daniela Rojas", 10.4806, -66.9036],
  ["Ecuador", "Quito", "Paula Mendoza", -0.1807, -78.4678],
  ["Uruguay", "Montevideo", "Florencia Suarez", -34.9011, -56.1645],
  ["Cuba", "Havana", "Carmen Diaz", 23.1136, -82.3666],
  ["Puerto Rico", "San Juan", "Gabriela Ortiz", 18.4655, -66.1057],
  ["Jamaica", "Kingston", "Aaliyah Brown", 17.997, -76.7936],
  ["Costa Rica", "San Jose", "Mariana Solis", 9.9281, -84.0907],
  ["Panama", "Panama City", "Sofia Herrera", 8.9824, -79.5199],
  ["Australia", "Sydney", "Mia Thompson", -33.8688, 151.2093],
  ["New Zealand", "Auckland", "Grace Wilson", -36.8485, 174.7633],
  ["South Africa", "Cape Town", "Thandiwe Nkosi", -33.9249, 18.4241],
  ["Nigeria", "Lagos", "Amara Okonkwo", 6.5244, 3.3792],
  ["Kenya", "Nairobi", "Wanjiku Kamau", -1.2921, 36.8219],
  ["Ghana", "Accra", "Abena Mensah", 5.6037, -0.187],
  ["Morocco", "Casablanca", "Yasmina El Amrani", 33.5731, -7.5898],
  ["Egypt", "Cairo", "Nour Hassan", 30.0444, 31.2357],
  ["Ethiopia", "Addis Ababa", "Hanna Bekele", 9.032, 38.7469],
  ["Senegal", "Dakar", "Awa Diop", 14.7167, -17.4677],
  ["Tanzania", "Dar es Salaam", "Neema Mwangi", -6.7924, 39.2083],
  ["Rwanda", "Kigali", "Imani Uwase", -1.9403, 29.8739],
  ["Georgia", "Tbilisi", "Nino Beridze", 41.7151, 44.8271],
  ["Armenia", "Yerevan", "Lilit Hakobyan", 40.1792, 44.4991],
  ["Kazakhstan", "Almaty", "Aigerim Suleimen", 43.222, 76.8512],
  ["Uzbekistan", "Tashkent", "Dilnoza Karimova", 41.2995, 69.2401],
  ["Mongolia", "Ulaanbaatar", "Bolormaa Erdene", 47.8864, 106.9057],
  ["Cambodia", "Phnom Penh", "Sreymom Chan", 11.5564, 104.9282],
  ["Laos", "Vientiane", "Khamla Phommasone", 17.9757, 102.6331],
  ["Myanmar", "Yangon", "Thiri Aung", 16.8661, 96.1951],
  ["Hong Kong", "Hong Kong", "Chelsea Wong", 22.3193, 114.1694],
  ["Scotland", "Edinburgh", "Fiona MacDonald", 55.9533, -3.1883],
  ["Wales", "Cardiff", "Bronwen Evans", 51.4816, -3.1791],
  ["Croatia", "Zagreb", "Petra Horvat", 45.815, 15.9819],
  ["Serbia", "Belgrade", "Milica Jovanovic", 44.7866, 20.4489],
  ["Bulgaria", "Sofia", "Viktoria Ivanova", 42.6977, 23.3219],
  ["Slovakia", "Bratislava", "Zuzana Kralova", 48.1486, 17.1077],
  ["Slovenia", "Ljubljana", "Maja Novak", 46.0569, 14.5058],
  ["Estonia", "Tallinn", "Kadri Tamm", 59.437, 24.7536],
  ["Latvia", "Riga", "Liga Ozola", 56.9496, 24.1052],
  ["Lithuania", "Vilnius", "Greta Kazlauskas", 54.6872, 25.2797],
  ["Luxembourg", "Luxembourg", "Claire Muller", 49.6116, 6.1319],
  ["Malta", "Valletta", "Chiara Borg", 35.8989, 14.5146],
  ["Cyprus", "Nicosia", "Eleni Constantinou", 35.1856, 33.3823],
  ["Jordan", "Amman", "Rana Al-Khatib", 31.9454, 35.9284],
  ["Qatar", "Doha", "Fatima Al-Thani", 25.2854, 51.531],
  ["Kuwait", "Kuwait City", "Nadia Al-Sabah", 29.3759, 47.9774],
  ["Bahrain", "Manama", "Hala Al-Khalifa", 26.2285, 50.586],
  ["Oman", "Muscat", "Salma Al-Balushi", 23.588, 58.3829],
  ["Azerbaijan", "Baku", "Leyla Mammadova", 40.4093, 49.8671],
  ["Bolivia", "La Paz", "Sofia Quispe", -16.4897, -68.1193],
  ["Paraguay", "Asuncion", "Maria Benitez", -25.2637, -57.5759],
  ["Honduras", "Tegucigalpa", "Valeria Mejia", 14.0723, -87.1921],
  ["Guatemala", "Guatemala City", "Andrea Castillo", 14.6349, -90.5069],
  ["Dominican Republic", "Santo Domingo", "Rosa Jimenez", 18.4861, -69.9312],
  ["Trinidad", "Port of Spain", "Keisha Williams", 10.6918, -61.2225],
  ["Fiji", "Suva", "Moana Ratu", -18.1416, 178.4419],
  ["Hawaii", "Honolulu", "Leilani Kealoha", 21.3069, -157.8583],
];

const handleFrom = (name) => {
  const base = name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14);
  return `@${base || "echelon"}`;
};

const profiles = PROFILES.map(([country, city, name], i) => {
  const id = `w${String(i + 1).padStart(3, "0")}`;
  const portrait = PORTRAITS[i % PORTRAITS.length];
  const lifestyle = LIFESTYLE[i % LIFESTYLE.length];
  const score = Math.round((2.9 + (i % 20) * 0.1 + (i % 7) * 0.03) * 100) / 100;
  const birthYear = 1990 + (i % 12);
  const heightM = Math.round((1.58 + (i % 18) * 0.01) * 100) / 100;
  return {
    id,
    name,
    handle: handleFrom(name),
    country,
    city,
    lat: PROFILES[i][3],
    lng: PROFILES[i][4],
    emoji: EMOJIS[i % EMOJIS.length],
    color: COLORS[i % COLORS.length],
    score: Math.min(4.95, Math.max(2.85, score)),
    miles: Math.round((0.3 + (i % 25) * 0.08) * 100) / 100,
    lensOn: i % 5 !== 0,
    lensX: 15 + (i * 7) % 70,
    lensY: 20 + (i * 11) % 60,
    onboarded: true,
    birthYear,
    heightM,
    gender: "female",
    bio: `${city} · ${country} · style, travel & soft light`,
    avatarUrl: UNSPLASH(portrait),
    postUrl: UNSPLASH(lifestyle, "&h=1350"),
    uid: `ID-${4800 + i}`,
  };
});

const captions = [
  "golden hour mood ✨", "soft morning light", "weekend wanderlust",
  "quiet confidence", "city lights & calm", "slow living era",
  "petals & coffee", "sun-kissed moments", "effortless glow",
];

const posts = profiles.map((p, i) => ({
  id: `wp_${p.id}`,
  author: p.id,
  caption: `${p.city} · ${captions[i % captions.length]}`,
  mediaUrl: p.postUrl,
  mediaType: "image",
  source: "echelon",
  scene: [p.color, "#FFE9A8"],
  emoji: p.emoji,
  likes: 40 + (i * 17) % 2400,
  premium: i % 9 === 0,
  ts: Date.now() - (3600000 * (2 + (i % 72))),
}));

const js = `/**
 * 100 international women test profiles (generated by scripts/gen-world-profiles.mjs).
 * Do not edit by hand; re-run the generator instead.
 */
export const WORLD_TEST_PROFILES = ${JSON.stringify(profiles, null, 2)};

export const WORLD_TEST_POSTS = ${JSON.stringify(posts, null, 2)};

export function worldProfilesAsContacts() {
  return WORLD_TEST_PROFILES.map((p) => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    emoji: p.emoji,
    color: p.color,
    score: p.score,
    miles: p.miles,
    lensOn: p.lensOn,
    lensX: p.lensX,
    lensY: p.lensY,
    lat: p.lat,
    lng: p.lng,
    uid: p.uid,
    onboarded: true,
    avatarUrl: p.avatarUrl,
    birthYear: p.birthYear,
    heightM: p.heightM,
    gender: p.gender,
    bio: p.bio,
    country: p.country,
    city: p.city,
  }));
}

export function worldProfileFeedPosts(now = Date.now()) {
  return WORLD_TEST_POSTS.map((p, i) => ({
    ...p,
    ts: now - (3600000 * (2 + (i % 72))),
  }));
}

export function mergeWorldProfilesIntoContacts(contacts = []) {
  const seen = new Set(contacts.map((c) => c.id));
  return [...contacts, ...worldProfilesAsContacts().filter((c) => !seen.has(c.id))];
}

export function mergeWorldPostsIntoFeed(feed = [], now = Date.now()) {
  const seen = new Set(feed.map((p) => p.id));
  return [...feed, ...worldProfileFeedPosts(now).filter((p) => !seen.has(p.id))];
}
`;

writeFileSync(join(process.cwd(), "world-profiles.js"), js, "utf8");
writeFileSync(
  join(process.cwd(), "api", "world-profiles.json"),
  JSON.stringify({ profiles, posts }, null, 0),
  "utf8",
);
console.log(`Wrote world-profiles.js and api/world-profiles.json with ${profiles.length} profiles`);
