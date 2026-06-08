# Multi-Auth Integration Guide

Portable pattern for **Sign in with Apple** (including silent sign-in on App Store builds), **Google / Gmail**, and **email + password** (register + login).

Replace placeholders:

| Placeholder | Example |
|-------------|---------|
| `YOUR_API_BASE` | `https://api.yourapp.com/v1` |
| `YOUR_WEB_ORIGIN` | `https://yourapp.com` |
| `YOUR_APP_BUNDLE_ID` | `com.yourcompany.yourapp` |
| `YOUR_APPLE_SERVICES_ID` | `com.yourcompany.yourapp.web` |
| `YOUR_GOOGLE_WEB_CLIENT_ID` | `123456789-abc.apps.googleusercontent.com` |
| `YOUR_GOOGLE_IOS_CLIENT_ID` | `123456789-ios.apps.googleusercontent.com` |

---

## 1. Architecture

```
┌─────────────┐     ID token (JWT)      ┌─────────────┐
│   Client    │ ──────────────────────► │   Your API  │
│ Web / iOS   │     or email+password   │   (verify)  │
└─────────────┘                         └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  users +    │
                                        │  sessions   │
                                        └─────────────┘
```

**Rules:**

1. The client never trusts tokens locally. It sends credentials to **your** API.
2. Google and Apple both return an **ID token (JWT)**. Your server verifies signature and `aud` (audience).
3. Passwords are hashed on the server with `password_hash()` (PHP) or `bcrypt` (Node).
4. After success, API returns `{ token, user }`. Client stores `token` and sends `Authorization: Bearer <token>` on later requests.

---

## 2. Database schema (MySQL)

```sql
CREATE TABLE users (
  id            VARCHAR(32) PRIMARY KEY,
  email         VARCHAR(255) NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  handle        VARCHAR(64) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  google_sub    VARCHAR(255) NULL UNIQUE,
  apple_sub     VARCHAR(255) NULL UNIQUE,
  auth_method   VARCHAR(16) NOT NULL DEFAULT 'password',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  token       CHAR(64) PRIMARY KEY,
  user_id     VARCHAR(32) NOT NULL,
  expires_at  DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

`auth_method` values: `password`, `google`, `apple`.

---

## 3. API contract

Base URL: `YOUR_API_BASE` (e.g. `https://api.yourapp.com/v1`)

All POST bodies: `Content-Type: application/json`

### 3.1 Get enabled methods

```http
GET /auth/config
```

```json
{
  "methods": ["password", "google", "apple"],
  "googleClientId": "YOUR_GOOGLE_WEB_CLIENT_ID",
  "googleIosClientId": "YOUR_GOOGLE_IOS_CLIENT_ID",
  "appleClientId": "YOUR_APPLE_SERVICES_ID",
  "appleRedirectUri": "https://yourapp.com/app/"
}
```

### 3.2 Google sign-in

```http
POST /auth/google
```

```json
{ "idToken": "<Google ID token JWT>" }
```

**Response (all auth endpoints):**

```json
{
  "token": "64-char-hex-session-token",
  "user": {
    "id": "u1a2b3c4d5e6",
    "name": "Jane Doe",
    "email": "jane@gmail.com",
    "authMethod": "google"
  }
}
```

### 3.3 Apple sign-in

```http
POST /auth/apple
```

```json
{
  "idToken": "<Apple identity token JWT>",
  "name": "Jane Doe",
  "email": "jane@privaterelay.appleid.com"
}
```

`name` and `email` are only sent on the **first** Apple authorization. Store them when present.

### 3.4 Register (email + password)

```http
POST /auth/register
```

```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "Display Name",
  "handle": "username"
}
```

### 3.5 Login (email or username + password)

```http
POST /auth/login
```

```json
{
  "identifier": "user@example.com",
  "password": "secure-password"
}
```

`identifier` accepts email or `@username`.

### 3.6 Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

---

## 4. Server config

