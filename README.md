# WW3 Grid Tactics

A local two-player browser prototype for a fictional near-future combined-arms tactics game.

Serve this directory with `python -m http.server 8000` and open `http://localhost:8000`. Choose a faction and three cards per player. Players share a screen and alternate turns. Deploy from your map edge, contest the two objectives, and reach eight victory points.

The US, China, Russia, and EU Coalition share unit stats for this first balance pass. Infantry get cover in woods and towns, vehicles spend extra movement in woods, and artillery can fire only from a stationary position. Reinforcements act starting on their next turn.

`rules.mjs` holds the game state and rules without browser dependencies. `game.mjs` handles setup, rendering, and input. The game uses relative asset paths and needs no build step. To publish on GitHub Pages, configure the repository to deploy from the root of its default branch. Check the Pages visibility before publishing a private repository.
