/** GDPR / ePrivacy legal texts + cookie consent helpers (shared app + homepage). */

const COOKIE_CONSENT_KEY = "echelon-cookie-consent";
const COOKIE_CONSENT_VERSION = "2.0";

function getCookieConsent() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.version === COOKIE_CONSENT_VERSION ? data : null;
  } catch {
    return null;
  }
}

function saveCookieConsent(consent) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
    necessary: true,
    functional: !!consent.functional,
    analytics: !!consent.analytics,
    ts: Date.now(),
    version: COOKIE_CONSENT_VERSION,
  }));
}

function hasCookieConsent() {
  return !!getCookieConsent();
}

const COMPANY = {
  legalName: "Fortune Comet, Unipessoal Lda",
  tradingName: "Echelon",
  vat: "PT516161440",
  address: "Avenida Estados Unidos da América, N.º 139, 6º, 1700-173 Lisboa, Portugal",
  email: "hi@echelon.rsvp",
  legalEmail: "hi@echelon.rsvp",
  dpo: "hi@echelon.rsvp",
  supervisoryAuthority: "Comissão Nacional de Proteção de Dados (CNPD), Portugal — www.cnpd.pt",
  website: "https://echelon.rsvp",
  appUrl: "https://echelon.rsvp/app/",
};

const CONTACT_LINE = `${COMPANY.legalName} (VAT ${COMPANY.vat}), ${COMPANY.address}. Email: ${COMPANY.email}.`;
const UPDATED = "8 June 2026";

function doc(lang, type) {
  const bag = LEGAL[lang] || LEGAL.en;
  return bag[type] || LEGAL.en[type];
}

function getLegalDoc(lang, type) {
  return doc(lang, type);
}

function renderSectionsHtml(d) {
  let html = `<p class="legal-updated">${d.updatedLabel}: ${d.updated}</p>`;
  d.sections.forEach((s) => {
    html += `<h2>${s.heading}</h2>`;
    s.paragraphs.forEach((p) => { html += `<p>${p}</p>`; });
    if (s.list) {
      html += "<ul>";
      s.list.forEach((li) => { html += `<li>${li}</li>`; });
      html += "</ul>";
    }
  });
  return html;
}

function renderLegalBodyHtml(lang, type) {
  const d = doc(lang, type);
  if (!d) return "";
  return renderSectionsHtml(d);
}

function renderLegalHtml(lang, type) {
  const d = doc(lang, type);
  if (!d) return "";
  return `<h1>${d.title}</h1>${renderSectionsHtml(d)}`;
}

/* -------------------------------------------------------------------------- */
/*  English (authoritative)                                                   */
/* -------------------------------------------------------------------------- */

