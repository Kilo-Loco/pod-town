# Pod Town

A shared pixel-art town for a public screen. People scan a QR code, build a
character on their phone, and tell it what to do in plain language ("train a model at the gym,
then fish for data"). Characters walk there and spend real minutes on the
activity. Finished activities earn raffle tickets, and a raffle draws at the top
of every hour.

All art is original and drawn in code (`public/art.js`); there are no image assets.

## Run it

Needs [Deno](https://deno.com) 2.x. No install step.

```bash
cp .env.example .env
```

```bash
deno task start
```

| Page | URL | For |
| --- | --- | --- |
| Big screen | `http://localhost:8080/` | The public display (put it in fullscreen) |
| Player | `/play` | What the QR code opens on phones |
| Admin | `/admin` | Winners, CSV export, manual draw, remove players |

`deno task demo` runs everything 30x faster for testing.

Phones must be able to reach the server. On shared Wi-Fi the default LAN
address works; for a real event, host it behind HTTPS and set `PUBLIC_URL`.

## Hosting on a Runpod CPU Pod

Every push to `main` builds `ghcr.io/kilo-loco/pod-town:latest` (see
`.github/workflows/image.yml`). The Pod runs that image with:

- port `8080/http` exposed, which gives `https://<pod-id>-8080.proxy.runpod.net`
- a network volume mounted at `/data` for the save file
- `ADMIN_TOKEN` set as an environment variable (plus any raffle or LLM settings)

`PUBLIC_URL` is worked out from the Pod ID automatically. Run exactly one Pod:
the town lives in that server's memory. To ship a new version, push to `main`,
wait for the build, then restart the Pod so it pulls the new image.

## How it plays

| Activity | Place | Time | Tickets | Reward |
| --- | --- | --- | --- | --- |
| Train a model | Training Gym | 6 min | 2 | Models, 10 coins |
| Deploy an endpoint | Runpod HQ | 15 min | 3 | Deployments, 30 coins, big XP |
| Play in the sandbox | Sandbox | 3 min | 1 | Silly experiments |
| Run benchmarks | Benchmark Arcade | 3 min | 1 | Chase the town benchmark record |
| Fish for datasets | Data Lake | 3 min | 1 | Datasets of varying rarity, coins |
| Grow GPUs | GPU Farm | 8 min | 2 | GPUs, coins |
| Read papers | Library | 4 min | 1 | Collect 12 papers |
| Warm up | Cache Cafe | 2 min | 1 | No cold start: next activity 25% faster |
| Get swag | Swag Shop | 2 min | 1 | Unlock an accessory for 25 coins |
| Network | Plaza | 2 min | 1 | Meet other players |

Characters keep going while the phone is closed, so players come back to see
what happened. Up to three activities can be queued in one prompt.

## Raffle

- Draws automatically at the top of each hour (and on demand from `/admin`).
- Odds are weighted by tickets earned that hour; tickets reset after each draw.
- By default each character can win once (`RAFFLE_ONE_WIN`). Nothing stops one
  person making several characters, so enforce one prize per person at the booth.
- The game collects no email or other contact details. A winner's phone shows a
  six-character claim code. They show it at the booth; staff look the code up in
  `/admin`, hand over the prize, and mark it given.
- Codes can be collected for `CLAIM_HOURS` after the draw (staff can still mark a
  late one given).

## Prompt AI

Set `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` in `.env` to any
OpenAI-compatible chat endpoint, such as a Runpod Serverless vLLM worker
(`https://api.runpod.ai/v2/<ENDPOINT_ID>/openai/v1`). Keep at least one active
worker so cold starts do not exceed `LLM_TIMEOUT_MS`. If the endpoint is unset,
slow, or returns something unusable, the game falls back to keyword matching, so
prompts always work.

The model only chooses from the fixed activity list and writes one short speech
bubble, which is length-capped and word-filtered before it reaches the screen.

## Files

- `server.js`: HTTP + WebSocket server, player and admin APIs, saving
- `game/world.js`: map generation and pathfinding
- `game/sim.js`: characters, activities, rewards, raffle
- `game/llm.js`: prompt to activities (LLM with keyword fallback)
- `public/`: big screen (`display.*`), phone (`play.html`), admin, pixel art
- `data/state.json`: saved game (players and raffle history; no contact details). Back it up; do not commit it.
