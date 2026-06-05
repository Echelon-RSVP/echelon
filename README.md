# Echelon

**Your reputation, measured.**

Echelon is a social reputation app where your score moves through real interactions: posts, stories, messages, and ratings from people who know you.

- **Live app:** [echelon.rsvp/app/](https://echelon.rsvp/app/)
- **Marketing:** [echelon.rsvp](https://echelon.rsvp/)
- **Support:** hi@echelon.rsvp
- **Privacy:** [Privacy policy](https://echelon.rsvp/app/docs.html#privacy)

## Product

| Item | Value |
|------|-------|
| Bundle ID | `rsvp.echelon.app` |
| Category | Social Networking |
| Platform | iOS (Capacitor shell) + web PWA |

## Features

- Feed, stories, and portfolio
- Direct messages (photos, voice, video)
- Discover people on the map
- Rate others when eligible (24h cooldown)
- Friends, blocks, and privacy controls

## Development

```powershell
npm install
npm run dev          # local web app
npm run build        # production build
npm run deploy:app   # deploy web to echelon.rsvp
```

## iOS App Store (free, from Windows)

1. Add GitHub Actions secrets (see [store-listing/BUILD-FREE.md](store-listing/BUILD-FREE.md))
2. **Actions** → **iOS App Store build** → **Run workflow**
3. Upload screenshots from `store-listing/screenshots/`

Store copy: `store-listing/en-US/`  
Organization profile fields: `store-listing/organization-github-profile.txt`

## License

Copyright 2026 Echelon
