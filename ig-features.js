/**
 * Instagram-parity feature storage and helpers for Echelon.
 * Persists to localStorage; merges into app state via LOAD_IG_EXTRAS / SYNC_IG_EXTRAS.
 */

export const IG_KEY = "echelon-ig-extras";

export const PROFILE_CATEGORIES = [
  "Creator",
  "Business",
  "Artist",
  "Musician",
  "Personal blog",
  "Product/service",
  "Public figure",
];

/** Curated meme / reaction GIFs (Giphy CDN, 200w). Shown instantly while search loads. */
export const STORY_STICKER_PACK = [
  "https://media.giphy.com/media/ICOgUjp0TOldx/200w.gif",
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif",
  "https://media.giphy.com/media/26BRuo6sGilxzhrwY/200w.gif",
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/200w.gif",
  "https://media.giphy.com/media/5GoVLqeAIo5PiF29GZ/200w.gif",
  "https://media.giphy.com/media/13CoXDiaCcCoyk/200w.gif",
  "https://media.giphy.com/media/l378khQemvdwqcmpy/200w.gif",
  "https://media.giphy.com/media/3o6Zt481isNVvbBIpa/200w.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200w.gif",
  "https://media.giphy.com/media/3o7TKSjRrfIPReNdbO/200w.gif",
  "https://media.giphy.com/media/l0MYGbRrX3k3aMsfC/200w.gif",
  "https://media.giphy.com/media/l3V0BJKv6azV2zNYI/200w.gif",
];

export const CUSTOM_STICKERS_KEY = "echelon-custom-stickers";

export function loadCustomStickers() {
  try {
    const raw = localStorage.getItem(CUSTOM_STICKERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((u) => typeof u === "string" && u.startsWith("data:")) : [];
  } catch {
    return [];
  }
}

export function addCustomSticker(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:")) return loadCustomStickers();
  const prev = loadCustomStickers();
  const next = [dataUrl, ...prev.filter((u) => u !== dataUrl)].slice(0, 24);
  try {
    localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(next));
  } catch { /* quota */ }
  return next;
}

export const STORY_STICKER_TYPES = [
  "poll",
  "question",
  "quiz",
  "emoji_slider",
  "countdown",
  "link",
  "location",
  "mention",
  "hashtag",
  "music",
];

/** Royalty-free / CC music via Jamendo (set VITE_JAMENDO_CLIENT_ID) or Audius fallback. */
export async function searchFreeMusic(query = "", limit = 20) {
  const q = (query || "").trim();
  const clientId = typeof import.meta !== "undefined" && import.meta.env?.VITE_JAMENDO_CLIENT_ID;
  if (clientId) {
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        format: "json",
        limit: String(limit),
        audioformat: "mp32",
        include: "musicinfo",
      });
      if (q) params.set("search", q);
      else params.set("tags", "chill+electronic");
      const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`);
      const data = await res.json();
      const rows = (data.results || []).map((t) => ({
        id: `jam_${t.id}`,
        title: t.name,
        artist: t.artist_name,
        preview: t.audio || t.audiodownload,
        license: t.license_ccurl ? "CC" : "Jamendo",
      })).filter((t) => t.preview);
      if (rows.length) return rows;
    } catch { /* fallback */ }
  }
  try {
    const path = q.length > 1
      ? `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}`
      : `https://api.audius.co/v1/tracks/trending?limit=${limit}`;
    const res = await fetch(path);
    const data = await res.json();
    const rows = (data.data || []).map((t) => ({
      id: `aud_${t.id}`,
      title: t.title,
      artist: t.user?.name || "Audius",
      preview: `https://api.audius.co/v1/tracks/${t.id}/stream`,
    }));
    if (rows.length) return rows;
  } catch { /* fallback */ }
  if (!q) return ECHELON_AUDIO_LIBRARY.slice(0, limit);
  const needle = q.toLowerCase();
  return ECHELON_AUDIO_LIBRARY.filter((t) => {
    const hay = `${t.title} ${t.artist}`.toLowerCase();
    return hay.includes(needle);
  });
}

