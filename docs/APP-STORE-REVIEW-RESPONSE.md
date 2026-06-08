# App Store Review Response

Use this response in App Store Connect Resolution Center.

## Reply To App Review

Hello App Review Team,

Thank you for the feedback. We updated the app, Privacy Policy, Cookie Policy, and App Review Notes to clarify face-data handling, cookie usage, and where to locate the 24-hour rating feature.

### Guideline 2.1 - Face Data

**What face data does the app collect?**

Echelon collects only the selfie/profile photo that the user voluntarily submits during onboarding or a one-time retry. The submitted image may contain the user's face.

Echelon does **not** collect Apple Face ID data, biometric face templates, faceprints, facial geometry measurements, liveness maps, depth maps, or government ID data.

**Planned uses of collected face data**

The submitted image is used only for:

- Creating the user's profile avatar.
- Requesting an automated image-analysis score suggestion used as the user's initial in-app Echelon Score.

The Echelon Score is an in-app entertainment/community metric only. It is not used for identity verification, credit, employment, housing, insurance, legal decisions, or access to real-world services.

**Will face data be shared with third parties? Where is it stored?**

The submitted image may be sent to an AI/image-analysis processor configured for the Service solely to return the onboarding score suggestion. Echelon does not sell face data, share it with data brokers, use it for advertising, use it to track users across apps/websites, or share it with Meta/Instagram, Google, or Apple except when the user separately chooses those services for sign-in or account connection.

The uploaded image is stored on Echelon-controlled server storage as the user's profile avatar. The numeric score result and score history are stored in the Echelon database. No biometric template or faceprint is stored by Echelon.

**How long is face data retained?**

The profile avatar is retained while the account is active or until the user replaces/deletes it. After account deletion, face images and account data are deleted or anonymised within 30 days. Encrypted backups may persist up to 24 months for security and disaster recovery, then are purged. Server/security logs are typically retained up to 90 days.

**Where is this explained in the Privacy Policy?**

Privacy Policy section: **"4A. Face data collection, use, sharing, storage, and retention"**

Specific quoted text:

> What face data we collect: during onboarding or a one-time retry, you may submit a selfie/profile photo. The submitted image may contain your face. We do not collect Apple Face ID data, biometric face templates, faceprints, facial geometry measurements, liveness maps, depth maps, or government ID data.

> How we use face data: the submitted image is used only to create your profile avatar and to request an automated image-analysis score suggestion used as your initial in-app Echelon Score. The score is an entertainment/community metric inside Echelon only and is not used for identity verification, access to real-world services, credit, employment, housing, insurance, or legal decisions.

> Third parties and sharing: we may send the submitted image to an AI/image-analysis processor configured for the Service solely to return the score suggestion. We do not sell face data, share it with data brokers, use it for advertising, use it to track users across apps or websites, or share it with Meta/Instagram, Google, or Apple except where you separately choose those providers for sign-in or account connection.

> Storage: the uploaded image is stored on Echelon-controlled server storage as your profile avatar unless you replace it or delete your account. The numeric score result and score history are stored in our database as account/reputation data. We do not store a biometric template or faceprint.

> Retention: your profile avatar is retained while your account is active or until you replace/delete it. After account deletion, face images and account data are deleted or anonymised within 30 days; encrypted backups may persist for up to 24 months for security and disaster recovery, then are purged. Server/security logs are typically retained up to 90 days.

### Guideline 5.1.2(i) - Cookies / Tracking

Echelon does not use cookies, local storage, or web content for advertising, data brokerage, or cross-app/cross-site tracking. We do not link app data with third-party data for advertising and do not share cookie data with data brokers.

We updated the cookie banner and Cookie Policy to clarify that storage is used only for strictly necessary app operation and optional functional preferences. Analytics are not currently deployed.

Specific quoted text from Cookie Policy:

> We do not use cookies, local storage, or web content in the app for advertising, data brokerage, or tracking users across other companies' apps or websites.

> Tracking/advertising: not used. We do not link app data with third-party data for advertising and do not share cookie data with data brokers.

Because the app does not track users as defined by App Tracking Transparency, ATT is not requested.

### Guideline 2.3 - Accurate Metadata / 24-Hour Rating

The "Rate others once every 24 hours" feature is implemented and available in the app.

How to locate it:

1. Sign in with the App Review account.
2. Open the **Map/Lens** tab. Lens is on by default.
3. Followed users with Lens on appear on the map. Tap a user, then tap **Rate**.
4. Submit a star rating. The same user is then blocked by the 24-hour direct rating cooldown.
5. The same 24-hour direct rating cooldown also applies after chat/call/video-call ratings.

Media ratings are separate:

1. Open **Feed**.
2. Single-tap a post to open empty stars.
3. Tap a star to rate that media item.
4. Media ratings are independent and do not consume the direct person-rating 24-hour cooldown.

Thank you.

Echelon Support  
hi@echelon.rsvp

## App Store Connect Instructions

1. Upload a new build after deploying these web/API changes.
2. In **App Store Connect -> My Apps -> Echelon -> App Review Information**, update the Notes field using `store-listing/en-US/app-review-info.txt`.
3. In **Resolution Center**, paste the reply above.
4. Confirm App Privacy answers do **not** say the app tracks users for advertising. The app uses functional storage only and does not implement ATT because no tracking is performed.
5. Confirm Privacy Policy URL points to `https://echelon.rsvp/app/privacy.html`.
6. Confirm the submitted build loads the updated web app and privacy/cookie pages.
