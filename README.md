# Brisa · everyday Spanish

A mobile-friendly Spanish learning app focused on traveling and meeting people. An original warm, quiet design; no Duolingo assets or branding.

## Run

Requires Node.js 22 or newer (developed with Node 24). No runtime packages, database, or paid API is required.

```sh
cd /workspace/app
npm ci
npm start
```

The server listens on port 3000, or `PORT`. `GET /api/health` checks readiness. Open the server through your development environment's supported access method. For your phone, deploy using HTTPS as below; a development machine's loopback address is not accessible from your phone.

## What works

- Eight short lessons, including introductions, small talk, cafés, directions, invitations, hotels, asking for help, and an optional business lesson. Every lesson is accessible immediately.
- Translation and listening quizzes, answer explanations, browser text-to-speech examples, and guided spoken role-plays with suggested replies.
- Vocabulary flashcards, daily XP targets, local-calendar streaks, saved lesson position, and progress export/import. First-time lesson completion gives 20 XP plus 5 per correct quiz answer; revisits give 10 XP. Each vocabulary phrase awards 2 XP once.
- Microphone recording, replay, and conversion to 16 kHz mono PCM WAV, capped at 30 seconds. Recording needs HTTPS (or localhost) and browser microphone permission.
- Optional, server-side Azure Speech Pronunciation Assessment integration, disabled without configuration. Reports service-provided overall, accuracy, fluency, completeness, and available word/phoneme feedback. No fabricated grading or speech-to-text similarity scores.

Progress is stored in this browser's localStorage, not an account. Changing domain, using private browsing, clearing browser data, or switching devices does not carry progress over. Export a backup from **Your progress** before switching. Recordings are temporary and disappear on reload. This first version uses guided dialogues rather than open-ended AI conversations. It is not an offline app; the home screen manifest provides standalone launch presentation only.

Examples use available device Spanish voices, preferring `es-MX`, then other Latin American variants. If no Spanish voice is installed, the app explains how to enable one. Device voices may require network access. Language is beginner Latin American Spanish with Mexico-oriented travel vocabulary; regional variations are noted where useful.

## Deploy to Render and use on your phone

No Render account is connected to this workspace, so deployment is prepared but has not been published. You control the hosting account and billing selection.

1. Commit and push the application files to your GitHub repository. Keep `.env` and credentials out of Git. Include `public/`, `server.js`, `package.json`, `package-lock.json`, and `render.yaml` (and preferably the README and tests).
2. Sign in at [Render](https://dashboard.render.com/), connect the GitHub repository, and choose **New → Blueprint**, selecting the branch containing these files. The included `render.yaml` defines a Node web service. Alternatively choose **New → Web Service**, set build command `npm ci --omit=dev`, start command `npm start`, and health check `/api/health`.
3. Review Render's current plan availability and costs before creating the service. The blueprint requests the free plan. Free service availability/limits can change, and it may sleep when idle, causing a slower first visit. Do not select a paid plan without reviewing its price.
4. After deployment shows healthy, open the HTTPS URL Render assigns on your phone. Test a lesson, refresh to verify saved progress, and test microphone recording. Allow microphone access when prompted.
5. On iPhone, use Safari's **Share → Add to Home Screen**. On Android, use Chrome's **Add to Home screen** (the exact wording depends on the browser). The app remains a website; no app-store submission is needed.

No database is necessary: Render restarts do not delete browser-held progress. Export/import lets you move progress from the development domain to the deployed domain. Changes pushed to the configured branch can trigger Render redeploys.

## Optional accurate pronunciation assessment — costs and privacy first

**This service has not been connected or live-validated.** Recording and replay work without it. Integration and error handling are tested with a mock service, not with a billable Azure call.

Azure AI Speech is a dedicated pronunciation assessment service. You need an Azure subscription and a Speech resource supporting pronunciation assessment for Mexican Spanish (`es-MX`). Check current [language support](https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment) and [pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) before provisioning. Speech assessment is billed by audio usage; rates, free allowances, and extra assessment feature costs depend on the selected region, feature, and tier. No fixed dollar estimate or free usage is assumed here. This app requests scripted accuracy, fluency, and completeness with phoneme granularity; it does not request paid prosody or content assessment add-ons.

Only after you accept those costs, configure these **server environment variables** in Render's Environment settings:

| Name | Purpose |
| --- | --- |
| `AZURE_SPEECH_KEY` | Key from the Azure Speech resource. Keep secret and server-only. |
| `AZURE_SPEECH_REGION` | Resource's actual region identifier, such as `eastus`. |
| `ASSESSMENT_ACCESS_TOKEN` | A long, randomly generated private passphrase you choose to protect the grading endpoint. Enter it in the app's Voice studio; never enter the Azure key there. |

Redeploy/restart after adding variables. The Voice studio will show Azure configured. Use a quiet place, record a short phrase, enter your private grading passphrase, and request a score. The app asks before transmitting audio. It sends the recording and reference phrase to Microsoft's regional Speech endpoint over HTTPS; no audio is stored by this server. Review Microsoft's service data-processing terms before use. The browser's passphrase stays in memory only and is sent to your server to authorize scoring.

For local development with optional credentials, copy `.env.example` to `.env`, fill values privately, and run `node --env-file=.env server.js`. Do not send credentials in chat or commit them.

Set Azure budgets/alerts and resource quota limits. This personal-use version also caps recordings at 30 seconds, request bodies at about 1 MB, and assessment attempts at 10 per minute per server-observed peer. That in-memory rate limit resets on restart and may be shared by users behind a hosting proxy; it is **not a billing cap**. Keep the grading passphrase private. Public/multiuser deployment should add proper user authentication, per-user quotas, and durable rate limiting before enabling paid grading.

For a restricted cloud environment, allow the exact regional host `<your-region>.stt.speech.microsoft.com` through the supported environment settings when enabling grading. On Node 24.5+ use `NODE_USE_ENV_PROXY=1 node --env-file=.env server.js` so outbound fetch honors the inherited proxy and CA trust. Do not disable TLS verification or bypass the proxy. Render's environment secret storage supplies the actual server-side credential; no key is needed for the rest of the app.

Azure may return fewer details for some languages/features. The interface displays only returned scores and phonemes. Automated scores vary with noise, microphones, and accent; they do not prove conversational proficiency. Specific weak phonemes are shown with their service score and targeted repeat practice, not an invented diagnosis of mouth position.

## Validate

```sh
npm test
npm run test:browser
```

Unit/integration checks cover XP, streaks, saved-progress validation, curriculum consistency, static serving, and the protected Azure proxy using a mock upstream. Browser checks cover completing and resuming lessons, corrections, skip-ahead, word review, microphone recording/replay using Chromium's synthetic microphone, and overflow at 360, 390, 768, and 1440 px. They do not replace testing a physical iPhone/Android microphone or a real Azure subscription.

The Playwright configuration defaults to `/usr/bin/chromium` in this cloud machine. Set `CHROMIUM_PATH` to your Chrome/Chromium executable elsewhere. It uses a synthetic microphone for reproducible browser tests. No production runtime dependency on Playwright.
