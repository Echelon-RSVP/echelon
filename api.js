const TOKEN_KEY = "echelon-token";



const API_BASE =

  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||

  "/api/v1";



async function req(path, opts = {}) {

  const token = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const headers = { ...(opts.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  let body = opts.body;

  if (body != null && !(body instanceof FormData)) {

    headers["Content-Type"] = "application/json";

    body = JSON.stringify(body);

  }

  const timeoutMs = opts.timeoutMs ?? 0;
  const { timeoutMs: _drop, ...fetchOpts } = opts;
  const ctrl = timeoutMs > 0 ? new AbortController() : null;
  const to = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOpts,
      headers,
      body,
      signal: ctrl ? ctrl.signal : fetchOpts.signal,
    });
  } finally {
    if (to) clearTimeout(to);
  }

  let data = {};

  try {

    data = await res.json();

  } catch {

    /* non-json */

  }

  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");

  return data;

}



export function getToken() {

  return localStorage.getItem(TOKEN_KEY);

}



export function setToken(token) {

  if (token) localStorage.setItem(TOKEN_KEY, token);

  else localStorage.removeItem(TOKEN_KEY);

}



/** Resolve relative upload/API media paths to absolute URLs. */
export function mediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const base = typeof window !== "undefined" ? window.location.origin : "https://echelon.rsvp";
  return base + (url.startsWith("/") ? url : "/" + url);
}



