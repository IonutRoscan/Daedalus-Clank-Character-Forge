;(() => {
  'use strict'

  // RP Systems metadata, normalization, recipes, and prompt compilation

  const SYSTEM_MARKER_START = '<!-- DAEDALUS_RP_SYSTEMS_START -->'
  const SYSTEM_MARKER_END = '<!-- DAEDALUS_RP_SYSTEMS_END -->'

  const MODULE_ORDER = [
    'worldState',
    'inventory',
    'time',
    'weather',
    'location',
    'thoughts',
    'relationships',
    'conditions',
    'objectives',
    'mystery',
    'knowledge',
    'currency',
    'appearance',
    'objects',
    'skills',
    'reputation'
  ]

  const MODULES = {
    worldState: {
      label: 'World State',
      icon: '◈',
      description: 'Combine selected trackers into one coherent, persistent scene-state system.',
      category: 'Core',
      defaults: {
        enabled: false,
        displayMode: 'changed',
        scope: 'scene',
        strictPersistence: true
      }
    },
    inventory: {
      label: 'Inventory & Equipment',
      icon: '▤',
      description: 'Track items, quantities, equipment, key items, and ownership changes.',
      category: 'State',
      defaults: {
        enabled: false,
        ownerMode: 'user',
        trackQuantities: true,
        trackEquipment: true,
        trackKeyItems: true,
        trackConsumables: true,
        displayMode: 'changed'
      }
    },
    time: {
      label: 'Time, Date & Seasons',
      icon: '◷',
      description: 'Keep believable time progression, dates, and seasonal continuity.',
      category: 'World',
      defaults: {
        enabled: false,
        calendar: 'real',
        progression: 'natural',
        showExactTime: true,
        showDate: true,
        showSeason: true,
        customCalendar: ''
      }
    },
    weather: {
      label: 'Weather & Climate',
      icon: '☁',
      description: 'Keep weather persistent and let it affect clothing, travel, visibility, and ambience.',
      category: 'World',
      defaults: {
        enabled: false,
        climate: 'temperate',
        persistence: 'strong',
        affectEnvironment: true,
        customClimate: ''
      }
    },
    location: {
      label: 'Location & Spatial Continuity',
      icon: '⌖',
      description: 'Maintain current place, nearby spaces, positioning, and believable physical reach.',
      category: 'Continuity',
      defaults: {
        enabled: false,
        trackSubLocation: true,
        trackNearbyCharacters: true,
        strictPositioning: true,
        displayLocation: true
      }
    },
    thoughts: {
      label: 'Internal Thoughts',
      icon: '◌',
      description: 'Control whose internal thoughts may appear, how often, and how they are formatted.',
      category: 'Narrative',
      defaults: {
        enabled: false,
        scope: 'main',
        frequency: 'occasional',
        format: 'italics',
        dramaticIrony: false,
        customFormat: ''
      }
    },
    relationships: {
      label: 'Relationship / Affinity',
      icon: '♥',
      description: 'Track evolving trust, affection, respect, fear, suspicion, rivalry, or custom dimensions.',
      category: 'Character',
      defaults: {
        enabled: false,
        display: 'descriptive',
        dimensions: ['trust', 'affection'],
        meaningfulChangesOnly: true,
        separatePerCharacter: true
      }
    },
    conditions: {
      label: 'Health & Conditions',
      icon: '✚',
      description: 'Persist injuries, fatigue, stress, hunger, mana, stamina, and other ongoing states.',
      category: 'State',
      defaults: {
        enabled: false,
        trackers: ['health', 'injuries', 'fatigue'],
        display: 'descriptive',
        recoveryMustBeJustified: true
      }
    },
    objectives: {
      label: 'Objectives / Quests',
      icon: '◇',
      description: 'Track active, optional, hidden, and completed goals without resolving them off-screen.',
      category: 'Story',
      defaults: {
        enabled: false,
        main: true,
        side: true,
        hidden: false,
        completed: true,
        displayMode: 'changed'
      }
    },
    mystery: {
      label: 'Mystery & Clues',
      icon: '?',
      description: 'Track discovered clues, unresolved questions, red herrings, and reveal state.',
      category: 'Story',
      defaults: {
        enabled: false,
        trackClues: true,
        trackQuestions: true,
        trackRedHerrings: true,
        protectUndiscovered: true,
        displayMode: 'changed'
      }
    },
    knowledge: {
      label: 'Knowledge & Secrets',
      icon: '◫',
      description: 'Keep information boundaries distinct between {{char}}, {{user}}, NPCs, suspects, and false beliefs.',
      category: 'Continuity',
      defaults: {
        enabled: false,
        strictBoundaries: true,
        trackSuspicions: true,
        trackFalseBeliefs: true,
        revealOnlyWhenJustified: true
      }
    },
    currency: {
      label: 'Currency & Economy',
      icon: '¤',
      description: 'Track money, purchases, losses, debt, and affordability using a custom currency.',
      category: 'State',
      defaults: {
        enabled: false,
        currencyName: 'gold',
        trackPurchases: true,
        enforceAffordability: true,
        allowDebt: false,
        displayMode: 'changed'
      }
    },
    appearance: {
      label: 'Clothing & Appearance Continuity',
      icon: '♢',
      description: 'Remember outfits, removed layers, dirt, blood, damage, wetness, accessories, and visible changes.',
      category: 'Continuity',
      defaults: {
        enabled: false,
        trackOutfit: true,
        trackAccessories: true,
        trackDamage: true,
        trackWetDirty: true,
        displayMode: 'hidden'
      }
    },
    objects: {
      label: 'Persistent World Objects',
      icon: '⬡',
      description: 'Keep important doors, vehicles, artifacts, switches, containers, and other objects in a consistent state.',
      category: 'World',
      defaults: {
        enabled: false,
        trackOwnership: true,
        trackLocation: true,
        trackCondition: true,
        trackOpenClosed: true,
        displayMode: 'changed'
      }
    },
    skills: {
      label: 'Skills & Stats',
      icon: '△',
      description: 'Track capabilities using descriptive, numeric, or hidden values without forcing every RP into an RPG.',
      category: 'Game',
      defaults: {
        enabled: false,
        mode: 'descriptive',
        values: ['strength', 'perception'],
        changesRequireCause: true,
        displayMode: 'hidden'
      }
    },
    reputation: {
      label: 'Reputation & Factions',
      icon: '◎',
      description: 'Track how groups, organizations, towns, or institutions regard the cast.',
      category: 'World',
      defaults: {
        enabled: false,
        display: 'descriptive',
        meaningfulChangesOnly: true,
        separatePerFaction: true
      }
    }
  }

  const HUD_BLOCKS = [
    ['time', 'Time'],
    ['date', 'Date'],
    ['season', 'Season'],
    ['weather', 'Weather'],
    ['location', 'Location'],
    ['health', 'Health'],
    ['inventory', 'Inventory'],
    ['relationship', 'Relationship'],
    ['objective', 'Objective'],
    ['currency', 'Currency'],
    ['cast', 'Active Cast']
  ]

  const RECIPES = [
    {
      id: 'cozy-domestic',
      name: 'Cozy Domestic',
      description: 'A lived-in, persistent everyday world with weather, routines, relationships, and appearance continuity.',
      modules: ['worldState', 'time', 'weather', 'relationships', 'appearance', 'location'],
      rulePresetIds: ['preset-immersive-core', 'preset-slice-life'],
      hud: ['time', 'weather', 'location', 'relationship'],
      hudDisplay: 'changed'
    },
    {
      id: 'survival-horror',
      name: 'Survival Horror',
      description: 'Track scarce resources, injuries, time, location, threat-relevant objects, and clue progression.',
      modules: ['worldState', 'inventory', 'time', 'weather', 'location', 'conditions', 'objectives', 'mystery', 'knowledge', 'objects'],
      rulePresetIds: ['preset-immersive-core', 'preset-horror'],
      hud: ['time', 'weather', 'location', 'health', 'inventory', 'objective'],
      hudDisplay: 'every'
    },
    {
      id: 'rpg-adventure',
      name: 'RPG Adventure',
      description: 'A party-friendly world state with inventory, economy, quests, conditions, skills, and faction reputation.',
      modules: ['worldState', 'inventory', 'time', 'weather', 'location', 'relationships', 'conditions', 'objectives', 'currency', 'objects', 'skills', 'reputation'],
      rulePresetIds: ['preset-immersive-core', 'preset-adventure'],
      hud: ['time', 'location', 'health', 'inventory', 'objective', 'currency'],
      hudDisplay: 'every'
    },
    {
      id: 'romance',
      name: 'Romance / Slow Burn',
      description: 'Prioritize meaningful relationship evolution, internal thought control, pacing, and physical continuity.',
      modules: ['worldState', 'time', 'location', 'thoughts', 'relationships', 'appearance'],
      rulePresetIds: ['preset-immersive-core', 'preset-romance'],
      hud: ['time', 'location', 'relationship'],
      hudDisplay: 'changed'
    },
    {
      id: 'detective-mystery',
      name: 'Detective Mystery',
      description: 'Protect secrets while tracking clues, suspicions, objectives, chronology, locations, and object state.',
      modules: ['worldState', 'time', 'location', 'objectives', 'mystery', 'knowledge', 'objects'],
      rulePresetIds: ['preset-immersive-core', 'preset-mystery'],
      hud: ['time', 'location', 'objective'],
      hudDisplay: 'changed'
    },
    {
      id: 'ensemble-drama',
      name: 'Ensemble Drama',
      description: 'Keep separate relationships, knowledge, thoughts, locations, and current cast consistent across a group.',
      modules: ['worldState', 'time', 'location', 'thoughts', 'relationships', 'knowledge', 'appearance'],
      rulePresetIds: ['preset-immersive-core', 'preset-ensemble'],
      hud: ['time', 'location', 'relationship', 'cast'],
      hudDisplay: 'changed'
    },
    {
      id: 'fantasy-adventure',
      name: 'Fantasy Adventure',
      description: 'A continuity-heavy journey with travel time, inventory, conditions, currency, powers/stats, quests, and factions.',
      modules: ['worldState', 'inventory', 'time', 'weather', 'location', 'conditions', 'objectives', 'currency', 'objects', 'skills', 'reputation'],
      rulePresetIds: ['preset-immersive-core', 'preset-adventure', 'preset-fantasy'],
      hud: ['time', 'season', 'weather', 'location', 'health', 'inventory', 'objective'],
      hudDisplay: 'every'
    }
  ]

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function createDefaultHud() {
    return {
      enabled: false,
      position: 'bottom',
      style: 'compact',
      displayMode: 'changed',
      title: 'SCENE STATE',
      blocks: [
        {id: 'time', label: 'Time', enabled: true},
        {id: 'date', label: 'Date', enabled: false},
        {id: 'season', label: 'Season', enabled: false},
        {id: 'weather', label: 'Weather', enabled: false},
        {id: 'location', label: 'Location', enabled: true},
        {id: 'health', label: 'Health', enabled: false},
        {id: 'inventory', label: 'Inventory', enabled: false},
        {id: 'relationship', label: 'Relationship', enabled: false},
        {id: 'objective', label: 'Objective', enabled: false},
        {id: 'currency', label: 'Currency', enabled: false},
        {id: 'cast', label: 'Active Cast', enabled: false}
      ],
      customBlocks: [],
      order: HUD_BLOCKS.map(([id]) => id)
    }
  }

  function createDefaultSystems() {
    return {
      version: 2,
      modules: Object.fromEntries(
        MODULE_ORDER.map(id => [id, clone(MODULES[id].defaults)])
      ),
      hud: createDefaultHud(),
      notes: '',
      reinforcement: {
        dialogue: {
          enabled: false,
          style: 'natural',
          includeHud: true,
          autoUpdate: false
        }
      }
    }
  }

  function normalizeStringList(value, fallback = []) {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    }
    return clone(fallback)
  }

  function normalizeSystems(input) {
    const base = createDefaultSystems()
    const source = input && typeof input === 'object' ? input : {}

    for (const id of MODULE_ORDER) {
      const definition = MODULES[id]
      const raw = source.modules?.[id] && typeof source.modules[id] === 'object'
        ? source.modules[id]
        : {}
      base.modules[id] = {...clone(definition.defaults), ...clone(raw)}
      base.modules[id].enabled = raw.enabled === true

      if (id === 'relationships') {
        base.modules[id].dimensions = normalizeStringList(
          raw.dimensions,
          definition.defaults.dimensions
        )
      }

      if (id === 'conditions') {
        base.modules[id].trackers = normalizeStringList(
          raw.trackers,
          definition.defaults.trackers
        )
      }

      if (id === 'skills') {
        base.modules[id].values = normalizeStringList(
          raw.values,
          definition.defaults.values
        )
      }
    }

    const rawHud = source.hud && typeof source.hud === 'object' ? source.hud : {}
    const knownLabels = new Map(HUD_BLOCKS)
    const rawBlocks = Array.isArray(rawHud.blocks) ? rawHud.blocks : []
    const normalizedBlocks = []
    const seen = new Set()

    for (const block of rawBlocks) {
      const id = String(block?.id || '')
      if (!knownLabels.has(id) || seen.has(id)) continue
      seen.add(id)
      normalizedBlocks.push({
        id,
        label: String(block?.label || knownLabels.get(id)),
        enabled: block?.enabled === true
      })
    }

    for (const [id, label] of HUD_BLOCKS) {
      if (!seen.has(id)) {
        const fallback = base.hud.blocks.find(block => block.id === id)
        normalizedBlocks.push({
          id,
          label,
          enabled: fallback?.enabled === true
        })
      }
    }

    base.hud = {
      enabled: rawHud.enabled === true,
      position: ['top', 'bottom'].includes(rawHud.position) ? rawHud.position : 'bottom',
      style: ['compact', 'detailed', 'minimal'].includes(rawHud.style) ? rawHud.style : 'compact',
      displayMode: ['every', 'changed', 'scene', 'asked'].includes(rawHud.displayMode)
        ? rawHud.displayMode
        : 'changed',
      title: String(rawHud.title || 'SCENE STATE'),
      blocks: normalizedBlocks,
      customBlocks: Array.isArray(rawHud.customBlocks)
        ? rawHud.customBlocks
            .map(block => ({
              id: String(block?.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
              label: String(block?.label || 'Custom'),
              hint: String(block?.hint || ''),
              enabled: block?.enabled !== false
            }))
            .filter(block => block.label.trim())
        : [],
      order: []
    }

    const allHudIds = [
      ...base.hud.blocks.map(block => block.id),
      ...base.hud.customBlocks.map(block => block.id)
    ]
    const rawOrder = Array.isArray(rawHud.order) ? rawHud.order.map(String) : []
    const seenOrder = new Set()
    base.hud.order = []
    for (const id of [...rawOrder, ...allHudIds]) {
      if (allHudIds.includes(id) && !seenOrder.has(id)) {
        seenOrder.add(id)
        base.hud.order.push(id)
      }
    }

    base.notes = String(source.notes || '')
    const rawReinforcement = source.reinforcement && typeof source.reinforcement === 'object' ? source.reinforcement : {}
    const rawDialogueReinforcement = rawReinforcement.dialogue && typeof rawReinforcement.dialogue === 'object' ? rawReinforcement.dialogue : {}
    base.reinforcement = {
      dialogue: {
        enabled: rawDialogueReinforcement.enabled === true,
        style: ['state', 'natural', 'hud'].includes(rawDialogueReinforcement.style)
          ? rawDialogueReinforcement.style
          : 'natural',
        includeHud: rawDialogueReinforcement.includeHud !== false,
        autoUpdate: rawDialogueReinforcement.autoUpdate === true
      }
    }
    return base
  }

  function enabledModuleIds(systems) {
    const normalized = normalizeSystems(systems)
    return MODULE_ORDER.filter(id => normalized.modules[id]?.enabled)
  }

  function displayRule(value) {
    const labels = {
      every: 'Show it in every response.',
      changed: 'Show it when it changes or when it is immediately relevant.',
      scene: 'Show it on scene transitions and major state changes.',
      asked: 'Keep it tracked, but display it only when {{user}} asks.'
    }
    return labels[value] || labels.changed
  }

  function compileModule(id, config) {
    if (!config?.enabled) return ''

    if (id === 'worldState') {
      return [
        '### World State',
        '- Maintain one coherent persistent state for enabled RP systems. Treat previously established state as authoritative until an in-story cause changes it.',
        config.strictPersistence !== false
          ? '- Never reset, invent, or silently repair tracked state merely to make a scene more convenient.'
          : '',
        '- When several trackers change at once, reconcile them together so time, location, inventory, conditions, relationships, and objectives do not contradict one another.'
      ].filter(Boolean).join('\n')
    }

    if (id === 'inventory') {
      const owners = {
        user: '{{user}}',
        char: '{{char}}',
        party: 'the active party',
        separate: 'each relevant character separately'
      }
      const parts = [
        '### Inventory & Equipment',
        `- Persist the inventory of ${owners[config.ownerMode] || '{{user}}'} across responses. Items appear, disappear, move, or change quantity only when the story justifies it.`
      ]
      if (config.trackQuantities) parts.push('- Track quantities for stackable items and consumables.')
      if (config.trackEquipment) parts.push('- Distinguish carried items from currently equipped or worn items.')
      if (config.trackKeyItems) parts.push('- Preserve important/key items until they are explicitly transferred, lost, consumed, destroyed, or used.')
      if (config.trackConsumables) parts.push('- Consumables are reduced when used; do not restore them without a stated source.')
      parts.push(`- ${displayRule(config.displayMode)}`)
      return parts.join('\n')
    }

    if (id === 'time') {
      const calendar = config.calendar === 'custom' && config.customCalendar.trim()
        ? `custom calendar: ${config.customCalendar.trim()}`
        : config.calendar === 'fantasy'
          ? 'setting-appropriate fantasy calendar'
          : 'ordinary calendar appropriate to the setting'
      const progression = {
        natural: 'Advance time according to believable actions, travel, sleep, waiting, and scene duration. Short dialogue exchanges should not cause large unexplained jumps.',
        approximate: 'Advance time approximately but conservatively; dialogue takes minutes, travel and major actions take believable amounts of time.',
        explicit: 'Advance time only when the narration or {{user}} explicitly establishes that time has passed.'
      }
      return [
        '### Time, Date & Seasons',
        `- Use a ${calendar}.`,
        `- ${progression[config.progression] || progression.natural}`,
        config.showExactTime ? '- Track an approximate or exact clock time when the scene supports it.' : '',
        config.showDate ? '- Keep the current date/day consistent across scenes.' : '',
        config.showSeason ? '- Track season and let it influence daylight, temperature, clothing, landscape, and routines when relevant.' : ''
      ].filter(Boolean).join('\n')
    }

    if (id === 'weather') {
      const climate = config.climate === 'custom' && config.customClimate.trim()
        ? config.customClimate.trim()
        : config.climate
      return [
        '### Weather & Climate',
        `- Use a ${climate || 'temperate'} climate unless the established setting requires otherwise.`,
        '- Weather persists between responses and changes gradually or because of believable events; do not randomize it every turn.',
        config.affectEnvironment !== false
          ? '- Let weather affect temperature, clothing, visibility, wet/dry surfaces, travel, sounds, smells, and ambience when relevant.'
          : '',
        config.persistence === 'strong'
          ? '- Preserve established weather until enough time passes or a clear change is narrated.'
          : ''
      ].filter(Boolean).join('\n')
    }

    if (id === 'location') {
      return [
        '### Location & Spatial Continuity',
        '- Track the current location and physical positioning of relevant characters and important objects.',
        config.trackSubLocation ? '- Preserve sub-locations such as floor, room, vehicle, corridor, or side of a space when established.' : '',
        config.trackNearbyCharacters ? '- Keep track of who is nearby, who has left, and who cannot reasonably perceive the current interaction.' : '',
        config.strictPositioning ? '- Respect distance, posture, orientation, barriers, and physical reach. Characters cannot touch or interact with something they cannot reasonably reach.' : '',
        config.displayLocation ? '- If a state display is used, include the current location when appropriate.' : ''
      ].filter(Boolean).join('\n')
    }

    if (id === 'thoughts') {
      const scope = {
        main: 'the main {{char}} character only',
        pov: 'the current point-of-view character only',
        all: 'all major characters when narratively useful'
      }
      const frequency = {
        rare: 'Use internal thoughts rarely, only for moments where they add meaningful subtext.',
        occasional: 'Use internal thoughts occasionally for meaningful subtext without narrating every thought.',
        frequent: 'Internal thoughts may appear frequently, but should still reveal character rather than repeat the narration.'
      }
      const format = {
        italics: 'Write internal thoughts in *italics* and make them distinguishable from spoken dialogue.',
        block: 'Present important internal thoughts in a clearly separated thought block.',
        parenthetical: 'Present internal thoughts parenthetically and keep them visually distinct from dialogue.',
        custom: config.customFormat?.trim() || 'Use a consistent custom format for internal thoughts.'
      }
      return [
        '### Internal Thoughts',
        `- Internal thoughts may be shown for ${scope[config.scope] || scope.main}.`,
        `- ${frequency[config.frequency] || frequency.occasional}`,
        `- ${format[config.format] || format.italics}`,
        config.dramaticIrony
          ? '- Internal thoughts may reveal information that {{user}}\'s character does not know; keep that knowledge separate from what {{user}} can act on in-character.'
          : '- Do not use internal thoughts to reveal information that the current narrative point of view should not expose.'
      ].join('\n')
    }

    if (id === 'relationships') {
      const dimensions = normalizeStringList(config.dimensions, ['trust', 'affection'])
      return [
        '### Relationship / Affinity State',
        `- Track ${dimensions.join(', ')} for relevant relationships${config.separatePerCharacter ? ' separately per character' : ''}.`,
        config.meaningfulChangesOnly !== false
          ? '- Relationship state changes only after meaningful interaction, revelation, conflict, reconciliation, sacrifice, betrayal, or other justified events; ordinary greetings do not cause large jumps.'
          : '',
        config.display === 'hidden'
          ? '- Keep relationship values implicit and express them through behavior rather than showing a meter.'
          : config.display === 'numeric'
            ? '- When displayed, use stable numeric values and change them conservatively.'
            : '- When displayed, prefer descriptive states such as Cautious, Growing, Strained, Trusted, or Hostile rather than arbitrary precision.'
      ].filter(Boolean).join('\n')
    }

    if (id === 'conditions') {
      const trackers = normalizeStringList(config.trackers, ['health', 'injuries', 'fatigue'])
      return [
        '### Health & Conditions',
        `- Persist ongoing physical/mental state including: ${trackers.join(', ')}.`,
        '- Injuries, exhaustion, hunger, stress, status effects, mana, or stamina should affect behavior and capability when relevant.',
        config.recoveryMustBeJustified !== false
          ? '- Recovery requires believable rest, treatment, food, magic, time, or another established cause; do not silently reset conditions between responses.'
          : '',
        config.display === 'numeric'
          ? '- Numeric values may be used when displayed, but should reflect actual narrative causes.'
          : '- Prefer descriptive condition states unless numeric tracking is explicitly useful.'
      ].filter(Boolean).join('\n')
    }

    if (id === 'objectives') {
      return [
        '### Objectives / Quests',
        '- Track active objectives until they are completed, failed, abandoned, replaced, or made impossible by the story.',
        config.main ? '- Preserve the current main objective.' : '',
        config.side ? '- Track side objectives separately from the main objective.' : '',
        config.hidden ? '- Hidden objectives may exist, but do not reveal them to {{user}} until disclosure is justified.' : '',
        config.completed ? '- Keep a lightweight record of recently completed objectives when useful for continuity.' : '',
        '- Do not complete objectives off-screen without a clear in-story cause or explicit time skip.',
        `- ${displayRule(config.displayMode)}`
      ].filter(Boolean).join('\n')
    }

    if (id === 'mystery') {
      return [
        '### Mystery & Clue Tracking',
        config.trackClues ? '- Track which clues have actually been discovered and what each clue currently implies.' : '',
        config.trackQuestions ? '- Preserve unresolved questions instead of prematurely answering them.' : '',
        config.trackRedHerrings ? '- Red herrings may mislead characters, but the underlying truth remains internally consistent.' : '',
        config.protectUndiscovered !== false
          ? '- Never reveal an undiscovered clue, hidden truth, or solution merely because it exists in the prompt. Information enters the roleplay only through justified discovery, deduction, confession, or observation.'
          : '',
        `- ${displayRule(config.displayMode)}`
      ].filter(Boolean).join('\n')
    }

    if (id === 'knowledge') {
      return [
        '### Knowledge & Secrets',
        config.strictBoundaries !== false
          ? '- Maintain separate knowledge for {{char}}, {{user}}, and relevant NPCs. A fact known by one person is not automatically known by everyone else.'
          : '',
        config.trackSuspicions ? '- Distinguish confirmed knowledge from suspicions, guesses, rumors, and deductions.' : '',
        config.trackFalseBeliefs ? '- Characters may hold false beliefs; do not silently correct them using narrator-only information.' : '',
        config.revealOnlyWhenJustified !== false
          ? '- Secrets are revealed only through a believable source, observation, confession, investigation, or other in-story event.'
          : ''
      ].filter(Boolean).join('\n')
    }

    if (id === 'currency') {
      return [
        '### Currency & Economy',
        `- Track the relevant balance using ${config.currencyName || 'the setting\'s currency'}.`,
        config.trackPurchases ? '- Purchases, rewards, theft, loss, fees, and transfers update the balance consistently.' : '',
        config.enforceAffordability ? '- Characters cannot purchase something they cannot afford unless debt, credit, theft, barter, or another explicit arrangement occurs.' : '',
        config.allowDebt ? '- Negative balances/debt may exist and should persist until resolved.' : '- Do not allow an unexplained negative balance.',
        `- ${displayRule(config.displayMode)}`
      ].join('\n')
    }

    if (id === 'appearance') {
      return [
        '### Clothing & Appearance Continuity',
        config.trackOutfit ? '- Track current clothing and layers that have been removed, changed, torn, or replaced.' : '',
        config.trackAccessories ? '- Preserve carried/worn accessories and notable visible items.' : '',
        config.trackDamage ? '- Persist visible blood, injuries, torn fabric, broken equipment, and other damage until cleaned, repaired, healed, or changed.' : '',
        config.trackWetDirty ? '- Wetness, dirt, dust, mud, soot, and similar appearance states persist until a believable action removes them.' : '',
        config.displayMode === 'hidden'
          ? '- Track these details through narration; do not create a separate appearance HUD unless requested.'
          : `- ${displayRule(config.displayMode)}`
      ].filter(Boolean).join('\n')
    }

    if (id === 'objects') {
      return [
        '### Persistent World Objects',
        '- Track important world objects that can meaningfully change state.',
        config.trackOwnership ? '- Preserve who possesses or controls an object.' : '',
        config.trackLocation ? '- Preserve where important objects were left, moved, hidden, stored, or dropped.' : '',
        config.trackCondition ? '- Preserve broken, damaged, powered, empty/full, armed/disarmed, or similar condition changes.' : '',
        config.trackOpenClosed ? '- Preserve open/closed/locked/unlocked state for relevant doors, containers, windows, gates, devices, and similar objects.' : '',
        `- ${displayRule(config.displayMode)}`
      ].filter(Boolean).join('\n')
    }

    if (id === 'skills') {
      const values = normalizeStringList(config.values, ['strength', 'perception'])
      return [
        '### Skills & Stats',
        `- Track relevant capabilities such as: ${values.join(', ')}.`,
        config.mode === 'numeric'
          ? '- Use consistent numeric values/ranges when a stat is shown.'
          : config.mode === 'hidden'
            ? '- Keep values hidden and express skill differences through believable outcomes.'
            : '- Prefer descriptive ratings such as Novice, Capable, Expert, Exceptional, or similar setting-appropriate terms.',
        config.changesRequireCause !== false
          ? '- Skills or stats improve, worsen, or change only after training, injury, equipment, magic, experience, or another believable cause.'
          : '',
        config.displayMode === 'hidden' ? '- Do not display a stat block unless asked.' : `- ${displayRule(config.displayMode)}`
      ].filter(Boolean).join('\n')
    }

    if (id === 'reputation') {
      return [
        '### Reputation & Factions',
        '- Track how relevant factions, institutions, settlements, or groups regard the characters.',
        config.separatePerFaction !== false ? '- Keep reputation separate per faction rather than using one universal morality/reputation score.' : '',
        config.meaningfulChangesOnly !== false ? '- Reputation changes only when information, actions, rumors, favors, crimes, public events, or political consequences justify it.' : '',
        config.display === 'numeric'
          ? '- Numeric reputation may be shown if useful, but changes should stay conservative.'
          : config.display === 'hidden'
            ? '- Keep reputation implicit and express it through access, tone, prices, suspicion, favors, and treatment.'
            : '- Prefer descriptive standings such as Allied, Friendly, Neutral, Suspicious, Hostile, or Feared.'
      ].filter(Boolean).join('\n')
    }

    return ''
  }

  function enabledHudBlocks(hud) {
    const all = [
      ...(hud.blocks || []),
      ...(hud.customBlocks || [])
    ]
    const byId = new Map(all.map(block => [block.id, block]))
    const order = Array.isArray(hud.order) ? hud.order : all.map(block => block.id)
    return order
      .map(id => byId.get(id))
      .filter(block => block && block.enabled !== false)
  }

  function compileHud(hud) {
    if (!hud?.enabled) return ''
    const blocks = enabledHudBlocks(hud)
    if (!blocks.length) return ''

    const position = hud.position === 'top' ? 'at the very top' : 'at the very bottom'
    const style = {
      compact: 'Keep it compact: one or a few short lines with minimal decoration.',
      detailed: 'Use a readable multi-line state panel with one clearly labeled line per enabled block.',
      minimal: 'Use the smallest readable inline state summary possible.'
    }[hud.style] || 'Keep it compact and readable.'

    return [
      '### State Display / HUD',
      `- When the display is due, place it ${position} of the response, outside spoken dialogue and narrative prose.`,
      `- Display mode: ${displayRule(hud.displayMode)}`,
      `- ${style}`,
      `- Use the title "${hud.title || 'SCENE STATE'}" when a title is appropriate.`,
      '- Only show facts that are currently established. Never invent a value merely to fill a HUD field.',
      `- Enabled blocks in this order: ${blocks.map(block => block.label).join(' → ')}.`
    ].join('\n')
  }

  function sampleStateValues(systems) {
    const normalized = normalizeSystems(systems)
    const values = {}
    const mods = normalized.modules || {}

    if (mods.time?.enabled) {
      values.time = '11:47 PM'
      values.date = mods.time.showDate === false ? '' : 'October 18'
      values.season = mods.time.showSeason === false ? '' : 'Autumn'
    }
    if (mods.weather?.enabled) values.weather = 'Cold rain'
    if (mods.location?.enabled) values.location = 'St. Agnes Hospital — West Wing'
    if (mods.conditions?.enabled) values.health = 'Injured · Fatigued'
    if (mods.inventory?.enabled) values.inventory = 'Flashlight · Ward Key · Bandage ×2'
    if (mods.relationships?.enabled) values.relationship = 'Trust: Guarded'
    if (mods.objectives?.enabled) values.objective = 'Reach the security office'
    if (mods.currency?.enabled) values.currency = `${mods.currency.currencyName || 'gold'}: 37`
    if (normalized.hud.enabled) values.cast = '{{char}} · {{user}}'
    return values
  }

  function buildHudLinesForDialogue(systems, includeHud = true) {
    const normalized = normalizeSystems(systems)
    if (!includeHud || !normalized.hud?.enabled) return []
    const blocks = enabledHudBlocks(normalized.hud)
    const values = sampleStateValues(normalized)
    return blocks
      .map(block => {
        const sample = values[block.id] || block.hint || '…'
        return `[${block.label}: ${sample}]`
      })
      .filter(Boolean)
  }

  function compileDialogueReinforcement(systems) {
    const normalized = normalizeSystems(systems)
    const dialogue = normalized.reinforcement?.dialogue || {}
    const enabled = enabledModuleIds(normalized)
    if (!enabled.length) return null

    const label = 'RP Systems Demonstration'
    const style = dialogue.style || 'natural'
    const hudLines = buildHudLinesForDialogue(normalized, dialogue.includeHud !== false)
    const hasLocation = enabled.includes('location')
    const hasWeather = enabled.includes('weather')
    const hasTime = enabled.includes('time')
    const hasInventory = enabled.includes('inventory')
    const hasConditions = enabled.includes('conditions')
    const hasObjectives = enabled.includes('objectives')
    const hasRelationships = enabled.includes('relationships')
    const hasThoughts = enabled.includes('thoughts')
    const stateHints = [
      hasTime ? 'time progressing conservatively' : '',
      hasLocation ? 'location staying consistent' : '',
      hasInventory ? 'inventory persisting correctly' : '',
      hasConditions ? 'conditions remaining consistent' : '',
      hasObjectives ? 'goals staying visible' : '',
      normalized.hud.enabled && dialogue.includeHud !== false ? 'the optional HUD format being respected' : ''
    ].filter(Boolean)
    const situation = stateHints.length
      ? `Demonstrates ${stateHints.join(', ')}.`
      : 'Demonstrates persistent state tracking inside roleplay.'

    const weatherPhrase = hasWeather ? 'Rain taps softly against the windows.' : ''
    const locationPhrase = hasLocation ? 'The west wing stays quiet and unchanged around us.' : ''
    const thoughtPhrase = hasThoughts ? '*She keeps the fear to herself and thinks through the next step before speaking.*' : ''

    let user = '{{user}}: *I check the corridor before following, then glance back at our current situation.*'
    let char = ''

    if (style === 'state') {
      user = '{{user}}: What is our current situation right now?'
      char = [
        '{{char}}: "We are still moving carefully, and nothing important has changed without cause."',
        ...hudLines
      ].filter(Boolean).join('\n')
    } else if (style === 'hud') {
      user = '{{user}}: *I pause, listen, and look to you for the next move.*'
      char = [
        '{{char}}: *She listens before answering in a low, steady voice.*',
        weatherPhrase,
        locationPhrase,
        '{{char}}: "Stay close. We have not finished here yet."',
        ...hudLines,
        hasTime ? '[Time advances naturally only by a minute or two here.]' : ''
      ].filter(Boolean).join('\n')
    } else {
      char = [
        '{{char}}: *She steadies her breathing and checks the hall again before answering.*',
        weatherPhrase,
        locationPhrase,
        thoughtPhrase,
        '{{char}}: "Nothing resets just because we spoke. We are still in the same place, still dealing with the same situation, and we move from there."',
        ...hudLines,
        hasInventory ? '{{char}}: "We still have the flashlight, the ward key, and two bandages. Use them carefully."' : '',
        hasObjectives ? '{{char}}: "Our objective has not changed. We still need to reach the security office."' : '',
        hasRelationships ? '{{char}}: "I trust you enough to keep moving, but stay careful."' : ''
      ].filter(Boolean).join('\n')
    }

    return {
      label,
      situation,
      user,
      char
    }
  }

  function compileSystems(systems) {
    const normalized = normalizeSystems(systems)
    const chunks = []

    for (const id of MODULE_ORDER) {
      const compiled = compileModule(id, normalized.modules[id])
      if (compiled) chunks.push(compiled)
    }

    const hud = compileHud(normalized.hud)
    if (hud) chunks.push(hud)

    if (normalized.notes.trim()) {
      chunks.push(`### Creator System Notes\n${normalized.notes.trim()}`)
    }

    if (!chunks.length) return ''

    return [
      SYSTEM_MARKER_START,
      '## Daedalus RP Systems',
      'The following systems are persistent roleplay instructions. Apply them consistently without turning the response into bookkeeping unless a visible state display is explicitly enabled.',
      '',
      chunks.join('\n\n'),
      SYSTEM_MARKER_END
    ].join('\n')
  }

  function stripSystemsSection(text) {
    const source = String(text || '')
    const start = source.indexOf(SYSTEM_MARKER_START)
    const end = source.indexOf(SYSTEM_MARKER_END)
    if (start < 0 || end < 0 || end < start) return source.trimEnd()
    const before = source.slice(0, start).trimEnd()
    const after = source.slice(end + SYSTEM_MARKER_END.length).trimStart()
    return [before, after].filter(Boolean).join('\n\n').trimEnd()
  }

  function upsertSystemsSection(text, systems) {
    const cleaned = stripSystemsSection(text)
    const compiled = compileSystems(systems)
    if (!compiled) return cleaned
    return cleaned ? `${cleaned}\n\n${compiled}` : compiled
  }

  function applyRecipe(systems, recipeId) {
    const recipe = RECIPES.find(item => item.id === recipeId)
    if (!recipe) throw new Error('RP system recipe not found.')

    const next = normalizeSystems(systems)
    for (const id of MODULE_ORDER) {
      next.modules[id].enabled = recipe.modules.includes(id)
    }

    next.hud.enabled = recipe.hud.length > 0
    next.hud.displayMode = recipe.hudDisplay || 'changed'
    next.hud.blocks = next.hud.blocks.map(block => ({
      ...block,
      enabled: recipe.hud.includes(block.id)
    }))
    next.hud.order = [
      ...recipe.hud,
      ...next.hud.order.filter(id => !recipe.hud.includes(id))
    ]

    return next
  }

  function inspectSystems(systems) {
    const normalized = normalizeSystems(systems)
    const warnings = []
    const enabled = new Set(enabledModuleIds(normalized))
    const hudBlocks = new Set(enabledHudBlocks(normalized.hud).map(block => block.id))

    const required = {
      time: 'time',
      date: 'time',
      season: 'time',
      weather: 'weather',
      location: 'location',
      health: 'conditions',
      inventory: 'inventory',
      relationship: 'relationships',
      objective: 'objectives',
      currency: 'currency'
    }

    if (normalized.hud.enabled) {
      if (!enabledHudBlocks(normalized.hud).length) {
        warnings.push({
          severity: 'warning',
          title: 'HUD is enabled with no blocks',
          detail: 'Enable at least one HUD block or disable the State Display.'
        })
      }

      for (const [block, moduleId] of Object.entries(required)) {
        if (hudBlocks.has(block) && !enabled.has(moduleId)) {
          warnings.push({
            severity: 'warning',
            title: `${HUD_BLOCKS.find(item => item[0] === block)?.[1] || block} HUD block has no tracker`,
            detail: `Enable ${MODULES[moduleId].label} or remove that HUD block so the model is not asked to display untracked state.`
          })
        }
      }
    }

    if (enabled.has('currency') && enabled.has('inventory') && normalized.modules.inventory.trackQuantities === false) {
      warnings.push({
        severity: 'suggestion',
        title: 'Inventory quantities are disabled',
        detail: 'Currency can still work independently, but quantity tracking is usually helpful for resource-heavy roleplay.'
      })
    }

    if (enabled.has('thoughts') && normalized.modules.thoughts.scope === 'all' && enabled.has('knowledge')) {
      warnings.push({
        severity: 'suggestion',
        title: 'All-character thoughts + secret tracking',
        detail: 'This can create dramatic irony. Keep Knowledge & Secrets enabled so characters do not act on thoughts they could not perceive.'
      })
    }

    if (enabled.size >= 12) {
      warnings.push({
        severity: 'suggestion',
        title: 'Many RP systems are enabled',
        detail: 'A very large systems stack can make responses feel like bookkeeping. Disable trackers that do not matter to this particular RP.'
      })
    }

    if (normalized.hud.enabled && normalized.hud.displayMode === 'every' && enabledHudBlocks(normalized.hud).length >= 8) {
      warnings.push({
        severity: 'suggestion',
        title: 'Large HUD on every response',
        detail: 'Consider Changed-only or a smaller block set if you want more space for prose.'
      })
    }

    return warnings
  }

  function hudPreview(systems) {
    const normalized = normalizeSystems(systems)
    const hud = normalized.hud
    const blocks = enabledHudBlocks(hud)
    if (!hud.enabled || !blocks.length) {
      return 'State Display disabled.'
    }

    const samples = {
      time: '21:46',
      date: 'October 17',
      season: 'Autumn',
      weather: 'Light rain · 9°C',
      location: 'East Hallway — Arden Estate',
      health: 'Healthy · Tired',
      inventory: 'Phone · Estate Key · Potion ×2',
      relationship: 'Trust: Cautious · Affection: Growing',
      objective: 'Find the missing artifact',
      currency: '47 gold',
      cast: 'Toko nearby · Momo upstairs'
    }

    const lineValues = blocks.map(block => `${block.label}: ${samples[block.id] || block.hint || '…'}`)

    if (hud.style === 'minimal') {
      return `[${lineValues.join(' · ')}]`
    }

    if (hud.style === 'compact') {
      return `${hud.title || 'SCENE STATE'}\n${lineValues.join(' | ')}`
    }

    return [
      `╭─ ${hud.title || 'SCENE STATE'}`,
      ...lineValues.map(value => `│ ${value}`),
      '╰─'
    ].join('\n')
  }

  window.DaedalusSystems = {
    MODULES,
    MODULE_ORDER,
    HUD_BLOCKS,
    RECIPES,
    SYSTEM_MARKER_START,
    SYSTEM_MARKER_END,
    createDefaultSystems,
    normalizeSystems,
    enabledModuleIds,
    compileSystems,
    stripSystemsSection,
    upsertSystemsSection,
    applyRecipe,
    inspectSystems,
    hudPreview,
    compileDialogueReinforcement,
    clone
  }
})()
