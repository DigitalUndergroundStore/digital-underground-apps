# digital-underground-apps
Phone versions of Digital Underground tools, served by GitHub Pages.

- `session-forge/`: Session Forge v2.1. The tools are inside `app.bin`, encrypted with AES-256-GCM (key = PBKDF2-SHA256, 250k rounds, from the buyer code). Buyers get the code in the "On your phone" PDF that ships with their purchase. The HTML files here are just unlock screens.
- `box-and-go/`: Box & Go v1.1 (moving planner).
- `due-desk/`: Due Desk v1.1 (assignment tracker).
- `exam-desk/`: Exam Desk v1.1 (finals study toolkit).
- `focus-gate/`: Focus Gate v1.1 (deep-work focus timer).
- `hook-bank/`: Hook Bank v3.1 (social hook generator).
- `invoice-desk/`: Invoice Desk v1.1 (invoice builder).
- `launch-ledger/`: Launch Ledger v1.1 (money OS for solo operators).
- `offer-desk/`: Offer Desk v1.1 (one-page offer builder).
- `packlane/`: Packlane v1.1 (travel packing lists).
- `pantry-week/`: Pantry Week v2.0.1 (meal planner + shopping list).
- `promo-lane/`: Promo Lane v1.1 (promo starter kit).
- `rate-wire/`: Rate Wire v1.1 (freelance rate calculator).
- `reply-forge/`: Reply Forge v1.1 (customer reply builder).
- `scope-lock/`: Scope Lock v1.1 (client brief generator).
- `streak-kit/`: Streak Kit v1.1 (habit tracker).
- `cork/`: maintained separately (not built by these scripts).
- `planetview/`: maintained separately (not built by these scripts).

Every app folder works the same way as `session-forge/`: the tool is only inside the encrypted `app.bin`, each product has its own buyer code (shipped in that product's "On your phone" PDF), and the HTML files are unlock screens.

`session-forge/` is built by `/workspace/session-forge/v2.1/tools/build-hosted.py`. Every other app folder, plus this README, is built by `/workspace/digital-underground/apps-site/tools/build-product.py`. The public root `index.html` redirects to `/store/`. The app list lives at `apps/index.html`. If a build script rewrites the root, put the app list back in `apps/` and restore the store redirect. Don't edit app folders by hand.