const EN_PRIVACY = {
  title: "Privacy Policy",
  updatedLabel: "Last updated",
  updated: UPDATED,
  sections: [
    { heading: "1. Data controller and contact", paragraphs: [
      `${COMPANY.legalName} (VAT ${COMPANY.vat}), trading as \"${COMPANY.tradingName}\" (\"Echelon\", \"we\", \"us\", \"our\"), is the data controller for personal data processed when you visit ${COMPANY.website}, use the Echelon web application at ${COMPANY.appUrl} (the \"Service\"), or otherwise interact with us.`,
      `Registered address: ${COMPANY.address}.`,
      `Privacy enquiries and data subject requests: ${COMPANY.email}. Data Protection Officer: ${COMPANY.dpo}. Legal enquiries: ${COMPANY.legalEmail}.`,
      `We process personal data in accordance with Regulation (EU) 2016/679 (GDPR), Portuguese Law No. 58/2019, and applicable EU electronic communications rules.`,
    ]},
    { heading: "2. Scope, age, and acceptance", paragraphs: [
      "This Privacy Policy applies to website visitors, registered users, and anyone whose data we process in connection with the Service.",
      "The Service is intended for individuals aged 16 or older in the European Economic Area (EEA) and United Kingdom. If you are under 16, you may not create an account unless verifiable parental consent is obtained where required by your Member State.",
      "By creating an account or using the Service, you confirm that the information you provide is accurate and that you have read this Privacy Policy together with our Terms and Conditions and Cookie Policy.",
    ]},
    { heading: "3. Description of the Service", paragraphs: [
      "Echelon is a social reputation platform that allows registered users to maintain a profile, receive and give community ratings, view an in-app Echelon Score™, connect with friends, publish and interact with feed content, send direct messages (including media and voice notes), use proximity and Lens features, RSVP to events, receive in-app notifications, and optionally connect third-party accounts such as Instagram.",
      "The Echelon Score is an in-app metric only. It is not a credit score, employment reference, government identifier, or professional certification.",
    ]},
    { heading: "4. Categories of personal data we process", paragraphs: [
      "Depending on your settings and use of the Service, we may process the following categories of personal data:",
    ], list: [
      "Identity and account data: display name, username/handle, profile emoji or avatar, email address (where used), authentication identifiers from Sign in with Apple, Google Sign-In, or email/password registration, account creation date, onboarding status.",
      "Face data / onboarding imagery: a selfie or profile photo you submit during onboarding, processed to create your avatar and generate an initial in-app Echelon Score suggestion via automated image analysis. We do not collect Face ID data, faceprints, face geometry templates, biometric identifiers, liveness maps, depth maps, or government identity verification data.",
      "Echelon Score and reputation data: numeric score, tier, rating history (stars, sentiment tags, timestamps), score changes, boost status, reputation hold or lock flags, and derived access levels within the Service.",
      "Social graph and interaction data: friend connections, friend requests sent or received, ratings you give or receive, comments, likes, bookmarks, shares, story views, and feed interactions.",
      "Messaging data: direct message text, photos, videos, voice notes, reactions, reply metadata, read receipts, typing indicators, and ephemeral message settings (disappearing timers, view-once media). Recipients may capture content before it expires; we cannot control copies on their devices.",
      "Location and proximity data: when you enable Lens or proximity features, approximate or precise geolocation (latitude/longitude), proximity scan activity, nearby user discovery within configured radius, and timestamps of location updates.",
      "Instagram / Meta data (optional): if you connect Instagram, we may receive and store your Instagram user ID, handle, access tokens, verification status, and content you authorise us to sync to your feed.",
      "Media uploads: photos, videos, and audio you upload to posts, stories, messages, or your profile, stored on our servers.",
      "Technical and usage data: IP address, browser type, device characteristics, session tokens, server logs, timestamps, feature usage, error reports, and local storage preferences.",
      "Communications: in-app notifications (\"Pulse\" alerts), support emails, and records of data subject requests.",
      "Cookie and consent records: your cookie preferences and version of consent given.",
    ]},
    { heading: "4A. Face data collection, use, sharing, storage, and retention", paragraphs: [
      "What face data we collect: during onboarding or a user-initiated retry, you may submit a selfie/profile photo. The submitted image may contain your face. We do not collect Apple Face ID data, biometric face templates, faceprints, facial geometry measurements, liveness maps, depth maps, or government ID data.",
      "Why we store face data: we store the submitted image only as your visible profile avatar and account media so your profile can function inside Echelon. We store the resulting numeric onboarding score and score history as account/reputation data so your Echelon Score can be displayed and audited in the app. We do not store any biometric identifier, faceprint, facial geometry template, or face-recognition template.",
      "How we use face data: the submitted image is used only to create or update your profile avatar and to request an automated image-analysis score suggestion used as your initial in-app Echelon Score. The score is an entertainment/community metric inside Echelon only and is not used for identity verification, access to real-world services, credit, employment, housing, insurance, or legal decisions.",
      "Which third parties receive face data: if automated image analysis is enabled, the onboarding image may be sent to Google LLC / Google Ireland Limited through the Google Gemini API, acting as our AI/image-analysis processor, solely to return the score suggestion. Our hosting providers may store the image on Echelon-controlled server storage as part of operating echelon.rsvp. We do not sell face data, share it with data brokers, use it for advertising, use it to track users across apps or websites, or share it with Meta/Instagram or Apple for face analysis.",
      "Why third parties receive face data: Google Gemini receives the image only to perform the requested image analysis and return a score suggestion. Hosting providers receive/store the image only so Echelon can display your avatar, operate backups, secure the service, and restore the service after incidents.",
      "Third-party storage of face data: Google Gemini API processing is configured for service processing, not advertising or cross-app tracking. Google may process submitted content transiently to provide the response and may keep limited abuse-prevention, safety, or service logs according to Google's Cloud/AI service terms; Echelon does not authorise Google to use face data to create faceprints or identify users. Hosting providers store the avatar only on Echelon-controlled infrastructure and backups under our instructions.",
      "Echelon storage and retention: the uploaded image is stored on Echelon-controlled server storage as your profile avatar until you replace it, remove it where available, or delete your account. This retention period is necessary because the image is your profile avatar. After account deletion, face images and account data are deleted or anonymised from active systems within 30 days; encrypted backups may persist for up to 24 months for security, disaster recovery, legal defence, and integrity reasons, then are purged on the normal backup rotation. Server/security logs are typically retained up to 90 days.",
    ]},
    { heading: "5. Sources of data", paragraphs: [
      "We collect data directly from you, automatically through your use of the Service, from other users (e.g. ratings they submit about you), and from third parties you choose to connect (Apple, Google, Meta/Instagram).",
    ]},
    { heading: "6. Purposes and legal bases (GDPR Article 6)", paragraphs: [
      "We process personal data only where a valid legal basis applies:",
    ], list: [
      "Performance of a contract (Art. 6(1)(b)): to register and maintain your account, provide core features (profile, score display, feed, messaging, friends, events), authenticate sessions, and deliver functionality you request.",
      "Consent (Art. 6(1)(a)): for optional processing including proximity/Lens location sharing, stranger ratings, public score or tier display, non-essential cookies/local storage, Instagram connection, marketing communications if offered, and push-style notifications where consent is required.",
      "Legitimate interests (Art. 6(1)(f)): to secure the Service, detect fraud and abuse, enforce our Terms, improve features, maintain community integrity, and defend legal claims — balanced against your rights and freedoms.",
      "Legal obligation (Art. 6(1)(c)): to comply with applicable law, respond to lawful requests from authorities, and maintain records required by regulation.",
    ]},
    { heading: "7. Automated processing, profiling, and the Echelon Score", paragraphs: [
      "Your Echelon Score™ is calculated using automated processing, including profiling based on community ratings, rating recency, rater influence, onboarding analysis, and in-app rules. This may affect feature access within the Service (e.g. events, score-ranked visibility, feed ranking).",
      "Under GDPR Article 22, you have the right not to be subject to a decision based solely on automated processing that produces legal or similarly significant effects concerning you. Our Score affects in-app experiences only and is not intended to produce legal effects outside the Service. You may contact us to request human review of significant automated outcomes where applicable.",
      "Community ratings reflect the subjective opinions of other users. Fortune Comet does not endorse ratings and is not responsible for their accuracy or fairness.",
    ]},
    { heading: "8. Location, Lens, and proximity features", paragraphs: [
      "Location data is collected only when you activate Lens, proximity scanning, or related features, or when you explicitly enable location-dependent functionality. You can disable Lens and proximity features in Settings.",
      "Nearby user discovery uses approximate distance calculations. We do not guarantee the accuracy of location data, which depends on device sensors, network conditions, and user settings.",
      "Continuous background location tracking is not required for basic use of the Service.",
    ]},
    { heading: "9. Messaging and ephemeral content", paragraphs: [
      "Messages may include disappearing timers or view-once media. While we delete or restrict access on our servers according to your settings, we cannot guarantee deletion from a recipient's device, screenshots, screen recordings, or external copies.",
      "You are responsible for the content you send. Do not send unlawful, harmful, or non-consensual intimate imagery.",
    ]},
    { heading: "10. Recipients and processors", paragraphs: [
      "We do not sell your personal data. We may disclose data to:",
    ], list: [
      "Infrastructure and hosting providers that operate echelon.rsvp (within the EEA or under EU Standard Contractual Clauses / adequacy decisions).",
      "Authentication providers: Apple (Sign in with Apple) and Google (Google Sign-In) when you choose those login methods.",
      "Meta Platforms (Instagram) when you connect your Instagram account, subject to Meta's terms and privacy policy.",
      "AI / image analysis providers used during onboarding score suggestion (processed on your submitted photo only for that purpose; no biometric template or faceprint is stored by Echelon).",
      "ipapi.co for one-time IP-based country detection when no language preference is stored (IP address only).",
      "Professional advisers (lawyers, accountants) under confidentiality obligations.",
      "Public authorities, regulators, or courts when required by applicable law or to protect our rights, users, or the public.",
    ]},
    { heading: "11. International transfers", paragraphs: [
      "Where personal data is transferred outside the EEA or UK, we implement appropriate safeguards such as European Commission adequacy decisions, UK adequacy regulations, or EU Standard Contractual Clauses. You may request information about safeguards by emailing hi@echelon.rsvp.",
    ]},
    { heading: "12. Retention", paragraphs: [
      "We retain personal data only as long as necessary for the purposes described:",
    ], list: [
      "Active account data: for the lifetime of your account.",
      "After account deletion: core personal data is deleted or anonymised within 30 days; encrypted backups may persist up to 24 months for security, disaster recovery, and dispute resolution, then are purged.",
      "Messages and ephemeral content: retained according to message type; disappearing and view-once content is removed from our systems after expiry or consumption where technically implemented.",
      "Server and security logs: typically up to 90 days.",
      "Cookie and consent records: up to 24 months from the date of consent.",
      "Legal claims: data may be retained longer where necessary to establish, exercise, or defend legal claims.",
    ]},
    { heading: "13. Your rights", paragraphs: [
      "Under GDPR, you have the right to access, rectification, erasure (\"right to be forgotten\"), restriction of processing, data portability, objection (including to processing based on legitimate interests), and to withdraw consent at any time without affecting the lawfulness of prior processing.",
      "To exercise your rights, email hi@echelon.rsvp from your registered email or use in-app account deletion (Settings → Delete account). We respond within one month, extendable by two further months where requests are complex.",
      `You may lodge a complaint with ${COMPANY.supervisoryAuthority} or your local supervisory authority in the EEA or UK.`,
    ]},
    { heading: "14. Security", paragraphs: [
      "We implement appropriate technical and organisational measures including TLS encryption in transit, access controls, authentication tokens, data minimisation, and server hardening. No method of transmission or storage is completely secure; you use the Service at your own risk.",
      "You must keep your login credentials and device secure. Notify us immediately at hi@echelon.rsvp if you suspect unauthorised access.",
    ]},
    { heading: "15. Children", paragraphs: [
      "The Service is not directed at children under 16. We do not knowingly collect personal data from children under 16 without appropriate consent. Contact us if you believe we have collected data from a child unlawfully.",
    ]},
    { heading: "16. Changes to this policy", paragraphs: [
      "We may update this Privacy Policy to reflect legal, technical, or business changes. Material changes will be notified via the Service, email where appropriate, or a prominent notice on echelon.rsvp. The \"Last updated\" date indicates the current version. Continued use after the effective date constitutes acknowledgment.",
    ]},
    { heading: "17. Contact", paragraphs: [CONTACT_LINE] },
  ],
};