```php
<?php
// config.local.php (never commit secrets to a public repo)

return [
    'session_days'        => 90,
    'google_client_id'    => 'YOUR_GOOGLE_WEB_CLIENT_ID',
    'google_ios_client_id'=> 'YOUR_GOOGLE_IOS_CLIENT_ID', // optional, for native iOS
    'apple_client_id'     => 'YOUR_APP_BUNDLE_ID',        // native iOS tokens
    'apple_web_client_id' => 'YOUR_APPLE_SERVICES_ID',    // web popup tokens
    'apple_redirect_uri'  => 'https://yourapp.com/app/',
];
```

**Apple `aud` check:** Native iOS tokens use the **Bundle ID**. Web tokens use the **Services ID**. Accept both in verification.

---

## 5. Server code (PHP)

### 5.1 Session helper

```php
<?php
declare(strict_types=1);

final class Auth
{
    public static function tokenFromRequest(): ?string
    {
        $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $hdr, $m)) return $m[1];
        return null;
    }

    public static function createSession(PDO $pdo, string $userId, int $days): string
    {
        $token = bin2hex(random_bytes(32));
        $st = $pdo->prepare(
            'INSERT INTO sessions (token, user_id, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))'
        );
        $st->execute([$token, $userId, $days]);
        return $token;
    }

    public static function sessionResponse(PDO $pdo, array $user, array $cfg): array
    {
        $token = self::createSession($pdo, $user['id'], (int)($cfg['session_days'] ?? 90));
        return [
            'token' => $token,
            'user'  => [
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'] ?? null,
                'authMethod' => $user['auth_method'] ?? 'password',
            ],
        ];
    }
}
```

### 5.2 Google token verification

```php
<?php
declare(strict_types=1);

final class GoogleAuth
{
    public static function verify(string $idToken, string $clientId): array
    {
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
        $raw = file_get_contents($url);
        if (!$raw) throw new InvalidArgumentException('Could not verify Google token');

        $data = json_decode($raw, true);
        if (!is_array($data) || isset($data['error'])) {
            throw new InvalidArgumentException('Invalid Google token');
        }
        if (($data['aud'] ?? '') !== $clientId) {
            throw new InvalidArgumentException('Google token audience mismatch');
        }
        if (empty($data['sub'])) {
            throw new InvalidArgumentException('Google token missing subject');
        }
        return $data;
    }
}
```

For production, prefer Google's official PHP library or verify JWT locally (supports multiple `aud` values for web + iOS clients).

### 5.3 Apple token verification

Verify JWT signature against Apple JWKS (`https://appleid.apple.com/auth/keys`). Check:

- `iss` === `https://appleid.apple.com`
- `aud` in `[bundle_id, services_id]`
- `exp` > now
- `sub` present (stable Apple user ID)

Use the full `AppleAuth::verify()` implementation from your reference stack (JWKS fetch, RSA verify, audience list).

### 5.4 Auth route handler (sketch)

```php
<?php
// POST /auth/google
$claims = GoogleAuth::verify($idToken, $cfg['google_client_id']);
$user = findOrCreateByGoogleSub($pdo, $claims['sub'], $claims['email'], $claims['name']);
echo json_encode(Auth::sessionResponse($pdo, $user, $cfg));

// POST /auth/apple
$allowedAppleIds = array_filter([
    $cfg['apple_client_id'],
    $cfg['apple_web_client_id'],
]);
$claims = AppleAuth::verify($idToken, $allowedAppleIds);
$user = findOrCreateByAppleSub($pdo, $claims['sub'], $body['name'] ?? null);
echo json_encode(Auth::sessionResponse($pdo, $user, $cfg));

// POST /auth/register
if (findByEmail($pdo, $email)) { http_response_code(409); exit; }
$user = createUser($pdo, [
    'email' => $email,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'name' => $name,
    'auth_method' => 'password',
]);

// POST /auth/login
$user = findByIdentifier($pdo, $identifier);
if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401); exit;
}
```

---

## 6. Client: API client

