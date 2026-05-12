import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  Clock,
  Users,
  CalendarCheck,
  UserCheck,
  DollarSign,
  RotateCw,
  Target,
  ArrowDown,
  Sparkles,
  ShieldAlert,
  Megaphone,
  Ticket,
} from "lucide-react";

// ============================================================
// BENCHMARKS — Red / Yellow / Green bands
//   red:    rate < red threshold      (critical)
//   yellow: red threshold ≤ rate ≤ yellow threshold
//   green:  rate > yellow threshold   (healthy)
// ============================================================
const BENCHMARKS = {
  booking: { red: 20, yellow: 30 },     // Lead → Book
  show: { red: 60, yellow: 75 },        // Book → Show
  close: { red: 60, yellow: 75 },       // Show → Close (or Show → FEO when FEO is on)
  feoClose: { red: 60, yellow: 80 },    // FEO → Membership
  leadToClose: { red: 10, yellow: 20 }, // Lead → Close (overall)
};
// Targets used by the bottleneck math — the upper (Green) threshold per metric.
const BENCHMARK_TARGETS = {
  booking: 30,
  show: 75,
  close: 75,
  feoClose: 80,
  leadToClose: 20,
};

// ============================================================
// SPEED-TO-LEAD INSIGHTS (with GMM Follow-Up tactics)
// ============================================================
const SPEED_DATA = {
  under_5: {
    severity: "gold",
    label: "Under 5 minutes",
    headline: "GOLD — sub-5-minute response is elite",
    detail:
      "Sub-5-minute response is the single biggest lever in turning leads into conversations. Per the GMM Follow-Up doc: the lead remembers the ad, they're still in 'decision mode,' and competitors haven't intercepted yet. Protect this standard like an asset — it's a real competitive moat.",
    tactics: null,
  },
  "5_15": {
    severity: "green",
    label: "5–15 minutes",
    headline: "Green — strong, with room to push toward Gold",
    detail:
      "Solid response time and well inside the green band. The real upgrade from here is sub-5-minute (Gold) — tighten notifications, on-call rotation, or auto-responders that buy time before the live conversation.",
    tactics: null,
  },
  "15_30": {
    severity: "green",
    label: "15–30 minutes",
    headline: "Green — acceptable, but the upside lives at Gold",
    detail:
      "Inside the green band, but on the slower end. Conversion data shows meaningful gains every minute you cut from response time — push the team toward sub-5-minute as the actual standard.",
    tactics: [
      "Turn on Call Connect inside the nurture — auto-fires the call while the lead is still warm. Fastest, free fix already in the platform.",
      "Stand up the AI Call Setter to handle first-touch when the team can't reliably hit under 5 minutes. Stopgap or permanent first-touch layer.",
      "Recommend hiring an appointment setter (upsell opportunity). A dedicated setter is the most reliable path to locked-in fast speed-to-lead.",
    ],
  },
  "30_60": {
    severity: "yellow",
    label: "30 minutes – 1 hour",
    headline: "Yellow — conversion is leaking here",
    detail:
      "Past the 30-minute mark you're contacting a meaningfully colder lead. Diagnose the slow link: lead routing, rep availability, or notification gaps. The follow-up doc is clear — 'follow-up speed is a competitive advantage.'",
    tactics: [
      "Turn on Call Connect inside the nurture — auto-fires the call while the lead is still warm. Fastest, free fix already in the platform.",
      "Stand up the AI Call Setter to handle first-touch when the team can't reliably hit under 5 minutes. Stopgap or permanent first-touch layer.",
      "Recommend hiring an appointment setter (upsell opportunity). A dedicated setter is the most reliable path to locked-in fast speed-to-lead.",
      "Standardize the Magic Voicemail: identify yourself, remind them what they opted in for, set expectation you'll follow up again.",
      "Use the SSS opening line: '[Name] from [Gym], you reached out on Facebook this morning about [Offer] — what made you decide to reach out?' This answers the four spam-filter questions in one breath.",
      "Send a text after every missed call. The lead doesn't have to call back — a reply text is enough to restart the conversation.",
    ],
  },
  "60_plus": {
    severity: "red",
    label: "1 hour or more",
    headline: "RED — speed-to-lead is the primary leak",
    detail:
      "Most leads have moved on. Per the playbook, this single fix will likely move the funnel more than any conversation-quality work. The doc is blunt: 'most gyms don't lose leads because the ads don't work — they lose leads because they wait too long.'",
    tactics: [
      "Turn on Call Connect inside the nurture — auto-fires the call while the lead is still warm. Fastest, free fix already in the platform.",
      "Stand up the AI Call Setter to handle first-touch when the team can't reliably hit under 5 minutes. Stopgap or permanent first-touch layer.",
      "Recommend hiring an appointment setter (upsell opportunity). A dedicated setter is the most reliable path to locked-in fast speed-to-lead.",
      "Stack contacts in the first 72 hours: calls + text after each attempt + automated email sequence in the background.",
      "Audit lead routing. If leads are waiting on rep assignment, that's the fix — automate it.",
    ],
  },
  "24_plus": {
    severity: "danger",
    label: "More than 24 hours",
    headline: "DANGER — these leads are effectively cold",
    detail:
      "Per the playbook, after 24 hours treat these as a separate motion: a reactivation campaign, not a fresh-lead process. Then fix the upstream cause so this doesn't repeat next month.",
    tactics: [
      "Turn on Call Connect inside the nurture — auto-fires the call while the lead is still warm. Fastest, free fix already in the platform.",
      "Stand up the AI Call Setter to handle first-touch when the team can't reliably hit under 5 minutes. Stopgap or permanent first-touch layer.",
      "Recommend hiring an appointment setter (upsell opportunity). A dedicated setter is the most reliable path to locked-in fast speed-to-lead.",
      "Stop treating 24+ hour leads as new — separate workflow, separate messaging.",
      "Diagnose the upstream gap: who owns lead response and what's blocking same-day contact?",
    ],
  },
};

// ============================================================
// BOTTLENECK RECOMMENDATIONS (with SSS Sales Mastery references)
// ============================================================
const BOTTLENECK_RECS = {
  booking: {
    diagnosis:
      "When booking rates fall below benchmark, the answer is rarely the leads — it's the conversation. Reps are getting on calls but not getting commitments. This is a coaching problem, not a marketing problem. The SSS Sales Mastery script is your rubric.",
    actions: [
      "Pull 5–10 unbooked call recordings this week. Score them against the SSS script before the next 1:1.",
      "Audit the first 5 seconds. The opening must establish: rep name, gym name, why they're calling, and the 'what made you reach out?' question. Most weak openers skip the context-set and lose the lead in the first sentence.",
      "Listen for whether reps actually engage with the answer to 'what made you decide to reach out?' or just bulldoze past it. The energy of the booking ask later in the call hangs on whether the rep heard them and built rapport in this moment.",
      "Drill the booking ask itself — Simple Set: 'Mornings, lunch, or evenings? I can get you in today at [time] or tomorrow at [time].' A/B options after one direct ask. This is the weakest moment in most booking calls.",
      "Role-play 'I want to think about it' and 'send me information.' Per the GMM follow-up doc, the first call's job is the appointment — not the sale, not the price. Both objections should be bookable.",
    ],
  },
  show: {
    diagnosis:
      "Booked appointments are happening, but leads aren't showing up. The leak is between the booking and the appointment — confirmation cadence, perceived value, or the booking time itself.",
    actions: [
      "Audit confirmation cadence: at booking, 24 hours before, day-of. Missing any one of these tanks the show rate.",
      "Personal beats automated. A short text from the actual rep — even one line — outperforms system reminders every time.",
      "Reinforce appointment value between booking and arrival. Send something useful: a prep note, short video, what to expect at the No Sweat Intro.",
      "Time-slot audit. Look at show rates by appointment time — there are almost always specific slots that under-perform. Limit or eliminate them.",
      "Are appointments being booked too far out? Same-day and next-day slots have meaningfully higher show rates. Default the Simple Set offer to 'today or tomorrow.'",
    ],
  },
  close: {
    diagnosis:
      "Reps are getting people in front of them, but conversations aren't converting. Per the SSS framework, this is a sales-skill, qualifying, or offer-positioning issue. Diagnose which before you coach.",
    actions: [
      "Pull 5–10 'no sale' appointment recordings. Listen for the exact moment the conversation went sideways — there's almost always one clear pivot point.",
      "Check the Transformation Vehicle pitch. All four wheels — training, nutrition, accountability, identity — landing? If reps skip wheels (especially identity), the close gets harder.",
      "Audit the actual ask. 'So what do you think?' is not a close. After Prescription, reps should ask clearly and stay silent until the lead answers.",
      "Drill the price objection: 'If I'm Telling The Truth' first, then 'Major Cajones' upgrade, then 'Send Her Home With The Car' as the walk-back. These should be muscle memory.",
      "Watch for reps over-presenting. The 7-deep onion is the answer to most objections — if reps are talking more than 50% of the call, that's the fix.",
    ],
  },
  feoClose: {
    diagnosis:
      "People are getting INTO the front-end offer but not converting to membership. The leak is in the trial experience itself, the conversion conversation, or the price-reveal moment. Diagnose which.",
    actions: [
      "Audit the FEO experience. The first week makes or breaks the conversion decision. Are coaches creating personal attention, name recognition, and quick wins from day one?",
      "Make sure someone owns the conversion conversation. The FEO-to-membership pitch can't be 'whoever's around at week 6' — assign a specific coach with a specific cadence (mid-trial check-in, end-of-trial sit-down).",
      "Celebrate habit and identity wins during the trial. Per the SSS Transformation Vehicle, the identity wheel is what makes membership feel inevitable instead of optional.",
      "Pull recordings of FEO-to-membership conversion calls. Score them against the SSS framework: rapport, Dan Sullivan question, 7-deep onion, Transformation Vehicle, Simple Set close.",
      "Coach the price-reveal. Members coming off a discounted FEO seeing real pricing for the first time will react — it has to be set up, not casual. Frame the FEO as 'tasting the program' and membership as 'the actual program.'",
    ],
  },
};

// ============================================================
// CALLS PER LEAD INSIGHT
// ============================================================
const callsInsight = (cpl) => {
  if (cpl <= 0) return null;
  if (cpl < 4) {
    return {
      severity: "red",
      headline: "RED — leads are being under-worked",
      detail:
        "Per the GMM Follow-Up doc, most conversions happen after multiple touches — not after the first call. At fewer than 4 calls per lead, leads who would have converted with persistence are being abandoned.",
      tactics: [
        "Install the 3×3 Method as the floor: 3 calls per day for 3 days after every new lead.",
        "Use the Double Dial: call once, hang up if voicemail, immediately call back. Carriers and humans both respond better to back-to-back calls.",
        "Send an immediate auto-text on opt-in. Multi-channel stacking starts before the first call lands.",
        "Build it into the CRM as required steps so reps can't skip ahead.",
        "Stack contacts: calls + texts + automated email all working together in the first 72 hours.",
      ],
    };
  }
  if (cpl < 6) {
    return {
      severity: "yellow",
      headline: "Yellow — below the persistence benchmark",
      detail:
        "Effort's there but not enough. Push for 6+ attempts before tagging a lead cold. Per the playbook, ad-side recommendations can still be pulled here on a case-by-case basis — but coaching cadence is the more reliable lever right now.",
      tactics: [
        "Move to full 3×3 Method instead of 2×3 if you're below 6.",
        "Use the Double Dial on every attempt — call, hang up on voicemail, immediately call back.",
        "Send an immediate auto-text on opt-in. Buys time and signals you're real before the first call.",
        "Send a text after every missed call. The text alone often restarts the conversation.",
      ],
    };
  }
  if (cpl <= 10) {
    return {
      severity: "green",
      headline: "Green — healthy persistence",
      detail:
        "You're in the optimal range. Continue the discipline. Next gain is in quality — right times of day, right messaging, multi-channel touches between calls.",
      tactics: null,
    };
  }
  return {
    severity: "green",
    headline: "Green — but watch for diminishing returns",
    detail:
      "Persistence is healthy. At 10+ calls per lead, watch for list-quality issues, contact-method gaps, or wrong-time-of-day calling. Consider pivoting unresponsive leads to a reactivation track sooner.",
    tactics: null,
  };
};