const EN_TERMS = {
  title: "Terms and Conditions",
  updatedLabel: "Last updated",
  updated: UPDATED,
  sections: [
    { heading: "1. Agreement", paragraphs: [
      `These Terms and Conditions (\"Terms\") govern access to and use of ${COMPANY.website} and the Echelon web application (the \"Service\") operated by ${COMPANY.legalName} (VAT ${COMPANY.vat}), trading as \"${COMPANY.tradingName}\" (\"Echelon\", \"we\", \"us\").`,
      "By registering, accessing, or using the Service, you agree to be bound by these Terms, our Privacy Policy, and Cookie Policy. If you do not agree, you must not use the Service.",
      "If you use the Service on behalf of an organisation, you represent that you have authority to bind that organisation.",
    ]},
    { heading: "2. The Service and important disclaimers", paragraphs: [
      "Echelon is a social reputation platform that enables users to build a profile, interact with a community, receive and give ratings, and access in-app features tied to an Echelon Score™.",
      "THE ECHELON SCORE AND ALL COMMUNITY RATINGS ARE IN-APP METRICS ONLY. THEY ARE NOT CREDIT SCORES, CONSUMER REPORTS, EMPLOYMENT OR TENANCY REFERENCES, BACKGROUND CHECKS, INSURANCE SCORES, PROFESSIONAL LICENSES, OR GOVERNMENT-ISSUED IDENTIFIERS. YOU MUST NOT RELY ON THEM FOR DECISIONS OUTSIDE THE SERVICE.",
      "Fortune Comet does not guarantee the accuracy, fairness, completeness, or timeliness of any score, rating, or user-generated content. Ratings express the subjective opinions of individual users, not ours.",
      "Features such as events, Lens overlays, score-ranked discovery, and access tiers are provided for in-app experience only and do not create legal entitlements to real-world goods, services, or privileges unless explicitly stated in a separate written agreement.",
    ]},
    { heading: "2A. Face scan and onboarding photo", paragraphs: [
      "During onboarding or a user-initiated retry, you may submit a selfie/profile photo. This image is used only to create your profile avatar and request an automated image-analysis score suggestion for your initial in-app Echelon Score.",
      "The face scan is not identity verification, age verification, liveness verification, or biometric authentication. We do not create or store faceprints, facial geometry templates, biometric identifiers, or Apple Face ID data.",
      "Full collection, sharing, storage, and retention details are provided in the Privacy Policy section \"4A. Face data collection, use, sharing, storage, and retention\".",
    ]},
    { heading: "3. Eligibility", paragraphs: [
      "You must be at least 16 years old and have legal capacity to enter a binding contract in your jurisdiction.",
      "You must not be prohibited from using the Service under applicable law or have had a prior account terminated for breach of these Terms.",
      "You agree to provide accurate registration information and keep it updated.",
    ]},
    { heading: "4. Account registration and security", paragraphs: [
      "You may register using Sign in with Apple, Google Sign-In, email/password, or other methods we make available. Third-party login is subject to the provider's terms.",
      "You are solely responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately at hi@echelon.rsvp of any unauthorised use.",
      "We may refuse registration, reclaim usernames, or require verification where we reasonably suspect fraud, impersonation, or policy violations.",
    ]},
    { heading: "5. Echelon Score, ratings, and community rules", paragraphs: [
      "Your Echelon Score may increase or decrease based on ratings from other users and automated in-app rules. Score changes may affect visibility, feature access, and interactions within the Service.",
      "You agree to give ratings honestly and in good faith, without coercion, bribery, bots, or manipulation. Organised score manipulation is prohibited.",
      "We may apply reputation holds, locks, cooldowns, or feature restrictions to protect community integrity.",
    ]},
    { heading: "6. User-generated content", paragraphs: [
      "You retain ownership of content you submit (posts, stories, messages, media, comments). You grant Fortune Comet a non-exclusive, worldwide, royalty-free, sublicensable licence to host, store, reproduce, display, transmit, and process your content solely to operate, promote, and improve the Service and enforce these Terms.",
      "This licence ends when content is deleted from our systems, except where retention is required by law or legitimate backup/archival cycles (up to 24 months).",
      "You represent that you own or have all necessary rights to your content and that it does not infringe third-party rights or violate law.",
      "You are solely responsible for your content and interactions. We do not pre-screen all content but may remove or restrict content or accounts at our sole discretion, without notice, where we believe it violates these Terms or applicable law.",
    ]},
    { heading: "7. Acceptable use", paragraphs: ["You agree not to:"], list: [
      "Harass, threaten, defame, stalk, discriminate against, or harm others.",
      "Post or transmit unlawful content, hate speech, non-consensual intimate imagery, or content exploiting minors.",
      "Impersonate any person or entity or misrepresent your affiliation.",
      "Use bots, scripts, or automated means to manipulate scores, create accounts, scrape data, or disrupt the Service.",
      "Reverse engineer, decompile, or attempt to extract source code except as permitted by mandatory law.",
      "Circumvent security, access controls, or rate limits.",
      "Use the Service for spam, phishing, malware, or unauthorised commercial solicitation.",
      "Collect or harvest personal data of other users without consent.",
      "Use scores or ratings to make unlawful employment, housing, credit, or insurance decisions in jurisdictions where such use is restricted.",
    ]},
    { heading: "8. Messaging, calls, and ephemeral features", paragraphs: [
      "Direct messaging may include text, media, voice notes, reactions, disappearing messages, and view-once content. Voice and video call interfaces may be simulated or limited; we do not guarantee call quality, connectivity, or availability.",
      "Ephemeral content may still be captured by recipients. We are not liable for unauthorised copying, forwarding, or screenshots.",
      "We may store message metadata and content as described in our Privacy Policy for delivery, safety, and legal compliance.",
    ]},
    { heading: "9. Location, Lens, and proximity", paragraphs: [
      "Lens and proximity features require location permissions on your device. By enabling them, you consent to processing described in our Privacy Policy.",
      "You must not use proximity features to stalk, harass, or endanger others. Misuse may result in immediate termination and referral to authorities.",
    ]},
    { heading: "10. Third-party services", paragraphs: [
      "Apple, Google, Meta (Instagram), hosting providers, and other integrated services are independent third parties with their own terms and privacy policies. We are not responsible for third-party services, outages, or data practices.",
      "Your use of Instagram connection features is also subject to Meta Platform Terms and Instagram policies.",
    ]},
    { heading: "11. Intellectual property", paragraphs: [
      "The Service, including the Echelon name, logo, design, software, and documentation, is owned by Fortune Comet or its licensors and protected by intellectual property laws. Except for the limited licence to use the Service, no rights are granted to you.",
      "You must not use our trademarks without prior written consent.",
    ]},
    { heading: "12. Service availability and changes", paragraphs: [
      "We strive to maintain availability but do not guarantee uninterrupted, timely, secure, or error-free operation. Maintenance, updates, and force majeure events may cause downtime.",
      "We may modify, suspend, or discontinue any part of the Service at any time, with or without notice, to the extent permitted by law.",
    ]},
    { heading: "13. Suspension and termination", paragraphs: [
      "We may suspend or terminate your account immediately, without refund, if you breach these Terms, create risk or legal exposure for us, or where required by law.",
      "You may stop using the Service at any time and delete your account in Settings. Provisions that by nature should survive (disclaimers, liability limits, indemnity, governing law) survive termination.",
    ]},
    { heading: "14. Indemnification", paragraphs: [
      "To the fullest extent permitted by law, you agree to indemnify, defend, and hold harmless Fortune Comet, its directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from: (a) your content or conduct; (b) your breach of these Terms; (c) your violation of law or third-party rights; or (d) your misuse of the Service.",
      "This indemnity does not apply to the extent a claim arises from our intentional misconduct or gross negligence where such limitation is prohibited by law.",
    ]},
    { heading: "15. Disclaimer of warranties", paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.",
      "We do not warrant that scores, ratings, location data, messages, or user profiles are accurate, complete, or reliable.",
    ]},
    { heading: "16. Limitation of liability", paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, FORTUNE COMET SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR REPUTATION, ARISING FROM YOUR USE OF THE SERVICE.",
      "OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) €100 OR (B) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM (TYPICALLY ZERO FOR THE FREE SERVICE).",
      "Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, fraudulent misrepresentation, or any liability that cannot be excluded under mandatory consumer protection law in your country of residence.",
    ]},
    { heading: "17. EEA and UK consumer rights", paragraphs: [
      "If you are a consumer in the EEA or UK, you benefit from mandatory provisions of the law of your country of residence. Nothing in these Terms affects those non-waivable rights.",
      "Online dispute resolution (EU): https://ec.europa.eu/consumers/odr. We are not obliged to participate in alternative dispute resolution but will consider good-faith requests.",
    ]},
    { heading: "18. Governing law and jurisdiction", paragraphs: [
      "These Terms are governed by the laws of Portugal, without regard to conflict-of-law principles.",
      "The courts of Lisbon, Portugal shall have exclusive jurisdiction, subject to mandatory rights of EEA/UK consumers to bring proceedings in their country of residence.",
    ]},
    { heading: "19. General", paragraphs: [
      "Entire agreement: These Terms, the Privacy Policy, and Cookie Policy constitute the entire agreement regarding the Service.",
      "Severability: If any provision is invalid, the remainder remains in effect.",
      "No waiver: Failure to enforce a provision is not a waiver.",
      "Assignment: You may not assign your rights without our consent. We may assign our rights to an affiliate or successor.",
      "Force majeure: We are not liable for failure due to events beyond reasonable control.",
    ]},
    { heading: "20. Contact", paragraphs: [CONTACT_LINE] },
  ],
};