```javascript
// api-client.js
const API_BASE = import.meta.env.VITE_API_BASE || "https://api.yourapp.com/v1";
const TOKEN_KEY = "app-session-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const authApi = {
  config: () => api("/auth/config"),
  appleConfig: () => api("/auth/apple/config"),
  google: (idToken) => api("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }),
  apple: (body) => api("/auth/apple", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => api("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => api("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api("/auth/logout", { method: "POST" }),
};
```

---

## 7. Client: Google (web + native iOS)

### 7.1 Dependencies (Capacitor iOS)

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync ios
```

In Xcode: add URL scheme from `GoogleService-Info.plist` (`REVERSED_CLIENT_ID`).

### 7.2 Google auth module

```javascript
// google-auth.js
import { Capacitor } from "@capacitor/core";

let ready = false;
let webClientId = null;
let useNative = false;

export async function initGoogleAuth({ googleClientId, googleIosClientId }) {
  webClientId = googleClientId;
  const isIosNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

  if (isIosNative && Capacitor.isPluginAvailable("GoogleAuth")) {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    GoogleAuth.initialize({
      clientId: googleIosClientId || googleClientId,
      scopes: ["profile", "email"],
    });
    useNative = true;
    ready = true;
    return;
  }

  await loadScript("https://accounts.google.com/gsi/client");
  if (!window.google?.accounts?.id) throw new Error("Google Sign-In unavailable");
  ready = true;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load Google Sign-In"));
    document.head.appendChild(s);
  });
}

export async function signInWithGoogle() {
  if (!ready) throw new Error("Google Sign-In not initialized");

  if (useNative) {
    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    const res = await GoogleAuth.signIn();
    const idToken = res?.authentication?.idToken;
    if (!idToken) throw new Error("Google sign-in cancelled");
    return idToken;
  }

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: webClientId,
      ux_mode: "popup",
      callback: (res) => {
        if (res?.credential) resolve(res.credential);
        else reject(new Error("Google sign-in cancelled"));
      },
    });
    window.google.accounts.id.prompt();
  });
}
```

### 7.3 Google Cloud Console

1. Create project → APIs & Services → Credentials
2. **OAuth 2.0 Client ID → Web application**
   - Authorized JavaScript origins: `https://yourapp.com`
   - Authorized redirect URIs: `https://yourapp.com/app/`
3. **OAuth 2.0 Client ID → iOS**
   - Bundle ID: `YOUR_APP_BUNDLE_ID`
4. Put Web client ID in server `google_client_id` and client `initGoogleAuth`

---

## 8. Client: Apple (web + native + App Store auto sign-in)

### 8.1 Dependencies (Capacitor iOS)

```bash
npm install @capacitor-community/apple-sign-in
npx cap sync ios
```

Xcode: enable **Sign in with Apple** capability on the App ID and target.

### 8.2 Apple auth module

```javascript
// apple-auth.js
import { Capacitor } from "@capacitor/core";

let ready = false;
let config = null;
let useNative = false;

export async function initAppleAuth({ clientId, redirectUri }) {
  config = { clientId, redirectUri: redirectUri || `${window.location.origin}/` };
  useNative = Capacitor.isNativePlatform()
    && Capacitor.getPlatform() === "ios"
    && Capacitor.isPluginAvailable("SignInWithApple");

  if (useNative) {
    ready = true;
    return;
  }

  await loadScript(
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
  );
  window.AppleID.auth.init({
    clientId: config.clientId,
    scope: "name email",
    redirectURI: config.redirectUri,
    usePopup: true,
  });
  ready = true;
}

async function signInNative() {
  const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
  const res = await SignInWithApple.authorize({
    clientId: config.clientId,
    redirectURI: config.redirectUri,
    scopes: "email name",
  });
  const body = res?.response;
  if (!body?.identityToken) throw new Error("Apple did not return an identity token");
  return {
    idToken: body.identityToken,
    name: [body.givenName, body.familyName].filter(Boolean).join(" ").trim() || null,
    email: body.email || null,
  };
}

async function signInWeb() {
  const res = await window.AppleID.auth.signIn();
  const idToken = res?.authorization?.id_token;
  if (!idToken) throw new Error("Apple did not return an identity token");
  const u = res.user;
  const name = u?.name
    ? [u.name.firstName, u.name.lastName].filter(Boolean).join(" ").trim()
    : null;
  return { idToken, name, email: u?.email || null };
}

export async function signInWithApple() {
  if (!ready) throw new Error("Apple Sign-In not initialized");
  return useNative ? signInNative() : signInWeb();
}

/** True when running inside an App Store / TestFlight iOS build */
export function isAppStoreShell() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

/**
 * Silent sign-in on App Store launch: tries native Apple without showing a button.
 * Returns null if user cancelled or no prior Apple ID session exists.
 */
export async function tryAutoSignInWithApple() {
  if (!isAppStoreShell() || !useNative) return null;
  try {
    return await signInNative();
  } catch (err) {
    const msg = String(err?.code || err?.message || "");
    if (msg.includes("1001") || msg.toLowerCase().includes("cancel")) return null;
    return null;
  }
}
```

