# Dexter → Nuvio experimental provider

This is an experimental, unverified provider package for Nuvio. It uses the Nuvio
`getStreams(tmdbId, mediaType, season, episode)` interface and attempts to find
direct MP4/HLS URLs exposed in Dexter page markup.

## Important limitations
- It is not a hosted plugin repository and does not include a public install URL.
- The site’s current player may load streams dynamically, require tokens, use DRM,
  or put the stream in a third-party iframe. This implementation will return no
  streams in those cases.
- It does not bypass DRM, logins, encryption, or access controls.
- The site’s page URL scheme may require a slug; this is a best-effort first pass.
- Must be tested in Nuvio's Plugin Tester; the website’s live stream could not be
  verified from this environment.

## Files
- `manifest.json`
- `providers/dexter.js`

## Official Nuvio provider documentation
https://github.com/yoruix/nuvio-providers/blob/template/DOCUMENTATION.md

A real repository installation URL requires publishing these files to a GitHub
repository (or another host supported by your Nuvio build). This ZIP alone is
not an installable repository URL.
