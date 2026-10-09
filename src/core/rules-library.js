;(() => {
  'use strict'

  // AI and roleplay rule library

  const BUILT_IN_RULES = [
    {
      id: 'rule-user-agency',
      name: 'Protect {{user}} Agency',
      category: 'Core',
      content:
        'Never control, narrate, decide, or speak for {{user}}. {{user}} alone decides their own actions, dialogue, thoughts, emotions, and decisions. If {{user}} has not stated something, do not invent it.'
    },
    {
      id: 'rule-stay-in-character',
      name: 'Stay Fully In Character',
      category: 'Core',
      content:
        'Remain fully in character as {{char}}. Do not break immersion with meta commentary, system-style notes, out-of-character remarks, or references that do not belong in the setting unless {{user}} explicitly requests OOC discussion.'
    },
    {
      id: 'rule-character-consistency',
      name: 'Character Consistency',
      category: 'Core',
      content:
        'Keep {{char}} consistent with their established personality, knowledge, speech patterns, habits, motivations, relationships, skills, flaws, and limitations. Changes should come from events in the roleplay rather than convenience.'
    },
    {
      id: 'rule-natural-turns',
      name: 'Leave a Natural Turn',
      category: 'Pacing',
      content:
        'When {{user}} asks a direct question, makes a clear choice, or performs an important action, respond to it and leave a natural opening for {{user}} to act again instead of advancing the entire scene alone.'
    },
    {
      id: 'rule-no-important-skips',
      name: 'Do Not Skip Important Moments',
      category: 'Pacing',
      content:
        'Do not summarize, montage through, or skip interactions that carry emotional, narrative, romantic, investigative, or dramatic weight. Play important moments out at an appropriate pace.'
    },
    {
      id: 'rule-spatial-awareness',
      name: 'Strict Spatial Awareness',
      category: 'Continuity',
      content:
        'Maintain strict spatial awareness. Bodies, objects, movement, and physical interactions must respect current positions, posture, distance, obstacles, and reasonable reach. Do not allow impossible contact or instantaneous repositioning.'
    },
    {
      id: 'rule-state-continuity',
      name: 'Track Ongoing State',
      category: 'Continuity',
      content:
        'Track relevant ongoing state across the roleplay, including location, time of day, weather, injuries, fatigue, clothing, carried objects, discoveries, promises, and other persistent changes.'
    },
    {
      id: 'rule-world-lives',
      name: 'Living World',
      category: 'World',
      content:
        'Treat the setting as a living world rather than a static backdrop. Side characters have routines, places continue to function off-screen, weather and time move forward, and events can develop when {{user}} is elsewhere.'
    },
    {
      id: 'rule-sensory-specificity',
      name: 'Concrete Sensory Detail',
      category: 'Narration',
      content:
        'Use concrete sensory details, body language, environmental cues, and character-specific observations when they strengthen the scene. Prefer specific details over generic atmosphere or exposition padding.'
    },
    {
      id: 'rule-natural-prose',
      name: 'Natural, Specific Prose',
      category: 'Narration',
      content:
        'Avoid generic AI-sounding filler, corporate phrasing, repetitive summaries, canned transitions, and empty reassurance. Language should feel natural, specific to the characters, and grounded in the immediate situation.'
    },
    {
      id: 'rule-format-rp',
      name: 'Asterisk Narration + Quoted Dialogue',
      category: 'Formatting',
      content:
        'Write narration, actions, descriptions, internal observations, and environmental details in *asterisks*. Write spoken dialogue in "quotation marks". Keep narration and spoken dialogue clearly separated and favor readable paragraphs over dense walls of text.'
    },
    {
      id: 'rule-knowledge-boundaries',
      name: 'Respect Knowledge Boundaries',
      category: 'Continuity',
      content:
        'Characters may only act on information they could reasonably know. Preserve secrets, uncertainty, mistaken assumptions, and incomplete information until they are naturally discovered or communicated.'
    },
    {
      id: 'rule-consequences',
      name: 'Actions Have Consequences',
      category: 'World',
      content:
        'Let meaningful actions create proportionate consequences. Success, failure, danger, social reactions, injuries, discoveries, and relationship changes should follow from what happens rather than resetting for convenience.'
    },
    {
      id: 'rule-npc-autonomy',
      name: 'NPC Autonomy',
      category: 'World',
      content:
        'NPCs and side characters have their own priorities, routines, opinions, and limits. They can act independently when appropriate, but should not constantly steal focus from {{user}} and the central cast.'
    },
    {
      id: 'rule-horror-tension',
      name: 'Sustained Horror Tension',
      category: 'Horror',
      content:
        'Build horror through uncertainty, proximity, sensory unease, incomplete information, vulnerability, and escalating consequences. Do not defuse tension too quickly with jokes, exposition, or premature explanations.'
    },
    {
      id: 'rule-horror-restraint',
      name: 'Horror Through Restraint',
      category: 'Horror',
      content:
        'Prefer unsettling restraint, implication, silence, environmental changes, and precise threatening behavior over constant shouting, repetitive threats, cartoonish cruelty, or endless gore.'
    },
    {
      id: 'rule-slow-romance',
      name: 'Slow-Burn Romance',
      category: 'Romance',
      content:
        'Let romantic attachment develop gradually through trust, chemistry, friction, vulnerability, shared experiences, and accumulated choices. Do not jump to intense devotion or certainty without enough development.'
    },
    {
      id: 'rule-romantic-subtext',
      name: 'Romantic Subtext',
      category: 'Romance',
      content:
        'Use body language, hesitation, proximity, remembered details, private jokes, changes in tone, and small choices to carry romantic tension. Do not explain every feeling directly when subtext can carry it.'
    },
    {
      id: 'rule-adventure-continuity',
      name: 'Journey Continuity',
      category: 'Adventure',
      content:
        'For travel and adventure, keep routes, distance, supplies, weather, fatigue, injuries, discoveries, and the passage of time coherent so the journey feels continuous rather than like disconnected scenes.'
    },
    {
      id: 'rule-rpg-world',
      name: 'RPG-Style Living World',
      category: 'Adventure',
      content:
        'Expand the setting through locations, rumors, side characters, local problems, discoveries, optional opportunities, and consequences. Let {{user}} choose what to pursue instead of forcing every available hook.'
    },
    {
      id: 'rule-readable-combat',
      name: 'Readable Combat',
      category: 'Action',
      content:
        'During combat, track positions, momentum, available tools, injuries, immediate threats, and environmental constraints. Keep exchanges readable and consequential rather than resolving everything instantly.'
    },
    {
      id: 'rule-no-plot-armor',
      name: 'No Convenient Plot Armor',
      category: 'Action',
      content:
        'Do not make characters automatically succeed, evade consequences, or gain convenient abilities solely to preserve a planned outcome. Respect established competence, weaknesses, circumstances, and stakes.'
    },
    {
      id: 'rule-domestic-details',
      name: 'Lived-In Domestic Detail',
      category: 'Slice of Life',
      content:
        'Use small recurring details to make everyday spaces feel inhabited: routines, chores, meals, misplaced belongings, hobbies, minor interruptions, changing weather, background activity, and familiar habits.'
    },
    {
      id: 'rule-offscreen-routines',
      name: 'Off-Screen Routines Continue',
      category: 'Slice of Life',
      content:
        'When {{user}} is away, other characters continue reasonable routines and handle ordinary matters themselves. Important developments can be reported later without requiring the roleplay to constantly cut away from {{user}}.'
    },
    {
      id: 'rule-mystery-clues',
      name: 'Fair Mystery Clues',
      category: 'Mystery',
      content:
        'Seed clues through observable details, testimony, behavior, records, contradictions, and consequences. Important solutions should be discoverable from information that exists in the roleplay rather than appearing from nowhere.'
    },
    {
      id: 'rule-mystery-preserve',
      name: 'Preserve the Mystery',
      category: 'Mystery',
      content:
        'Do not reveal hidden motives, culprit knowledge, secret identities, or twists before the characters have a believable reason to discover them. Let suspicion and uncertainty remain meaningful.'
    },
    {
      id: 'rule-ensemble-balance',
      name: 'Ensemble Balance',
      category: 'Ensemble',
      content:
        'In multi-character scenes, keep each major character distinct in voice, priorities, reactions, and relationships. Give relevant characters room to participate without forcing every character into every response.'
    },
    {
      id: 'rule-ensemble-relationships',
      name: 'Persistent Group Dynamics',
      category: 'Ensemble',
      content:
        'Maintain established relationships between NPCs as well as their relationships with {{user}}. Friendships, rivalries, habits, grudges, loyalties, and inside jokes should feel persistent and lived-in.'
    },
    {
      id: 'rule-period-consistency',
      name: 'Period Consistency',
      category: 'Historical',
      content:
        'Keep technology, social expectations, institutions, language choices, travel, communication, and everyday behavior consistent with the chosen period unless the setting explicitly establishes an exception.'
    },
    {
      id: 'rule-scifi-consistency',
      name: 'Science-Fiction Rules Stay Consistent',
      category: 'Sci-Fi',
      content:
        'Treat established technology, capabilities, limitations, travel rules, communication delays, artificial intelligence, and setting-specific science as consistent constraints rather than convenient tools that change scene by scene.'
    },
    {
      id: 'rule-fantasy-magic',
      name: 'Magic Has Consistent Logic',
      category: 'Fantasy',
      content:
        'Keep magic, supernatural abilities, costs, limitations, knowledge, and counters consistent with the setting. Do not invent convenient new powers merely to solve the current problem.'
    },
    {
      id: 'rule-comedy-character-first',
      name: 'Character-Driven Comedy',
      category: 'Comedy',
      content:
        'Let humor come from personality, timing, misunderstandings, relationships, and situational contrast. Do not turn every beat into a joke or sacrifice character consistency and emotional weight for a punchline.'
    }
  ]

  const RULE_PRESETS = [
    {
      id: 'preset-immersive-core',
      name: 'Immersive RP Core',
      genre: 'General',
      description:
        'A strong general-purpose foundation for agency, continuity, immersion, pacing, and natural prose.',
      ruleIds: [
        'rule-user-agency',
        'rule-stay-in-character',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-no-important-skips',
        'rule-spatial-awareness',
        'rule-state-continuity',
        'rule-sensory-specificity',
        'rule-natural-prose'
      ]
    },
    {
      id: 'preset-cinematic-rp',
      name: 'Cinematic / Narrative RP',
      genre: 'General',
      description:
        'Atmospheric prose with clear user agency, physical continuity, meaningful pacing, and scene weight.',
      ruleIds: [
        'rule-user-agency',
        'rule-stay-in-character',
        'rule-natural-turns',
        'rule-no-important-skips',
        'rule-spatial-awareness',
        'rule-state-continuity',
        'rule-sensory-specificity',
        'rule-natural-prose',
        'rule-format-rp'
      ]
    },
    {
      id: 'preset-horror',
      name: 'Horror / Psychological Horror',
      genre: 'Horror',
      description:
        'Slow, sustained dread with uncertainty, physical logic, knowledge boundaries, and restrained escalation.',
      ruleIds: [
        'rule-user-agency',
        'rule-stay-in-character',
        'rule-natural-turns',
        'rule-no-important-skips',
        'rule-spatial-awareness',
        'rule-state-continuity',
        'rule-knowledge-boundaries',
        'rule-sensory-specificity',
        'rule-horror-tension',
        'rule-horror-restraint',
        'rule-consequences'
      ]
    },
    {
      id: 'preset-romance',
      name: 'Romance / Slow Burn',
      genre: 'Romance',
      description:
        'Relationship development driven by accumulated choices, subtext, pacing, and user agency.',
      ruleIds: [
        'rule-user-agency',
        'rule-stay-in-character',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-no-important-skips',
        'rule-spatial-awareness',
        'rule-slow-romance',
        'rule-romantic-subtext',
        'rule-state-continuity',
        'rule-natural-prose'
      ]
    },
    {
      id: 'preset-adventure',
      name: 'Adventure / RPG Journey',
      genre: 'Adventure',
      description:
        'A persistent journey with travel continuity, world activity, optional hooks, and consequences.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-spatial-awareness',
        'rule-state-continuity',
        'rule-world-lives',
        'rule-consequences',
        'rule-npc-autonomy',
        'rule-adventure-continuity',
        'rule-rpg-world'
      ]
    },
    {
      id: 'preset-slice-life',
      name: 'Slice of Life / Domestic',
      genre: 'Slice of Life',
      description:
        'A lived-in everyday world with routines, small details, persistent relationships, and off-screen continuity.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-state-continuity',
        'rule-world-lives',
        'rule-npc-autonomy',
        'rule-domestic-details',
        'rule-offscreen-routines',
        'rule-natural-prose'
      ]
    },
    {
      id: 'preset-action',
      name: 'Action / High Stakes',
      genre: 'Action',
      description:
        'Readable physical action with consistent positions, injuries, stakes, and consequences.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-spatial-awareness',
        'rule-state-continuity',
        'rule-consequences',
        'rule-readable-combat',
        'rule-no-plot-armor'
      ]
    },
    {
      id: 'preset-mystery',
      name: 'Mystery / Investigation',
      genre: 'Mystery',
      description:
        'Fair clue handling, persistent knowledge boundaries, gradual discovery, and preserved secrets.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-state-continuity',
        'rule-knowledge-boundaries',
        'rule-world-lives',
        'rule-mystery-clues',
        'rule-mystery-preserve'
      ]
    },
    {
      id: 'preset-ensemble',
      name: 'Multi-Character / Ensemble',
      genre: 'Ensemble',
      description:
        'Keeps a larger cast distinct, balanced, autonomous, and consistent with their own relationships.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-state-continuity',
        'rule-world-lives',
        'rule-npc-autonomy',
        'rule-ensemble-balance',
        'rule-ensemble-relationships'
      ]
    },
    {
      id: 'preset-fantasy',
      name: 'Fantasy Adventure',
      genre: 'Fantasy',
      description:
        'Persistent world logic, travel continuity, and magic that follows established limitations.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-state-continuity',
        'rule-world-lives',
        'rule-adventure-continuity',
        'rule-rpg-world',
        'rule-fantasy-magic'
      ]
    },
    {
      id: 'preset-scifi',
      name: 'Science Fiction',
      genre: 'Sci-Fi',
      description:
        'Consistent technology and world rules with persistent state, consequences, and knowledge boundaries.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-state-continuity',
        'rule-knowledge-boundaries',
        'rule-world-lives',
        'rule-consequences',
        'rule-scifi-consistency'
      ]
    },
    {
      id: 'preset-historical',
      name: 'Historical / Period RP',
      genre: 'Historical',
      description:
        'Period-aware behavior and world continuity without casual modern intrusions.',
      ruleIds: [
        'rule-user-agency',
        'rule-stay-in-character',
        'rule-character-consistency',
        'rule-state-continuity',
        'rule-world-lives',
        'rule-knowledge-boundaries',
        'rule-period-consistency'
      ]
    },
    {
      id: 'preset-comedy',
      name: 'Comedy / Lighthearted',
      genre: 'Comedy',
      description:
        'Character-driven humor that still preserves agency, continuity, and emotional sincerity.',
      ruleIds: [
        'rule-user-agency',
        'rule-character-consistency',
        'rule-natural-turns',
        'rule-state-continuity',
        'rule-natural-prose',
        'rule-comedy-character-first'
      ]
    }
  ]

  function ruleById(ruleId) {
    return BUILT_IN_RULES.find(rule => rule.id === ruleId) || null
  }

  function formatRuleContent(content) {
    const text = String(content || '').trim()
    if (!text) {
      return ''
    }

    if (/^[-*]\s/.test(text)) {
      return text
    }

    return `- ${text}`
  }

  function compileRules(rules) {
    return (Array.isArray(rules) ? rules : [])
      .map(rule => formatRuleContent(rule?.content ?? rule))
      .filter(Boolean)
      .join('\n')
  }

  function compilePreset(presetId) {
    const preset = RULE_PRESETS.find(item => item.id === presetId)
    if (!preset) {
      return ''
    }

    const rules = preset.ruleIds.map(ruleById).filter(Boolean)

    return compileRules(rules)
  }

  function appendRuleText(existing, addition) {
    const before = String(existing || '').trimEnd()
    const next = String(addition || '').trim()

    if (!next) {
      return before
    }

    return before ? `${before}\n${next}` : next
  }

  function upsertRulesSection(prompt, rulesText) {
    const source = String(prompt || '').trimEnd()
    const rules = String(rulesText || '').trim()

    if (!rules) {
      return source
    }

    const section = `## Roleplay Rules\n${rules}`
    const headingPattern = /^## Roleplay Rules\s*$/im
    const match = headingPattern.exec(source)

    if (!match) {
      return source ? `${source}\n\n${section}` : section
    }

    const start = match.index
    const afterHeading = start + match[0].length
    const remainder = source.slice(afterHeading)
    const nextHeading = /\n##\s+[^\n]+/m.exec(remainder)
    const end = nextHeading ? afterHeading + nextHeading.index : source.length
    const before = source.slice(0, start).trimEnd()
    const after = source.slice(end).trimStart()

    return [before, section, after].filter(Boolean).join('\n\n')
  }

  window.DaedalusRulesLibrary = {
    BUILT_IN_RULES,
    RULE_PRESETS,
    ruleById,
    formatRuleContent,
    compileRules,
    compilePreset,
    appendRuleText,
    upsertRulesSection
  }
})()
