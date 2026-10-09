;(() => {
  'use strict'

  // Project inspector

  const LIMITS = {
    name: 100,
    characterPrompt: 25000,
    dialogue: 20000,
    sceneTitle: 200,
    scenePrompt: 10000,
    initialMessage: 10000
  }

  function issue(severity, title, detail, area) {
    return {
      id: `${severity}-${area}-${title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      severity,
      title,
      detail,
      area
    }
  }

  function addLimitIssue(issues, value, limit, label, area) {
    const length = String(value || '').length

    if (length > limit) {
      issues.push(
        issue(
          'error',
          `${label} exceeds Clank's limit`,
          `${length.toLocaleString()} / ${limit.toLocaleString()} characters.`,
          area
        )
      )
    }
  }

  function paragraphDuplicates(text) {
    const paragraphs = String(text || '')
      .split(/\n\s*\n/)
      .map(value => value.trim())
      .filter(value => value.length >= 80)

    const seen = new Set()

    for (const paragraph of paragraphs) {
      const normalized = paragraph.toLowerCase().replace(/\s+/g, ' ')

      if (seen.has(normalized)) {
        return true
      }

      seen.add(normalized)
    }

    return false
  }

  function inspect(project) {
    const issues = []
    const name = String(project?.character?.name || '')
    const prompt = String(project?.character?.prompt || '')
    const dialogue = String(project?.dialogue?.raw || '')
    const sceneTitle = String(project?.scene?.title || '')
    const scenePrompt = String(project?.scene?.prompt || '')
    const intros = Array.isArray(project?.initialMessages)
      ? project.initialMessages
      : []
    const characterBuilderText = Object.values(
      project?.character?.builder || {}
    ).join('\n')
    const sceneBuilderText = Object.values(project?.scene?.builder || {}).join(
      '\n'
    )
    const combined = [
      prompt,
      dialogue,
      scenePrompt,
      characterBuilderText,
      sceneBuilderText,
      ...intros.map(item => item.content)
    ].join('\n')

    if (!name.trim()) {
      issues.push(
        issue(
          'warning',
          'Character name is empty',
          'Clank requires a character name before publishing.',
          'Character'
        )
      )
    }

    if (!prompt.trim()) {
      issues.push(
        issue(
          'warning',
          'Character prompt is empty',
          'The core character definition has not been written yet.',
          'Character'
        )
      )
    }

    addLimitIssue(issues, name, LIMITS.name, 'Character name', 'Character')
    addLimitIssue(
      issues,
      prompt,
      LIMITS.characterPrompt,
      'Character prompt',
      'Character'
    )
    addLimitIssue(
      issues,
      dialogue,
      LIMITS.dialogue,
      'Dialogue example',
      'Dialogue'
    )
    addLimitIssue(issues, sceneTitle, LIMITS.sceneTitle, 'Scene title', 'Scene')
    addLimitIssue(
      issues,
      scenePrompt,
      LIMITS.scenePrompt,
      'Scene prompt',
      'Scene'
    )

    intros.forEach((message, index) => {
      addLimitIssue(
        issues,
        message?.content,
        LIMITS.initialMessage,
        message?.label || `Initial Message ${index + 1}`,
        'Initial Messages'
      )
    })

    if (!intros.some(message => String(message?.content || '').trim())) {
      issues.push(
        issue(
          'suggestion',
          'No initial message has been written',
          'A strong opening usually establishes the scene, voice, and immediate hook.',
          'Initial Messages'
        )
      )
    }

    if (!dialogue.trim()) {
      issues.push(
        issue(
          'suggestion',
          'No dialogue examples yet',
          'Dialogue examples can demonstrate how the character actually sounds in different situations.',
          'Dialogue'
        )
      )
    }

    if (
      prompt.trim() &&
      !/\b(speak|speaks|speech|voice|tone|vocabulary|dialogue)\b/i.test(prompt)
    ) {
      issues.push(
        issue(
          'suggestion',
          'Speech style is not obvious in the raw prompt',
          'Consider defining how {{char}} speaks, or use the Voice & Speech section in Builder mode.',
          'Character'
        )
      )
    }

    const builderRules = String(project?.character?.builder?.rules || '').trim()

    if (builderRules && !prompt.includes(builderRules)) {
      issues.push(
        issue(
          'suggestion',
          'Roleplay Rules are not synced to the raw prompt',
          'The Rules Studio contains active rules that are not currently present in the raw Character Prompt. Compile the Character Builder or use Sync Rules → Raw Prompt.',
          'Character'
        )
      )
    }

    if (
      prompt.trim() &&
      !builderRules &&
      !/\b(user agency|never control|do not control|never speak for|do not speak for|user.* decides)\b/i.test(
        prompt
      )
    ) {
      issues.push(
        issue(
          'suggestion',
          'No explicit {{user}} agency rule detected',
          'For roleplay characters, consider adding a user-agency rule from the AI & RP Rules Studio if you want the model to avoid deciding {{user}} actions, dialogue, thoughts, or emotions.',
          'Character'
        )
      )
    }

    if (sceneTitle.trim() && !scenePrompt.trim()) {
      issues.push(
        issue(
          'warning',
          'Scene title has no scene prompt',
          'The named intro scene does not currently define its context or plot.',
          'Scene'
        )
      )
    }

    if (scenePrompt.trim() && !sceneTitle.trim()) {
      issues.push(
        issue(
          'suggestion',
          'Scene prompt has no title',
          'A short scene title can make the introduction easier to identify.',
          'Scene'
        )
      )
    }

    if (/(^|[^\{])\{(?:user|char)\}(?!\})/i.test(combined)) {
      issues.push(
        issue(
          'warning',
          'Possible malformed variable found',
          'Daedalus found {user} or {char}. Clank variables use {{user}} and {{char}}.',
          'Project'
        )
      )
    }

    if (
      /\[(?:todo|insert|fill|replace|name here|description here)[^\]]*\]/i.test(
        combined
      )
    ) {
      issues.push(
        issue(
          'warning',
          'Possible unfinished placeholder',
          'A TODO or fill-in placeholder may still be present in the project.',
          'Project'
        )
      )
    }

    if (paragraphDuplicates(prompt)) {
      issues.push(
        issue(
          'suggestion',
          'Repeated paragraph detected',
          'The character prompt appears to contain an identical long paragraph more than once.',
          'Character'
        )
      )
    }

    const systemsCore = window.DaedalusSystems
    if (systemsCore && project?.systems) {
      const enabledSystems = systemsCore.enabledModuleIds(project.systems)
      const compiledSystems = systemsCore.compileSystems(project.systems)
      const hasHud = project.systems?.hud?.enabled === true

      if ((enabledSystems.length || hasHud) && !prompt.includes(systemsCore.SYSTEM_MARKER_START)) {
        issues.push(
          issue(
            'suggestion',
            'RP Systems are not synced to the Character Prompt',
            'The Systems Studio contains enabled trackers. Open Systems and use Sync → Character Prompt when you want Clank to receive those instructions.',
            'Systems'
          )
        )
      }

      if (compiledSystems) {
        const merged = systemsCore.upsertSystemsSection(prompt, project.systems)
        if (merged.length > LIMITS.characterPrompt) {
          issues.push(
            issue(
              'warning',
              'RP Systems would exceed the Character Prompt limit',
              `The current prompt plus Systems would be ${merged.length.toLocaleString()} / ${LIMITS.characterPrompt.toLocaleString()} characters. Disable some systems or shorten the prompt before syncing.`,
              'Systems'
            )
          )
        }
      }

      for (const systemIssue of systemsCore.inspectSystems(project.systems)) {
        issues.push(
          issue(
            systemIssue.severity || 'suggestion',
            systemIssue.title,
            systemIssue.detail,
            'Systems'
          )
        )
      }
    }

    const counts = {
      errors: issues.filter(item => item.severity === 'error').length,
      warnings: issues.filter(item => item.severity === 'warning').length,
      suggestions: issues.filter(item => item.severity === 'suggestion').length
    }

    return {issues, counts, limits: {...LIMITS}}
  }

  window.DaedalusInspector = {
    LIMITS,
    inspect
  }
})()