const EN_COOKIES = {
  title: "Cookie Policy",
  updatedLabel: "Last updated",
  updated: UPDATED,
  sections: [
    { heading: "1. Introduction", paragraphs: [
      `This Cookie Policy explains how ${COMPANY.legalName} (VAT ${COMPANY.vat}), trading as \"${COMPANY.tradingName}\", uses cookies and similar technologies on ${COMPANY.website} and the Echelon web app, in compliance with the EU ePrivacy rules and GDPR.`,
    ]},
    { heading: "2. What are cookies and similar technologies?", paragraphs: [
      "Cookies are small text files stored on your device. We also use browser local storage and session storage for similar purposes. In this policy, \"cookies\" includes comparable technologies unless stated otherwise.",
    ]},
    { heading: "3. Legal basis", paragraphs: [
      "Strictly necessary cookies are used based on our legitimate interest in providing a secure, functioning Service.",
      "Functional cookies require your consent, obtained via our cookie banner or Settings. Analytics cookies are not currently deployed.",
      "We do not use cookies, local storage, or web content in the app for advertising, data brokerage, or tracking users across other companies' apps or websites.",
    ]},
    { heading: "4. Cookie categories", paragraphs: ["We use the following categories:"], list: [
      "Strictly necessary: required for security, session management, and storing your cookie consent choice. These cannot be disabled while using the Service.",
      "Functional: remember language, app preferences, demo state, and UI choices. Require consent.",
      "Analytics: not currently deployed. If added, analytics would be aggregate product analytics only and would require consent first.",
      "Marketing: not used.",
      "Tracking/advertising: not used. We do not link app data with third-party data for advertising and do not share cookie data with data brokers.",
    ]},
    { heading: "5. Storage items we use", paragraphs: ["Current local storage and cookies include:"], list: [
      "echelon-cookie-consent (strictly necessary): stores your cookie choices and version. Duration: 24 months.",
      "echelon-lang / echelon-lang-chosen (functional): language preference. Duration: until cleared. Set after functional consent.",
      "echelon-token (strictly necessary when logged in): authentication session token. Duration: until logout or expiry.",
      "echelon-chat-inbox, echelon-chat-tip, echelon-feed-ix (functional): in-app demo/cache state. Duration: until cleared.",
      "echelon-install-dismiss (functional): remembers install banner dismissal. Duration: until cleared.",
    ]},
    { heading: "6. Third-party technologies", paragraphs: [
      "We may load Google Fonts (typography) and use ipapi.co for optional one-time IP-based language detection. These providers may process IP address data under their own policies.",
      "Sign in with Apple, Google Sign-In, and Instagram OAuth are initiated by you and subject to those providers' cookies and policies.",
      "Non-essential third-party loading is deferred until you accept functional cookies where applicable.",
      "These technologies are not used by Echelon for cross-app or cross-site tracking or advertising attribution.",
    ]},
    { heading: "7. Managing consent", paragraphs: [
      "On first visit you will see a cookie banner with Allow functional, Reject non-essential, and Manage preferences.",
      "You may change or withdraw consent at any time via Cookie settings in the website footer or app Settings → Legal → Cookie settings.",
      "Withdrawal does not affect the lawfulness of processing before withdrawal.",
    ]},
    { heading: "8. Browser controls", paragraphs: [
      "Most browsers allow you to block or delete cookies. Blocking strictly necessary storage may prevent login and core functionality.",
    ]},
    { heading: "9. Changes", paragraphs: [
      "We may update this Cookie Policy. Material changes will be communicated via the Service or website.",
    ]},
    { heading: "10. Contact", paragraphs: [
      `${COMPANY.legalName} (VAT ${COMPANY.vat}), ${COMPANY.address}. ${COMPANY.email}. DPO: ${COMPANY.dpo}.`,
    ]},
  ],
};