export const ECHELON_AUDIO_LIBRARY = [
  { id: "a1", title: "Sunrise Drive", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", uses: 12400 },
  { id: "a2", title: "Neon Pulse", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", uses: 8900 },
  { id: "a3", title: "Soft Focus", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", uses: 15200 },
  { id: "a4", title: "City Lights", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", uses: 6700 },
  { id: "a5", title: "Golden Hour", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", uses: 21000 },
  { id: "a6", title: "Midnight Run", artist: "Echelon Audio", preview: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", uses: 4300 },
];

export function defaultAlgorithmTopics() {
  return ["Travel", "Food", "Music"];
}

export function defaultIgExtras() {
  return {
    profile: { bio: "", website: "", category: "", links: [], aiLabel: false },
    collections: [
      { id: "col_all", name: "All posts", postIds: [], icon: "📌" },
      { id: "col_recipes", name: "Recipes", postIds: [], icon: "🍳" },
      { id: "col_travel", name: "Travel", postIds: [], icon: "✈️" },
    ],
    highlights: [],
    hiddenPosts: [],
    closeFriends: [],
    muted: [],
    restricted: [],
    blockedWords: [],
    pinnedChats: [],
    groupChats: [],
    broadcastChannels: [],
    postAnalytics: {},
    storyInteractions: {},
    scheduledPosts: [],
    twoFactorEnabled: false,
    accountStatus: { violations: 0, restrictions: [] },
    blendFeeds: {},
    exploreSeen: [],
    pinnedPosts: [],
    pinnedComments: {},
    algorithmTopics: defaultAlgorithmTopics(),
    instants: [],
    subscriptions: { enabled: false, price: 4.99, subscribers: [] },
    trialReels: [],
    earlyAccessReels: [],
    leadForms: [],
    mediaMentions: [],
    shopTags: [],
  };
}

export function loadIgExtras() {
  try {
    const raw = localStorage.getItem(IG_KEY);
    if (!raw) return defaultIgExtras();
    return { ...defaultIgExtras(), ...JSON.parse(raw) };
  } catch {
    return defaultIgExtras();
  }
}

export function saveIgExtras(extras) {
  try {
    localStorage.setItem(IG_KEY, JSON.stringify(extras));
  } catch { /* ignore */ }
}

export function patchIgExtras(patch) {
  const prev = loadIgExtras();
  const next = { ...prev, ...patch };
  saveIgExtras(next);
  return next;
}

export function saveToCollection(collectionId, postId) {
  const extras = loadIgExtras();
  const collections = extras.collections.map((c) => {
    if (c.id !== collectionId) return c;
    const postIds = c.postIds.includes(postId) ? c.postIds : [...c.postIds, postId];
    return { ...c, postIds };
  });
  return patchIgExtras({ collections });
}

export function removeFromAllCollections(postId) {
  const extras = loadIgExtras();
  const collections = extras.collections.map((c) => ({
    ...c,
    postIds: c.postIds.filter((id) => id !== postId),
  }));
  return patchIgExtras({ collections });
}

export function postsInCollection(extras, collectionId) {
  const col = extras.collections.find((c) => c.id === collectionId);
  return col?.postIds || [];
}

export function allSavedPostIds(extras) {
  const ids = new Set();
  extras.collections.forEach((c) => c.postIds.forEach((id) => ids.add(id)));
  return ids;
}

export function addHighlight(extras, { title, coverUrl, items = [] }) {
  const highlights = [
    ...extras.highlights,
    { id: `hl_${Date.now()}`, title, coverUrl, items, ts: Date.now() },
  ];
  return patchIgExtras({ highlights });
}

export function updateAlbum(extras, albumId, patch) {
  const highlights = extras.highlights.map((h) =>
    h.id === albumId ? { ...h, ...patch } : h
  );
  return patchIgExtras({ highlights });
}

export function addAlbumItems(extras, albumId, newItems) {
  const highlights = extras.highlights.map((h) => {
    if (h.id !== albumId) return h;
    const existing = h.items || [];
    const merged = [...existing];
    newItems.forEach((item) => {
      if (!merged.some((x) => x.type === item.type && x.id === item.id)) merged.push(item);
    });
    const coverUrl = h.coverUrl || newItems[0]?.mediaUrl || h.coverUrl;
    return { ...h, items: merged, coverUrl };
  });
  return patchIgExtras({ highlights });
}

export function removeAlbumItem(extras, albumId, itemType, itemId) {
  const highlights = extras.highlights.map((h) => {
    if (h.id !== albumId) return h;
    const items = (h.items || []).filter((x) => !(x.type === itemType && x.id === itemId));
    const coverUrl = items[0]?.mediaUrl || null;
    return { ...h, items, coverUrl };
  });
  return patchIgExtras({ highlights });
}

export function recordMediaMention(extras, mention) {
  const mediaMentions = [
    { ...mention, id: mention.id || `men_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: mention.ts || Date.now(), removed: false },
    ...(extras.mediaMentions || []).filter((m) => !(m.postId === mention.postId && m.userId === mention.userId && !m.removed)),
  ];
  return patchIgExtras({ mediaMentions });
}

export function removeMediaMention(extras, mentionId, userId) {
  const mediaMentions = (extras.mediaMentions || []).map((m) => (
    m.id === mentionId && m.userId === userId ? { ...m, removed: true } : m
  ));
  return patchIgExtras({ mediaMentions });
}

export function mentionsForUser(extras, userId) {
  return (extras.mediaMentions || []).filter((m) => m.userId === userId && !m.removed);
}

export function hidePost(postId) {
  const extras = loadIgExtras();
  const hiddenPosts = [...new Set([...(extras.hiddenPosts || []), postId])];
  return patchIgExtras({ hiddenPosts });
}

export function recordPostAnalytics(postId, event) {
  const extras = loadIgExtras();
  const prev = extras.postAnalytics[postId] || {
    reach: 0, impressions: 0, likes: 0, comments: 0, saves: 0, shares: 0, profileVisits: 0,
  };
  const next = { ...prev, [event]: (prev[event] || 0) + 1, impressions: prev.impressions + 1 };
  return patchIgExtras({ postAnalytics: { ...extras.postAnalytics, [postId]: next } });
}

export function getPostAnalytics(postId) {
  const extras = loadIgExtras();
  return extras.postAnalytics[postId] || {
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    profileVisits: 0,
  };
}

export function voteStoryPoll(storyId, overlayId, option) {
  const extras = loadIgExtras();
  const key = `${storyId}:${overlayId}`;
  const prev = extras.storyInteractions[key] || { votes: { a: 0, b: 0 } };
  const votes = { ...prev.votes, [option]: (prev.votes[option] || 0) + 1 };
  return patchIgExtras({
    storyInteractions: { ...extras.storyInteractions, [key]: { ...prev, votes, voted: true } },
  });
}

export function getStoryPollVotes(storyId, overlayId) {
  const extras = loadIgExtras();
  return extras.storyInteractions[`${storyId}:${overlayId}`]?.votes || { a: 0, b: 0 };
}

export function filterHiddenWords(text, words) {
  if (!text || !words?.length) return text;
  let out = text;
  words.forEach((w) => {
    if (!w?.trim()) return;
    const re = new RegExp(w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "•••");
  });
  return out;
}

export const REEL_MAX_SEC = 60;

export function isReelPost(post) {
  if (!post || post.fromStory) return false;
  if (post.kind === "reel" || post.isReel) return true;
  if (post.mediaType === "video" && post.durationSec != null && post.durationSec <= REEL_MAX_SEC) {
    return post.kind !== "post" && post.kind !== "feed";
  }
  return false;
}

export function isFeedPost(post) {
  return post && !post.fromStory && !isReelPost(post);
}

export function buildExploreGrid(posts, users, now = Date.now()) {
  const recent = [...posts].filter((p) => now - (p.ts || 0) < 604800000);
  const trending = recent
    .filter((p) => isFeedPost(p))
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 24);
  const reels = recent
    .filter((p) => isReelPost(p) || (p.mediaType === "video" && (p.durationSec ?? 30) <= REEL_MAX_SEC))
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || (b.likes || 0) - (a.likes || 0))
    .slice(0, 18);
  const suggested = users.filter((u) => u.id !== "me").slice(0, 8);
  return { trending, reels, suggested };
}

export function defaultBroadcastChannel(name = "Updates") {
  return {
    id: `bc_${Date.now()}`,
    name,
    subscribers: [],
    posts: [],
    ts: Date.now(),
  };
}

export function defaultGroupChat(name, memberIds) {
  return {
    id: `gc_${Date.now()}`,
    name,
    members: memberIds,
    lastTs: Date.now(),
    messages: [],
  };
}

export function createStorySticker(type, tr) {
  const id = `stk_${Date.now()}`;
  const base = { id, type, x: 50, y: 55, scale: 1 };
  switch (type) {
    case "poll":
      return { ...base, question: tr("stickers.pollDefault"), optionA: "Yes", optionB: "No", votes: { a: 0, b: 0 } };
    case "question":
      return { ...base, prompt: tr("stickers.questionDefault"), answers: [] };
    case "quiz":
      return { ...base, question: tr("stickers.quizDefault"), options: ["A", "B", "C"], correct: 0 };
    case "emoji_slider":
      return { ...base, prompt: tr("stickers.sliderDefault"), emoji: "🔥", value: 72 };
    case "countdown":
      return { ...base, label: tr("stickers.countdownDefault"), targetTs: Date.now() + 86400000 * 3 };
    case "link":
      return { ...base, url: "https://echelon.rsvp", label: tr("stickers.linkDefault") };
    case "hashtag":
      return { ...base, tag: "#echelon" };
    case "mention":
      return { ...base, type: "tag", handle: "you", name: "You" };
    case "location":
      return { ...base, type: "location", text: tr("stickers.locationDefault") };
    case "music":
      return { ...base, trackId: ECHELON_AUDIO_LIBRARY[0].id, title: ECHELON_AUDIO_LIBRARY[0].title };
    default:
      return { ...base, type: "text", text: "" };
  }
}

export function reelEditorTools() {
  return [
    { id: "audio", label: "Audio" },
    { id: "voiceover", label: "Voiceover" },
    { id: "effects", label: "Effects" },
    { id: "greenscreen", label: "Green screen" },
    { id: "speed", label: "Speed" },
    { id: "timer", label: "Timer" },
    { id: "align", label: "Align" },
    { id: "remix", label: "Remix" },
  ];
}
