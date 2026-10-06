# digital-underground-apps
Phone versions of Digital Underground tools, served by GitHub Pages.

- `session-forge/`: Session Forge v2.1. The tools are inside `app.bin`, encrypted with AES-256-GCM (key = PBKDF2-SHA256, 250k rounds, from the buyer code). Buyers get the code in the "On your phone" PDF that ships with their purchase. The HTML files here are just unlock screens.

Built by `/workspace/session-forge/v2.1/tools/build-hosted.py`. Don't edit `session-forge/` by hand.