const EN_DATA_DELETION = {
  title: "Data Deletion Instructions",
  updatedLabel: "Last updated",
  updated: UPDATED,
  sections: [
    { heading: "1. Overview", paragraphs: [
      `${COMPANY.legalName} (VAT ${COMPANY.vat}), trading as \"${COMPANY.tradingName}\", operates ${COMPANY.website} and the Echelon web app. This page explains how to request deletion of personal data we hold about you, including data received from Meta (Instagram) when you connect your account.`,
      "You may exercise your GDPR right to erasure (\"right to be forgotten\") using the methods below. We verify identity before processing requests to protect your account.",
    ]},
    { heading: "2. Delete Instagram-linked data only", paragraphs: [
      "If you want Echelon to stop using Instagram data but keep your Echelon account:",
    ], list: [
      "In the Echelon app: Settings → Instagram → Disconnect.",
      "On Instagram: Settings → Website permissions → Apps and websites → remove Echelon.",
      "When you remove Echelon from Instagram, Meta may send us an automated signed data-deletion request. We delete Instagram tokens, handle, synced posts, and related identifiers within 30 days (usually immediately).",
    ]},
    { heading: "3. Delete your full Echelon account", paragraphs: [
      "To permanently delete your Echelon account and associated data:",
    ], list: [
      "In the Echelon app: Settings → Account → Delete account → confirm in the in-app dialog.",
      "Or email hi@echelon.rsvp from your registered address with subject \"Delete my Echelon account\" and your username/handle. We verify ownership and complete deletion within 30 days.",
    ]},
    { heading: "4. Data deleted upon account deletion", paragraphs: [
      "Account deletion removes or anonymises, where technically feasible:",
    ], list: [
      "Account identifiers, profile data, avatar, and settings.",
      "Echelon Score, rating history, and notifications.",
      "Direct messages, posts, stories, comments, and uploaded media you authored.",
      "Friend connections, friend requests, RSVPs, and session tokens.",
      "Instagram connection data and synced Instagram content.",
      "Location and proximity records associated with your account.",
    ]},
    { heading: "5. Data we may retain", paragraphs: [
      "We may retain certain data where permitted by law:",
    ], list: [
      "Encrypted backups for up to 24 months, then automatically purged.",
      "Anonymised or aggregated data that cannot identify you.",
      "Records required for legal compliance, tax, fraud prevention, or defence of legal claims.",
      "Content lawfully copied by other users (e.g. ratings about you may remain in anonymised form tied to your deleted profile ID).",
    ]},
    { heading: "6. Meta / Instagram data-deletion callback", paragraphs: [
      "Meta requires apps to provide a customer data-deletion callback URL:",
      "https://echelon.rsvp/api/v1/instagram/deletion",
      "When you remove Echelon from Instagram, Meta POSTs a signed request to that URL. We validate the signature, delete Instagram-derived data for your account, and return a confirmation code plus a status URL on this page.",
      "If you were redirected here with ?code= in the address bar, your Instagram data removal request has been processed. Retain the confirmation code for your records.",
    ]},
    { heading: "7. Timing and verification", paragraphs: [
      "We respond to verified deletion requests within 30 days unless an extension is permitted under GDPR Article 12(3).",
      "We may ask for additional verification to prevent fraudulent deletion of another person's account.",
    ]},
    { heading: "8. Contact", paragraphs: [
      `${CONTACT_LINE} For data protection requests: ${COMPANY.email}.`,
    ]},
  ],
};

const LEGAL = {
  en: {
    privacy: EN_PRIVACY,
    terms: EN_TERMS,
    cookies: EN_COOKIES,
    data_deletion: EN_DATA_DELETION,
  },
};

/* -------------------------------------------------------------------------- */
/*  Localized documents — full professional translations                      */
/* -------------------------------------------------------------------------- */

function addLocale(lang, privacy, terms, cookies, data_deletion) {
  LEGAL[lang] = { privacy, terms, cookies, data_deletion };
}