// ============================================================
// REACTIVATION STATUS
// Cadence: 8–12 week window per the playbook
// ============================================================
const reactivationStatus = (weeksSince) => {
  if (weeksSince === null) {
    return {
      severity: "critical",
      eyebrow: "No reactivation logged",
      headline: "Start a reactivation campaign this week",
      body: "There's no record of a reactivation having been run. The aged-lead database is one of the cheapest pipeline sources available — every week without one is uncaptured revenue. Schedule and launch the first campaign in the next 7 days.",
    };
  }
  if (weeksSince < 8) {
    return {
      severity: "good",
      eyebrow: `Last reactivation: ${weeksSince} week${weeksSince === 1 ? "" : "s"} ago`,
      headline: "On track — next one's due in the 8–12 week window",
      body: `You're inside the recent window. The next campaign should land between ${Math.max(8 - weeksSince, 1)} and ${12 - weeksSince} weeks from now. Put it on the calendar today so it doesn't slip when the week gets busy.`,
    };
  }
  if (weeksSince <= 12) {
    return {
      severity: "warning",
      eyebrow: `Last reactivation: ${weeksSince} weeks ago`,
      headline: "You're in the window — run the next one now",
      body: "This is the optimal moment per the 8–12 week cadence. Schedule and launch this week before the gap stretches and aged leads cool further.",
    };
  }
  return {
    severity: "critical",
    eyebrow: `Last reactivation: ${weeksSince} weeks ago`,
    headline: "Overdue — run a reactivation immediately",
    body: `You're ${weeksSince - 12} week${weeksSince - 12 === 1 ? "" : "s"} past the recommended cadence. Aged leads are sitting in the database earning nothing. Build the campaign this week and reset the cadence going forward.`,
  };
};

// ============================================================
// REACTIVATION CAMPAIGNS — seasonal calendar
// ============================================================
const REACTIVATION_CAMPAIGNS = [
  { name: "Member Madness", months: [3] },
  { name: "Spring Into Fitness", months: [4] },
  { name: "Stress Awareness Month", months: [4] },
  { name: "Moms Train Free", months: [5] },
  { name: "Memorial Day Meltdown", months: [5], note: "Tied to Memorial Day, late May" },
  { name: "Summer Bingo", months: [5, 6, 7] },
  { name: "Dads Train Free", months: [6] },
  { name: "Summer Slimdown / Shred", months: [6, 7], note: "Depends on client brand or target demo" },
  { name: "July 4th Event / Flash Class", months: [7], note: "Around July 4th" },
  { name: "Back To School", months: [8, 9], note: "Depends on the area's school calendar" },
  { name: "Fall Into Fitness", months: [9, 10], note: "Depends on where the gym is located" },
  { name: "Black Friday", months: [11] },
  { name: "Gift of Fitmas", months: [12] },
  { name: "New Year, New Me", months: [1] },
  { name: "General Reactivation", months: "anytime" },
  { name: "Sweepstakes / Viral Giveaway", months: "anytime", except: [11, 12] },
];

// Given today's date, return campaigns relevant in the next ~2 weeks
const getRelevantCampaigns = (now = new Date()) => {
  const currentMonth = now.getMonth() + 1; // 1–12
  const twoWeeksAhead = new Date(now);
  twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14);
  const lookAheadMonth = twoWeeksAhead.getMonth() + 1;
  const targetMonths = new Set([currentMonth, lookAheadMonth]);

  const seasonal = [];
  const evergreen = [];

  for (const c of REACTIVATION_CAMPAIGNS) {
    if (c.months === "anytime") {
      if (c.except && c.except.includes(currentMonth)) continue;
      evergreen.push(c);
    } else if (c.months.some((m) => targetMonths.has(m))) {
      seasonal.push(c);
    }
  }

  return { seasonal, evergreen, currentMonth, lookAheadMonth };
};

// ============================================================
// LEAD QUALITY COMPLAINTS — Media Buying Playbook levers
// Order: lowest impact → highest impact
// ============================================================
const COMPLAINTS = {
  bad_contact: {
    label: "Bad contact info",
    diagnosis:
      "Bad contact info points to low-intent placements and missing verification at submission.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Tighten placements toward Feeds. Stories and Reels generate higher volume but lower intent and more bad info.",
      },
      {
        impact: "Medium impact",
        text: "Add qualifying questions OR move to a high-intent lead form. Forces the lead to think before submitting.",
      },
      {
        impact: "Highest impact",
        text: "Add 2FA / verification on submission. Expect CPL to rise, but bad contact info should drop sharply. Use only when quality is the explicit priority.",
      },
    ],
  },
  foreign: {
    label: "Foreign / Spanish-speaking leads",
    diagnosis:
      "Almost always a targeting setup issue. Move in order of impact.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Confirm language targeting is set to English only at the ad set level. Should be in the standard build SOP — verify it actually is.",
      },
      {
        impact: "Medium impact",
        text: "Geo cleanup. Meta only allows 'living in or recently in' — exclude airports, major highways, bordering states, or known higher-Spanish-speaking zip codes.",
      },
      {
        impact: "Highest impact",
        text: "Turn on WiFi-only delivery (Placements > Devices). Restricts to people on WiFi, reducing transient/traveler delivery. Per the playbook, this hasn't increased CPL as much as expected — strong option.",
      },
    ],
  },
  not_answering: {
    label: "People not answering",
    diagnosis:
      "Two possible causes: low-intent placements (lead doesn't remember opting in) OR execution gaps. The execution check above tells us we can credibly look at the ad side.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Tighten placements toward Feeds. Higher-intent placement = leads more likely to remember opting in and pick up.",
      },
      {
        impact: "Medium impact",
        text: "Add qualifying questions or move to a high-intent lead form. Self-selected leads pick up at higher rates.",
      },
      {
        impact: "Highest impact",
        text: "Verification or 2FA on submission. Forces awareness, dramatically reduces fake/throwaway numbers.",
      },
    ],
  },
  too_far: {
    label: "People live too far away",
    diagnosis:
      "Geo targeting cleanup. Per the playbook, Meta no longer allows 'Living In Only' — 'recently in' delivery is leaking outside the trade area.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Narrow geo radius if it's currently too wide for the trade area.",
      },
      {
        impact: "Medium impact",
        text: "Exclude airports, major highways, and bordering areas Meta is pulling 'recently in' delivery from.",
      },
      {
        impact: "Highest impact",
        text: "Turn on WiFi-only delivery (Placements > Devices). Specifically listed in the playbook as the solution for out-of-area leads.",
      },
    ],
  },
  didnt_opt_in: {
    label: "They didn't opt in / didn't know",
    diagnosis:
      "Awareness and intent are too low. Lead opted in casually and forgot. Move toward intent levers in order of impact.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Tighten placements toward Feeds and narrow geo if it's too broad. Low-intent placements drive low awareness.",
      },
      {
        impact: "Medium impact",
        text: "Move to a high-intent lead form and add qualifying questions to force conscious submission.",
      },
      {
        impact: "Highest impact",
        text: "Add 2FA or verification on submission. The playbook calls this the cleanest fix for legitimacy when CPL increase is acceptable.",
      },
    ],
  },
  not_enough_volume: {
    label: "Not getting enough leads",
    diagnosis:
      "Volume is gated by reach. Reduce friction and open delivery in order of impact.",
    levers: [
      {
        impact: "Lowest impact",
        text: "Confirm territory and audience size aren't the constraint. Volume is capped by reach — check audience size first.",
      },
      {
        impact: "Medium impact",
        text: "Open delivery: expand geo if appropriate, broaden targeting, open placements to Advantage+ or lowest-CPL placements.",
      },
      {
        impact: "Higher impact",
        text: "Reduce friction: volume lead form with no extra questions, short benefits-focused copy, clear 'Get Offer' CTA.",
      },
      {
        impact: "Highest impact",
        text: "Right-size budget. Use the formula: CPM × (audience size / 1000) = monthly budget. Avoid both insufficient AND excessive budgets.",
      },
    ],
  },
  cpl_too_high: {
    label: "CPL is too high",
    diagnosis:
      "Per the playbook, get more lead flow without breaking quality. Confirm priority first — willing to trade some intent for volume?",
    levers: [
      {
        impact: "Lowest impact",
        text: "Confirm priority and timeline. Are they willing to trade some intent for volume short-term? Are 3–6% L2C numbers acceptable?",
      },
      {
        impact: "Medium impact",
        text: "Placement and creative friction check. If skewed heavily to higher-intent placements only, open placements to increase volume.",
      },
      {
        impact: "Higher impact",
        text: "Lead form friction. If on a high-intent form, switch to a more volume-oriented form (fewer steps, fewer questions). Expect lower intent in exchange.",
      },
      {
        impact: "Highest impact",
        text: "Budget right-sizing. Check if budget is too low for the market or too high causing oversaturation. Use the CPM × (audience / 1000) formula as a sanity check.",
      },
    ],
  },
};

// ============================================================
// EXECUTION GATE — three-state (passed / caution / failed)
//   passed   → speed AND calls in Green/Gold → ads can flow freely
//   caution  → either is Yellow (none Red/Danger) → ads case-by-case
//   failed   → either is Red/Danger → fix execution first
// ============================================================
const SPEED_GREEN = ["under_5", "5_15", "15_30"]; // gold + green bands
const SPEED_YELLOW = ["30_60"]; // yellow band
const SPEED_RED = ["60_plus", "24_plus"]; // red + danger bands
const CALLS_GREEN_FLOOR = 6;
const CALLS_YELLOW_FLOOR = 4;

// Kept for backward compatibility with anything still referencing it
const SPEED_GOOD = SPEED_GREEN;
const CALLS_PER_LEAD_FLOOR = CALLS_GREEN_FLOOR;

const evaluateGate = (speed, callsPerLead) => {
  const speedKnown = !!speed;
  const callsKnown = callsPerLead > 0;

  const speedGreen = speedKnown && SPEED_GREEN.includes(speed);
  const speedYellow = speedKnown && SPEED_YELLOW.includes(speed);
  const speedRed = speedKnown && SPEED_RED.includes(speed);

  const callsGreen = callsKnown && callsPerLead >= CALLS_GREEN_FLOOR;
  const callsYellow =
    callsKnown && callsPerLead >= CALLS_YELLOW_FLOOR && callsPerLead < CALLS_GREEN_FLOOR;
  const callsRed = callsKnown && callsPerLead < CALLS_YELLOW_FLOOR;

  let status; // "passed" | "caution" | "failed"
  if (!speedKnown || !callsKnown) {
    status = "failed"; // missing data → treat as failed
  } else if (speedRed || callsRed) {
    status = "failed";
  } else if (speedYellow || callsYellow) {
    status = "caution";
  } else {
    status = "passed";
  }

  return {
    status,
    passed: status === "passed",
    caution: status === "caution",
    failed: status === "failed",
    // Granular flags for the UI
    speedGreen,
    speedYellow,
    speedRed,
    callsGreen,
    callsYellow,
    callsRed,
    // Legacy
    speedOk: speedGreen,
    callsOk: callsGreen,
    speedKnown,
    callsKnown,
  };
};

// ============================================================
// SEVERITY STYLES
// ============================================================
const SEVERITY_STYLES = {
  excellent: {
    text: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    dot: "bg-emerald-600",
    label: "text-emerald-700",
  },
  good: {
    text: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    dot: "bg-emerald-600",
    label: "text-emerald-700",
  },
  green: {
    text: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    dot: "bg-emerald-600",
    label: "text-emerald-700",
  },
  work: {
    text: "text-amber-900",
    bg: "bg-amber-50",
    border: "border-amber-300",
    dot: "bg-amber-600",
    label: "text-amber-800",
  },
  warning: {
    text: "text-amber-900",
    bg: "bg-amber-50",
    border: "border-amber-300",
    dot: "bg-amber-600",
    label: "text-amber-800",
  },
  yellow: {
    text: "text-amber-900",
    bg: "bg-amber-50",
    border: "border-amber-300",
    dot: "bg-amber-600",
    label: "text-amber-800",
  },
  critical: {
    text: "text-rose-900",
    bg: "bg-rose-50",
    border: "border-rose-300",
    dot: "bg-rose-600",
    label: "text-rose-700",
  },
  red: {
    text: "text-rose-900",
    bg: "bg-rose-50",
    border: "border-rose-300",
    dot: "bg-rose-600",
    label: "text-rose-700",
  },
  gold: {
    text: "text-yellow-900",
    bg: "bg-yellow-50",
    border: "border-yellow-500",
    dot: "bg-yellow-500",
    label: "text-yellow-800",
  },
  danger: {
    text: "text-rose-950",
    bg: "bg-rose-100",
    border: "border-rose-700",
    dot: "bg-rose-700",
    label: "text-rose-900",
  },
};

