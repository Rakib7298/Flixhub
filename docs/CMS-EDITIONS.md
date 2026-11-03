# WordPress and Blogger editions

These editions are discovery clients for a separately deployed MediaMatrix application. They are not backend ports and must not be described as containing PostgreSQL, Next.js server APIs, Auth.js accounts, playlists, Jellyfin, or FFmpeg.

## Public API contract

The primary application exposes read-only:

- `GET /api/public/discover?type=movie|tv&page=1`
- `GET /api/public/search?q=...&page=1`
- `GET /api/public/title?type=movie|tv&id=...&country=BD`

Successful title responses contain `media` and `availability`; normalized provider entries are in `availability.offers`. These routes return honest 503 errors when TMDB is not configured and allow cross-origin GET requests without credentials. No API keys or user data are exposed.

## WordPress theme

1. Deploy MediaMatrix and verify the public endpoints return real data.
2. Install `mediamatrix-v1.0.0-wordpress.zip` under **Appearance → Themes → Add New → Upload Theme** and activate it.
3. Open **Appearance → MediaMatrix**.
4. Set Public API base URL to `https://YOUR_APP/api/public` and Primary application URL to `https://YOUR_APP`.
5. Test discovery, catalog switching, search, title details, official provider links, and the primary-app link on desktop/mobile.

The theme uses WordPress REST endpoints as a fixed-path server proxy. It enforces HTTPS settings, rejects embedded credentials, disables redirects, limits response size/time, and applies a basic per-IP transient throttle. No TMDB key belongs in WordPress settings. Production reverse-proxy and edge-rate-limit configuration remains necessary.

Source: `packages/cms-editions/wordpress/mediamatrix`.

## Blogger XML

1. Open `mediamatrix-v1.0.0-blogger.xml` in a text editor.
2. Replace exactly `https://your-mediamatrix-app.example.com/api/public` in the `data-api-base` attribute with the deployed HTTPS API base.
3. Back up the existing Blogger theme, then upload the XML through Blogger theme restoration/editing.
4. Verify discovery, search, title details, provider links, mobile layout, and browser console/CORS behavior.

Until configured, the template shows a setup requirement instead of sample titles. Blogger must reach the public API over HTTPS; the primary application supplies public read-only CORS headers. Blogger's own theme parser/runtime can change, so installation remains an environment-specific verification step.

Source: `packages/cms-editions/blogger/mediamatrix-blogger.xml`.

## Data and rendering safety

Both clients create DOM elements and assign API text through `textContent`, not interpolated HTML. Provider links accept only HTTP(S) URLs and use `noopener noreferrer`. Image paths are accepted only in the expected TMDB `/...` form. No availability is inferred when the provider is unconfigured or returns no offers.