addLocale("es",
  { title: "Política de Privacidad", updatedLabel: "Última actualización", updated: UPDATED, sections: [
    { heading: "1. Responsable y contacto", paragraphs: [
      `${COMPANY.legalName} (NIF ${COMPANY.vat}), comercializado como \"Echelon\", es el responsable del tratamiento cuando utiliza echelon.rsvp y la aplicación web Echelon (el \"Servicio\").`,
      `Dirección: ${COMPANY.address}. Privacidad: ${COMPANY.email}. DPO: ${COMPANY.dpo}. Legal: ${COMPANY.legalEmail}.`,
      "Tratamos datos conforme al RGPD, la Ley portuguesa 58/2019 y normativa europea de comunicaciones electrónicas.",
    ]},
    { heading: "2. Ámbito y edad", paragraphs: [
      "Esta Política se aplica a visitantes, usuarios registrados y terceros cuyos datos procesemos.",
      "El Servicio está destinado a personas de 16 años o más en el EEE/Reino Unido. Menores de 16 no pueden registrarse sin consentimiento parental verificable cuando lo exija su Estado.",
    ]},
    { heading: "3. Descripción del Servicio", paragraphs: [
      "Echelon es una plataforma social de reputación con perfil, valoraciones, Echelon Score™, amigos, feed, mensajería (texto, medios, voz), funciones de proximidad/Lens, eventos, notificaciones e integración opcional con Instagram.",
      "El Echelon Score es una métrica interna; no es un score crediticio, referencia laboral ni identificación oficial.",
    ]},
    { heading: "4. Datos personales que tratamos", paragraphs: ["Según su uso, podemos tratar:"], list: [
      "Cuenta e identidad: nombre, handle, avatar, email, identificadores Apple/Google/contraseña, estado de onboarding.",
      "Imagen de onboarding: selfie procesada por análisis automatizado para sugerencia de puntuación inicial (no identificación biométrica gubernamental).",
      "Echelon Score: puntuación, nivel, historial de valoraciones, boosts, bloqueos.",
      "Interacciones sociales: amigos, solicitudes, valoraciones, comentarios, likes, historias, feed.",
      "Mensajería: texto, fotos, vídeos, notas de voz, reacciones, mensajes temporales y view-once (no garantizamos borrado en dispositivos del destinatario).",
      "Ubicación: coordenadas cuando activa Lens/proximidad.",
      "Instagram (opcional): ID, handle, tokens, contenido sincronizado.",
      "Medios subidos, datos técnicos (IP, sesión, logs), notificaciones y consentimiento de cookies.",
    ]},
    { heading: "5. Finalidades y bases legales (Art. 6 RGPD)", paragraphs: ["Tratamos datos con base en:"], list: [
      "Contrato: prestar el Servicio y funciones solicitadas.",
      "Consentimiento: Lens/proximidad, valoraciones de desconocidos, cookies no esenciales, Instagram, visualización pública del score.",
      "Interés legítimo: seguridad, prevención de abusos, mejora del Servicio.",
      "Obligación legal: cumplimiento normativo y requerimientos de autoridades.",
    ]},
    { heading: "6. Decisiones automatizadas", paragraphs: [
      "El Echelon Score se calcula automáticamente y puede afectar funciones in-app. Derecho Art. 22 RGPD a no ser sometido a decisiones automatizadas con efectos legales similares fuera del Servicio. Las valoraciones son opiniones subjetivas de usuarios.",
    ]},
    { heading: "7. Ubicación y mensajería", paragraphs: [
      "La ubicación solo se recoge con Lens/proximidad activos. El contenido efímero puede ser capturado por destinatarios; no garantizamos su eliminación externa.",
    ]},
    { heading: "8. Destinatarios", paragraphs: ["No vendemos datos. Podemos compartir con:"], list: [
      "Alojamiento (EEE o garantías adecuadas), Apple, Google, Meta/Instagram, análisis de onboarding, ipapi.co, asesores profesionales y autoridades cuando la ley lo exija.",
    ]},
    { heading: "9. Transferencias internacionales", paragraphs: ["Garantías SCC UE o decisiones de adecuación fuera del EEE. Solicite información en hi@echelon.rsvp."]},
    { heading: "10. Conservación", paragraphs: ["Plazos:"], list: [
      "Cuenta activa: vida de la cuenta. Tras eliminación: borrado/anonymización en 30 días; copias cifradas hasta 24 meses.",
      "Logs: ~90 días. Consentimiento cookies: 24 meses.",
    ]},
    { heading: "11. Sus derechos", paragraphs: [
      "Acceso, rectificación, supresión, limitación, portabilidad, oposición, retirar consentimiento. Contacto: hi@echelon.rsvp (respuesta en un mes).",
      `Reclamación: ${COMPANY.supervisoryAuthority} o su autoridad nacional.`,
    ]},
    { heading: "12. Seguridad y menores", paragraphs: [
      "Medidas técnicas y organizativas incluido TLS. Notifique accesos no autorizados. No dirigido a menores de 16.",
    ]},
    { heading: "13. Cambios y contacto", paragraphs: [
      "Actualizaciones materiales se comunicarán en el Servicio.",
      CONTACT_LINE,
    ]},
  ]},
  { title: "Términos y Condiciones", updatedLabel: "Última actualización", updated: UPDATED, sections: [
    { heading: "1. Acuerdo", paragraphs: [
      `Estos Términos regulan echelon.rsvp y la app Echelon operada por ${COMPANY.legalName} (NIF ${COMPANY.vat}). Al usar el Servicio acepta estos Términos, Privacidad y Cookies.`,
    ]},
    { heading: "2. Servicio y avisos importantes", paragraphs: [
      "Echelon es una plataforma social de reputación. EL ECHELON SCORE Y LAS VALORACIONES SON MÉTRICAS IN-APP ÚNICAMENTE. NO SON SCORES CREDITICIOS, REFERENCIAS LABORALES, INFORMES DE CONSUMO NI IDENTIFICACIÓN OFICIAL. NO DEBE CONFIAR EN ELLOS FUERA DEL SERVICIO.",
      "Fortune Comet no garantiza exactitud ni imparcialidad de puntuaciones o contenido de usuarios.",
    ]},
    { heading: "3. Elegibilidad y cuenta", paragraphs: [
      "16+ años, información veraz, seguridad de credenciales. Podemos rechazar o verificar registros sospechosos.",
    ]},
    { heading: "4. Score, valoraciones y contenido", paragraphs: [
      "Valoraciones deben ser honestas; prohibida manipulación. Usted es responsable de su contenido. Nos otorga licencia mundial no exclusiva para alojar y procesar contenido para operar el Servicio. Podemos eliminar contenido o cuentas a nuestra discreción.",
    ]},
    { heading: "5. Uso aceptable", paragraphs: ["Prohibido:"], list: [
      "Acoso, contenido ilegal, suplantación, bots/manipulación de scores, scraping, eludir seguridad, spam, recopilar datos de otros sin consentimiento, usos ilegales de scores en empleo/vivienda/crédito.",
    ]},
    { heading: "6. Mensajería, Lens y terceros", paragraphs: [
      "Mensajes efímeros pueden ser capturados. Lens requiere permisos de ubicación. Apple, Google e Instagram tienen términos propios; no somos responsables de terceros.",
    ]},
    { heading: "7. Propiedad intelectual y cambios", paragraphs: [
      "Echelon y su marca nos pertenecen. Podemos modificar o interrumpir el Servicio.",
    ]},
    { heading: "8. Suspensión e indemnización", paragraphs: [
      "Podemos suspender cuentas por incumplimiento. Usted indemniza a Fortune Comet por reclamaciones derivadas de su conducta o contenido, en la medida permitida por ley.",
    ]},
    { heading: "9. Garantías y responsabilidad", paragraphs: [
      "Servicio \"tal cual\". Sin responsabilidad por daños indirectos. Límite agregado: 100 € o importe pagado en 12 meses. Derechos imperativos del consumidor EEE preservados.",
    ]},
    { heading: "10. Ley aplicable", paragraphs: [
      "Ley portuguesa; tribunales de Lisboa; consumidores EEE pueden demandar en su país. ODR UE: https://ec.europa.eu/consumers/odr",
      CONTACT_LINE,
    ]},
  ]},
  { title: "Política de Cookies", updatedLabel: "Última actualización", updated: UPDATED, sections: [
    { heading: "1. Introducción", paragraphs: [`${COMPANY.legalName} (NIF ${COMPANY.vat}) usa cookies y almacenamiento local conforme ePrivacy y RGPD.`]},
    { heading: "2. Categorías", paragraphs: ["Necesarias, funcionales (consentimiento), analíticas (no desplegadas), marketing (ninguna)."]},
    { heading: "3. Almacenamiento", paragraphs: ["Elementos:"], list: [
      "echelon-cookie-consent (necesaria, 24 meses), echelon-lang (funcional), echelon-token (sesión), echelon-chat-inbox, echelon-feed-ix, echelon-install-dismiss.",
    ]},
    { heading: "4. Terceros y consentimiento", paragraphs: [
      "Google Fonts, ipapi.co, OAuth Apple/Google/Instagram. Banner: Aceptar/Rechazar/Preferencias. Retirar en Ajustes de cookies.",
      `${COMPANY.legalName}, ${COMPANY.address}. ${COMPANY.email}.`,
    ]},
  ]},
  { title: "Instrucciones de eliminación de datos", updatedLabel: "Última actualización", updated: UPDATED, sections: [
    { heading: "1. Resumen", paragraphs: [`${COMPANY.legalName} (NIF ${COMPANY.vat}) explica cómo solicitar eliminación de datos, incluidos datos de Meta (Instagram).`]},
    { heading: "2. Solo Instagram", paragraphs: ["App: Ajustes → Instagram → Desconectar. Instagram: eliminar Echelon de apps autorizadas."]},
    { heading: "3. Eliminar cuenta", paragraphs: ["App: Ajustes → Cuenta → Eliminar cuenta. O email hi@echelon.rsvp con asunto \"Eliminar mi cuenta Echelon\"."]},
    { heading: "4. Datos eliminados y retenidos", paragraphs: [
      "Eliminamos perfil, score, mensajes, publicaciones, amigos, tokens e Instagram. Backups cifrados hasta 24 meses; datos anonimizados o exigidos por ley pueden conservarse.",
    ]},
    { heading: "5. Callback Meta", paragraphs: [
      "URL: https://echelon.rsvp/api/v1/instagram/deletion — procesamos solicitudes firmadas y devolvemos código de confirmación. ?code= indica procesamiento completado.",
      CONTACT_LINE,
    ]},
  ]},
);

