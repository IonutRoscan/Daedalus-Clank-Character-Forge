;(() => {
  'use strict'

  // Planning Station metadata and helpers

  const ENTITY_TYPES = {
    character: {
      label: 'Character',
      icon: '◇',
      fields: [
        ['role', 'Role'],
        ['personality', 'Personality notes', 'textarea'],
        ['goals', 'Goals', 'textarea'],
        ['fears', 'Fears', 'textarea'],
        ['secrets', 'Secrets', 'textarea'],
        ['arc', 'Character arc', 'textarea'],
        ['arcStart', 'Arc starting state', 'textarea'],
        ['arcPressure', 'What pressures them to change?', 'textarea'],
        ['arcEnd', 'Possible arc end state', 'textarea'],
        ['possessions', 'Important possessions', 'textarea']
      ]
    },
    location: {
      label: 'Location',
      icon: '⌖',
      fields: [
        ['region', 'Region'],
        ['atmosphere', 'Atmosphere', 'textarea'],
        ['residents', 'Who lives here', 'textarea'],
        ['objects', 'Important objects', 'textarea'],
        ['secrets', 'Secrets', 'textarea'],
        ['events', 'Events that happened here', 'textarea']
      ]
    },
    faction: {
      label: 'Faction',
      icon: '⬡',
      fields: [
        ['purpose', 'Purpose', 'textarea'],
        ['leader', 'Leader'],
        ['members', 'Members', 'textarea'],
        ['allies', 'Allies', 'textarea'],
        ['enemies', 'Enemies', 'textarea'],
        ['territory', 'Territory'],
        ['resources', 'Resources', 'textarea'],
        ['hierarchy', 'Hierarchy / ranks', 'textarea'],
        ['ideology', 'Ideology / beliefs', 'textarea'],
        ['reputation', 'Public reputation', 'textarea'],
        ['agenda', 'Hidden agenda', 'textarea']
      ]
    },
    group: {
      label: 'Group',
      icon: '◎',
      fields: [
        ['purpose', 'Purpose', 'textarea'],
        ['members', 'Members', 'textarea'],
        ['leader', 'Leader'],
        ['base', 'Base / location'],
        ['notes', 'Group notes', 'textarea']
      ]
    },
    item: {
      label: 'Item / Artifact',
      icon: '◆',
      fields: [
        ['owner', 'Owner'],
        ['location', 'Current location'],
        ['function', 'Function', 'textarea'],
        ['history', 'History', 'textarea'],
        ['importance', 'Importance', 'textarea'],
        ['state', 'Current state'],
        ['rules', 'Special rules', 'textarea']
      ]
    },
    power: {
      label: 'Power / Ability',
      icon: '✦',
      fields: [
        ['owner', 'Owner'],
        ['powerType', 'Type'],
        ['source', 'Source / origin', 'textarea'],
        ['coreRule', 'Core rule', 'textarea'],
        ['strengths', 'Strengths', 'textarea'],
        ['weaknesses', 'Weaknesses', 'textarea'],
        ['cost', 'Cost', 'textarea'],
        ['limits', 'Limits', 'textarea'],
        ['conditions', 'Conditions', 'textarea'],
        ['counters', 'Counters', 'textarea'],
        ['evolution', 'Evolution / upgrades', 'textarea']
      ]
    },
    event: {
      label: 'Event',
      icon: '◷',
      fields: [
        ['date', 'Date / order'],
        ['beat', 'Story beat / chapter'],
        ['participants', 'Participants', 'textarea'],
        ['location', 'Location'],
        ['cause', 'Cause', 'textarea'],
        ['consequences', 'Consequences', 'textarea']
      ]
    },
    plot: {
      label: 'Plot Thread',
      icon: '⌁',
      fields: [
        ['stage', 'Stage'],
        ['act', 'Act / arc'],
        ['dependencies', 'Dependencies / prerequisites', 'textarea'],
        ['objective', 'Objective', 'textarea'],
        ['stakes', 'Stakes', 'textarea'],
        ['participants', 'Participants', 'textarea'],
        ['resolution', 'Possible resolution', 'textarea']
      ]
    },
    mystery: {
      label: 'Mystery / Secret',
      icon: '?',
      fields: [
        ['truth', 'Truth', 'textarea'],
        ['knows', 'Who knows', 'textarea'],
        ['suspects', 'Who suspects', 'textarea'],
        ['clues', 'Clues', 'textarea'],
        ['redHerrings', 'Red herrings', 'textarea'],
        ['revealConditions', 'Reveal conditions', 'textarea'],
        ['revealBeat', 'Planned reveal beat'],
        ['revealStatus', 'Reveal status']
      ]
    },
    scene: {
      label: 'Scene',
      icon: '▣',
      fields: [
        ['location', 'Location'],
        ['order', 'Timeline order'],
        ['participants', 'Participants', 'textarea'],
        ['purpose', 'Purpose', 'textarea'],
        ['conflict', 'Conflict', 'textarea'],
        ['outcome', 'Planned outcome', 'textarea']
      ]
    },
    lore: {
      label: 'Lore / Rule',
      icon: '◫',
      fields: [
        ['category', 'Category'],
        ['rule', 'Rule / fact', 'textarea'],
        ['exceptions', 'Exceptions', 'textarea'],
        ['implications', 'Implications', 'textarea']
      ]
    },
    custom: {
      label: 'Custom',
      icon: '＋',
      fields: [
        ['field1', 'Custom detail', 'textarea'],
        ['field2', 'Additional detail', 'textarea']
      ]
    }
  }

  const TYPE_ORDER = [
    'character',
    'location',
    'faction',
    'group',
    'item',
    'power',
    'event',
    'plot',
    'mystery',
    'scene',
    'lore',
    'custom'
  ]

  const TEMPLATE_DEFINITIONS = [
    {
      id: 'single-character',
      name: 'Single Character RP',
      description: 'A compact board for one central character, setting, premise, and important secret.',
      nodes: [
        ['character', 'Main Character', 120, 160],
        ['location', 'Primary Setting', 460, 90],
        ['plot', 'Core Premise', 460, 270],
        ['mystery', 'Important Secret', 800, 180]
      ],
      connections: [
        [0, 1, 'lives in', true],
        [0, 2, 'drives', true],
        [2, 3, 'concerns', true],
        [0, 3, 'affected by', true]
      ],
      frames: [['Core RP', 70, 60, 1020, 470]]
    },
    {
      id: 'romance',
      name: 'Romance',
      description: 'Two leads, their shared setting, relationship arc, and a source of tension.',
      nodes: [
        ['character', 'Lead A', 120, 130],
        ['character', 'Lead B', 120, 330],
        ['location', 'Shared Setting', 470, 80],
        ['plot', 'Relationship Arc', 470, 280],
        ['mystery', 'Unspoken Tension', 810, 180]
      ],
      connections: [
        [0, 1, 'relationship', false],
        [0, 3, 'part of', true],
        [1, 3, 'part of', true]
      ],
      frames: [['Main Relationship', 70, 60, 1020, 520]]
    },
    {
      id: 'adventure-party',
      name: 'Adventure Party',
      description: 'A party, a world hub, quest thread, faction, artifact, and power system.',
      nodes: [
        ['character', 'Party Leader', 120, 110],
        ['character', 'Party Member', 120, 300],
        ['location', 'Starting Region', 450, 80],
        ['plot', 'Main Quest', 450, 280],
        ['faction', 'Major Faction', 780, 80],
        ['item', 'Important Artifact', 780, 280],
        ['lore', 'World / Magic Rule', 1110, 180]
      ],
      connections: [
        [0, 1, 'travels with', false],
        [0, 2, 'starts in', true],
        [1, 2, 'starts in', true],
        [0, 3, 'pursues', true],
        [1, 3, 'supports', true],
        [3, 5, 'seeks', true],
        [4, 3, 'complicates', true],
        [6, 5, 'governs', true]
      ],
      frames: [
        ['Party', 70, 50, 300, 470],
        ['World', 395, 50, 970, 470]
      ]
    },
    {
      id: 'horror-mystery',
      name: 'Horror Mystery',
      description: 'Threat, victims, locations, clues, secret truth, and reveal structure.',
      nodes: [
        ['character', 'Protagonist', 120, 110],
        ['character', 'Threat / Antagonist', 120, 320],
        ['location', 'Primary Location', 450, 80],
        ['mystery', 'Central Mystery', 450, 280],
        ['item', 'Key Clue', 790, 80],
        ['event', 'Inciting Incident', 790, 280],
        ['plot', 'Reveal Path', 1120, 180]
      ],
      connections: [
        [1, 0, 'hunts', true],
        [0, 2, 'trapped in', true],
        [3, 1, 'concerns', true],
        [4, 3, 'clue to', true],
        [5, 3, 'reveals part of', true],
        [6, 3, 'uncovers', true]
      ],
      frames: [['Horror Mystery', 70, 50, 1310, 500]]
    },
    {
      id: 'ensemble',
      name: 'Multi-Character Ensemble',
      description: 'A cast-focused board with a shared home, group identity, and central conflict.',
      nodes: [
        ['character', 'Character A', 110, 90],
        ['character', 'Character B', 110, 270],
        ['character', 'Character C', 110, 450],
        ['group', 'Main Cast / Group', 450, 180],
        ['location', 'Shared Location', 790, 90],
        ['plot', 'Shared Conflict', 790, 300],
        ['mystery', 'Group Secret', 1120, 200]
      ],
      connections: [
        [0, 3, 'member of', true],
        [1, 3, 'member of', true],
        [2, 3, 'member of', true],
        [3, 4, 'based in', true],
        [5, 3, 'affects', true],
        [6, 3, 'kept by', true]
      ],
      frames: [
        ['Cast', 60, 40, 300, 580],
        ['Shared World', 400, 40, 970, 580]
      ]
    },
    {
      id: 'fantasy-world',
      name: 'Fantasy World',
      description: 'A world-first structure for regions, factions, powers, artifacts, lore, and history.',
      nodes: [
        ['location', 'Capital / Major Region', 110, 100],
        ['location', 'Frontier / Secondary Region', 110, 320],
        ['faction', 'Major Faction', 450, 100],
        ['faction', 'Rival Faction', 450, 320],
        ['power', 'Magic / Power System', 790, 100],
        ['item', 'Legendary Artifact', 790, 320],
        ['event', 'Historical Event', 1130, 100],
        ['lore', 'Foundational World Rule', 1130, 320]
      ],
      connections: [
        [2, 0, 'controls', true],
        [3, 1, 'influences', true],
        [2, 3, 'rivals', false],
        [4, 7, 'defined by', true],
        [5, 4, 'channels', true],
        [6, 2, 'changed', true],
        [6, 3, 'changed', true]
      ],
      frames: [['World Foundations', 60, 50, 1360, 520]]
    },
    {
      id: 'academy',
      name: 'Academy / School',
      description: 'Students, staff, campus locations, clubs, powers, and an ongoing school plot.',
      nodes: [
        ['character', 'Student / Lead', 110, 90],
        ['character', 'Teacher / Mentor', 110, 300],
        ['location', 'Campus', 450, 90],
        ['group', 'Club / Class', 450, 300],
        ['power', 'Special Ability', 790, 90],
        ['plot', 'Semester Plot', 790, 300],
        ['mystery', 'Campus Secret', 1130, 195]
      ],
      connections: [
        [1, 0, 'mentors', true],
        [0, 2, 'studies at', true],
        [1, 2, 'teaches at', true],
        [0, 3, 'member of', true],
        [4, 0, 'belongs to', true],
        [5, 3, 'affects', true],
        [6, 2, 'hidden in', true]
      ],
      frames: [['Academy', 60, 50, 1360, 500]]
    },
    {
      id: 'manor-household',
      name: 'Manor / Household',
      description: 'Residents, staff, rooms, routines, relationships, and secrets.',
      nodes: [
        ['character', 'Household Lead', 100, 90],
        ['group', 'Staff / Household', 100, 300],
        ['location', 'Main Estate', 440, 90],
        ['location', 'Important Room', 440, 300],
        ['plot', 'Household Routine / Arc', 780, 90],
        ['mystery', 'Estate Secret', 780, 300],
        ['item', 'Important Possession', 1120, 195]
      ],
      connections: [
        [0, 1, 'leads', true],
        [1, 2, 'lives in', true],
        [3, 2, 'part of', true],
        [4, 1, 'affects', true],
        [5, 3, 'hidden in', true],
        [6, 0, 'owned by', true]
      ],
      frames: [['Household', 50, 50, 1360, 500]]
    },
    {
      id: 'political-intrigue',
      name: 'Political Intrigue',
      description: 'Leaders, factions, territory, leverage, secrets, and a central power struggle.',
      nodes: [
        ['character', 'Political Lead', 100, 100],
        ['faction', 'Faction A', 430, 80],
        ['faction', 'Faction B', 430, 300],
        ['location', 'Seat of Power', 770, 80],
        ['mystery', 'Hidden Leverage', 770, 300],
        ['plot', 'Power Struggle', 1110, 190]
      ],
      connections: [
        [0, 1, 'aligned with', true],
        [1, 2, 'rivals', false],
        [1, 3, 'contests', true],
        [2, 3, 'contests', true],
        [4, 0, 'known by', true],
        [5, 1, 'driven by', true],
        [5, 2, 'driven by', true]
      ],
      frames: [['Political Web', 50, 50, 1320, 500]]
    },
    {
      id: 'detective-mystery',
      name: 'Detective Mystery',
      description: 'Detective, suspects, crime scene, evidence, truth, and investigation thread.',
      nodes: [
        ['character', 'Investigator', 100, 100],
        ['character', 'Suspect A', 100, 300],
        ['location', 'Crime Scene', 440, 80],
        ['item', 'Evidence', 440, 300],
        ['mystery', 'Case Truth', 780, 80],
        ['event', 'Crime / Incident', 780, 300],
        ['plot', 'Investigation', 1120, 190]
      ],
      connections: [
        [0, 6, 'investigates', true],
        [1, 5, 'connected to', true],
        [5, 2, 'happened at', true],
        [3, 2, 'found at', true],
        [3, 4, 'clue to', true],
        [6, 4, 'seeks truth of', true]
      ],
      frames: [['Case Board', 50, 50, 1360, 500]]
    }
  ]

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function makeEntity(type, name, x = 100, y = 100, idFactory = null) {
    const meta = ENTITY_TYPES[type] || ENTITY_TYPES.custom
    const makeId = idFactory || (() => `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)

    return {
      id: makeId('entity'),
      type: ENTITY_TYPES[type] ? type : 'custom',
      name: String(name || meta.label),
      subtitle: '',
      status: '',
      tags: [],
      imageUrl: '',
      description: '',
      notes: '',
      favorite: false,
      locked: false,
      hidden: false,
      updatedAt: new Date().toISOString(),
      x: Number.isFinite(x) ? x : 100,
      y: Number.isFinite(y) ? y : 100,
      fields: Object.fromEntries(meta.fields.map(([key]) => [key, ''])),
      customFields: []
    }
  }

  function makeFrame(name, x, y, width = 520, height = 320, idFactory = null) {
    const makeId = idFactory || (() => `frame-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
    return {
      id: makeId('frame'),
      name: String(name || 'New Frame'),
      x: Number.isFinite(x) ? x : 80,
      y: Number.isFinite(y) ? y : 80,
      width: Math.max(260, Number(width) || 520),
      height: Math.max(140, Number(height) || 320),
      collapsed: false,
      locked: false,
      color: 'neutral',
      memberIds: [],
      expandedHeight: Math.max(140, Number(height) || 320)
    }
  }

  function inferConnectionCategory(label) {
    const value = String(label || '').toLowerCase()
    if (/rival|hunt|enemy|oppose|complicate|conflict/.test(value)) return 'conflict'
    if (/secret|know|clue|reveal|truth|suspect/.test(value)) return 'knowledge'
    if (/member|lead|aligned|allied|works for/.test(value)) return 'membership'
    if (/own|belong|created|uses|channels/.test(value)) return 'ownership'
    if (/live|based|located|starts|happened at|found at|hidden in|studies at|teaches at|part of/.test(value)) return 'location'
    if (/plot|quest|pursue|drive|affect|investigat|seek|uncovers|supports/.test(value)) return 'plot'
    return 'relationship'
  }

  function createTemplatePlanning(templateId, idFactory) {
    const template = TEMPLATE_DEFINITIONS.find(item => item.id === templateId)
    if (!template) {
      throw new Error('Planning template not found.')
    }

    const entities = template.nodes.map(([type, name, x, y]) =>
      makeEntity(type, name, x, y, idFactory)
    )

    const connections = (template.connections || []).map(
      ([sourceIndex, targetIndex, label, directed = true]) => ({
        id: idFactory('connection'),
        sourceId: entities[sourceIndex].id,
        targetId: entities[targetIndex].id,
        label: String(label || 'connected to'),
        directed: directed !== false,
        category: inferConnectionCategory(label),
        style: /rival|hunt|enemy|complicate/i.test(String(label || '')) ? 'dashed' : 'solid',
        notes: ''
      })
    )

    const frames = (template.frames || []).map(([name, x, y, width, height]) =>
      makeFrame(name, x, y, width, height, idFactory)
    )

    return {
      version: 2,
      entities,
      connections,
      frames,
      view: {panX: 180, panY: 120, zoom: 0.9, snapToGrid: true, gridSize: 20}
    }
  }

  function planningToMarkdown(planning, projectTitle = 'Daedalus Planning') {
    const source = planning || {}
    const entities = Array.isArray(source.entities) ? source.entities : []
    const connections = Array.isArray(source.connections) ? source.connections : []
    const lines = [`# ${projectTitle} — World Bible`, '']
    const byId = new Map(entities.map(entity => [entity.id, entity]))

    for (const type of TYPE_ORDER) {
      const items = entities.filter(entity => entity.type === type)
      if (!items.length) continue

      lines.push(`## ${ENTITY_TYPES[type]?.label || type}`, '')

      for (const entity of items) {
        lines.push(`### ${entity.name || 'Untitled'}`)
        if (entity.subtitle) lines.push(`*${entity.subtitle}*`, '')
        if (entity.status) lines.push(`**Status:** ${entity.status}`)
        if (entity.tags?.length) lines.push(`**Tags:** ${entity.tags.join(', ')}`)
        if (entity.description) lines.push('', entity.description)

        const typeFields = ENTITY_TYPES[type]?.fields || []
        for (const [key, label] of typeFields) {
          const value = String(entity.fields?.[key] || '').trim()
          if (value) lines.push('', `**${label}:** ${value}`)
        }

        if (entity.notes) lines.push('', '**Notes**', '', entity.notes)
        lines.push('')
      }
    }

    if (connections.length) {
      lines.push('## Connections', '')
      for (const connection of connections) {
        const sourceEntity = byId.get(connection.sourceId)
        const targetEntity = byId.get(connection.targetId)
        if (!sourceEntity || !targetEntity) continue
        const arrow = connection.directed === false ? '—' : '→'
        lines.push(
          `- **${sourceEntity.name}** ${arrow} *${connection.label || 'connected to'}* ${arrow} **${targetEntity.name}**`
        )
      }
      lines.push('')
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  }

  function planningToText(planning, projectTitle = 'Daedalus Planning') {
    const source = planning || {}
    const entities = Array.isArray(source.entities) ? source.entities : []
    const connections = Array.isArray(source.connections) ? source.connections : []
    const lines = [`${projectTitle} — Planning Brief`, '']
    const byId = new Map(entities.map(entity => [entity.id, entity]))

    for (const type of TYPE_ORDER) {
      const items = entities.filter(entity => entity.type === type)
      if (!items.length) continue

      lines.push(`${ENTITY_TYPES[type]?.label || type}`.toUpperCase(), '')

      for (const entity of items) {
        lines.push(entity.name || 'Untitled')
        if (entity.subtitle) lines.push(`  ${entity.subtitle}`)
        if (entity.status) lines.push(`  Status: ${entity.status}`)
        if (entity.tags?.length) lines.push(`  Tags: ${entity.tags.join(', ')}`)
        if (entity.description) lines.push(`  Summary: ${entity.description}`)

        const typeFields = ENTITY_TYPES[type]?.fields || []
        for (const [key, label] of typeFields) {
          const value = String(entity.fields?.[key] || '').trim()
          if (value) lines.push(`  ${label}: ${value}`)
        }

        if (entity.notes) lines.push(`  Notes: ${entity.notes}`)
        lines.push('')
      }
    }

    if (connections.length) {
      lines.push('CONNECTIONS', '')
      for (const connection of connections) {
        const sourceEntity = byId.get(connection.sourceId)
        const targetEntity = byId.get(connection.targetId)
        if (!sourceEntity || !targetEntity) continue
        const arrow = connection.directed === false ? '<->' : '->'
        lines.push(`- ${sourceEntity.name} ${arrow} ${connection.label || 'connected to'} ${arrow} ${targetEntity.name}`)
      }
      lines.push('')
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  }

  window.DaedalusPlanning = {
    ENTITY_TYPES,
    TYPE_ORDER,
    TEMPLATE_DEFINITIONS,
    makeEntity,
    makeFrame,
    createTemplatePlanning,
    planningToMarkdown,
    planningToText,
    clone
  }
})()
