;(() => {
  'use strict'

  // Builder compilers

  const CHARACTER_SECTIONS = [
    ['identity', 'Identity'],
    ['appearance', 'Appearance'],
    ['personality', 'Personality'],
    ['behavior', 'Behavior'],
    ['voice', 'Voice & Speech'],
    ['relationships', 'Relationships'],
    ['backstory', 'Backstory'],
    ['goals', 'Goals'],
    ['rules', 'Roleplay Rules']
  ]

  const SCENE_SECTIONS = [
    ['location', 'Location'],
    ['time', 'Time'],
    ['atmosphere', 'Atmosphere'],
    ['situation', 'Current Situation'],
    ['characterGoal', "{{char}}'s Goal"],
    ['userRole', "{{user}}'s Role"],
    ['conflict', 'Immediate Conflict'],
    ['knownInformation', 'Known Information'],
    ['hiddenInformation', 'Hidden Information'],
    ['rules', 'Scene Rules']
  ]

  function clean(value) {
    return String(value || '').trim()
  }

  function orderDefinitions(definitions, order) {
    if (!Array.isArray(order) || !order.length) {
      return definitions
    }

    const byKey = new Map(
      definitions.map(definition => [definition[0], definition])
    )
    const ordered = order.map(key => byKey.get(key)).filter(Boolean)

    for (const definition of definitions) {
      if (!ordered.includes(definition)) {
        ordered.push(definition)
      }
    }

    return ordered
  }

  function compileSections(source, definitions, order = null) {
    return orderDefinitions(definitions, order)
      .map(([key, heading]) => {
        const content = clean(source?.[key])
        return content ? `## ${heading}\n${content}` : ''
      })
      .filter(Boolean)
      .join('\n\n')
  }

  function compileCharacterBuilder(builder, order = null) {
    return compileSections(builder, CHARACTER_SECTIONS, order)
  }

  function compileSceneBuilder(builder) {
    return compileSections(builder, SCENE_SECTIONS)
  }

  function compileDialogueExamples(examples) {
    if (!Array.isArray(examples)) {
      return ''
    }

    return examples
      .map((example, index) => {
        const label = clean(example?.label) || `Example ${index + 1}`
        const situation = clean(example?.situation)
        const user = clean(example?.user)
        const char = clean(example?.char)
        const lines = [`### ${label}`]

        if (situation) {
          lines.push(`Situation: ${situation}`)
        }

        if (user) {
          lines.push(`{{user}}: ${user}`)
        }

        if (char) {
          lines.push(`{{char}}: ${char}`)
        }

        return lines.length > 1 ? lines.join('\n') : ''
      })
      .filter(Boolean)
      .join('\n\n')
  }

  window.DaedalusCompilers = {
    CHARACTER_SECTIONS,
    SCENE_SECTIONS,
    compileCharacterBuilder,
    compileSceneBuilder,
    compileDialogueExamples
  }
})()
