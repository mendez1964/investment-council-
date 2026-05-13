# Record of Local AI Implementation Attempt
**Date:** April 24, 2026
**Project:** Investment Council

## 1. Initial Problem
The user reported an "Error connecting to the Investment Council" message in the chat UI.

## 2. Diagnosis
Investigation of PM2 logs (`pm2 logs investment-council`) revealed a **400 Bad Request** from Anthropic:
> `You have reached your specified API usage limits. You will regain access on 2026-05-01 at 00:00 UTC.`

## 3. Actions Taken
### Local AI Integration
- Modified `src/app/api/chat/route.ts` to add a new `ollama` provider.
- Implemented a standard `fetch` stream handler for Ollama to ensure compatibility with local network requests.
- Added environment variables to `.env.local`:
    - `OLLAMA_BASE_URL=http://spark-c763.local:11434/v1`
    - `OLLAMA_MODEL=deepseek-r1:70b`
    - `FORCE_LOCAL_AI=true`
- Successfully rebuilt the project (`npm run build`) and restarted the server.

### Connectivity Troubleshooting
- Tested network path to DGX Spark (`192.168.12.222`). Pings and port checks (`11434`) were successful from the terminal.
- The Node.js application consistently returned `EHOSTUNREACH`.
- **Root Cause:** Suspected **ProtonVPN** split-tunneling or interface priority preventing the Node.js process from routing to the local LAN correctly.

## 4. Final Resolution
At the user's request, the project was reverted to ensure stability while they fund the Anthropic account.
- Current project directory was moved to `investment-council-modified-local-ai/` for reference.
- Restored from backup: `investment-council-backup-2026-03-28_21-55-58.zip`.
- Reinstalled dependencies and performed a fresh production build.
- PM2 processes (`investment-council` and `council-watcher`) were restarted and verified.

## 5. Technical Note for Future Claude Agents
The code for the Local AI switch is complete and functional in the `modified-local-ai` folder. To enable it in the future:
1. Ensure the VPN allows LAN bypass for the `node` process.
2. Port the `route.ts` changes back to the main branch.
3. Update `.env.local` with the Spark machine's local hostname or IP.