### 8.3 Apple Developer setup

**For native iOS (Bundle ID):**

1. Identifiers → App IDs → your app → enable **Sign in with Apple**
2. Server `apple_client_id` = Bundle ID (`com.yourcompany.yourapp`)

**For web (Services ID):**

1. Identifiers → Services IDs → create e.g. `com.yourcompany.yourapp.web`
2. Enable Sign in with Apple → Configure
3. Domains: `yourapp.com`
4. Return URLs: `https://yourapp.com/app/`
5. Server `apple_web_client_id` = Services ID

---

## 9. Client: login screen wiring

```javascript
// auth-screen.js
import { authApi, setToken } from "./api-client.js";
import { initGoogleAuth, signInWithGoogle } from "./google-auth.js";
import {
  initAppleAuth,
  signInWithApple,
  tryAutoSignInWithApple,
  isAppStoreShell,
} from "./apple-auth.js";

export async function bootstrapAuth() {
  const cfg = await authApi.config();

  if (cfg.googleClientId) {
    await initGoogleAuth({
      googleClientId: cfg.googleClientId,
      googleIosClientId: cfg.googleIosClientId,
    });
  }

  if (cfg.appleClientId) {
    await initAppleAuth({
      clientId: cfg.appleClientId,
      redirectUri: cfg.appleRedirectUri,
    });
  }

  // App Store: attempt silent Apple sign-in before showing login UI
  if (isAppStoreShell() && cfg.methods?.includes("apple")) {
    const apple = await tryAutoSignInWithApple();
    if (apple?.idToken) {
      const { token, user } = await authApi.apple(apple);
      setToken(token);
      return { user, method: "apple-auto" };
    }
  }

  return null;
}

export async function loginWithGoogle() {
  const idToken = await signInWithGoogle();
  const { token, user } = await authApi.google(idToken);
  setToken(token);
  return user;
}

export async function loginWithApple() {
  const apple = await signInWithApple();
  const { token, user } = await authApi.apple(apple);
  setToken(token);
  return user;
}

export async function registerWithPassword({ email, password, name, handle }) {
  const { token, user } = await authApi.register({ email, password, name, handle });
  setToken(token);
  return user;
}

export async function loginWithPassword({ identifier, password }) {
  const { token, user } = await authApi.login({ identifier, password });
  setToken(token);
  return user;
}
```

### React example (buttons)

```jsx
function AuthScreen() {
  const [error, setError] = useState("");

  return (
    <div>
      <button type="button" onClick={() => loginWithGoogle().catch((e) => setError(e.message))}>
        Continue with Google
      </button>
      <button type="button" onClick={() => loginWithApple().catch((e) => setError(e.message))}>
        Continue with Apple
      </button>
      <form onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await loginWithPassword({
          identifier: fd.get("identifier"),
          password: fd.get("password"),
        });
      }}>
        <input name="identifier" placeholder="Email or username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign in</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}
```

---

## 10. Native Swift (standalone iOS, no Capacitor)