const HEALTH_LABEL = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
  gold: "Gold",
  danger: "Danger",
};

const stageHealth = (rate, key) => {
  const b = BENCHMARKS[key];
  if (rate > b.yellow) return "green";
  if (rate >= b.red) return "yellow";
  return "red";
};

const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);

// ============================================================
// BUCKETS — Resources & audit content from GMM Circle
// ============================================================
const CIRCLE = (id, section, hub = "lead-conversion-basics") =>
  `https://gmm.circle.so/c/${hub}/sections/${section}/lessons/${id}`;

const BUCKETS = {
  speedToLead: {
    name: "Speed-to-Lead Bucket",
    summary: "Slow first response — leads cooling before contact",
    play:
      "Fix the speed problem first. Call Connect inside the nurture, AI Call Setter, or a dedicated appointment setter (upsell opportunity) are the three reliable paths. Then audit lead routing and notifications so the team is actually getting the alert.",
    resources: [
      { label: "Speed-to-Lead — GMM Lesson", url: CIRCLE("796715", "214962") },
    ],
  },
  callVolume: {
    name: "Call Volume Bucket",
    summary: "Low persistence — reps giving up too early",
    play:
      "Install the 3×3 Method, Double Dial every attempt, immediate auto-text on opt-in, and send a text after every missed call. Build the cadence into the CRM as required steps so reps can't skip ahead.",
    resources: [
      { label: "Call Volume / Cadence — GMM Lesson", url: CIRCLE("796777", "214962") },
    ],
  },
  booking: {
    name: "Booking Bucket",
    summary: "Low Lead → Book — conversation isn't getting commitments",
    play:
      "Audit the booking call against the SSS framework. Pull recordings, score against the checklist below, pick the 1–2 weakest links to coach this week.",
    fallbackNote:
      "If speed-to-lead or call volume aren't yet locked, start by listening to any calls longer than :90 — those are the ones that actually went somewhere. Use what you hear to pick the right audit item below.",
    auditItems: [
      {
        title: "How is their opening?",
        resources: [
          { label: "The Opening — Part 1", url: CIRCLE("798656", "215714") },
          { label: "The Opening — Part 2", url: CIRCLE("798761", "215714") },
        ],
      },
      {
        title: "Are they following one of the scripts?",
        resources: [
          { label: "Main script", url: CIRCLE("798781", "215714") },
          { label: "Shorter script", url: CIRCLE("800709", "215714") },
          { label: "Longer prequal script", url: CIRCLE("800720", "215714") },
        ],
      },
      {
        title: "How are they handling basic objections?",
        resources: [
          { label: "Objections — Part 1", url: CIRCLE("800852", "215714") },
          { label: "Objections — Part 2", url: CIRCLE("803165", "215714") },
        ],
      },
      {
        title: "Do they have calendar availability?",
        manualCheck:
          "Audit the calendar directly. Confirm same-day and next-day appointment slots are bookable — the Simple Set close depends on it.",
      },
    ],
  },
  showRate: {
    name: "Show Rate Bucket",
    summary: "Low Book → Show — leads booking but not arriving",
    play:
      "Audit confirmation cadence, the 'what to expect' setup, and social proof. Most show-rate leaks come from one of those three.",
    resources: [
      { label: "Show Rate Fundamentals — GMM Lesson", url: CIRCLE("803224", "217125") },
    ],
    auditItems: [
      {
        title: "Do they have a 'what to expect' setup?",
        resources: [
          { label: "What to Expect — Part 1", url: CIRCLE("803270", "217125") },
          { label: "What to Expect — Part 2", url: CIRCLE("803490", "217125") },
          { label: "What to Expect — Part 3", url: CIRCLE("803538", "217125") },
        ],
      },
      {
        title: "Do they have social proof in place?",
        resources: [
          { label: "Social Proof — GMM Lesson", url: CIRCLE("803656", "217216") },
        ],
        manualCheck:
          "Verify the social proof actually exists: Google reviews, Facebook reviews, FB/IG pages with regular posts, posts relevant to the gym, posts quality. If any of those are missing, that's the fix.",
      },
    ],
  },
  close: {
    name: "Close Bucket",
    summary:
      "Low Show → Close — they're in the room/on the call but not converting",
    precondition:
      "Get sales recordings on hand before walking through this audit. Without recordings, you're guessing.",
    play:
      "Work through the audit below in order — Approach & Discovery first, then Pitch & Close Mechanics, then Offer & Structure. Pick the 1–2 weakest links to coach.",
    auditGroups: [
      {
        groupName: "Approach & Discovery",
        items: [
          {
            title: "Are they making assumptions instead of asking about the person?",
            resources: [
              { label: "Ask, Don't Assume — GMM Lesson", url: CIRCLE("814230", "220565", "sales-training-hub") },
            ],
          },
          {
            title: "Are they preframing success with the Dan Sullivan question?",
            resources: [
              { label: "Dan Sullivan / Preframing — GMM Lesson", url: CIRCLE("814234", "220565", "sales-training-hub") },
            ],
          },
          {
            title: "Are they getting to the root of the lead's reasoning?",
            resources: [
              { label: "Root Reasoning — GMM Lesson", url: CIRCLE("814260", "220565", "sales-training-hub") },
            ],
          },
          {
            title: "Are they recapping goals and situation before moving on?",
            resources: [
              { label: "Recap Goals — GMM Lesson", url: CIRCLE("821621", "220565", "sales-training-hub") },
            ],
          },
        ],
      },
      {
        groupName: "Pitch & Close Mechanics",
        items: [
          {
            title: "Are they creating value and certainty?",
            resources: [
              { label: "Value & Certainty — GMM Lesson", url: CIRCLE("814202", "220507", "sales-training-hub") },
            ],
          },
          {
            title:
              "Are they prescribing the right membership, or presenting ALL the options?",
            resources: [
              { label: "Prescribe, Don't Present — GMM Lesson", url: CIRCLE("821641", "220565", "sales-training-hub") },
            ],
          },
          {
            title: "How are they handling objections?",
            resources: [
              { label: "Objections — Part 1", url: CIRCLE("814006", "220507", "sales-training-hub") },
              { label: "Objections — Part 2", url: CIRCLE("814007", "220507", "sales-training-hub") },
              { label: "Objections — Part 3", url: CIRCLE("814220", "220507", "sales-training-hub") },
            ],
          },
          {
            title: "Do they have a role-play habit?",
            resources: [
              { label: "Role-Play — GMM Lesson", url: CIRCLE("814007", "220507", "sales-training-hub") },
            ],
          },
        ],
      },
      {
        groupName: "Offer & Structure",
        items: [
          {
            title: "Is the client complaining 'nobody's just buying a membership'?",
            resources: [
              { label: "Membership Sales — Part 1", url: CIRCLE("814004", "220507", "sales-training-hub") },
              { label: "Membership Sales — Part 2", url: CIRCLE("814005", "220507", "sales-training-hub") },
            ],
          },
          {
            title: "Is there a membership guarantee in place?",
            resources: [
              { label: "Membership Guarantee — GMM Lesson", url: CIRCLE("1128155", "305762", "sales-training-hub") },
            ],
          },
        ],
      },
    ],
  },
  feo: {
    name: "FEO Bucket",
    summary: "Low FEO → Membership conversion",
    play:
      "The leak is in the trial experience, the conversion conversation, or the price-reveal moment. Pick the FEO type below to surface the relevant playbook.",
    requiresFollowUp: true,
    followUp: {
      question: "What type of FEO are they running?",
      options: [
        {
          value: "free_trial",
          label: "Free Trial",
          resources: [
            { label: "Free Trial Offer — GMM Lesson", url: CIRCLE("821644", "222804", "sales-training-hub") },
          ],
        },
        {
          value: "challenge",
          label: "Challenge",
          resources: [
            { label: "Challenge Offer — GMM Lesson", url: CIRCLE("821645", "222804", "sales-training-hub") },
          ],
        },
        {
          value: "other",
          label: "Something else",
          note:
            "Different FEO type? The free trial and challenge playbooks below are the GMM standards — the structural principles transfer even when the offer shape doesn't.",
          resources: [
            { label: "Free Trial Offer — GMM Lesson", url: CIRCLE("821644", "222804", "sales-training-hub") },
            { label: "Challenge Offer — GMM Lesson", url: CIRCLE("821645", "222804", "sales-training-hub") },
          ],
        },
      ],
    },
  },
  lowLeadFlow: {
    name: "Low Lead Flow Bucket",
    summary: "Not enough leads coming in",
    play:
      "Ads-side levers in order: open targeting, expand geo, broaden placements, reduce form friction, then right-size budget. See the Lead Quality recommendations below for the specifics.",
  },
  adQuality: {
    name: "Ad Quality Bucket",
    summary: "Junk leads, but execution is locked",
    play:
      "Run the lever recommendations below. Per the playbook, only one meaningful change per 30-day window.",
  },
  reactivation: {
    name: "Reactivation Bucket",
    summary: "Aged-lead pipeline sitting idle",
    play:
      "Schedule and launch a reactivation campaign in the next 7 days. See the reactivation card below for tactical specifics.",
  },
};

// Detect which buckets a client falls into based on inputs
const detectBuckets = ({
  data,
  speedKey,
  hasComplaint,
  selectedComplaints,
  gateStatus, // "passed" | "caution" | "failed"
}) => {
  const buckets = [];

  // Execution buckets
  if (speedKey && !["under_5", "5_15", "15_30"].includes(speedKey)) {
    buckets.push("speedToLead");
  }
  if (data.callsPerLead > 0 && data.callsPerLead < CALLS_GREEN_FLOOR) {
    buckets.push("callVolume");
  }

  // Funnel-stage buckets — fire whenever a stage lands in Red
  if (data.leads > 0 && data.bookingRate < 20) buckets.push("booking");
  if (data.booked > 0 && data.showRate < 60) buckets.push("showRate");
  if (data.showed > 0 && data.closeRate < 60) buckets.push("close");
  if (data.feoOn && data.feoSales > 0 && data.feoCloseRate < 60)
    buckets.push("feo");

  // Low Lead Flow — selected via complaint
  if (
    hasComplaint &&
    selectedComplaints.includes("not_enough_volume")
  ) {
    buckets.push("lowLeadFlow");
  }

  // Ad Quality — fires when gate is passed OR caution (case-by-case ads allowed)
  if (
    hasComplaint &&
    selectedComplaints.length > 0 &&
    (gateStatus === "passed" || gateStatus === "caution")
  ) {
    buckets.push("adQuality");
  }

  // Reactivation — overdue or never run
  if (
    data.weeksSinceReactivation === null ||
    data.weeksSinceReactivation > 12
  ) {
    buckets.push("reactivation");
  }

  return buckets;
};

// Determine the priority bucket — execution beats funnel, funnel beats ad/reactivation
const prioritizeBucket = (activeBuckets) => {
  if (!activeBuckets.length) return null;
  const priority = [
    "speedToLead",
    "callVolume",
    "booking",
    "showRate",
    "close",
    "feo",
    "lowLeadFlow",
    "adQuality",
    "reactivation",
  ];
  for (const key of priority) {
    if (activeBuckets.includes(key)) return key;
  }
  return activeBuckets[0];
};

// Project the funnel forward — what would the counts look like if the given
// stage keys were brought up to their Green target?
const projectFunnel = (data, fixedKeys) => {
  const fixed = new Set(fixedKeys);
  const leads = data.leads;

  const bookingRate = fixed.has("booking")
    ? BENCHMARK_TARGETS.booking
    : data.bookingRate;
  const booked = leads * (bookingRate / 100);

  const showRate = fixed.has("show") ? BENCHMARK_TARGETS.show : data.showRate;
  const showed = booked * (showRate / 100);

  const closeRate = fixed.has("close")
    ? BENCHMARK_TARGETS.close
    : data.closeRate;

  let feoSales = 0;
  let sold;
  let feoCloseRate = 0;
  if (data.feoOn) {
    feoSales = showed * (closeRate / 100);
    feoCloseRate = fixed.has("feoClose")
      ? BENCHMARK_TARGETS.feoClose
      : data.feoCloseRate;
    sold = feoSales * (feoCloseRate / 100);
  } else {
    sold = showed * (closeRate / 100);
  }

  return {
    leads,
    booked,
    showed,
    feoSales,
    sold,
    bookingRate,
    showRate,
    closeRate,
    feoCloseRate,
    overallRate: leads > 0 ? (sold / leads) * 100 : 0,
  };
};

