/**
 * Curated demo session for App Store screenshots only.
 * Activate with ?screenshotDemo=1 or localStorage echelon-screenshot-demo=1
 */

export const SCREENSHOT_DEMO_USER_ID = "demo_alex";

const APP_BASE = "/app/";
const asset = (file) => `${APP_BASE}screenshot-assets/${file}`;

const U = (id, name, handle, score, emoji, color, bio, avatarFile) => ({
  id,
  name,
  handle,
  score,
  emoji,
  color,
  bio,
  avatarUrl: avatarFile ? asset(avatarFile) : null,
  lensOn: true,
  miles: 0.4 + (id.charCodeAt(5) % 8) * 0.1,
});

export function isScreenshotDemoMode() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("screenshotDemo") === "1") return true;
    return localStorage.getItem("echelon-screenshot-demo") === "1";
  } catch {
    return false;
  }
}

export function buildScreenshotDemoSession() {
  const now = Date.now();
  const me = U(
    SCREENSHOT_DEMO_USER_ID,
    "Alex Rivera",
    "@alexrivera",
    4.38,
    "✨",
    "#E8DEFF",
    "Designer · Lisbon · building a life worth measuring",
    "port-workspace.jpg",
  );
  me.website = "echelon.rsvp";
  me.onboarded = true;
  me.authMethod = "apple";
  me.birthYear = 1995;
  me.heightM = 1.75;
  me.gender = "male";

  const contacts = [
    me,
    U("demo_sofia", "Sofia Mendes", "@sofiamendes", 4.72, "🌸", "#FFE4F0", "Photographer · golden hours & slow travel", "story-sofia.jpg"),
    U("demo_luca", "Luca Ferreira", "@lucaferreira", 4.41, "🎧", "#DFF4FF", "Producer · night runs & city lights", "story-luca.jpg"),
    U("demo_maya", "Maya Chen", "@mayachen", 4.68, "🌿", "#E5F8EE", "Wellness · matcha mornings · quiet wins", "story-maya.jpg"),
    U("demo_noah", "Noah Brooks", "@noahbrooks", 4.19, "📷", "#FFF3D6", "Street style · lavender season", "feed-style.jpg"),
    U("demo_elena", "Elena Costa", "@elenacosta", 4.55, "☀️", "#FFECD9", "Soft linen · soft light · soft mornings", "story-elena.jpg"),
    U("demo_isabella", "Isabella Voss", "@isabellavoss", 4.61, "🌙", "#F3E8FF", "Art curator · weekend hikes", "feed-linen.jpg"),
    U("demo_julian", "Julian Park", "@julianpark", 4.48, "🎹", "#E0F2FE", "Night photography · vinyl nights", "feed-city.jpg"),
    U("demo_amara", "Amara Okonkwo", "@amaraok", 4.73, "💫", "#FCE7F3", "Design student · mindful mornings", "feed-matcha.jpg"),
  ];

  const sparkProfiles = [
    { id: "demo_isabella", photo: "feed-linen.jpg", bio: "Weekend art walks & espresso", age: 28, heightM: 1.7, gender: "female" },
    { id: "demo_julian", photo: "feed-city.jpg", bio: "Night photography & vinyl", age: 31, heightM: 1.84, gender: "male" },
    { id: "demo_amara", photo: "feed-matcha.jpg", bio: "Mindful mornings · design student", age: 26, heightM: 1.65, gender: "female" },
  ];

  const mkPost = (id, author, caption, imageFile, extra = {}) => ({
    id,
    author,
    caption,
    mediaUrl: asset(imageFile),
    mediaType: "image",
    source: "echelon",
    scene: extra.scene || ["#FFF4FA", "#EFE9FF"],
    emoji: extra.emoji || "✨",
    ts: now - (extra.agoMs || 3600000),
    likes: extra.likes ?? 240,
    avgRating: extra.avgRating ?? 4.5,
    ratingCount: extra.ratings ?? 38,
    musicTitle: extra.music || null,
    location: extra.location || null,
    tags: extra.tags || [],
  });

  const feed = [
    mkPost("shot_feed_1", "demo_sofia", "Golden hour on the Tagus 🌅", "feed-golden.jpg", {
      agoMs: 1800000,
      likes: 412,
      avgRating: 4.7,
      ratings: 56,
      music: "Sofia · Golden Hour",
      location: "Lisbon",
      scene: ["#FFF8F0", "#FFE8D6"],
      emoji: "🌅",
    }),
    mkPost("shot_feed_2", "demo_maya", "Slow morning ritual: matcha, journal, breathe.", "feed-matcha.jpg", {
      agoMs: 5400000,
      likes: 318,
      avgRating: 4.6,
      ratings: 44,
      scene: ["#F0FFF4", "#E8F5E9"],
      emoji: "🌿",
      location: "Chiado",
    }),
    mkPost("shot_feed_3", "demo_luca", "Night ride through the city lights", "feed-city.jpg", {
      agoMs: 7200000,
      likes: 276,
      avgRating: 4.4,
      ratings: 31,
      music: "Luca · Midnight Drive",
      scene: ["#0F172A", "#312E81"],
      emoji: "🎧",
    }),
    mkPost("shot_feed_4", "demo_elena", "Soft linen, soft light, soft score.", "feed-linen.jpg", {
      agoMs: 10800000,
      likes: 198,
      avgRating: 4.5,
      ratings: 29,
      emoji: "☀️",
      scene: ["#FFFBF5", "#FDE8D0"],
    }),
    mkPost("shot_feed_5", "demo_noah", "Fit check · lavender season", "feed-style.jpg", {
      agoMs: 14400000,
      likes: 521,
      avgRating: 4.3,
      ratings: 67,
      location: "Príncipe Real",
    }),
    mkPost("shot_port_1", SCREENSHOT_DEMO_USER_ID, "Portfolio day · new layout study", "port-workspace.jpg", {
      agoMs: 864000000,
      likes: 164,
      avgRating: 4.5,
      ratings: 22,
    }),
    mkPost("shot_port_2", SCREENSHOT_DEMO_USER_ID, "Workspace mood", "port-gallery.jpg", {
      agoMs: 900000000,
      likes: 142,
      avgRating: 4.4,
      ratings: 19,
    }),
    mkPost("shot_port_3", SCREENSHOT_DEMO_USER_ID, "Weekend gallery walk", "feed-golden.jpg", {
      agoMs: 950000000,
      likes: 189,
      avgRating: 4.6,
      ratings: 24,
    }),
    mkPost("shot_feed_6", "demo_isabella", "Gallery opening · soft neon & quiet applause", "feed-linen.jpg", {
      agoMs: 43200000,
      likes: 287,
      avgRating: 4.6,
      ratings: 41,
      location: "Baixa",
      emoji: "🌙",
    }),
  ];

  const byId = Object.fromEntries(contacts.map((c) => [c.id, c]));
  const sparkDeck = sparkProfiles.map((sp) => {
    const c = byId[sp.id];
    const url = asset(sp.photo);
    return {
      ...c,
      birthYear: new Date().getFullYear() - sp.age,
      heightM: sp.heightM,
      gender: sp.gender,
      age: sp.age,
      photos: [{ url, type: "image", caption: sp.bio, scene: [c.color || "#FFE0EC", "#fff"] }],
    };
  });

  const storyTtl = 20 * 3600000;
  const mkStory = (id, author, imageFile, agoMs) => ({
    id,
    author,
    expiresAt: now + storyTtl,
    items: [{
      id: `${id}a`,
      mediaUrl: asset(imageFile),
      mediaType: "image",
      ts: now - agoMs,
    }],
    ts: now - agoMs,
  });

  const stories = [
    mkStory("shot_story_1", "demo_sofia", "story-sofia.jpg", 3600000),
    mkStory("shot_story_2", "demo_maya", "story-maya.jpg", 7200000),
    mkStory("shot_story_3", "demo_luca", "story-luca.jpg", 5400000),
    mkStory("shot_story_4", "demo_elena", "story-elena.jpg", 4800000),
  ];

  const friends = ["demo_sofia", "demo_luca", "demo_maya", "demo_noah", "demo_elena"];

  const chatInbox = {
    demo_sofia: { lastTs: now - 420000, lastPreview: "That sunset post is stunning 🌅", lastFrom: "demo_sofia", unread: 1 },
    demo_luca: { lastTs: now - 3600000, lastPreview: "See you at the meetup tonight?", lastFrom: "me", unread: 0 },
    demo_maya: { lastTs: now - 7200000, lastPreview: "🎤 Voice message", lastFrom: "demo_maya", unread: 0 },
    demo_noah: { lastTs: now - 86400000, lastPreview: "📷 Photo", lastFrom: "me", unread: 0 },
    demo_elena: { lastTs: now - 172800000, lastPreview: "Love the linen shot ☀️", lastFrom: "demo_elena", unread: 0 },
  };

  const nearbyUsers = contacts.filter((c) => c.id !== SCREENSHOT_DEMO_USER_ID).map((c) => ({
    ...c,
    miles: c.miles,
    lensOn: true,
  }));

  return {
    liveData: false,
    user: me,
    contacts,
    gatherings: [],
    feed,
    friends,
    rsvps: [],
    history: [
      { t: now - 86400000 * 30, s: 4.05 },
      { t: now - 86400000 * 21, s: 4.12 },
      { t: now - 86400000 * 14, s: 4.22 },
      { t: now - 86400000 * 7, s: 4.31 },
      { t: now, s: 4.38 },
    ],
    notifications: [],
    settings: { lens: true, sound: false },
    stories,
    chatInbox,
    sparkDeck,
    nearbyUsers,
    proximityScan: true,
    contactMiles: Object.fromEntries(nearbyUsers.map((c) => [c.id, c.miles])),
    strangerRatings: true,
    onboarded: true,
  };
}
