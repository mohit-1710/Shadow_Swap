# ShadowSwap Demo Video Script

## Goal
Deliver a five-minute founder-level demo that proves ShadowSwap is already a full-stack, all-in build: privacy-preserving orderbook, gritty engineering pivots, and a live experience at `shadowswap.fun`.

## Scene Breakdown

| Timecode | Visual Direction | Voiceover Script | On-Screen Reinforcement |
| --- | --- | --- | --- |
| 00:00 – 00:20 | Cold open: quick cuts of encrypted order flow diagrams, Solana validators, and the ShadowSwap logo resolving into focus. | “Privacy in trading shouldn’t be a privilege. ShadowSwap is our answer: a privacy-first orderbook DEX on Solana that we’ve taken from blank repo to live demo in a single sprint.” | Lower-third: “ShadowSwap — Privacy-Preserving Orderbook DEX” |
| 00:20 – 00:45 | Team montage: screenshare snippets of standups, whiteboarding, and git commits scrolling. | “We committed, as a team, to owning every part of this stack — program, keeper, frontend, tooling. No half measures. This is the story of how we built it, the pivots we survived, and what’s live today.” | Overlay: “Monorepo • Anchor Program • Next.js Frontend • Settlement Bot” |
| 00:45 – 01:15 | Timeline graphic animating from ‘Idea’ → ‘Order Book Vision’ → ‘Arcium Integration’. | “Our first thesis: keep order matching decentralized by running it on Arcium’s MXE secure compute server. We wrote the matcher in no_std Rust, ready to compile inside MPC enclaves.” | Callout: “Goal: Fully decentralized matching on Arcium MXE” |
| 01:15 – 01:40 | Code editor showing the Arcium contract attempt with `while`/`break`/`Vec` highlighted in red. Cut to team huddle. | “Then reality hit — current MXE expressions can’t compile `while`, `break`, or even `Vec`. That killed price-time priority and netting. Instead of shipping excuses, we pivoted fast.” | Overlay: “Constraint: MXE (no while / break / Vec)” |
| 01:40 – 02:10 | Transition to diagrams of the new hybrid architecture: on-chain program, off-chain keeper, Sanctum gateway. | “We built a settlement bot that keeps decentralization honest: orders stay encrypted on-chain, we decrypt through Arcium, match off-chain, and submit settlements privately through Sanctum’s gateway so MEV bots never see the payload.” | Diagram labels: “Encrypted Orders → Keeper → Sanctum Private Gateway → Solana” |
| 02:10 – 02:40 | Deep dive into on-chain program in Anchor Explorer; highlight escrow logic and permissionless design. | “The Anchor program escrows funds, validates signatures, and stores ciphertext. It’s audited-by-design with shared TypeScript layouts so every client reads the same bytes — no drift, no ambiguity.” | Overlay bullet flashes: “Escrow vaults”, “Ciphertext storage”, “Shared IDL types” |
| 02:40 – 03:30 | Live product demo captured at `shadowswap.fun`: connect wallet, place encrypted limit order, see orderbook update, settlement confirmation toast. | “Let’s trade. We’re live at shadowswap.fun. Connect wallet, choose SOL/USDC, and place a limit order. The order is encrypted in-browser, sent to Solana, matched by the keeper, and settled privately. Notice the matching confirmation — that came through Sanctum without leaking order flow.” | On-screen: “Demo: 1) Connect 2) Encrypt order 3) Settlement bot fills privately” |
| 03:30 – 03:55 | Split screen of backend terminal logs (keeper) and Sanctum dashboard metrics; highlight retries, metrics, and monitoring. | “Behind the scenes the keeper polls, decrypts via the Arcium client, runs deterministic matching, and pushes settlements with automatic retries. Metrics stream out so we know every fill succeeded.” | Overlay: “Deterministic matcher • Sanctum relay • Observability hooks” |
| 03:55 – 04:20 | Ops montage: `yarn anchor:setup`, documentation in repo, design prototype, domain purchase receipt, GitHub automation. | “We automated devnet setup, documented every subsystem, iterated on UI in a separate design playground, and yes — we bought the shadowswap.fun domain because this isn’t a throwaway hack. It’s the foundation of a private trading venue.” | Text flashes: “DevOps Scripts • Docs • SPA Prototype • Domain in production” |
| 04:20 – 04:45 | Team shots celebrating; roadmap overlay with upcoming milestones. | “The next milestones are clear: ship Arcium-native matching when loops land, expand to multi-markets, and plug into private liquidity partners. Today we’re asking you to back a team that’s already shipping.” | Roadmap bullets glide in: “Arcium parity • Multi-market support • Partner integrations” |
| 04:45 – 05:00 | Closing hero shot of the product with Solana skyline background; fade to logo + call to action. | “ShadowSwap is live, private, and ready. Join us as we make privacy the default on Solana.” | CTA: “Trade privately at shadowswap.fun” |

## Demo Checklist
- Open `shadowswap.fun` in a fresh browser profile, connect a funded devnet wallet, and showcase encrypted order placement plus settlement toast.
- Run the settlement bot terminal in the background with verbose logging so the video can cut to real-time fills.
- Prepare screen captures of the Anchor program IDL, the shared types package, and the system diagram from the repo to reinforce the full-stack ownership story.
- Keep a slide ready that lists the Arcium limitation (lack of `while`, `break`, `Vec`) to contextualize the pivot before showing the bot.
- Capture Sanctum private gateway dashboard (or mocked metrics) demonstrating private submission latency improvements over public RPC.
- Include a brief shot of the domain registrar confirmation email for `shadowswap.fun` to underline long-term commitment.

## Narration Notes
- Delivery tone: confident, focused, no marketing fluff — this is builders talking to founders.
- Emphasize “we shipped” statements: encrypted orders, keeper loop, Sanctum routing, domain live.
- When mentioning Arcium, stress that integration is paused by platform limits, not lack of ambition; highlight readiness to re-enable full MPC matching once control flow support ships.
- Close with a direct ask: support to scale liquidity partners and to productionize at mainnet-beta.

## Credits Roll (optional bumper)
- Build: Anchor program (`apps/anchor_program`), settlement bot (`apps/settlement_bot`), frontend (`apps/frontend`)
- Tooling: `yarn anchor:setup`, shared types, system docs
- Partners: Arcium (MPC decryption), Sanctum (private gateway), Solana devnet
- Team: Show headshots or handles with roles (Smart Contracts, Off-chain Infra, Product)

