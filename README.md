# mochreach.dev

The website for Mo Chreach! Music Technology, served by GitHub Pages with Jekyll (no build step).

- `index.html`: the home page. `privacy.md`: the privacy policy (Google's OAuth consent screen links to it).
- `_data/videos.json`, `_data/channel.json`: the channel's public videos. Refresh with
  `python3 scripts/update_videos.py` (uses yt-dlp, or `nix run nixpkgs#yt-dlp`), then commit.
- `_data/projects.yml`: the projects section.
- `assets/`: CSS, JS, fonts (Rubik and IBM Plex Mono, OFL) and logos.

Preview locally: `nix shell nixpkgs#jekyll -c jekyll serve` (the GitHub Pages plugins are optional locally).
