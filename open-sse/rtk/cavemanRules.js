// Rule-based Caveman input rewrite. Port of OmniRoute CAVEMAN_RULES (EN only).
// Does not touch tool_result / code / URLs — caller extracts those first.

const RANK = { lite: 0, full: 1, ultra: 2 };

export const CAVEMAN_RULES = [
  {
    name: "pleasantries",
    min: "lite",
    context: "all",
    pattern: /(?<!make\s)(?<!be\s)\b(?:i'?d be happy to|i would be happy to|glad to help|happy to|thank you|thanks|no problem|you'?re welcome|absolutely|certainly|of course|sure)\b[,.!?\s]*/gi,
    replacement: "",
  },
  {
    name: "polite_framing",
    min: "lite",
    context: "all",
    pattern: /\b(?:please|kindly|could you please|would you please|can you please|I would like you to|I want you to|I need you to)\b\s*/gi,
    replacement: "",
  },
  {
    name: "hedging",
    min: "lite",
    context: "all",
    pattern: /\b(?:it seems like|it appears that|I think that|I believe that|probably|possibly|maybe it)\b\s*/gi,
    replacement: "",
  },
  {
    name: "verbose_instructions",
    min: "lite",
    context: "all",
    pattern: /\b(?:provide a detailed explanation of|give me a comprehensive explanation of|write an in-depth explanation of|create a thorough explanation of|provide a detailed|give me a comprehensive|write an in-depth|create a thorough|explain in detail)\b/gi,
    replacement: (match) => {
      const map = {
        "provide a detailed explanation of": "explain ",
        "give me a comprehensive explanation of": "explain ",
        "write an in-depth explanation of": "explain ",
        "create a thorough explanation of": "explain ",
        "provide a detailed": "provide ",
        "give me a comprehensive": "give ",
        "write an in-depth": "write ",
        "create a thorough": "create ",
        "explain in detail": "explain ",
      };
      return map[match.toLowerCase()] ?? match;
    },
  },
  {
    name: "filler_adverbs",
    min: "lite",
    context: "all",
    pattern: /(?<![a-z])\b(?:basically|essentially|actually|literally|simply|currently)\b\s*/gi,
    replacement: "",
  },
  {
    name: "filler_phrases",
    min: "lite",
    context: "user",
    pattern: /^(?:I want to|I need to|I'd like to|I'm looking for)\b\s*/gim,
    replacement: "",
  },
  {
    name: "redundant_openers",
    min: "lite",
    context: "user",
    pattern: /^(?:Hi there|Hello|Good morning|Hey)\s*[,.!?\s]?\s*/gim,
    replacement: "",
  },
  {
    name: "verbose_requests",
    min: "lite",
    context: "user",
    pattern: /\b(?:I was wondering if you could|Would it be possible to)\b\s*/gi,
    replacement: "",
  },
  {
    name: "self_reference",
    min: "lite",
    context: "user",
    pattern: /^(?:I am trying to|I am working on|I have been)\b\s*/gim,
    replacement: "",
  },
  {
    name: "excessive_gratitude",
    min: "lite",
    context: "all",
    pattern: /\b(?:Thank you so much|Thanks in advance|I really appreciate)\b[,.!?\s]*/gi,
    replacement: "",
  },
  {
    name: "qualifier_removal",
    min: "lite",
    context: "all",
    pattern: /\b(?:a bit|a little|somewhat|kind of|sort of)\b\s*/gi,
    replacement: "",
  },
  {
    name: "purpose_phrases",
    min: "lite",
    context: "all",
    pattern: /\b(?:in order to|so as to)\b\s*/gi,
    replacement: "to ",
  },
  {
    name: "verbose_connectors",
    min: "lite",
    context: "all",
    pattern: /\b(?:furthermore|additionally|moreover|in addition)\b\s*/gi,
    replacement: "also ",
  },
  {
    name: "emphasis_removal",
    min: "lite",
    context: "all",
    pattern: /\b(?:very|really|extremely|highly|quite)\s+(?=[a-z])/gi,
    replacement: "",
  },
  {
    name: "question_to_directive",
    min: "lite",
    context: "user",
    pattern: /\b(?:Can you explain why|Could you show me how|Would you tell me|Can you tell me)\b\s*/gi,
    replacement: (match) => {
      const map = {
        "can you explain why": "Explain why ",
        "could you show me how": "Show how ",
        "would you tell me": "Tell me ",
        "can you tell me": "Tell me ",
      };
      return map[match.trimEnd().toLowerCase()] ?? match;
    },
  },
  {
    name: "context_setup",
    min: "lite",
    context: "user",
    pattern: /\b(?:I have the following code|Here is my code|Below is the code)\b\s*[:.]?\s*/gi,
    replacement: "Code:",
  },
  {
    name: "intent_clarification",
    min: "lite",
    context: "user",
    pattern: /\b(?:What I'm trying to do is|My objective is to|What I need is|I'm aiming to)\b\s*/gi,
    replacement: "Goal:",
  },
  {
    name: "meta_commentary",
    min: "lite",
    context: "all",
    pattern: /^(?:Note that|Keep in mind that|Remember that)\b\s*/gim,
    replacement: "",
  },
  {
    name: "repeated_context",
    min: "lite",
    context: "all",
    pattern: /\b(?:As we discussed earlier|As mentioned before|As previously stated|As I said before)\b[,.]?\s*/gi,
    replacement: "See above. ",
  },
  {
    name: "redundant_phrasing",
    min: "full",
    context: "all",
    pattern: /\b(?:make sure to|be sure to|due to the fact that|the reason is because|it is important to|you should|remember to)\b\s*/gi,
    replacement: (match) => {
      const map = {
        "make sure to": "ensure ",
        "be sure to": "ensure ",
        "due to the fact that": "because ",
        "the reason is because": "because ",
        "it is important to": "",
        "you should": "",
        "remember to": "",
      };
      return map[match.trim().toLowerCase()] ?? "";
    },
  },
  {
    name: "articles",
    min: "full",
    context: "all",
    pattern: /\b(?:[Aa]n|[Aa]|[Tt]he)\s+(?=[a-z])/g,
    replacement: "",
  },
  {
    name: "leader_phrases",
    min: "full",
    context: "all",
    pattern: /^(?:i'?ll|i will|i can|i'?d|let me|you can|we will|we can|let'?s)\s+(?=[a-z])/gim,
    replacement: "",
  },
  {
    name: "list_conjunction",
    min: "full",
    context: "all",
    pattern: /,\s*and also\s+|,\s*as well as\s+/gi,
    replacement: ", ",
  },
  {
    name: "redundant_quantifiers",
    min: "full",
    context: "all",
    pattern: /\b(?:each and every single|each and every|any and all)\b/gi,
    replacement: (match) => {
      const map = {
        "each and every single": "each",
        "each and every": "each",
        "any and all": "all",
      };
      return map[match.toLowerCase()] ?? match;
    },
  },
  {
    name: "ultra_abbreviations",
    min: "ultra",
    context: "all",
    pattern: /\b(?:database|configuration|implementation|authentication|authorization|application|dependencies|dependency)\b/gi,
    replacement: (match) => {
      const map = {
        database: "DB",
        configuration: "config",
        implementation: "impl",
        authentication: "auth",
        authorization: "authz",
        application: "app",
        dependency: "dep",
        dependencies: "deps",
      };
      return map[match.toLowerCase()] ?? match;
    },
  },
];

export function mapCavemanIntensity(level) {
  if (level === "lite" || level === "wenyan-lite") return "lite";
  if (level === "ultra" || level === "wenyan-ultra") return "ultra";
  return "full";
}

export function getRulesForContext(role, intensity) {
  const rank = RANK[intensity] ?? RANK.full;
  return CAVEMAN_RULES.filter((rule) => {
    const minRank = RANK[rule.min] ?? 0;
    return minRank <= rank && (rule.context === "all" || rule.context === role);
  });
}

export function applyRulesToText(text, rules) {
  let result = text;
  const applied = [];
  for (const rule of rules) {
    const before = result;
    result = result.replace(rule.pattern, rule.replacement);
    if (result !== before) applied.push(rule.name);
  }
  result = result
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
  return { text: result, applied };
}
