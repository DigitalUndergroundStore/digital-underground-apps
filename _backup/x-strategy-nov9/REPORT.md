# @DigitalUG_Store X Strategy — Nov 9, 2026

**Scope:** Last-24h performance check (since ~12:36 PM America/Toronto Nov 8) + researched 2025–2026 winning playbook for Buffer.  
**Mode:** Read-only. No posts, replies, follows, DMs, Buffer edits, or routine changes were made.  
**Business goal:** Get builders to list on digitalundergroundstore.com and get their followers to visit (funnel) — not just raw follower count.

Raw data: `posts_24h.csv`

---

## 1) 24-hour snapshot (brief)

**Profile (pull time ~12:37 PM America/Toronto Nov 9):**
- Followers: **5,629** | Following: **5,706** (≈1:1 ratio)
- Tweets: 13,507 | Listed: 4 | Not verified

**Original posts in window (X API, excluding replies/retweets): 17**  
All had a grow graphic. 16/17 were follow-train templates ("Reply Hi/Connect/Grow/Done… I follow back"). 1 was a short thought-piece.

| Metric | Total | Median per post |
| --- | ---: | ---: |
| Impressions | 875 | **44** |
| Likes | 34 | 2 |
| Replies | 47 | 2 |
| Reposts | 7 | 0 |
| Bookmarks | **0** | 0 |
| Engagement (L+R+RT+Q+BM) | — | **4** |

Buffer aggregate for a similar window (channel `6adfe5b62f1f5ed648e1adb7`): 702 impressions, 24 reactions, 36 comments, 9 reposts, **0 clicks**, 12.54% eng rate on a small impression base. Buffer counted more posts (27) than the X original-post pull (17) — treat X originals as the source of truth for style/metrics.

**Best posts (evening America/Toronto):**
- 10:20 PM Nov 8 — 85 imp, 16 eng ("Reply Connect…")
- 7:20 PM Nov 8 — 91 imp, 11 eng
- 11:20 PM Nov 8 — 90 imp, 11 eng

**Worst:** midday Nov 9 — 12 imp, 0 eng.

Night window (~7 PM–midnight ET) median impressions ~53 vs day ~41.5 — still tiny for a 5.6k account.

### Reply quality (sample on top post `2119631075915730967`)

Replies were almost entirely one-word **"Connect" / "CONNECT" / "Active"**. Sample accounts:
- Brand-new (Oct–Nov 2026), follow≈following near 1:1
- Bios like "Follow Me Follow Back", NBA spam, crypto traders, mutual-follow AI accounts
- **No clear app/game builders** in the sample; zero bookmarks on any 24h post

**Site conversion:** We cannot see marketplace analytics from here — say so explicitly. Public X + Buffer show **0 link clicks** in Buffer's window.

---

## 2) Top 3 diagnoses (why results are weak)

