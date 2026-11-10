# Pod Town

A booth game for a big screen. Attendees scan a QR code, make a pixel character
on their phone, and tell it what to do in plain words ("train a model, then fish
for data"). Everyone's characters share one town on the screen. Finished
activities earn raffle tickets, and a raffle draws at the top of every hour.

No app, no sign-up, and no personal data: players only choose a character name.

| Big screen | Phone |
| --- | --- |
| ![The town on the big screen](docs/big-screen.jpg) | ![The phone join page](docs/phone.jpg) |

This guide is for running Pod Town at an event. Developer notes are at the end.

## What you need

- A Runpod account with credits. The game runs on one small CPU Pod: about
  $0.06 an hour (roughly $1.50 a day) plus a few cents for storage.
- A screen at the booth with a web browser.
- About 15 minutes for first-time setup. No coding.

## Set up for an event

Do this a day or more before the event so you have time to test.

### 1. Create a network volume

This is where the game saves its progress, so a restart doesn't empty the town.

1. In the [Runpod console](https://console.runpod.io), open **Storage** and
   create a new **network volume**.
2. Name it for the event (for example `pod-town-berlin`), size **10 GB**.
3. Choose a **data center near the event**. The closer it is, the snappier the
   game feels.

### 2. Create the Pod Town template (first time only)

A template remembers the game's settings so you don't retype them each event.

1. Open **Templates** and click **New Template**.
2. Fill in:
   - **Name**: `Pod Town`
   - **Container Image**: `ghcr.io/kilo-loco/pod-town:latest`
   - **Container Disk**: `5 GB`
   - **HTTP Ports**: add port `8080`
   - **Environment Variables**: add the ones from [Settings](#settings) below.
     At minimum set `ADMIN_TOKEN` and `RAFFLE_PRIZE`.
3. Save the template.

### 3. Deploy the Pod

1. Open **Pods** and click **Deploy**.
2. Choose **CPU**, and pick the smallest option (2 vCPUs is plenty).
3. Select the **network volume** from step 1. Leave its mount path as
   `/workspace`.
4. Choose the **Pod Town** template.
5. Deploy. The Pod is ready in under a minute.

Run **one Pod only**. The town lives in that one server's memory, so a second
Pod would be a second, separate town.

### 4. Get your three links

Open the Pod, click **Connect**, and open the HTTP service on port 8080. The
address looks like `https://<pod-id>-8080.proxy.runpod.net`. Your links are:

| What | Address | Who uses it |
| --- | --- | --- |
| Big screen | `https://<pod-id>-8080.proxy.runpod.net/` | The booth display |
| Player page | `.../play` | Phones. The QR code on the big screen opens this |
| Admin | `.../admin` | Booth staff. Needs the `ADMIN_TOKEN` |

### 5. Rehearse

1. Open the big screen link. You should see the town, a QR code and a countdown.
2. Scan the QR code with a phone, make a character, and send it somewhere.
   It should walk there on the big screen within a few seconds.
3. Open the admin link, enter the admin token, and press **Draw a raffle now**.
   The big screen announces the winner and the phone shows a claim code.
4. Type that code into **Check a claim code** on the admin page and press
   **Mark prize given**.

The rehearsal leaves a test character and a test raffle in the history. To start
the event clean, terminate the Pod, delete the volume, and repeat steps 1 and 3.

### Settings

Set these as environment variables on the template (or on the Pod). Restart the
Pod after changing them.

| Setting | What it does | Default |
| --- | --- | --- |
| `ADMIN_TOKEN` | Password for the admin page. Choose something long. | Random on every start (shown only in the Pod's logs) |
| `RAFFLE_PRIZE` | Prize text shown on the screen and phones | `$25 in Runpod Credits` |
| `RAFFLE_WINNERS` | Winners per hourly draw | `1` |
| `RAFFLE_ONE_WIN` | `1` = a character can only win once per event | `1` |
| `CLAIM_HOURS` | Hours a winner has to collect the prize | `24` |

## Running it on the day

**The big screen**
- Open the big screen link and make the browser fullscreen.
- Turn off the screen saver and sleep on that computer.
- If the screen loses its connection it shows a banner and recovers by itself.

**What players do**
1. Scan the QR code and make a character (name and outfit only).
2. Type what the character should do, or tap one of the activity buttons.
3. Come back later: characters keep working while the phone is away.

**The raffle**
- A draw happens automatically at the top of every hour.
- Each finished activity earns tickets for that hour's draw. More tickets means
  better odds. Tickets reset after each draw.
- The winner's phone shows a six-character **claim code**.
- When a winner comes to the booth: open the admin page, type their code into
  **Check a claim code**, hand over the prize, and press **Mark prize given**.
- You can also press **Draw a raffle now** for an extra draw at any time.

**Activities**

| Activity | Place | Time | Tickets |
| --- | --- | --- | --- |
| Train a model | Training Gym | 6 min | 2 |
| Deploy an endpoint | Runpod HQ | 15 min | 3 |
| Play in the sandbox | Sandbox | 3 min | 1 |
| Run benchmarks | Benchmark Arcade | 3 min | 1 |
| Fish for datasets | Data Lake | 3 min | 1 |
| Grow GPUs | GPU Farm | 8 min | 2 |
| Read papers | Library | 4 min | 1 |
| Warm up | Cache Cafe | 2 min | 1 |
| Get swag | Swag Shop | 2 min | 1 |
| Network | Plaza | 2 min | 1 |

**Things staff should know**
- **One prize per person is yours to enforce.** The game limits each character
  to one win, but one person can make several characters.
- **Names are the only thing players write that appears on the screen.** A basic
  word filter blocks obvious profanity. If something slips through, press
  **Remove** next to that player on the admin page.
- **A character lives in that phone's browser.** If a player clears their
  browser data or switches phones, the character and any unclaimed code are gone.

## After the event

1. On the admin page, press **Download winners CSV** if you want a record.
2. In the Runpod console, **terminate the Pod** so it stops billing.
3. **Delete the network volume.** The next event then starts with an empty town.

Keep the template. Next time, start again from step 1 and skip step 2.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Big screen shows "Connecting to Pod Town…" or "Reconnecting…" | The Pod is restarting or stopped. Check it is running in the Runpod console, then wait a minute. |
| Page says "not found" just after starting the Pod | It is still starting. Reload after 30 seconds. |
| Phones can't open the QR link | Check the Pod is running and that port 8080 is listed under HTTP ports. |
| Admin page says "Bad admin token" | Use the `ADMIN_TOKEN` value set on the Pod. |
| Town is empty after a restart | The network volume wasn't attached. Without it, progress is only kept until the next restart. |
| A player says "that name is taken" | Names are unique. They pick another, or you remove the old character on the admin page. |
| "Not sure how to do that" on the phone | The game only understands the ten activities above. Use their names or tap a button. |

## Before you take it somewhere new

- **Prize draw rules.** Many countries require published terms for a prize draw.
  Check with legal for each event.
- **Privacy.** The game stores character names and game progress only. It never
  asks for email, phone number or badge details.
- **Wording.** The game tells winners to go to "the Runpod booth". Changing that
  needs a small code edit (search the code for `Runpod booth`).

## For developers

Needs [Deno](https://deno.com) 2.x. There is no install step.

```bash
deno task demo
```

That runs the game locally at 30x speed on `http://localhost:8080`. Use
`deno task start` for normal speed. Copy `.env.example` to `.env` for local
settings.

- **Shipping a change:** push to `main`. GitHub Actions builds
  `ghcr.io/<owner>/pod-town:latest` (see `.github/workflows/image.yml`). Restart
  the Pod to pull the new image.
- **If the repo moves or is forked:** the image name follows the new owner, so
  update the template's Container Image. The image package must be public, or
  the Pod needs registry credentials.
- **Smarter prompts (optional):** set `LLM_BASE_URL`, `LLM_API_KEY` and
  `LLM_MODEL` to an OpenAI-compatible endpoint, such as a Runpod Serverless vLLM
  worker, and the model interprets prompts instead of keyword matching. It falls
  back to keywords if the endpoint is slow or fails. This path has not been
  tested against a live endpoint.

| File | What it holds |
| --- | --- |
| `server.js` | Web server, player and admin APIs, big-screen feed, saving |
| `game/world.js` | Map layout and pathfinding |
| `game/sim.js` | Characters, activities, rewards, raffle |
| `game/llm.js` | Turning a prompt into activities |
| `public/` | Big screen, phone page, admin page and the pixel art (drawn in code) |
