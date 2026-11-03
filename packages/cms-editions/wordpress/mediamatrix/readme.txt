=== MediaMatrix ===
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 1.0.0
License: MIT

A cinematic discovery presentation for a separately deployed MediaMatrix application.

== Installation ==
1. Deploy and configure MediaMatrix with TMDB_ACCESS_TOKEN.
2. Install this theme ZIP in Appearance → Themes → Add New → Upload Theme.
3. Activate MediaMatrix.
4. Open Appearance → MediaMatrix.
5. Set Public API base URL to https://your-app.example.com/api/public and Primary application URL to https://your-app.example.com.
6. Test discovery and search on the site front end.

== Scope and security ==
This is not a Next.js, PostgreSQL, account, playlist, or FFmpeg implementation. It exposes read-only public discovery through WordPress REST endpoints. WordPress makes fixed-path HTTPS requests with redirects disabled, response limits, timeouts, and basic per-IP throttling. Configure reverse-proxy IP handling and additional edge rate limits for production. Never put TMDB, administrator, Jellyfin, or transcoder credentials in theme settings.

== Changelog ==
= 1.0.0 =
Initial presentation edition with real discovery, search, details, and official provider links.