1. **Templated follow-trains at high volume are burning their own reach.** ~17 nearly identical posts/day. X's published author-diversity decay multiplies an author's 2nd/3rd/… posts in one feed by ~0.625 → 0.44 → toward 0.25 ([xDoctor on posting frequency](https://xdoctor.app/learn/p2-reach/posting-frequency); [TweetFactory weights](https://docs.tweetfactory.sh/x-algorithm-engagement-weights/)). Median **44 impressions** on 5.6k followers is the symptom. Graphics on every post did not save it.

2. **The audience these posts attract is not the funnel.** Replies are F4F bots/growth-hackers, not makers. Follow-for-follow is weak for engaged reach and sits under X's Authenticity policy against coordinating follow exchanges ([Repli — F4F on X](https://repli.sh/blog/follow-for-follow-on-x/); [Hclout on follow trains](https://hclout.com/blog/follow-train-guide)). Mutual-follow reply boost (July 2026) helps **real conversations with mutuals**, not mass one-word "Connect" threads ([TweetFactory](https://docs.tweetfactory.sh/x-algorithm-engagement-weights/)).

3. **Content never serves the marketplace.** Zero Buffer clicks; zero bookmarks; no shipping posts, Maker League, MotW, or "list your app" hooks in this window. Comparable indie accounts win with specific shipping stories, founder interviews, and product screenshots — e.g. @IndieHackers founder threads (30k+ impressions on a single hook) vs our 44 median.

**Tradeoff for Donald's wide-audience preference:** Follow-trains grow *count* and feel "wide," but they fill the follower graph with people who never visit the store. Wide growth that still serves the funnel = curiosity hooks that *filter for builders* ("Reply with what you shipped this week"), not "I follow back" trains. Recommend cutting trains to **0** for the 2-week test; keep 1–2 wide show-your-work prompts/day instead.

---

## 3) What winning looks like on X in 2025–2026 (sourced)

### Algorithm signals (from X's published open-source weights, sync ~Oct 2026)
Largest **positive** predicted-action weights ([TweetFactory table from `xai-org/x-algorithm`](https://docs.tweetfactory.sh/x-algorithm-engagement-weights/)):
- Copy-link share **20**, mutual-original reply **20** (base reply 5 + 15), DM share **5**, quote **5**, follow author **4**
- Like only **0.5**; photo expand **0.05**
- Huge negatives: report **−234**, mute **−58.8**, not interested **−47.5**, block **−31.2**

Implications for us:
- Write posts people **reply to, quote, or copy** — not posts people mute.
- One strong original beats a burst of near-duplicates (dedup + author diversity).
- Cold-start can lift originals from accounts **under 50k** followers when post age <2h and impressions <200 — originals only, not replies ([Siela reply-guy guide](https://siela.in/blog-reply-guy-strategy-x)).

### Replies as growth (still works, with rules)
- Replies put a small account in front of a bigger account's readers; originals convert follows better ([Siela](https://siela.in/blog-reply-guy-strategy-x)).
- Enter early (<15–30 min), add one fact/number/extension — not "great post!" ([Mendi Early-Entry Reply Protocol](https://commentverdict.com/research/reply-protocol-2026-09)).
- Hand-written only. X removed **42,000** chatbot reply accounts in July 2026 (Nikita Bier; cited in [Siela](https://siela.in/blog-reply-guy-strategy-x)).
- Suggested split for ~5k followers: ~10 min replies/day to niche + 2 originals/day minimum ([Siela stage table](https://siela.in/blog-reply-guy-strategy-x)); indie guides often say 3–5 quality originals/week to daily depending on capacity ([Monolit indie 2026](https://monolit.sh/blog/twitter-marketing-strategy-indie-hackers-2026)).

### Links, graphics, frequency
- **No explicit link penalty in published ranking code**; Nikita Bier / Elon said links aren't deboosted in 2026 ([RecurPost](https://blog.recurpost.com/drive-traffic-from-x-twitter/), [Finn Marten](https://www.finnmarten.com/writing/x-algorithm)). Buffer's Aug 2025 study still found link posts underperform engagement-wise ([Buffer](https://buffer.com/resources/links-on-x/)). **Practical rule for us:** no URL in main post; put marketplace link in **first reply** when needed. Matches Donald's current preference and still drives funnel.
- Graphics help when they are **native product screenshots / MotW cards**; generic growth graphics on every post look spammy and don't overcome weak copy (our 24h data).
- No frequency throttle in code, but diversity decay = diminishing returns past a few strong posts/day ([xDoctor](https://xdoctor.app/learn/p2-reach/posting-frequency)).

### Indie / build-in-public patterns that win
- Specific numbers, failures, shipping logs, "here's what I listed / what flopped" ([Distribution Base](https://www.distributionbase.com/blog/channels/x-twitter/build-in-public-results), [Monolit](https://monolit.sh/blog/twitter-marketing-strategy-indie-hackers-2026), [Teract](https://www.teract.ai/resources/twitter-strategy-indie-hackers-2026)).
- Early reply velocity in first 30–90 minutes compounds reach.
- Soft promo ~1 in 7–10 posts; lead with value ([xfaste.st BIP framework](https://xfaste.st/blog/how-to-build-in-public-on-twitter)).
- Comparable accounts (@IndieHackers, @ProductHunt, @levelsio, @tdinh_me): founder stories, product cards, shipping numbers — **never** follow-train templates. Following << followers (healthy graph).

### Timing (America/Toronto / ET)
- SaaS/indie peaks: **Tue–Thu 8–11 AM ET**, secondary **12–2 PM** and **5–7 PM** ([OpenTweet](https://opentweet.io/best-time-to-post/industry/saas), [Doomers launches](https://doomers.ai/guides/best-time-to-post-on-x)).
- Our 24h data: evening trains got more impressions than midday — useful for *growth prompts*, not a reason to keep trains.

---

## 4) Ready-to-run Buffer playbook

### Cadence
| Slot (America/Toronto) | Role |
| --- | --- |
| **9:20 AM** | Builder spotlight / MotW / shipping lesson (priority slot) |
| **12:20 PM** | Wide show-your-work prompt OR short opinion |
| **5:20 PM** | Marketplace soft CTA or listing tip (link in first reply) |
| **8:20 PM** | Conversation hook / "what's shipping" (optional 4th) |

- **Target: 3–4 originals/day** (use ≤4 of the 10/day refill). Stop hourly posting.
- **Reply to every comment in the first 60 minutes** of each post (manual or alert — do not automate replies).
- **No follow-train / "I follow back" posts** for the 2-week test.
- **No URLs in main post body.** When promoting the store, first reply: `Free listing → digitalundergroundstore.com` (or short branded URL).
- **Graphics:** MotW cards, listing screenshots, maker avatars collage — rotate. Cap growth-style graphics at **≤1/day** if used at all.
- **Hashtags:** optional 0–1 (`#buildinpublic` only when natural). No hashtag spam.

### Content mix (percent of originals)
| Bucket | % | What it is |
| --- | ---: | --- |
| A. Builder spotlight / MotW / New Arrivals | **35%** | Name a maker, what they shipped, one concrete line. Screenshot OK. |
| B. Shipping / marketplace lessons | **25%** | What gets votes, listing tips, "we noticed…", short and specific. |
| C. Wide conversation hooks (builder-filtered) | **20%** | "Reply with…", "Drop your stack", "Show the bug you fixed" — **no** follow-back language. |
| D. Soft marketplace CTA | **10%** | List free / vote MotW / browse new arrivals. Link in reply. |
| E. Short takes | **10%** | 1–3 punchy lines. Avoid long thought-pieces Donald disliked. |

### Rules of thumb (Buffer checklist)
1. First line must work as a standalone hook.
2. Ask for **one** easy reply action that reveals a builder (shipped feature, stack, game genre) — not "Connect".
3. Mention ≥1 real maker/app when possible (tag them).
4. If the post could also work as a random growth account's copy, rewrite it until it couldn't.
5. After publish: reply to tagged makers + first 5 comments personally.

### Daily engagement routine (~25–30 min, not Buffer)
1. **10 min — Reply outbound:** 6–10 hand replies under indie/build-in-public posts <1h old (accounts ~2k–80k). Add a number, tip, or question. Never "check out our marketplace" in cold replies.
2. **10 min — Own threads:** Answer every reply on today's posts; like thoughtful ones; invite strong makers to list (DM or reply) only when organic.
3. **5 min — Scout:** Save 3 makers who shipped today for tomorrow's Spotlight slot.
4. Private List of ~25 target builders to watch (Indie Hackers adjacent, game devs, AI tool makers).

### Weekly KPIs (track every Monday)
| KPI | Baseline (this 24h) | 2-week target |
| --- | --- | --- |
| Median impressions / original | 44 | **≥250** |
| Median bookmarks / original | 0 | **≥1** |
| Profile clicks (if Analytics available) | n/a | Rising week over week |
| Buffer clicks (link-in-reply posts) | 0 | **≥20 / week** |
| Replies that look like real builders (manual sample of 20) | ~0/8 | **≥50%** |
| New marketplace listings attributed to X (manual ask / UTM if available) | unknown | Log weekly |
| Follower net change | — | Prefer slower growth with better reply quality over F4F spikes |
| Following count | 5,706 | Stop mass follow-backs; tidy gradually if desired |

---

## 5) 2-week test plan

**Week 1 — Replace trains with mix A/B/C only (no D soft CTA yet).**  
3 posts/day at 9:20 / 12:20 / 8:20. Engagement routine daily. Goal: prove impressions + builder reply quality move without F4F.

**Week 2 — Add 1 soft CTA (D) every other day** with link in first reply. Keep 1 MotW/spotlight with screenshot. Compare median impressions, bookmarks, Buffer clicks, and % builder replies vs Week 1 and vs this baseline.

**Kill criteria:** If after 14 days median impressions are still <100 *and* builder-reply share <20%, revisit hooks/timing before adding volume.  
**Success:** Median impressions ≥250 **or** ≥5 genuine builder conversations/week that mention listing/visiting.

Do **not** resume follow-trains during the test even if follower growth slows — that's the expected tradeoff.

---

## 6) Ten Buffer-ready drafts (Donald's tone, no URLs)

**1 — Spotlight (A)**  
Someone on here shipped something weird and useful this week.

Reply with the app or game you're most proud of right now — one line on what it does. I'll boost a few in the next posts.

**2 — MotW energy (A)**  
Maker League is how small builders get seen without a marketing budget.

If you listed something recently, drop the name + what changed since launch. Voting makers > shouting into the void.

**3 — Shipping lesson (B)**  
Listings that get love usually do three things: clear screenshot, one-sentence pitch, and a real update in the last month.

Pretty logos without a "what it does" line get scrolled past. Seen it all week.

**4 — Marketplace observation (B)**  
New Arrivals move when makers talk about the problem, not the stack.

"I was tired of X so I built Y" beats "Built with React + AI." Say the itch.

**5 — Wide hook, builder filter (C)**  
Builders only:

Reply with the one feature you shipped in the last 7 days.  
No pitch decks. No "follow me." Just the feature.

**6 — Wide hook (C)**  
Drop your stack in one line.

Example: "Flutter + Supabase, solo, shipping a puzzle game."  
Looking for people actually building — let's compare notes.

**7 — Soft CTA (D) — put link in first reply after publish**  
Free marketplace for apps, games, and AI tools built by people on X.

If you've got something live, list it. If you're hunting for your next favorite indie tool, come browse.  
(First reply: digitalundergroundstore.com)

**8 — Soft CTA / MotW (D)**  
This week's Maker of the Week voting is open for anyone who wants to support a builder instead of an ad.

Reply "voting" if you want the reminder — I'll reply with how.

**9 — Short take (E)**  
Follower trains inflate the number.  
Real builders inflate the product.

We're optimizing for the second one.

**10 — Short take + ask (E)**  
Unpopular opinion for marketplace folks: a rough demo video beats a perfect landing page screenshot.

Agree or disagree — reply with what converted for you.

*(Optional first-reply templates when a draft needs the site:)*  
`Link: digitalundergroundstore.com — free to list.`

---

## 7) What we couldn't get / limits

- **Non-public metrics:** Detailed profile visits from X Analytics UI not available via these APIs; Buffer clicks were 0 in the aggregate pull.
- **Site analytics:** No access — cannot prove listing/visit conversion from these posts.
- **Full 2–3 week history:** Intentionally skipped per scope change; diagnosis uses last ~24h only.
- **Impressions:** Available via public_metrics (used above). Buffer metrics can lag ~24h.
- **marc_louvion** handle not found when sampling comparables; used @IndieHackers, @ProductHunt, @levelsio, @tdinh_me instead.
- Did **not** change Buffer queue, routines, or post anything.

---

## 8) Source list

- https://docs.tweetfactory.sh/x-algorithm-engagement-weights/
- https://xdoctor.app/learn/p2-reach/posting-frequency
- https://xdoctor.app/learn/p4-growth/reply-quality
- https://siela.in/blog-reply-guy-strategy-x
- https://commentverdict.com/research/reply-protocol-2026-09
- https://repli.sh/blog/follow-for-follow-on-x/
- https://repli.sh/blog/how-to-grow-on-x/
- https://hclout.com/blog/follow-train-guide
- https://blog.recurpost.com/drive-traffic-from-x-twitter/
- https://buffer.com/resources/links-on-x/
- https://www.finnmarten.com/writing/x-algorithm
- https://monolit.sh/blog/twitter-marketing-strategy-indie-hackers-2026
- https://www.teract.ai/resources/twitter-strategy-indie-hackers-2026
- https://www.distributionbase.com/blog/channels/x-twitter/build-in-public-results
- https://xfaste.st/blog/how-to-build-in-public-on-twitter
- https://opentweet.io/best-time-to-post/industry/saas
- https://doomers.ai/guides/best-time-to-post-on-x
- X Authenticity / automation policy (via Repli + Hclout citations)
