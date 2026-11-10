# Pod Town

A booth game for a big screen. Attendees scan a QR code, make a pixel character
on their phone, and tell it what to do ("train a model, then fish for data").
Finished activities earn raffle tickets, and a raffle draws every hour.

Players only choose a character name. No app, sign-up or personal data.

| Big screen | Phone |
| --- | --- |
| ![The town on the big screen](docs/big-screen.jpg) | ![The phone join page](docs/phone.jpg) |

## Set up for an event

You need a Runpod account with credits (about $1.50 a day) and 15 minutes.
Everything happens in the [Runpod console](https://console.runpod.io).

1. **Create a network volume** under Storage: 10 GB, in a data center near the
   event. This keeps the town if the Pod restarts.
2. **Deploy a Pod** under Pods:
   - Choose **CPU**, smallest size (2 vCPUs).
   - Select the network volume. Leave its mount path as `/workspace`.
   - Choose the **Pod Town** template (see below if you don't have it).
   - Set the environment variable `ADMIN_TOKEN` to a long password of your own,
     and change `RAFFLE_PRIZE` if needed.
3. **Open the Pod's HTTP service on port 8080** (Connect button). That address,
   `https://<pod-id>-8080.proxy.runpod.net`, is the big screen. Add `/admin` for
   the staff page. The QR code on the big screen is the player link.
4. **Rehearse:** join from a phone, send your character somewhere, then press
   **Draw a raffle now** on the admin page.

Run one Pod only. To clear rehearsal data, delete the Pod and volume and repeat.

**No Pod Town template?** Under Templates, create one with container image
`ghcr.io/kilo-loco/pod-town:latest`, container disk 5 GB, and HTTP port 8080.

| Setting | What it does | Default |
| --- | --- | --- |
| `ADMIN_TOKEN` | Password for the admin page. Never share or commit it. | Random each start, shown in the Pod's logs |
| `RAFFLE_PRIZE` | Prize text on the screen and phones | `$25 in Runpod Credits` |
| `RAFFLE_WINNERS` | Winners per draw | `1` |
| `RAFFLE_ONE_WIN` | `1` = a character can win only once | `1` |
| `CLAIM_HOURS` | Hours a winner has to collect | `24` |

## On the day

- Put the big screen link in a fullscreen browser and turn off sleep.
- The raffle draws at the top of every hour. The winner's phone shows a
  six-character claim code.
- When a winner comes to the booth, type their code into **Check a claim code**
  on the admin page, hand over the prize, and press **Mark prize given**.
- One person can make several characters, so enforce one prize per person at
  the booth.
- To take an offensive name off the screen, press **Remove** on the admin page.

## After the event

Download the winners CSV from the admin page if you want a record, then
terminate the Pod and delete the volume. The next event starts with an empty town.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Screen says "Connecting" or "Reconnecting" | Check the Pod is running, then wait a minute. |
| "Not found" just after starting | Still starting. Reload in 30 seconds. |
| Town is empty after a restart | The network volume wasn't attached. |
| "Bad admin token" | Use the `ADMIN_TOKEN` value set on the Pod. |

Prize draws need published terms in many countries. Check with legal per event.

## For developers

Run locally with [Deno](https://deno.com) 2.x: `deno task demo` (30x speed) or
`deno task start`, then open `http://localhost:8080`. Local settings go in
`.env` (copy `.env.example`); `.env` and `data/` are never committed.

Pushing to `main` builds `ghcr.io/<owner>/pod-town:latest`; restart the Pod to
pull it. Code: `server.js` (server and APIs), `game/` (map, activities, raffle,
prompt parsing), `public/` (big screen, phone and admin pages).