```swift
import AuthenticationServices

func signInWithApple(presentationAnchor: ASPresentationAnchor) async throws -> (idToken: String, name: String?) {
    let provider = ASAuthorizationAppleIDProvider()
    let request = provider.createRequest()
    request.requestedScopes = [.fullName, .email]

    let controller = ASAuthorizationController(authorizationRequests: [request])
    // Use ASAuthorizationControllerDelegate + presentationContextProvider
    // On success: credential.identityToken → String (JWT)
    // POST to YOUR_API_BASE/auth/apple
}

// URLSession example
func exchangeAppleToken(idToken: String, name: String?) async throws -> Session {
    var req = URLRequest(url: URL(string: "https://api.yourapp.com/v1/auth/apple")!)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    let body: [String: Any?] = ["idToken": idToken, "name": name]
    req.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 })
    // decode { token, user }, save token in Keychain
}
```

**App Store auto sign-in (Swift):** On launch, call `ASAuthorizationAppleIDProvider().getCredentialState(forUserID:)` for a stored Apple user ID. If `.authorized`, you still need a fresh `identityToken` from a new `ASAuthorizationController` request. There is no fully silent token refresh without user interaction on first install; after first sign-in, use **Keychain-stored session token** from your API instead of re-prompting Apple every launch.

Recommended App Store flow:

1. App launch → read API session token from Keychain
2. If valid → `GET /bootstrap` (or `/me`) with Bearer token
3. If missing → `tryAutoSignInWithApple()` (native plugin) or show login buttons

---

## 11. React Native / Expo (sketch)

```javascript
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";

const API = "https://api.yourapp.com/v1";

// Google
const [request, , promptAsync] = Google.useIdTokenAuthRequest({
  clientId: "YOUR_GOOGLE_WEB_CLIENT_ID",
  iosClientId: "YOUR_GOOGLE_IOS_CLIENT_ID",
});
const result = await promptAsync();
if (result?.type === "success") {
  await fetch(`${API}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: result.params.id_token }),
  });
}

// Apple
const cred = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});
await fetch(`${API}/auth/apple`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    idToken: cred.identityToken,
    name: [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" "),
    email: cred.email,
  }),
});
```

---

## 12. Environment variables (client)

```env
VITE_API_BASE=https://api.yourapp.com/v1
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

Apple `clientId` and `redirectUri` should come from `GET /auth/config` so you can change them server-side without app updates.

---

## 13. Security checklist

- [ ] Verify Google `aud` matches your Web client ID (extend for iOS client if needed)
- [ ] Verify Apple JWT signature via Apple JWKS, not decode-only
- [ ] Accept both Bundle ID and Services ID in Apple `aud`
- [ ] Store passwords with `password_hash` / bcrypt only
- [ ] Session tokens: 64+ random bytes, expiry in DB
- [ ] HTTPS everywhere
- [ ] Rate-limit `/auth/login` and `/auth/register`
- [ ] Never log ID tokens or passwords
- [ ] CORS: restrict origins in production (avoid `*` if cookies matter; Bearer tokens in header are OK with `*`)

---

## 14. Common errors

| Symptom | Fix |
|---------|-----|
| Google `aud` mismatch | Web client ID in server must match token audience |
| Apple `audience invalid` | Add Bundle ID + Services ID to allowed list |
| Apple name always empty | Apple sends name once; save on first sign-in |
| Gmail works on web, not iOS | Add iOS OAuth client + native plugin + URL scheme |
| Login returns 400 "uses google sign-in" | User registered with Google; no password set |
| App Store users see login every time | Persist API `token` in Keychain; auto Apple only when no session |

---

## 15. Minimal implementation order

1. Database + session table
2. `POST /auth/register` + `POST /auth/login`
3. `GET /auth/config`
4. Google: console setup → `POST /auth/google`
5. Apple web: Services ID → `POST /auth/apple`
6. iOS shell: Capacitor plugins → native flows
7. App launch: restore session → optional `tryAutoSignInWithApple()`

This document is self-contained. Copy `api-client.js`, `google-auth.js`, `apple-auth.js`, and the PHP patterns into any new project and replace the placeholders above.