addLocale("pt",
  { title: "Política de Privacidade", updatedLabel: "Última atualização", updated: UPDATED, sections: [
    { heading: "1. Responsável pelo tratamento", paragraphs: [
      `A ${COMPANY.legalName} (NIF ${COMPANY.vat}), comercializada como \"Echelon\", é responsável pelo tratamento de dados pessoais quando utiliza echelon.rsvp e a aplicação web Echelon (o \"Serviço\").`,
      `Morada: ${COMPANY.address}. Privacidade: ${COMPANY.email}. Encarregado de Proteção de Dados: ${COMPANY.dpo}. Jurídico: ${COMPANY.legalEmail}.`,
      "Tratamos dados em conformidade com o RGPD, a Lei n.º 58/2019 e a legislação europeia aplicável.",
    ]},
    { heading: "2. Âmbito e idade", paragraphs: [
      "Esta Política aplica-se a visitantes, utilizadores registados e terceiros cujos dados tratemos.",
      "O Serviço destina-se a maiores de 16 anos no EEE/Reino Unido. Menores de 16 não podem criar conta sem consentimento parental verificável quando exigido.",
    ]},
    { heading: "3. Descrição do Serviço", paragraphs: [
      "Echelon é uma plataforma social de reputação com perfil, avaliações, Echelon Score™, amigos, feed, mensagens (texto, media, voz), Lens/proximidade, eventos, notificações e ligação opcional ao Instagram.",
      "O Echelon Score é uma métrica interna; não constitui score de crédito, referência emprego ou identificação oficial.",
    ]},
    { heading: "4. Dados pessoais tratados", paragraphs: ["Conforme utilização:"], list: [
      "Conta: nome, handle, avatar, email, identificadores Apple/Google/password, onboarding.",
      "Selfie de onboarding: análise automatizada para sugestão de pontuação (não identificação biométrica estatal).",
      "Echelon Score, avaliações, interações sociais, mensagens (incl. efémeras/view-once), localização (Lens), Instagram, media, dados técnicos, notificações, cookies.",
    ]},
    { heading: "5. Finalidades e bases legais", paragraphs: ["Art. 6.º RGPD:"], list: [
      "Contrato, consentimento (funcionalidades opcionais), interesse legítimo (segurança), obrigação legal.",
    ]},
    { heading: "6. Decisões automatizadas", paragraphs: [
      "Score calculado automaticamente; direito Art. 22.º RGPD; avaliações são opiniões de utilizadores.",
    ]},
    { heading: "7. Localização e mensagens", paragraphs: [
      "Localização apenas com Lens/proximidade ativos. Conteúdo efémero pode ser capturado por destinatários.",
    ]},
    { heading: "8. Destinatários e transferências", paragraphs: [
      "Sem venda de dados. Alojamento, Apple, Google, Meta, ipapi.co, autoridades. Garantias adequadas fora do EEE.",
    ]},
    { heading: "9. Conservação", paragraphs: [
      "Conta ativa: enquanto existir. Após eliminação: 30 dias + backups até 24 meses. Logs ~90 dias.",
    ]},
    { heading: "10. Direitos", paragraphs: [
      "Acesso, retificação, apagamento, limitação, portabilidade, oposição, retirar consentimento. hi@echelon.rsvp.",
      `Reclamação: ${COMPANY.supervisoryAuthority}.`,
    ]},
    { heading: "11. Segurança, menores e alterações", paragraphs: [
      "TLS e medidas organizativas. Não dirigido a menores de 16. Alterações comunicadas no Serviço.",
      CONTACT_LINE,
    ]},
  ]},
  { title: "Termos e Condições", updatedLabel: "Última atualização", updated: UPDATED, sections: [
    { heading: "1. Acordo", paragraphs: [
      `Estes Termos regulam echelon.rsvp operado pela ${COMPANY.legalName} (NIF ${COMPANY.vat}). Ao usar o Serviço aceita Termos, Privacidade e Cookies.`,
    ]},
    { heading: "2. Serviço e avisos", paragraphs: [
      "O ECHELON SCORE E AVALIAÇÕES SÃO APENAS MÉTRICAS IN-APP. NÃO SÃO SCORES DE CRÉDITO, REFERÊNCIAS PROFISSIONAIS OU IDENTIFICAÇÃO OFICIAL. NÃO CONFIE NELES FORA DO SERVIÇO.",
      "A Fortune Comet não garante exatidão de pontuações ou conteúdo de utilizadores.",
    ]},
    { heading: "3. Elegibilidade e conta", paragraphs: ["16+ anos. Informação verídica. Segurança das credenciais."]},
    { heading: "4. Score, conteúdo e conduta", paragraphs: [
      "Avaliações honestas; proibida manipulação. Licença para alojar conteúdo submetido. Podemos remover conteúdo/contas. Uso proibido: assédio, ilegalidades, bots, scraping, abuso de localização.",
    ]},
    { heading: "5. Mensagens, Lens, terceiros", paragraphs: [
      "Mensagens efémeras podem ser copiadas. Apple/Google/Instagram: termos próprios.",
    ]},
    { heading: "6. PI, disponibilidade, suspensão", paragraphs: [
      "Marcas e software protegidos. Serviço pode ser modificado. Suspensão por incumprimento.",
    ]},
    { heading: "7. Indemnização e responsabilidade", paragraphs: [
      "Indemniza a Fortune Comet por reclamações da sua conduta/conteúdo. Serviço \"como está\". Responsabilidade máxima: 100 €. Direitos imperativos do consumidor preservados.",
    ]},
    { heading: "8. Lei aplicável", paragraphs: [
      "Lei portuguesa; tribunais de Lisboa; consumidores EEE podem litigar no seu país. ODR: https://ec.europa.eu/consumers/odr",
      CONTACT_LINE,
    ]},
  ]},
  { title: "Política de Cookies", updatedLabel: "Última atualização", updated: UPDATED, sections: [
    { heading: "1. Introdução", paragraphs: [`Cookies e armazenamento local conforme ePrivacy e RGPD — ${COMPANY.legalName} (NIF ${COMPANY.vat}).`]},
    { heading: "2. Categorias e itens", paragraphs: ["Necessárias, funcionais, analíticas (não usadas), marketing (nenhum)."], list: [
      "echelon-cookie-consent, echelon-lang, echelon-token, echelon-chat-inbox, echelon-feed-ix, echelon-install-dismiss.",
    ]},
    { heading: "3. Consentimento", paragraphs: [
      "Banner inicial; retirar em Definições de cookies. Google Fonts, ipapi.co, OAuth.",
      `${COMPANY.address}. ${COMPANY.email}.`,
    ]},
  ]},
  { title: "Instruções de eliminação de dados", updatedLabel: "Última atualização", updated: UPDATED, sections: [
    { heading: "1. Resumo", paragraphs: [`${COMPANY.legalName} (NIF ${COMPANY.vat}) — como eliminar dados, incluindo Meta/Instagram.`]},
    { heading: "2. Apenas Instagram", paragraphs: ["Definições → Instagram → Desligar; remover Echelon no Instagram."]},
    { heading: "3. Eliminar conta", paragraphs: ["Definições → Conta → Eliminar conta; ou hi@echelon.rsvp."]},
    { heading: "4. Dados e callback Meta", paragraphs: [
      "Eliminamos perfil, score, mensagens, media, amigos, tokens. Backups até 24 meses.",
      "Callback: https://echelon.rsvp/api/v1/instagram/deletion. ?code= confirma processamento.",
      CONTACT_LINE,
    ]},
  ]},
);