// Run the funnel with user-specified rates (slider simulator)
const simulateFunnel = (data, rates) => {
  const leads = data.leads;
  const booked = leads * (rates.booking / 100);
  const showed = booked * (rates.show / 100);
  let feoSales = 0;
  let sold;
  if (data.feoOn) {
    feoSales = showed * (rates.close / 100);
    sold = feoSales * (rates.feoClose / 100);
  } else {
    sold = showed * (rates.close / 100);
  }
  return {
    leads,
    booked,
    showed,
    feoSales,
    sold,
    overallRate: leads > 0 ? (sold / leads) * 100 : 0,
  };
};
// ============================================================
// SUB-COMPONENTS
// ============================================================
function NumberInput({ label, icon: Icon, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span
        className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2"
        style={{ fontFamily: '"Archivo", sans-serif' }}
      >
        <Icon size={14} strokeWidth={2} className="text-stone-500" />
        {label}
      </span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-yellow-100 border border-yellow-200 rounded-md px-4 py-3 text-2xl font-semibold focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 focus:bg-yellow-50 transition-colors"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          color: "#0c1a3d",
        }}
      />
    </label>
  );
}

function SectionCard({ title, description, children, className = "" }) {
  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 ${className}`}
    >
      {/* Top-left blue tab accent */}
      <div className="absolute top-0 left-8 w-1 h-7 bg-blue-700 rounded-b" />
      <h2
        className="text-3xl md:text-4xl mb-3 uppercase leading-tight"
        style={{
          fontFamily: '"Big Shoulders Display", sans-serif',
          fontWeight: 900,
          color: "#0c1a3d",
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="text-stone-600 mb-6 leading-relaxed"
          style={{ fontFamily: '"Archivo", sans-serif' }}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function FunnelStage({ name, count, prevCount, rate, benchmarkKey, isLast }) {
  const health = benchmarkKey ? stageHealth(rate, benchmarkKey) : null;
  const styles = health ? SEVERITY_STYLES[health] : null;
  const widthPct = prevCount > 0 ? Math.min((count / prevCount) * 100, 100) : 100;
  const bench = benchmarkKey ? BENCHMARKS[benchmarkKey] : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="text-stone-900 font-medium"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            {name}
          </span>
          {benchmarkKey && (
            <span
              className={`text-xs px-2 py-0.5 border ${styles.border} ${styles.bg} ${styles.label} font-bold uppercase`}
            >
              {HEALTH_LABEL[health]}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          {benchmarkKey && (
            <span
              className="text-sm text-stone-500"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {rate.toFixed(1)}%
            </span>
          )}
          <span
            className="text-3xl font-semibold text-stone-900"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {count.toLocaleString()}
          </span>
        </div>
      </div>

      {bench ? (
        <>
          {/* R/Y/G zone background with current-rate marker */}
          <div className="h-4 relative rounded overflow-hidden">
            <div className="absolute inset-0 flex">
              <div
                className="bg-rose-200"
                style={{ width: `${bench.red}%` }}
                title={`Red < ${bench.red}%`}
              />
              <div
                className="bg-amber-200"
                style={{ width: `${bench.yellow - bench.red}%` }}
                title={`Yellow ${bench.red}–${bench.yellow}%`}
              />
              <div
                className="bg-emerald-200"
                style={{ width: `${100 - bench.yellow}%` }}
                title={`Green > ${bench.yellow}%`}
              />
            </div>
            {/* Current-rate marker */}
            <div
              className="absolute top-0 bottom-0 w-[3px] bg-slate-900 transition-all duration-700"
              style={{
                left: `calc(${Math.min(Math.max(rate, 0), 100)}% - 1.5px)`,
              }}
            />
          </div>
          {/* Zone scale labels */}
          <div
            className="relative h-4 mt-1 text-[10px] text-stone-500"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <span className="absolute left-0">0</span>
            <span
              className="absolute -translate-x-1/2"
              style={{ left: `${bench.red}%` }}
            >
              {bench.red}
            </span>
            <span
              className="absolute -translate-x-1/2"
              style={{ left: `${bench.yellow}%` }}
            >
              {bench.yellow}
            </span>
            <span className="absolute right-0">100</span>
          </div>
        </>
      ) : (
        // No benchmark — keep a simple bar (used for the Leads row)
        <div className="h-3 bg-stone-100 relative overflow-hidden rounded">
          <div
            className="h-full bg-stone-900 transition-all duration-700"
            style={{ width: `${widthPct}%` }}
          />
        </div>
      )}

      {!isLast && (
        <div className="flex items-center justify-center py-2 text-stone-400">
          <ArrowDown size={14} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

function InsightCard({ severity, icon: Icon, eyebrow, headline, children, tactics }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES.work;
  return (
    <div className={`border ${s.border} ${s.bg} rounded-xl p-6 md:p-8`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} strokeWidth={2} className={s.text} />
        <span className={`text-xs uppercase tracking-wider font-bold ${s.label}`}>
          {eyebrow}
        </span>
      </div>
      <h3
        className={`text-2xl md:text-3xl ${s.text} mb-3 leading-tight uppercase`}
        style={{
          fontFamily: '"Big Shoulders Display", sans-serif',
          fontWeight: 900,
          letterSpacing: "-0.005em",
        }}
      >
        {headline}
      </h3>
      <div
        className="text-stone-700 leading-relaxed"
        style={{ fontFamily: '"Archivo", sans-serif' }}
      >
        {children}
      </div>
      {tactics && tactics.length > 0 && (
        <div className="mt-5 pt-5 border-t border-stone-300/60">
          <p className={`text-xs uppercase tracking-wider font-bold ${s.label} mb-3`}>
            Tactics to deploy
          </p>
          <ul className="space-y-2">
            {tactics.map((t, i) => (
              <li
                key={i}
                className="flex gap-3 text-stone-700"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                <span className={`${s.text} shrink-0 font-semibold`}>→</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ComplaintToggle({ complaintKey, label, isSelected, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(complaintKey)}
      disabled={disabled}
      className={`text-left px-4 py-3 border rounded-md transition-all ${
        isSelected
          ? "border-blue-700 bg-blue-700 text-white"
          : disabled
          ? "border-slate-200 bg-slate-50 text-stone-400 cursor-not-allowed"
          : "border-slate-300 bg-white text-stone-700 hover:border-blue-700"
      }`}
      style={{ fontFamily: '"Archivo", sans-serif' }}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        {isSelected && (
          <span className="text-xs" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            ✓
          </span>
        )}
      </span>
    </button>
  );
}

function LeverList({ levers }) {
  return (
    <ol className="space-y-3 mt-4">
      {levers.map((l, i) => (
        <li key={i} className="flex flex-col md:flex-row gap-2 md:gap-4 items-start">
          <span
            className="text-xs uppercase tracking-wider font-semibold text-stone-500 shrink-0 md:w-32 pt-1"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            {l.impact}
          </span>
          <span
            className="text-stone-700 leading-relaxed flex-1"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            {l.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Resource link list — small, compact, brand-blue
function ResourceLinks({ resources }) {
  if (!resources || resources.length === 0) return null;
  return (
    <ul className="space-y-1.5 mt-2">
      {resources.map((r, i) => (
        <li key={i}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 hover:underline transition-colors"
            style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600 }}
          >
            <span className="text-blue-700">↗</span>
            {r.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Single audit item — title + resources + optional manual check note
function AuditItem({ item, index }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <div className="flex gap-3 items-start mb-2">
        <span
          className="text-xs font-bold text-blue-700 shrink-0"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <p
          className="font-semibold leading-snug"
          style={{
            fontFamily: '"Archivo", sans-serif',
            color: "#0c1a3d",
          }}
        >
          {item.title}
        </p>
      </div>
      <div className="pl-7">
        {item.resources && <ResourceLinks resources={item.resources} />}
        {item.manualCheck && (
          <p
            className="text-sm text-stone-600 leading-relaxed mt-2 italic"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            {item.manualCheck}
          </p>
        )}
      </div>
    </div>
  );
}

// Flat audit checklist (used by booking, show rate)
function AuditChecklist({ items }) {
  return (
    <div className="space-y-3 mt-4">
      {items.map((item, i) => (
        <AuditItem key={i} item={item} index={i} />
      ))}
    </div>
  );
}

// Grouped audit checklist (used by close bucket)
function GroupedAuditChecklist({ groups }) {
  let runningIndex = 0;
  return (
    <div className="space-y-6 mt-4">
      {groups.map((group, gi) => {
        const startIndex = runningIndex;
        runningIndex += group.items.length;
        return (
          <div key={gi}>
            <p
              className="text-xs uppercase tracking-[0.15em] text-blue-700 font-bold mb-3"
              style={{ fontFamily: '"Archivo", sans-serif' }}
            >
              {group.groupName}
            </p>
            <div className="space-y-3">
              {group.items.map((item, i) => (
                <AuditItem
                  key={i}
                  item={item}
                  index={startIndex + i}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Bucket chip for the summary card
function BucketChip({ name, isPrimary }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider ${
        isPrimary
          ? "bg-blue-700 text-white"
          : "bg-white border border-slate-300 text-stone-700"
      }`}
      style={{ fontFamily: '"Archivo", sans-serif' }}
    >
      {isPrimary && <span className="text-yellow-300">★</span>}
      {name}
    </div>
  );
}


// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CSFunnelCoach() {
  const [leads, setLeads] = useState("");
  const [booked, setBooked] = useState("");
  const [showed, setShowed] = useState("");
  const [usesFeo, setUsesFeo] = useState(null);
  const [feoSales, setFeoSales] = useState("");
  const [sold, setSold] = useState("");
  const [calls, setCalls] = useState("");
  const [speed, setSpeed] = useState("");
  const [lastReactivation, setLastReactivation] = useState("");
  const [hasComplaint, setHasComplaint] = useState(null);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [feoType, setFeoType] = useState(""); // "free_trial" | "challenge" | "other" | ""
  const [simOverrides, setSimOverrides] = useState({}); // {booking: 30, show: 70, ...}
  const [submitted, setSubmitted] = useState(false);

  const data = useMemo(() => {
    const l = parseFloat(leads) || 0;
    const b = parseFloat(booked) || 0;
    const sh = parseFloat(showed) || 0;
    const so = parseFloat(sold) || 0;
    const c = parseFloat(calls) || 0;
    const feo = parseFloat(feoSales) || 0;
    let weeksSince = null;
    if (lastReactivation) {
      const ms = Date.now() - new Date(lastReactivation).getTime();
      const w = Math.floor(ms / (1000 * 60 * 60 * 24 * 7));
      weeksSince = w >= 0 ? w : 0;
    }

    // Close rate semantics:
    //   FEO ON  → "close" = Show → FEO Sales (the appointment-stage close)
    //             Then "feoClose" = FEO → Membership
    //   FEO OFF → "close" = Show → Sold (direct to membership)
    const feoOn = usesFeo === true;
    const closeRate = feoOn ? pct(feo, sh) : pct(so, sh);
    const feoCloseRate = feoOn ? pct(so, feo) : 0;

    return {
      leads: l,
      booked: b,
      showed: sh,
      feoSales: feo,
      sold: so,
      calls: c,
      bookingRate: pct(b, l),
      showRate: pct(sh, b),
      closeRate,
      feoCloseRate,
      overallRate: pct(so, l), // Lead → Membership (always)
      callsPerLead: l > 0 ? c / l : 0,
      weeksSinceReactivation: weeksSince,
      feoOn,
    };
  }, [leads, booked, showed, sold, calls, feoSales, usesFeo, lastReactivation]);

  const bottlenecks = useMemo(() => {
    if (!submitted || data.leads === 0) return [];
    const stages = [];
    if (data.leads > 0)
      stages.push({
        key: "booking",
        label: "Lead → Booked",
        rate: data.bookingRate,
        target: BENCHMARK_TARGETS.booking,
      });
    if (data.booked > 0)
      stages.push({
        key: "show",
        label: "Booked → Showed",
        rate: data.showRate,
        target: BENCHMARK_TARGETS.show,
      });
    if (data.showed > 0)
      stages.push({
        key: "close",
        label: data.feoOn ? "Showed → FEO" : "Showed → Sold",
        rate: data.closeRate,
        target: BENCHMARK_TARGETS.close,
      });
    if (data.feoOn && data.feoSales > 0)
      stages.push({
        key: "feoClose",
        label: "FEO → Membership",
        rate: data.feoCloseRate,
        target: BENCHMARK_TARGETS.feoClose,
      });

    const withGaps = stages.map((s) => ({
      ...s,
      gap: s.target - s.rate, // absolute points off target
    }));

    // Only stages that are below target
    const belowTarget = withGaps
      .filter((s) => s.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    if (belowTarget.length === 0) return [];

    const result = [belowTarget[0]];
    // Show second only if BOTH the primary AND second are 20+ points off target
    if (
      belowTarget.length > 1 &&
      belowTarget[0].gap > 20 &&
      belowTarget[1].gap > 20
    ) {
      result.push(belowTarget[1]);
    }
    return result;
  }, [submitted, data]);

  // Backward-compat alias for any single-bottleneck references
  const bottleneck = bottlenecks[0] || null;

  const speedInsight = submitted && speed ? SPEED_DATA[speed] : null;
  const cplInsight =
    submitted && data.callsPerLead > 0 ? callsInsight(data.callsPerLead) : null;
  const reactivationInsight = submitted
    ? reactivationStatus(data.weeksSinceReactivation)
    : null;
  const gate = submitted ? evaluateGate(speed, data.callsPerLead) : null;

  // Active buckets — every category the client falls into
  const activeBuckets = useMemo(() => {
    if (!submitted || data.leads === 0) return [];
    return detectBuckets({
      data,
      speedKey: speed,
      hasComplaint: hasComplaint === true,
      selectedComplaints,
      gateStatus: gate ? gate.status : "failed",
    });
  }, [submitted, data, speed, hasComplaint, selectedComplaints, gate]);

  const primaryBucket = useMemo(
    () => prioritizeBucket(activeBuckets),
    [activeBuckets]
  );

  const canSubmit = leads !== "" && parseFloat(leads) > 0;

  const toggleComplaint = (key) => {
    setSelectedComplaints((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : prev.length >= 3
        ? prev
        : [...prev, key]
    );
  };

  const handleSubmit = () => {
    if (canSubmit) setSubmitted(true);
  };

  const handleReset = () => {
    setLeads("");
    setBooked("");
    setShowed("");
    setUsesFeo(null);
    setFeoSales("");
    setSold("");
    setCalls("");
    setSpeed("");
    setLastReactivation("");
    setHasComplaint(null);
    setSelectedComplaints([]);
    setFeoType("");
    setSimOverrides({});
    setSubmitted(false);
  };

  const showLeadQualitySection =
    submitted && hasComplaint === true && selectedComplaints.length > 0;

  return (
    <div className="min-h-screen text-stone-900" style={{ backgroundColor: "#eef2f8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Big+Shoulders+Display:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: "Archivo", sans-serif; }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* HEADER */}
        <header className="mb-10">
          {/* Eyebrow */}
          <p
            className="text-blue-700 text-sm font-bold uppercase tracking-[0.2em] mb-3"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            Gym Member Machine
          </p>

          {/* Title */}
          <h1
            className="text-5xl md:text-7xl leading-[0.95] mb-5 uppercase"
            style={{
              fontFamily: '"Big Shoulders Display", sans-serif',
              fontWeight: 900,
              letterSpacing: "-0.005em",
              color: "#0c1a3d",
            }}
          >
            Funnel Diagnostic
          </h1>

          {/* Tagline */}
          <p
            className="text-stone-700 text-base md:text-lg max-w-2xl mb-3 leading-relaxed"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            Plug in the funnel numbers. Get a coached read on where the leak
            is, what to fix first, and whether ad-lever changes are even on the
            table yet.
          </p>
          <p
            className="text-stone-700 text-base max-w-2xl leading-relaxed"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            If a stage looks scary red, that's normal — you're in the right
            place and we'll work through it together 💪
          </p>

          {/* Decorative accent bar */}
          <div className="flex items-center gap-1 mt-8">
            <div className="h-1 w-16 bg-yellow-300" />
            <div className="h-1 flex-1 bg-blue-700" />
          </div>
        </header>

        {/* INPUTS */}
        <section className="space-y-6 mb-10">
          {/* FUNNEL NUMBERS */}
          <SectionCard
            title="Funnel Numbers"
            description="The raw numbers from the most recent reporting period. Higher counts give cleaner reads — a few weeks is fine, a month is better."
          >
            {/* FEO Toggle (inside card) */}
            <div className="border border-slate-200 rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p
                    className="font-semibold mb-0.5"
                    style={{
                      fontFamily: '"Archivo", sans-serif',
                      color: "#0c1a3d",
                    }}
                  >
                    Does this gym run a Front End Offer (FEO)?
                  </p>
                  <p
                    className="text-sm text-stone-600"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    Low-ticket trial or challenge that leads to membership.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setUsesFeo(true)}
                    className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors ${
                      usesFeo === true
                        ? "bg-blue-700 text-white"
                        : "bg-white text-stone-700 border border-slate-300 hover:border-blue-700"
                    }`}
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsesFeo(false);
                      setFeoSales("");
                    }}
                    className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors ${
                      usesFeo === false
                        ? "bg-blue-700 text-white"
                        : "bg-white text-stone-700 border border-slate-300 hover:border-blue-700"
                    }`}
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`grid grid-cols-2 ${
                usesFeo === true ? "md:grid-cols-5" : "md:grid-cols-4"
              } gap-4`}
            >
              <NumberInput
                label="Leads"
                icon={Users}
                value={leads}
                onChange={setLeads}
                placeholder="0"
              />
              <NumberInput
                label="Booked"
                icon={CalendarCheck}
                value={booked}
                onChange={setBooked}
                placeholder="0"
              />
              <NumberInput
                label="Showed"
                icon={UserCheck}
                value={showed}
                onChange={setShowed}
                placeholder="0"
              />
              {usesFeo === true && (
                <NumberInput
                  label="FEO Sales"
                  icon={Ticket}
                  value={feoSales}
                  onChange={setFeoSales}
                  placeholder="0"
                />
              )}
              <NumberInput
                label={usesFeo === true ? "Memberships" : "Sold"}
                icon={DollarSign}
                value={sold}
                onChange={setSold}
                placeholder="0"
              />
            </div>
          </SectionCard>

          {/* EFFORT & SPEED */}
          <SectionCard
            title="Effort & Speed"
            description="How hard the team is working leads. These two numbers gate every other recommendation in the tool — slow speed or low cadence means we coach execution before touching anything else."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                label="Total Calls Made"
                icon={Phone}
                value={calls}
                onChange={setCalls}
                placeholder="0"
              />
              <label className="block">
                <span
                  className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  <Clock size={14} strokeWidth={2} className="text-stone-500" />
                  Speed to Lead
                </span>
                <select
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="w-full bg-yellow-100 border border-yellow-200 rounded-md px-4 py-3 text-base focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-colors h-[58px]"
                  style={{
                    fontFamily: '"Archivo", sans-serif',
                    color: "#0c1a3d",
                  }}
                >
                  <option value="">Select average response time…</option>
                  <option value="under_5">Under 5 minutes</option>
                  <option value="5_15">5–15 minutes</option>
                  <option value="15_30">15–30 minutes</option>
                  <option value="30_60">30 minutes – 1 hour</option>
                  <option value="60_plus">1 hour or more</option>
                  <option value="24_plus">More than 24 hours</option>
                </select>
              </label>
            </div>
          </SectionCard>

          {/* REACTIVATION HISTORY */}
          <SectionCard
            title="Reactivation History"
            description="When was the last reactivation campaign run? The cadence we're aiming for is every 8–12 weeks."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span
                  className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  <RotateCw size={14} strokeWidth={2} className="text-stone-500" />
                  Last Reactivation Run
                </span>
                <input
                  type="date"
                  value={lastReactivation}
                  onChange={(e) => setLastReactivation(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full bg-yellow-100 border border-yellow-200 rounded-md px-4 py-3 text-base focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-colors h-[58px]"
                  style={{
                    fontFamily: '"Archivo", sans-serif',
                    color: "#0c1a3d",
                  }}
                />
                <span
                  className="block mt-2 text-sm text-stone-500"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  Leave blank if one's never been run.
                </span>
              </label>
              {lastReactivation && (
                <div className="flex items-start pt-9">
                  <button
                    type="button"
                    onClick={() => setLastReactivation("")}
                    className="text-sm text-stone-500 hover:text-blue-700 underline"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    Clear date
                  </button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* LEAD QUALITY CONCERNS */}
          <SectionCard
            title="Lead Quality Concerns"
            description="If the client is complaining about leads, tell the tool what they're saying. We'll only suggest ad-side changes if execution is already locked in — otherwise we coach execution first."
          >
            <p
              className="font-semibold mb-3"
              style={{
                fontFamily: '"Archivo", sans-serif',
                color: "#0c1a3d",
              }}
            >
              Is the client complaining about lead quality?
            </p>
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setHasComplaint(true)}
                className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors ${
                  hasComplaint === true
                    ? "bg-blue-700 text-white"
                    : "bg-white text-stone-700 border border-slate-300 hover:border-blue-700"
                }`}
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasComplaint(false);
                  setSelectedComplaints([]);
                }}
                className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors ${
                  hasComplaint === false
                    ? "bg-blue-700 text-white"
                    : "bg-white text-stone-700 border border-slate-300 hover:border-blue-700"
                }`}
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                No
              </button>
            </div>

            {hasComplaint === true && (
              <div>
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <p
                    className="text-sm text-stone-700"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    Pick the most common complaints (up to 3):
                  </p>
                  <span
                    className="text-xs text-stone-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {selectedComplaints.length}/3 selected
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(COMPLAINTS).map(([key, c]) => {
                    const isSelected = selectedComplaints.includes(key);
                    const disabled =
                      !isSelected && selectedComplaints.length >= 3;
                    return (
                      <ComplaintToggle
                        key={key}
                        complaintKey={key}
                        label={c.label}
                        isSelected={isSelected}
                        onToggle={toggleComplaint}
                        disabled={disabled}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>

          {/* CTA Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-blue-700 text-white px-8 py-4 font-bold text-sm uppercase tracking-wider rounded hover:bg-blue-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-blue-700 inline-flex items-center gap-2"
              style={{ fontFamily: '"Archivo", sans-serif' }}
            >
              Run the Diagnostic →
            </button>
            {submitted && (
              <button
                onClick={handleReset}
                className="bg-white border-2 border-slate-300 text-stone-700 px-8 py-4 font-bold text-sm uppercase tracking-wider rounded hover:border-blue-700 hover:text-blue-700 transition-colors"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* RESULTS */}
        {submitted && data.leads > 0 && (
          <section className="space-y-6">
            {/* RESULTS EYEBROW DIVIDER */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-1 w-16 bg-yellow-300" />
              <p
                className="text-blue-700 text-xs font-bold uppercase tracking-[0.2em]"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                Diagnostic Results
              </p>
              <div className="h-1 flex-1 bg-blue-700" />
            </div>

            {/* CLIENT BUCKET SUMMARY */}
            {activeBuckets.length > 0 && (
              <div className="relative bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                <div className="absolute top-0 left-8 w-1 h-7 bg-blue-700 rounded-b" />
                <p
                  className="text-blue-700 text-xs font-bold uppercase tracking-[0.2em] mb-2"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  Client Buckets
                </p>
                <h2
                  className="text-3xl md:text-4xl mb-3 uppercase leading-tight"
                  style={{
                    fontFamily: '"Big Shoulders Display", sans-serif',
                    fontWeight: 900,
                    color: "#0c1a3d",
                    letterSpacing: "-0.005em",
                  }}
                >
                  This client is a{" "}
                  <span className="text-blue-700">
                    {BUCKETS[primaryBucket].name.replace(" Bucket", "")}
                  </span>{" "}
                  case
                </h2>
                <p
                  className="text-stone-700 leading-relaxed mb-5"
                  style={{ fontFamily: '"Archivo", sans-serif' }}
                >
                  {BUCKETS[primaryBucket].summary}. {BUCKETS[primaryBucket].play}
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {activeBuckets.map((key) => (
                    <BucketChip
                      key={key}
                      name={BUCKETS[key].name.replace(" Bucket", "")}
                      isPrimary={key === primaryBucket}
                    />
                  ))}
                </div>
                {activeBuckets.length > 1 && (
                  <p
                    className="text-xs text-stone-500 mt-3"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    ★ priority bucket — coach this one first.
                    {(activeBuckets.includes("speedToLead") ||
                      activeBuckets.includes("callVolume")) &&
                      activeBuckets.length > 1 &&
                      (gate && gate.failed
                        ? " Execution is in Red/Danger — fix routing and cadence before pulling any ad lever. Funnel data won't be trustworthy until execution is locked."
                        : gate && gate.caution
                        ? " Execution is in Yellow — coaching speed and call volume is still the priority, but ad-side levers can flow case-by-case if the client's situation warrants it."
                        : " Execution buckets generally come before downstream funnel buckets — but with execution in Green, every bucket below is fair game.")}
                  </p>
                )}
              </div>
            )}

            {/* HERO */}
            {(() => {
              const overallHealth = stageHealth(
                data.overallRate,
                "leadToClose"
              );
              const overallStyle = SEVERITY_STYLES[overallHealth];
              return (
                <div className="relative bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <div className="absolute top-0 left-8 w-1 h-7 bg-blue-700 rounded-b" />
                  <div className="flex items-end justify-between flex-wrap gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <p
                          className="text-blue-700 text-xs font-bold uppercase tracking-[0.2em]"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Lead-to-Close Conversion
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${overallStyle.border} ${overallStyle.bg} ${overallStyle.label} font-bold uppercase`}
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          {HEALTH_LABEL[overallHealth]}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-4">
                        <span
                          className={`text-7xl md:text-8xl ${overallStyle.text} leading-none`}
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                          }}
                        >
                          {data.overallRate.toFixed(1)}
                        </span>
                        <span
                          className="text-3xl text-stone-400"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          %
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xs uppercase tracking-[0.2em] text-stone-500 font-semibold mb-2"
                        style={{ fontFamily: '"Archivo", sans-serif' }}
                      >
                        From {data.leads.toLocaleString()} leads
                      </p>
                      <p
                        className="text-stone-600"
                        style={{ fontFamily: '"Archivo", sans-serif' }}
                      >
                        {data.sold.toLocaleString()}{" "}
                        {data.feoOn ? "memberships" : "closed"}
                        {data.calls > 0 && (
                          <> · {data.callsPerLead.toFixed(1)} calls/lead</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* FUNNEL + SIMULATOR */}
            <div className="grid lg:grid-cols-2 gap-6">
              <SectionCard
                title="Stage-by-Stage Breakdown"
                description="Each stage scored against the GMM red/yellow/green bands. The bar shows where the rate sits inside the band; the marker is the current rate."
              >
                <div className="space-y-1">
                  <FunnelStage
                    name="Leads"
                    count={data.leads}
                    prevCount={data.leads}
                    rate={100}
                  />
                  <FunnelStage
                    name="Booked Appointments"
                    count={data.booked}
                    prevCount={data.leads}
                    rate={data.bookingRate}
                    benchmarkKey="booking"
                  />
                  <FunnelStage
                    name="Showed Appointments"
                    count={data.showed}
                    prevCount={data.booked}
                    rate={data.showRate}
                    benchmarkKey="show"
                  />
                  {data.feoOn ? (
                    <>
                      <FunnelStage
                        name="Front End Offer Sales"
                        count={data.feoSales}
                        prevCount={data.showed}
                        rate={data.closeRate}
                        benchmarkKey="close"
                      />
                      <FunnelStage
                        name="Memberships"
                        count={data.sold}
                        prevCount={data.feoSales}
                        rate={data.feoCloseRate}
                        benchmarkKey="feoClose"
                        isLast
                      />
                    </>
                  ) : (
                    <FunnelStage
                      name="Sold"
                      count={data.sold}
                      prevCount={data.showed}
                      rate={data.closeRate}
                      benchmarkKey="close"
                      isLast
                    />
                  )}
                </div>
              </SectionCard>

              {/* SIMULATOR */}
              {(() => {
                const getRate = (stage, fallback) =>
                  simOverrides[stage] !== undefined
                    ? simOverrides[stage]
                    : fallback;
                const setRate = (stage, value) =>
                  setSimOverrides((prev) => ({ ...prev, [stage]: value }));
                const effectiveRates = {
                  booking: getRate("booking", data.bookingRate),
                  show: getRate("show", data.showRate),
                  close: getRate("close", data.closeRate),
                  feoClose: getRate("feoClose", data.feoCloseRate),
                };
                const sim = simulateFunnel(data, effectiveRates);
                const hasOverrides = Object.keys(simOverrides).length > 0;
                const deltaSales = sim.sold - data.sold;
                const deltaRate = sim.overallRate - data.overallRate;

                const sliders = [
                  {
                    stage: "booking",
                    label: "Lead → Book",
                    rate: effectiveRates.booking,
                    bench: BENCHMARKS.booking,
                  },
                  {
                    stage: "show",
                    label: "Book → Show",
                    rate: effectiveRates.show,
                    bench: BENCHMARKS.show,
                  },
                  {
                    stage: "close",
                    label: data.feoOn ? "Show → FEO" : "Show → Close",
                    rate: effectiveRates.close,
                    bench: BENCHMARKS.close,
                  },
                ];
                if (data.feoOn) {
                  sliders.push({
                    stage: "feoClose",
                    label: "FEO → Membership",
                    rate: effectiveRates.feoClose,
                    bench: BENCHMARKS.feoClose,
                  });
                }

                return (
                  <SectionCard
                    title="Funnel Simulator"
                    description="Drag a slider to see what shifts. Sliders default to the current rates — move one up to model the upside, move one down to see the downside."
                  >
                    <div className="space-y-4">
                      {sliders.map((s) => {
                        const health = stageHealth(s.rate, s.stage);
                        const styles = SEVERITY_STYLES[health];
                        return (
                          <div
                            key={s.stage}
                            className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                          >
                            <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
                              <span
                                className="font-semibold text-sm"
                                style={{
                                  fontFamily: '"Archivo", sans-serif',
                                  color: "#0c1a3d",
                                }}
                              >
                                {s.label}
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span
                                  className={`text-xs px-2 py-0.5 border ${styles.border} ${styles.bg} ${styles.label} font-bold uppercase`}
                                >
                                  {HEALTH_LABEL[health]}
                                </span>
                                <span
                                  className="text-xl font-semibold"
                                  style={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    color: "#0c1a3d",
                                  }}
                                >
                                  {s.rate.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={s.rate}
                              onChange={(e) =>
                                setRate(s.stage, parseFloat(e.target.value))
                              }
                              className="w-full accent-blue-700"
                              aria-label={`${s.label} rate`}
                            />
                            {/* Mini scale */}
                            <div
                              className="relative h-3 mt-1 text-[10px] text-stone-500"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                              }}
                            >
                              <span className="absolute left-0">0</span>
                              <span
                                className="absolute -translate-x-1/2"
                                style={{ left: `${s.bench.red}%` }}
                              >
                                {s.bench.red}
                              </span>
                              <span
                                className="absolute -translate-x-1/2"
                                style={{ left: `${s.bench.yellow}%` }}
                              >
                                {s.bench.yellow}
                              </span>
                              <span className="absolute right-0">100</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Result panel */}
                    <div className="mt-5 bg-emerald-50 border border-emerald-300 rounded-lg p-5">
                      <p
                        className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-3"
                        style={{ fontFamily: '"Archivo", sans-serif' }}
                      >
                        Simulated Result
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p
                            className="text-xs text-stone-600 mb-1"
                            style={{ fontFamily: '"Archivo", sans-serif' }}
                          >
                            Lead-to-Close
                          </p>
                          <p
                            className="text-3xl text-emerald-800"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 600,
                            }}
                          >
                            {sim.overallRate.toFixed(1)}%
                          </p>
                          {hasOverrides && (
                            <p
                              className={`text-xs font-bold mt-1 ${
                                deltaRate >= 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                              style={{ fontFamily: '"Archivo", sans-serif' }}
                            >
                              {deltaRate >= 0 ? "+" : ""}
                              {deltaRate.toFixed(1)} pts vs current
                            </p>
                          )}
                        </div>
                        <div>
                          <p
                            className="text-xs text-stone-600 mb-1"
                            style={{ fontFamily: '"Archivo", sans-serif' }}
                          >
                            {data.feoOn ? "Memberships" : "Sold"}
                          </p>
                          <p
                            className="text-3xl text-emerald-800"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 600,
                            }}
                          >
                            {Math.round(sim.sold).toLocaleString()}
                          </p>
                          {hasOverrides && (
                            <p
                              className={`text-xs font-bold mt-1 ${
                                deltaSales >= 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                              style={{ fontFamily: '"Archivo", sans-serif' }}
                            >
                              {deltaSales >= 0 ? "+" : ""}
                              {Math.round(deltaSales).toLocaleString()} vs
                              current
                            </p>
                          )}
                        </div>
                      </div>
                      {hasOverrides && (
                        <button
                          type="button"
                          onClick={() => setSimOverrides({})}
                          className="text-xs uppercase tracking-wider text-emerald-700 hover:text-emerald-900 font-bold underline"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          ↺ Reset sliders to current rates
                        </button>
                      )}
                    </div>
                  </SectionCard>
                );
              })()}
            </div>

            {/* BOTTLENECK(S) */}
            {bottlenecks.length > 0 ? (
              bottlenecks.map((b, idx) => {
                const isPrimary = idx === 0;
                const tabColor = isPrimary ? "bg-yellow-300" : "bg-blue-400";
                const eyebrowText = isPrimary
                  ? "The Bottleneck"
                  : "Also Worth Addressing";
                const headlineTail = isPrimary
                  ? "is where coaching pays off most"
                  : "is also 20+ points off target";
                return (
                  <div
                    key={b.key}
                    className="relative bg-slate-900 text-stone-50 rounded-xl shadow-sm p-6 md:p-10"
                  >
                    <div
                      className={`absolute top-0 left-8 w-1 h-7 ${tabColor} rounded-b`}
                    />
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={16} strokeWidth={2} className="text-blue-400" />
                      <span className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
                        {eyebrowText}
                      </span>
                    </div>
                    <h2
                      className="text-3xl md:text-5xl mb-6 leading-tight"
                      style={{
                        fontFamily: '"Big Shoulders Display", sans-serif',
                        fontWeight: 800,
                      }}
                    >
                      {b.label}{" "}
                      <span className="text-blue-400">{headlineTail}</span>
                    </h2>
                    <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8 pb-8 border-b border-stone-700">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                          Current
                        </p>
                        <p
                          className="text-2xl md:text-3xl"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          {b.rate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                          Target
                        </p>
                        <p
                          className="text-2xl md:text-3xl text-stone-300"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          {b.target}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                          Gap
                        </p>
                        <p
                          className="text-2xl md:text-3xl text-blue-400"
                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          −{b.gap.toFixed(1)} pts
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-stone-300 text-lg leading-relaxed mb-8"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      {BOTTLENECK_RECS[b.key].diagnosis}
                    </p>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold mb-4">
                        Coaching Actions
                      </p>
                      <ol className="space-y-4">
                        {BOTTLENECK_RECS[b.key].actions.map((a, i) => (
                          <li key={i} className="flex gap-4">
                            <span
                              className="text-blue-400 shrink-0"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 500,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="text-stone-200 leading-relaxed"
                              style={{ fontFamily: '"Archivo", sans-serif' }}
                            >
                              {a}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })
            ) : (
              <InsightCard
                severity="excellent"
                icon={CheckCircle2}
                eyebrow="Funnel Health"
                headline="Every stage is in the Green"
              >
                <p>
                  No single stage is dragging the funnel down. From here, look
                  at speed-to-lead and call cadence below — those are usually
                  the next levers when the funnel itself is healthy.
                </p>
              </InsightCard>
            )}

            {/* PROJECTED IMPACT — only when there are bottlenecks to fix */}
            {bottlenecks.length > 0 &&
              (() => {
                const fixedKeys = bottlenecks.map((b) => b.key);
                const fixedLabels = bottlenecks.map((b) => b.label);
                const projected = projectFunnel(data, fixedKeys);
                const addedSales = projected.sold - data.sold;
                const addedRate = projected.overallRate - data.overallRate;
                const fmt = (n) =>
                  Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
                return (
                  <div className="relative bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <div className="absolute top-0 left-8 w-1 h-7 bg-emerald-600 rounded-b" />
                    <p
                      className="text-emerald-700 text-xs font-bold uppercase tracking-[0.2em] mb-2"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      Projected Impact
                    </p>
                    <h2
                      className="text-3xl md:text-4xl mb-3 uppercase leading-tight"
                      style={{
                        fontFamily: '"Big Shoulders Display", sans-serif',
                        fontWeight: 900,
                        color: "#0c1a3d",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      What if{" "}
                      <span className="text-emerald-700">
                        {fixedLabels.join(" + ")}
                      </span>{" "}
                      moved into the Green?
                    </h2>
                    <p
                      className="text-stone-600 leading-relaxed mb-6"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      Math assumes the fixed stage{bottlenecks.length > 1 ? "s" : ""}{" "}
                      land{bottlenecks.length > 1 ? "" : "s"} right at the Green
                      target ({fixedKeys
                        .map((k) => `${BENCHMARK_TARGETS[k]}%`)
                        .join(" / ")}). Downstream stages flow through at the
                      client's current rates.
                    </p>

                    {/* Funnel comparison table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                      <div
                        className="grid bg-slate-50 px-4 py-3 text-xs uppercase tracking-wider font-bold text-stone-500"
                        style={{
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          fontFamily: '"Archivo", sans-serif',
                        }}
                      >
                        <span>Stage</span>
                        <span className="text-right">Current</span>
                        <span className="text-right">Projected</span>
                      </div>
                      {[
                        {
                          label: "Leads",
                          current: data.leads,
                          projected: projected.leads,
                          rate: null,
                          projRate: null,
                          fixed: false,
                        },
                        {
                          label: "Booked",
                          current: data.booked,
                          projected: projected.booked,
                          rate: data.bookingRate,
                          projRate: projected.bookingRate,
                          fixed: fixedKeys.includes("booking"),
                        },
                        {
                          label: "Showed",
                          current: data.showed,
                          projected: projected.showed,
                          rate: data.showRate,
                          projRate: projected.showRate,
                          fixed: fixedKeys.includes("show"),
                        },
                        ...(data.feoOn
                          ? [
                              {
                                label: "FEO Sales",
                                current: data.feoSales,
                                projected: projected.feoSales,
                                rate: data.closeRate,
                                projRate: projected.closeRate,
                                fixed: fixedKeys.includes("close"),
                              },
                              {
                                label: "Memberships",
                                current: data.sold,
                                projected: projected.sold,
                                rate: data.feoCloseRate,
                                projRate: projected.feoCloseRate,
                                fixed: fixedKeys.includes("feoClose"),
                              },
                            ]
                          : [
                              {
                                label: "Sold",
                                current: data.sold,
                                projected: projected.sold,
                                rate: data.closeRate,
                                projRate: projected.closeRate,
                                fixed: fixedKeys.includes("close"),
                              },
                            ]),
                      ].map((row, i) => (
                        <div
                          key={i}
                          className={`grid px-4 py-3 border-t border-slate-200 items-center ${
                            row.fixed ? "bg-emerald-50/50" : ""
                          }`}
                          style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}
                        >
                          <span
                            className="font-medium"
                            style={{
                              fontFamily: '"Archivo", sans-serif',
                              color: "#0c1a3d",
                            }}
                          >
                            {row.label}
                            {row.fixed && (
                              <span className="ml-2 text-xs text-emerald-700 font-bold uppercase tracking-wider">
                                fixed
                              </span>
                            )}
                          </span>
                          <span
                            className="text-right text-stone-600"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            {fmt(row.current)}
                            {row.rate !== null && (
                              <span className="text-xs text-stone-400 ml-1">
                                ({row.rate.toFixed(0)}%)
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-right font-semibold ${
                              row.fixed ? "text-emerald-700" : "text-stone-900"
                            }`}
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                            }}
                          >
                            {fmt(row.projected)}
                            {row.projRate !== null && (
                              <span className="text-xs text-stone-400 ml-1">
                                ({row.projRate.toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom-line delta */}
                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p
                          className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          {data.feoOn ? "Additional Memberships" : "Additional Sales"}
                        </p>
                        <p
                          className="text-4xl md:text-5xl text-emerald-800"
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                          }}
                        >
                          +{fmt(addedSales)}
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Lead-to-Close lift
                        </p>
                        <p
                          className="text-4xl md:text-5xl text-emerald-800"
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                          }}
                        >
                          {data.overallRate.toFixed(1)}%
                          <span className="text-stone-400 mx-1">→</span>
                          {projected.overallRate.toFixed(1)}%
                        </p>
                        <p
                          className="text-xs text-emerald-700 font-bold mt-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          +{addedRate.toFixed(1)} points
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* SPEED */}
            {speedInsight && (
              <InsightCard
                severity={speedInsight.severity}
                icon={Clock}
                eyebrow={`Speed to Lead — ${speedInsight.label}`}
                headline={speedInsight.headline}
                tactics={speedInsight.tactics}
              >
                <p>{speedInsight.detail}</p>
                {activeBuckets.includes("speedToLead") && (
                  <div className="mt-4 pt-4 border-t border-stone-300/60">
                    <p className="text-xs uppercase tracking-wider font-bold text-stone-700 mb-1">
                      Resource
                    </p>
                    <ResourceLinks resources={BUCKETS.speedToLead.resources} />
                  </div>
                )}
              </InsightCard>
            )}

            {/* CALLS */}
            {cplInsight && (
              <InsightCard
                severity={cplInsight.severity}
                icon={Phone}
                eyebrow={`Calls per Lead — ${data.callsPerLead.toFixed(1)}`}
                headline={cplInsight.headline}
                tactics={cplInsight.tactics}
              >
                <p>{cplInsight.detail}</p>
                {activeBuckets.includes("callVolume") && (
                  <div className="mt-4 pt-4 border-t border-stone-300/60">
                    <p className="text-xs uppercase tracking-wider font-bold text-stone-700 mb-1">
                      Resource
                    </p>
                    <ResourceLinks resources={BUCKETS.callVolume.resources} />
                  </div>
                )}
              </InsightCard>
            )}

            {/* BOOKING / SHOW / CLOSE / FEO AUDITS */}
            {activeBuckets.includes("booking") && (
              <SectionCard
                title="Booking Audit"
                description={BUCKETS.booking.play}
              >
                {!gate.passed && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                    <p
                      className="text-amber-900 text-sm leading-relaxed"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      <span className="font-bold uppercase tracking-wider text-xs">
                        Heads up:
                      </span>{" "}
                      {BUCKETS.booking.fallbackNote}
                    </p>
                  </div>
                )}
                <AuditChecklist items={BUCKETS.booking.auditItems} />
              </SectionCard>
            )}

            {activeBuckets.includes("showRate") && (
              <SectionCard
                title="Show Rate Audit"
                description={BUCKETS.showRate.play}
              >
                <div className="mb-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-blue-700 mb-1">
                    Start here
                  </p>
                  <ResourceLinks resources={BUCKETS.showRate.resources} />
                </div>
                <AuditChecklist items={BUCKETS.showRate.auditItems} />
              </SectionCard>
            )}

            {activeBuckets.includes("close") && (
              <SectionCard
                title="Close Audit"
                description={BUCKETS.close.play}
              >
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                  <p
                    className="text-blue-900 text-sm leading-relaxed"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    <span className="font-bold uppercase tracking-wider text-xs">
                      Precondition:
                    </span>{" "}
                    {BUCKETS.close.precondition}
                  </p>
                </div>
                <GroupedAuditChecklist groups={BUCKETS.close.auditGroups} />
              </SectionCard>
            )}

            {activeBuckets.includes("feo") && (
              <SectionCard
                title="FEO Audit"
                description={BUCKETS.feo.play}
              >
                <p
                  className="font-semibold mb-3"
                  style={{
                    fontFamily: '"Archivo", sans-serif',
                    color: "#0c1a3d",
                  }}
                >
                  {BUCKETS.feo.followUp.question}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {BUCKETS.feo.followUp.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFeoType(opt.value)}
                      className={`px-5 py-2 text-sm font-bold uppercase tracking-wider rounded transition-colors ${
                        feoType === opt.value
                          ? "bg-blue-700 text-white"
                          : "bg-white text-stone-700 border border-slate-300 hover:border-blue-700"
                      }`}
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {feoType &&
                  (() => {
                    const selected = BUCKETS.feo.followUp.options.find(
                      (o) => o.value === feoType
                    );
                    if (!selected) return null;
                    return (
                      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        {selected.note && (
                          <p
                            className="text-sm text-stone-600 leading-relaxed mb-3 italic"
                            style={{ fontFamily: '"Archivo", sans-serif' }}
                          >
                            {selected.note}
                          </p>
                        )}
                        <p
                          className="text-xs uppercase tracking-wider font-bold text-blue-700 mb-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          {selected.label} — Resources
                        </p>
                        <ResourceLinks resources={selected.resources} />
                      </div>
                    );
                  })()}
              </SectionCard>
            )}

            {/* LEAD QUALITY DIAGNOSTIC */}
            {showLeadQualitySection && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-px w-8 bg-blue-700" />
                  <span className="text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold">
                    Lead Quality Diagnostic
                  </span>
                </div>
                <h2
                  className="text-3xl md:text-4xl text-stone-900 mb-6 leading-tight"
                  style={{ fontFamily: '"Big Shoulders Display", sans-serif', fontWeight: 800 }}
                >
                  Is this an{" "}
                  <span className="text-blue-700">ad problem</span> or an{" "}
                  <span className="text-blue-700">execution problem</span>
                  ?
                </h2>

                {/* GATE FAILED — hard stop, coach execution first */}
                {gate.failed && (
                  <div className="relative bg-slate-900 text-stone-50 rounded-xl shadow-sm p-6 md:p-10 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert
                        size={18}
                        strokeWidth={2}
                        className="text-blue-400"
                      />
                      <span className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
                        Hold the Ad Levers — Fix Execution First
                      </span>
                    </div>
                    <h3
                      className="text-2xl md:text-3xl mb-5 leading-tight"
                      style={{ fontFamily: '"Big Shoulders Display", sans-serif', fontWeight: 800 }}
                    >
                      We can't honestly diagnose lead quality{" "}
                      <span className="text-blue-400">
                        when execution is the bigger variable
                      </span>
                      .
                    </h3>
                    <p
                      className="text-stone-300 text-lg leading-relaxed mb-6"
                      style={{ fontFamily: '"Archivo", sans-serif' }}
                    >
                      Per the Media Buying Playbook: speed-to-lead and follow-up
                      cadence are checked <em>before</em> any lever is pulled.
                      Pulling ad levers now will produce data we can't trust.
                      Coach the execution gap first, give it 2–4 weeks, then
                      re-evaluate.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div
                        className={`p-4 rounded-lg border ${
                          gate.speedGreen
                            ? "border-emerald-700 bg-emerald-950/30"
                            : gate.speedYellow
                            ? "border-amber-700 bg-amber-950/30"
                            : "border-rose-700 bg-rose-950/30"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                          Speed to Lead
                        </p>
                        <p className="text-lg font-medium">
                          {!gate.speedKnown
                            ? "— Not entered"
                            : gate.speedGreen
                            ? "✓ Green band"
                            : gate.speedYellow
                            ? "⚠ Yellow band"
                            : "✗ Red / Danger"}
                        </p>
                        <p
                          className="text-xs text-stone-400 mt-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Standard: under 30 minutes (Green band)
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-lg border ${
                          gate.callsGreen
                            ? "border-emerald-700 bg-emerald-950/30"
                            : gate.callsYellow
                            ? "border-amber-700 bg-amber-950/30"
                            : "border-rose-700 bg-rose-950/30"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                          Calls per Lead
                        </p>
                        <p className="text-lg font-medium">
                          {!gate.callsKnown
                            ? "— Not entered"
                            : gate.callsGreen
                            ? `✓ ${data.callsPerLead.toFixed(1)} attempts (Green)`
                            : gate.callsYellow
                            ? `⚠ ${data.callsPerLead.toFixed(1)} attempts (Yellow)`
                            : `✗ ${data.callsPerLead.toFixed(1)} attempts (Red)`}
                        </p>
                        <p
                          className="text-xs text-stone-400 mt-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Green: 6+ · Yellow: 4–5 · Red: under 4
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold mb-4">
                        Coaching Plan Before Touching Ads
                      </p>
                      <ol className="space-y-4">
                        {[
                          "Install the 3×3 Method as the floor: 3 calls per day for 3 days on every new lead. Build it into the CRM as required steps.",
                          "Use the Double Dial on every attempt — call, hang up if voicemail, immediately call back. Leave the Magic Voicemail only on the second miss.",
                          "Standardize the 5-second opening: '[Name] from [Gym], you reached out on Facebook this morning about [Offer] — what made you decide to reach out?' Answers all four spam-filter questions in one breath.",
                          "Send a text after every missed call. The text alone often restarts the conversation.",
                          "Run for 2–4 weeks, re-pull the funnel data, and revisit the lead-quality conversation with cleaner inputs.",
                        ].map((a, i) => (
                          <li key={i} className="flex gap-4">
                            <span
                              className="text-blue-400 shrink-0"
                              style={{
                                fontFamily: '"JetBrains Mono", monospace',
                                fontWeight: 500,
                              }}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="text-stone-200 leading-relaxed"
                              style={{
                                fontFamily: '"Archivo", sans-serif',
                              }}
                            >
                              {a}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}

                {/* GATE CAUTION — case-by-case, ads CAN flow with caveat */}
                {gate.caution && (
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 md:p-6 mb-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle
                        size={20}
                        strokeWidth={2}
                        className="text-amber-700 shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p
                          className="text-amber-800 text-xs font-bold uppercase tracking-[0.15em] mb-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Caution — Execution in Yellow
                        </p>
                        <h3
                          className="text-xl md:text-2xl mb-2 leading-tight"
                          style={{
                            fontFamily: '"Big Shoulders Display", sans-serif',
                            fontWeight: 800,
                            color: "#0c1a3d",
                          }}
                        >
                          Ad-lever changes can flow — case-by-case
                        </h3>
                        <p
                          className="text-amber-900 text-sm leading-relaxed"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Execution isn't fully locked, but it's not red either.
                          The standard play is still to fix execution first —
                          but if the client's situation warrants it, pull an ad
                          lever now. Just be ready to revisit if execution
                          doesn't tighten in the next 2–4 weeks.
                        </p>
                      </div>
                    </div>

                    {/* Status grid */}
                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      <div
                        className={`p-3 rounded-lg border ${
                          gate.speedGreen
                            ? "border-emerald-300 bg-emerald-50"
                            : gate.speedYellow
                            ? "border-amber-400 bg-amber-100"
                            : "border-rose-300 bg-rose-50"
                        }`}
                      >
                        <p
                          className="text-xs uppercase tracking-wider text-stone-600 font-bold mb-0.5"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Speed to Lead
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{
                            fontFamily: '"Archivo", sans-serif',
                            color: "#0c1a3d",
                          }}
                        >
                          {gate.speedGreen
                            ? "✓ Green band"
                            : gate.speedYellow
                            ? "⚠ Yellow band — push to under 30 min"
                            : "✗ Red"}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-lg border ${
                          gate.callsGreen
                            ? "border-emerald-300 bg-emerald-50"
                            : gate.callsYellow
                            ? "border-amber-400 bg-amber-100"
                            : "border-rose-300 bg-rose-50"
                        }`}
                      >
                        <p
                          className="text-xs uppercase tracking-wider text-stone-600 font-bold mb-0.5"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Calls per Lead
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{
                            fontFamily: '"Archivo", sans-serif',
                            color: "#0c1a3d",
                          }}
                        >
                          {gate.callsGreen
                            ? `✓ ${data.callsPerLead.toFixed(1)} (Green)`
                            : gate.callsYellow
                            ? `⚠ ${data.callsPerLead.toFixed(1)} attempts — push to 6+`
                            : `✗ ${data.callsPerLead.toFixed(1)} attempts (Red)`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* GATE PASSED — ads flow freely */}
                {gate.passed && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-5 mb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        className="text-emerald-700 shrink-0 mt-0.5"
                        strokeWidth={2}
                      />
                      <div>
                        <p
                          className="text-emerald-900 font-medium"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Execution check passed
                        </p>
                        <p
                          className="text-emerald-800 text-sm mt-1"
                          style={{ fontFamily: '"Archivo", sans-serif' }}
                        >
                          Speed-to-lead and calls per lead are both in the
                          Green band. Lead quality complaints are credible —
                          recommendations below follow the playbook order,
                          lowest impact to highest impact. Per playbook
                          standard, only <strong>one</strong> meaningful change
                          at a time over a 30-day window.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* AD RECOMMENDATIONS — shown for passed AND caution */}
                {(gate.passed || gate.caution) && (
                  <div className="space-y-4">
                    {selectedComplaints.map((key) => {
                      const c = COMPLAINTS[key];
                      return (
                        <div
                          key={key}
                          className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Megaphone
                              size={16}
                              strokeWidth={2}
                              className="text-blue-700"
                            />
                            <span className="text-xs uppercase tracking-wider font-semibold text-blue-700">
                              Client Complaint
                            </span>
                          </div>
                          <h3
                            className="text-2xl text-stone-900 mb-3 leading-tight"
                            style={{
                              fontFamily: '"Big Shoulders Display", sans-serif',
                              fontWeight: 500,
                            }}
                          >
                            {c.label}
                          </h3>
                          <p
                            className="text-stone-700 leading-relaxed"
                            style={{
                              fontFamily: '"Archivo", sans-serif',
                            }}
                          >
                            {c.diagnosis}
                          </p>
                          <div className="mt-5 pt-5 border-t border-stone-200">
                            <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-1">
                              Levers in order of impact
                            </p>
                            <LeverList levers={c.levers} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* REACTIVATION */}
            {reactivationInsight && (() => {
              const sev = reactivationInsight.severity;
              const palette = {
                good: {
                  border: "border-emerald-700",
                  bg: "bg-emerald-50",
                  iconBg: "bg-emerald-700",
                  eyebrow: "text-emerald-800",
                  arrow: "text-emerald-700",
                },
                warning: {
                  border: "border-amber-700",
                  bg: "bg-amber-50",
                  iconBg: "bg-amber-700",
                  eyebrow: "text-amber-800",
                  arrow: "text-amber-700",
                },
                critical: {
                  border: "border-rose-700",
                  bg: "bg-rose-50",
                  iconBg: "bg-rose-700",
                  eyebrow: "text-rose-800",
                  arrow: "text-rose-700",
                },
              }[sev];
              return (
                <div className={`border-2 ${palette.border} rounded-xl p-6 md:p-8 ${palette.bg}`}>
                  <div className="flex items-start gap-4">
                    <div className={`${palette.iconBg} text-stone-50 p-3 shrink-0`}>
                      <RotateCw size={20} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-xs uppercase tracking-[0.2em] ${palette.eyebrow} font-semibold mb-2`}
                      >
                        {reactivationInsight.eyebrow}
                      </p>
                      <h3
                        className="text-2xl text-stone-900 mb-3 leading-tight"
                        style={{ fontFamily: '"Big Shoulders Display", sans-serif', fontWeight: 800 }}
                      >
                        {reactivationInsight.headline}
                      </h3>
                      <p
                        className="text-stone-700 leading-relaxed mb-4"
                        style={{ fontFamily: '"Archivo", sans-serif' }}
                      >
                        {reactivationInsight.body}
                      </p>

                      {/* SEASONAL CAMPAIGN SUGGESTIONS */}
                      {(() => {
                        const { seasonal, evergreen } =
                          getRelevantCampaigns();
                        return (
                          <div className="bg-white/60 border border-slate-200 rounded-lg p-4 mb-5">
                            <p
                              className={`text-xs uppercase tracking-wider ${palette.eyebrow} font-bold mb-2`}
                            >
                              Coming up in the next 2 weeks
                            </p>
                            {seasonal.length > 0 ? (
                              <ul
                                className="space-y-1.5 mb-3"
                                style={{ fontFamily: '"Archivo", sans-serif' }}
                              >
                                {seasonal.map((c) => (
                                  <li
                                    key={c.name}
                                    className="flex gap-2 text-stone-700"
                                  >
                                    <span
                                      className={`${palette.arrow} font-semibold shrink-0`}
                                    >
                                      →
                                    </span>
                                    <span>
                                      <span
                                        className="font-bold"
                                        style={{ color: "#0c1a3d" }}
                                      >
                                        {c.name}
                                      </span>
                                      {c.note && (
                                        <span className="text-sm text-stone-500">
                                          {" "}
                                          — {c.note}
                                        </span>
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p
                                className="text-sm text-stone-600 italic mb-3"
                                style={{ fontFamily: '"Archivo", sans-serif' }}
                              >
                                No seasonal campaigns lining up in this
                                window — go with one of the evergreen options
                                below.
                              </p>
                            )}

                            {evergreen.length > 0 && (
                              <>
                                <p className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2 mt-3">
                                  Always available
                                </p>
                                <ul
                                  className="space-y-1.5"
                                  style={{ fontFamily: '"Archivo", sans-serif' }}
                                >
                                  {evergreen.map((c) => (
                                    <li
                                      key={c.name}
                                      className="flex gap-2 text-stone-700"
                                    >
                                      <span className="text-stone-400 font-semibold shrink-0">
                                        →
                                      </span>
                                      <span>
                                        <span
                                          className="font-semibold"
                                          style={{ color: "#0c1a3d" }}
                                        >
                                          {c.name}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      <p
                        className={`text-xs uppercase tracking-wider ${palette.eyebrow} font-semibold mb-3`}
                      >
                        How to run it well
                      </p>
                      <ul
                        className="space-y-2 text-stone-700"
                        style={{ fontFamily: '"Archivo", sans-serif' }}
                      >
                        <li className="flex gap-2">
                          <span className={`${palette.arrow} font-semibold`}>→</span>
                          <span>
                            Target leads that didn't book, didn't show, or were
                            marked cold in the last 90 days first.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className={`${palette.arrow} font-semibold`}>→</span>
                          <span>
                            Use a different angle than the original outreach — new
                            offer, new pain, or a check-in framing.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className={`${palette.arrow} font-semibold`}>→</span>
                          <span>
                            Multi-channel always beats single-channel: SMS, email,
                            and call together outperform any one alone.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="text-center pt-6 pb-4">
              <Sparkles
                size={16}
                className="text-blue-700 mx-auto mb-3"
                strokeWidth={2}
              />
              <p
                className="text-sm text-stone-500"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                Coach execution first. Pull ad levers second. Reactivation
                always.
              </p>
            </div>
          </section>
        )}

        {submitted && data.leads === 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-6 text-amber-900">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} />
              <span className="font-semibold">Need lead count</span>
            </div>
            <p className="text-sm">
              Enter at least the total leads to run the diagnostic.
            </p>
          </div>
        )}

        {/* GMM FOOTER */}
        <footer className="mt-20 pt-8 border-t border-slate-300">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-700 text-white px-3 py-1.5 rounded">
                  <span
                    className="text-xs font-black uppercase tracking-[0.15em]"
                    style={{ fontFamily: '"Archivo", sans-serif' }}
                  >
                    GMM
                  </span>
                </div>
                <span
                  className="font-bold uppercase tracking-wider text-sm"
                  style={{
                    fontFamily: '"Archivo", sans-serif',
                    color: "#0c1a3d",
                  }}
                >
                  Gym Member Machine
                </span>
              </div>
              <p
                className="text-sm text-stone-600 max-w-md leading-relaxed"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                Growth tools for helping great coaches become great gym
                owners. This diagnostic pulls from the GMM Follow-Up,
                Sales Mastery, and Media Buying Levers playbooks.
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-2">
              <a
                href="https://www.gymmembermachine.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-900 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ fontFamily: '"Archivo", sans-serif' }}
              >
                gymmembermachine.com →
              </a>
              <span
                className="text-xs text-stone-400"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                Internal CS Coaching Tool · build v1.0
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