export const api = {

  health: () => req("/health"),

  authConfig: () => req("/auth/config"),

  authApple: ({ idToken, name, email }) =>

    req("/auth/apple", { method: "POST", body: { idToken, name, email } }),

  authGoogle: (payload) =>
    req("/auth/google", {
      method: "POST",
      body: typeof payload === "string" ? { idToken: payload } : payload,
    }),

  authRegister: (payload) => req("/auth/register", { method: "POST", body: payload }),

  authLogin: (payload) => req("/auth/login", { method: "POST", body: payload }),

  authMagicSend: (email) => req("/auth/magic/send", { method: "POST", body: { email } }),

  authMagicVerify: (token) => req("/auth/magic/verify", { method: "POST", body: { token } }),

  appleConfig: () => req("/auth/apple/config"),

  logout: () => req("/auth/logout", { method: "POST" }),

  bootstrap: () => req("/bootstrap", { timeoutMs: 15000 }),

  me: () => req("/me"),

  patchMe: (patch) => req("/me", { method: "PATCH", body: patch }),

  onboard: (image) => req("/onboard", { method: "POST", body: { image } }),

  faceScanRetry: (image) => req("/me/face-retry", { method: "POST", body: { image } }),

  rate: (targetId, stars, tag, context, postId = null) =>
    req("/ratings", { method: "POST", body: { targetId, stars, tag, context, postId } }),

  ratingsReceived: (since = 0) => req(`/ratings/received?since=${since}`),

  notifications: (since = 0) => req(`/notifications?since=${since}`),

  friends: () => req("/friends"),

  friendRequests: () => req("/friends/requests"),

  sendFriendRequest: (friendId) => req("/friends/requests", { method: "POST", body: { friendId } }),

  acceptFriendRequest: (requestId) => req(`/friends/requests/${requestId}/accept`, { method: "POST" }),

  declineFriendRequest: (requestId) => req(`/friends/requests/${requestId}/decline`, { method: "POST" }),

  removeFriend: (friendId) => req(`/friends/${friendId}`, { method: "DELETE" }),

  instagramAuthUrl: (importMode = "both") =>
    req(`/instagram/auth?importMode=${encodeURIComponent(importMode)}`),

  eventGuests: (eventId) => req(`/events/${encodeURIComponent(eventId)}/guests`),

  instagramSync: () => req("/instagram/sync", { method: "POST" }),

  instagramSetSyncFeed: (syncFeed) => req("/instagram/sync-feed", { method: "PATCH", body: { syncFeed } }),

  instagramDisconnect: () => req("/instagram/disconnect", { method: "POST" }),

  disconnectGoogle: () => req("/settings/disconnect-google", { method: "POST" }),

  blockUser: (userId) => req(`/users/${userId}/block`, { method: "POST" }),

  unblockUser: (userId) => req(`/users/${userId}/block`, { method: "DELETE" }),

  userProfile: (userId) => req(`/users/${userId}`),

  event: (eventId) => req(`/events/${eventId}`),

  posts: () => req("/posts"),

  createPost: (post) => req("/posts", { method: "POST", body: post }),
  deletePost: (postId) => req(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" }),
  likePost: (postId) => req(`/posts/${encodeURIComponent(postId)}/like`, { method: "POST" }),
  unlikePost: (postId) => req(`/posts/${encodeURIComponent(postId)}/like`, { method: "DELETE" }),

  createStory: (story) => req("/stories", { method: "POST", body: story }),

  gatherings: (params = {}) => {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    if (params.sort) q.set("sort", params.sort);
    if (params.type) q.set("type", params.type);
    if (params.kind) q.set("kind", params.kind);
    if (params.maxMiles != null) q.set("maxMiles", String(params.maxMiles));
    const qs = q.toString();
    return req(`/events${qs ? `?${qs}` : ""}`);
  },

  createEvent: (payload) => req("/events", { method: "POST", body: payload }),

  updateEvent: (eventId, payload) => req(`/events/${eventId}`, { method: "PATCH", body: payload }),

  deleteEvent: (eventId) => req(`/events/${eventId}`, { method: "DELETE" }),

  rsvp: (eventId) => req("/events/rsvp", { method: "POST", body: { eventId } }),

  messages: (contactId, opts = {}) => {
    const q = opts.markRead === false ? "?markRead=0" : "";
    return req(`/messages/${contactId}${q}`);
  },

  chatTyping: (contactId) => req(`/messages/${contactId}/typing`),

  setChatTyping: (contactId) => req(`/messages/${contactId}/typing`, { method: "POST" }),

  sendMessage: (contactId, msg) => req(`/messages/${contactId}`, { method: "POST", body: msg }),

  markChatRead: (contactId) => req(`/messages/${contactId}/read`, { method: "PATCH" }),

  deleteChat: (contactId) => req(`/messages/${contactId}`, { method: "DELETE" }),

  deleteMessage: (contactId, msgId) => req(`/messages/${contactId}/${msgId}`, { method: "DELETE" }),

  consumeMessage: (contactId, msgId) => req(`/messages/${contactId}/${msgId}/consume`, { method: "PATCH" }),

  chats: () => req("/chats"),

  reactMessage: (contactId, msgId, emoji) =>

    req(`/messages/${contactId}/${msgId}/react`, { method: "PATCH", body: { emoji } }),

  patchSettings: (patch) => req("/settings", { method: "PATCH", body: patch }),

  deleteAccount: () => req("/me", { method: "DELETE" }),

  updatePresence: ({ lat, lng, lensOn, hideMapLocation }) =>
    req("/presence", { method: "POST", body: { lat, lng, lensOn, hideMapLocation: !!hideMapLocation } }),

  nearby: (radiusMiles = 1, lensOnly = false) =>
    req(`/presence/nearby?radiusMiles=${radiusMiles}&lensOnly=${lensOnly ? 1 : 0}`),

  searchUsers: (q) => req(`/users/search?q=${encodeURIComponent(q)}`),

  sparkDeck: () => req("/spark/deck"),

  sparkPreferences: () => req("/spark/preferences"),

  patchSparkPreferences: (patch) =>
    req("/spark/preferences", { method: "PATCH", body: patch }),

  friendsMap: () => req("/friends/map"),

  sparkMatches: () => req("/spark/matches"),

  sparkLikes: () => req("/spark/likes"),

  sparkSwipe: (targetId, action = "like") =>
    req("/spark/swipe", { method: "POST", body: { targetId, action } }),

  sparkCan: (targetId) => req(`/spark/can?targetId=${encodeURIComponent(targetId)}`),

  canRate: (targetId, context = "proximity", postId = null) => {
    const q = new URLSearchParams({ targetId, context });
    if (postId) q.set("postId", postId);
    return req(`/ratings/can?${q.toString()}`);
  },

  upload: (file) => {

    const fd = new FormData();

    fd.append("file", file);

    return req("/upload", { method: "POST", body: fd });

  },

};



export async function tryBootstrap() {

  if (!getToken()) return null;

  return api.bootstrap();

}