addLocale("fr",
  { title: "Politique de Confidentialité", updatedLabel: "Dernière mise à jour", updated: UPDATED, sections: [
    { heading: "1. Responsable", paragraphs: [
      `${COMPANY.legalName} (TVA ${COMPANY.vat}), Echelon. ${COMPANY.address}. ${COMPANY.email}. DPO : ${COMPANY.dpo}.`,
      "Conformité RGPD et droit portugais.",
    ]},
    { heading: "2. Champ et âge", paragraphs: ["16 ans minimum EEE/R-U."]},
    { heading: "3. Service", paragraphs: [
      "Plateforme sociale de réputation : profil, score, amis, fil, messagerie, Lens/proximité, événements, Instagram optionnel. Score interne uniquement.",
    ]},
    { heading: "4. Données", paragraphs: ["Compte, onboarding, score, interactions, messages éphémères, localisation, Instagram, technique, notifications."]},
    { heading: "5. Bases légales", paragraphs: ["Contrat, consentement, intérêt légitime, obligation légale (Art. 6 RGPD)."]},
    { heading: "6. Profilage", paragraphs: ["Score automatisé ; Art. 22 RGPD ; avis subjectifs des utilisateurs."]},
    { heading: "7. Destinataires et transferts", paragraphs: ["Hébergeurs, Apple, Google, Meta, ipapi.co. SCC UE si hors EEE. Pas de vente."]},
    { heading: "8. Conservation et droits", paragraphs: [
      "Compte + 30 jours après suppression ; backups 24 mois. Accès, rectification, effacement : hi@echelon.rsvp.",
      `Réclamation : ${COMPANY.supervisoryAuthority}.`,
    ]},
    { heading: "9. Contact", paragraphs: [CONTACT_LINE] },
  ]},
  { title: "Conditions Générales", updatedLabel: "Dernière mise à jour", updated: UPDATED, sections: [
    { heading: "1. Accord", paragraphs: ["Utilisation = acceptation CGU, Confidentialité, Cookies."]},
    { heading: "2. Avertissements", paragraphs: [
      "LE SCORE ECHELON N'EST PAS UN SCORE DE CRÉDIT NI UNE RÉFÉRENCE OFFICIELLE. Ne pas s'y fier hors du Service.",
    ]},
    { heading: "3. Compte et contenu", paragraphs: ["16+. Licence de contenu. Interdiction harcèlement, fraude, bots."]},
    { heading: "4. Responsabilité", paragraphs: [
      "Service « en l'état ». Plafond 100 €. Indemnisation utilisateur. Droit impératif consommateur préservé.",
    ]},
    { heading: "5. Droit applicable", paragraphs: ["Portugal ; tribunaux de Lisbonne. RLL : https://ec.europa.eu/consumers/odr", CONTACT_LINE] },
  ]},
  { title: "Politique Cookies", updatedLabel: "Dernière mise à jour", updated: UPDATED, sections: [
    { heading: "1. Introduction", paragraphs: ["Cookies et stockage local — ePrivacy et RGPD."]},
    { heading: "2. Catégories et stockage", paragraphs: ["Nécessaires, fonctionnels, pas d'analytiques/marketing."], list: [
      "echelon-cookie-consent, echelon-lang, echelon-token, echelon-chat-inbox, echelon-feed-ix.",
    ]},
    { heading: "3. Contact", paragraphs: [`${COMPANY.address}. ${COMPANY.email}.`] },
  ]},
  { title: "Instructions de suppression des données", updatedLabel: "Dernière mise à jour", updated: UPDATED, sections: [
    { heading: "1. Aperçu", paragraphs: ["Suppression des données Echelon et Instagram."]},
    { heading: "2. Méthodes", paragraphs: ["Réglages → Instagram → Déconnecter ; Réglages → Supprimer le compte ; ou hi@echelon.rsvp."]},
    { heading: "3. Callback Meta", paragraphs: ["https://echelon.rsvp/api/v1/instagram/deletion", CONTACT_LINE] },
  ]},
);

addLocale("de",
  { title: "Datenschutzerklärung", updatedLabel: "Zuletzt aktualisiert", updated: UPDATED, sections: [
    { heading: "1. Verantwortlicher", paragraphs: [
      `${COMPANY.legalName} (USt.-IdNr. ${COMPANY.vat}), Echelon. ${COMPANY.address}. ${COMPANY.email}. DSB: ${COMPANY.dpo}.`,
      "DSGVO und portugiesisches Recht.",
    ]},
    { heading: "2. Geltungsbereich", paragraphs: ["Ab 16 Jahren im EWR/Vereinigtes Königreich."]},
    { heading: "3. Dienst", paragraphs: [
      "Soziale Reputationsplattform: Profil, Score, Freunde, Feed, Nachrichten, Lens/Nähe, Events, optionales Instagram. Score nur in-app.",
    ]},
    { heading: "4. Datenkategorien", paragraphs: ["Konto, Onboarding-Bild, Score, Interaktionen, Nachrichten, Standort, Instagram, Technik, Benachrichtigungen."]},
    { heading: "5. Rechtsgrundlagen", paragraphs: ["Vertrag, Einwilligung, berechtigtes Interesse, Rechtspflicht (Art. 6 DSGVO)."]},
    { heading: "6. Automatisierung", paragraphs: ["Automatischer Score; Art. 22 DSGVO; Bewertungen sind Nutzermeinungen."]},
    { heading: "7. Empfänger und Speicherung", paragraphs: [
      "Hosting, Apple, Google, Meta, ipapi.co. Kein Verkauf. Konto + 30 Tage nach Löschung; Backups 24 Monate.",
    ]},
    { heading: "8. Rechte", paragraphs: [
      "Auskunft, Berichtigung, Löschung: hi@echelon.rsvp.",
      `Beschwerde: ${COMPANY.supervisoryAuthority}.`,
      CONTACT_LINE,
    ]},
  ]},
  { title: "Allgemeine Geschäftsbedingungen", updatedLabel: "Zuletzt aktualisiert", updated: UPDATED, sections: [
    { heading: "1. Vertrag", paragraphs: ["Nutzung = Zustimmung zu AGB, Datenschutz, Cookies."]},
    { heading: "2. Haftungsausschluss", paragraphs: [
      "ECHELON SCORE IST KEIN KREDITSCORE ODER BEHÖRDLICHE BEWERTUNG. Keine Verlass außerhalb des Dienstes.",
    ]},
    { heading: "3. Nutzung", paragraphs: ["16+. Ehrliche Bewertungen. Kein Missbrauch, Bots, Scraping. Inhaltslizenz an Fortune Comet."]},
    { heading: "4. Haftung", paragraphs: [
      "„Wie besehen“. Maximal 100 €. Freistellung durch Nutzer. Verbraucherrechte bleiben.",
    ]},
    { heading: "5. Recht", paragraphs: ["Portugiesisches Recht; Gerichte Lissabon. ODR: https://ec.europa.eu/consumers/odr", CONTACT_LINE] },
  ]},
  { title: "Cookie-Richtlinie", updatedLabel: "Zuletzt aktualisiert", updated: UPDATED, sections: [
    { heading: "1. Einleitung", paragraphs: ["Cookies und Local Storage — ePrivacy und DSGVO."]},
    { heading: "2. Speicher", paragraphs: ["echelon-cookie-consent, echelon-lang, echelon-token, echelon-chat-inbox, echelon-feed-ix."]},
    { heading: "3. Kontakt", paragraphs: [`${COMPANY.email}. ${COMPANY.address}.`] },
  ]},
  { title: "Anleitung zur Datenlöschung", updatedLabel: "Zuletzt aktualisiert", updated: UPDATED, sections: [
    { heading: "1. Überblick", paragraphs: ["Löschung von Echelon- und Instagram-Daten."]},
    { heading: "2. Methoden", paragraphs: ["Einstellungen → Instagram trennen; Konto löschen; oder hi@echelon.rsvp."]},
    { heading: "3. Meta-Callback", paragraphs: ["https://echelon.rsvp/api/v1/instagram/deletion", CONTACT_LINE] },
  ]},
);

if (typeof window !== "undefined") {
  window.EchelonLegal = {
    COOKIE_CONSENT_KEY, COOKIE_CONSENT_VERSION,
    getCookieConsent, saveCookieConsent, hasCookieConsent,
    getLegalDoc, renderLegalHtml, renderLegalBodyHtml,
  };
}
