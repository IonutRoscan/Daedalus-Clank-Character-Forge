;(() => {
  'use strict'

  // Clank field detection and synchronization

  const ROOT_ID = 'daedalus-forge-root'
  const INITIAL_MESSAGE_PLACEHOLDER =
    "What's the first message this character will send to the user?"

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function isClankElement(element) {
    return Boolean(element) && !element.closest?.(`#${ROOT_ID}`)
  }

  function queryAll(selector) {
    return [...document.querySelectorAll(selector)].filter(isClankElement)
  }

  function findButtonByText(text) {
    const target = normalizeText(text)

    return (
      queryAll('button').find(
        button => normalizeText(button.innerText) === target
      ) || null
    )
  }

  function findAdvancedToggle() {
    return (
      queryAll('button').find(button => {
        return normalizeText(button.innerText).startsWith(
          'Advanced: Intro Scene and Customizations'
        )
      }) || null
    )
  }

  function findInitialMessageTextareas() {
    return queryAll('textarea').filter(textarea => {
      return normalizeText(textarea.placeholder) === INITIAL_MESSAGE_PLACEHOLDER
    })
  }

  function findFileInputs() {
    const inputs = queryAll('input[type="file"]')

    return {
      characterImage: inputs[0] || null,
      sceneImage: inputs[1] || null
    }
  }

  function detectFields() {
    const files = findFileInputs()
    const initialMessages = findInitialMessageTextareas()

    return {
      characterName: queryAll('input#name')[0] || null,
      characterPrompt: queryAll('textarea#personality')[0] || null,
      dialogueExample: queryAll('textarea#dialogue_example')[0] || null,
      sceneTitle: queryAll('input#story_title')[0] || null,
      scenePrompt: queryAll('textarea#story_prompt')[0] || null,
      initialMessage: initialMessages[0] || null,
      initialMessages,
      characterImage: files.characterImage,
      sceneImage: files.sceneImage,
      addMessageButton: findButtonByText('Add message'),
      publishButton: findButtonByText('Publish'),
      advancedToggle: findAdvancedToggle()
    }
  }

  function getDetectionReport() {
    const fields = detectFields()
    const report = {}

    for (const [key, element] of Object.entries(fields)) {
      if (Array.isArray(element)) {
        report[key] = {
          found: element.length > 0,
          count: element.length,
          tag: element[0]?.tagName?.toLowerCase() || null
        }
        continue
      }

      report[key] = {
        found: Boolean(element),
        tag: element?.tagName?.toLowerCase() || null,
        id: element?.id || null,
        placeholder: element?.placeholder || null,
        type: element?.type || null
      }
    }

    return report
  }

  function getDetectedCount() {
    const fields = detectFields()
    const logicalFields = [
      fields.characterName,
      fields.characterPrompt,
      fields.dialogueExample,
      fields.sceneTitle,
      fields.scenePrompt,
      fields.initialMessage,
      fields.characterImage,
      fields.sceneImage,
      fields.addMessageButton,
      fields.publishButton
    ]

    return logicalFields.filter(Boolean).length
  }

  function setNativeValue(element, value) {
    if (!element) {
      return false
    }

    const prototype =
      element.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')

    if (descriptor?.set) {
      descriptor.set.call(element, String(value ?? ''))
    } else {
      element.value = String(value ?? '')
    }

    element.dispatchEvent(new Event('input', {bubbles: true}))
    element.dispatchEvent(new Event('change', {bubbles: true}))
    return true
  }

  function applyText(element, value, limit) {
    const text = String(value || '')

    if (!element) {
      return {ok: false, reason: 'field-not-found'}
    }

    if (Number.isFinite(limit) && text.length > limit) {
      return {
        ok: false,
        reason: 'over-limit',
        length: text.length,
        limit
      }
    }

    setNativeValue(element, text)
    return {ok: true, length: text.length}
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async function ensureAdvancedFields() {
    let fields = detectFields()

    if (fields.sceneTitle && fields.scenePrompt) {
      return fields
    }

    if (fields.advancedToggle) {
      fields.advancedToggle.click()
      await wait(180)
      fields = detectFields()
    }

    return fields
  }

  async function ensureInitialMessageCount(count) {
    let fields = detectFields()
    let attempts = 0

    while (
      fields.initialMessages.length < count &&
      attempts < Math.max(8, count + 2)
    ) {
      const addButton =
        fields.addMessageButton || findButtonByText('Add message')

      if (!addButton) {
        break
      }

      addButton.click()
      await wait(100)
      fields = detectFields()
      attempts += 1
    }

    return fields.initialMessages
  }

  function applyCharacterToClank(projectOrCharacter) {
    const fields = detectFields()
    const character = projectOrCharacter?.character || projectOrCharacter || {}

    return {
      characterName: applyText(fields.characterName, character.name, 100),
      characterPrompt: applyText(
        fields.characterPrompt,
        character.prompt,
        25000
      )
    }
  }

  function applyDialogueToClank(projectOrDialogue) {
    const fields = detectFields()
    const dialogue = projectOrDialogue?.dialogue || projectOrDialogue || {}
    const raw = typeof dialogue === 'string' ? dialogue : dialogue.raw

    return {
      dialogueExample: applyText(fields.dialogueExample, raw, 20000)
    }
  }

  async function applySceneToClank(projectOrScene) {
    const fields = await ensureAdvancedFields()
    const scene = projectOrScene?.scene || projectOrScene || {}

    return {
      sceneTitle: applyText(fields.sceneTitle, scene.title, 200),
      scenePrompt: applyText(fields.scenePrompt, scene.prompt, 10000)
    }
  }

  async function applyInitialMessagesToClank(projectOrMessages) {
    const messages = Array.isArray(projectOrMessages)
      ? projectOrMessages
      : projectOrMessages?.initialMessages || []
    const desired = messages.length || 1
    const textareas = await ensureInitialMessageCount(desired)
    const results = []

    for (let index = 0; index < messages.length; index += 1) {
      results.push(applyText(textareas[index], messages[index]?.content, 10000))
    }

    return {
      initialMessages: results,
      availableFields: textareas.length,
      requestedFields: messages.length,
      extraFieldsRemain: Math.max(0, textareas.length - messages.length)
    }
  }

  async function applyProjectToClank(project) {
    const character = applyCharacterToClank(project)
    const dialogue = applyDialogueToClank(project)
    const scene = await applySceneToClank(project)
    const initial = await applyInitialMessagesToClank(project)

    return {
      ...character,
      ...dialogue,
      ...scene,
      ...initial,
      images: {
        ok: false,
        reason: 'manual-file-selection-required',
        note: 'Browser security prevents restoring local file inputs directly.'
      }
    }
  }

  async function readCreateForm() {
    const fields = await ensureAdvancedFields()
    const initialMessages = findInitialMessageTextareas()

    return {
      character: {
        name: String(fields.characterName?.value || ''),
        prompt: String(fields.characterPrompt?.value || '')
      },
      dialogue: {
        raw: String(fields.dialogueExample?.value || '')
      },
      scene: {
        title: String(fields.sceneTitle?.value || ''),
        prompt: String(fields.scenePrompt?.value || '')
      },
      initialMessages: initialMessages.map((textarea, index) => ({
        label: `Initial Message ${index + 1}`,
        content: String(textarea.value || '')
      }))
    }
  }

  function compareValue(element, value) {
    if (!element) {
      return {status: 'unavailable', equal: false}
    }

    const expected = String(value ?? '')
    const actual = String(element.value ?? '')

    return {
      status: actual === expected ? 'synced' : 'different',
      equal: actual === expected,
      actualLength: actual.length,
      expectedLength: expected.length
    }
  }

  function summarizeGroup(parts) {
    if (parts.some(part => part.status === 'unavailable')) {
      return 'unavailable'
    }

    return parts.every(part => part.equal) ? 'synced' : 'different'
  }

  function getSyncStatus(project) {
    const fields = detectFields()
    const characterName = compareValue(
      fields.characterName,
      project?.character?.name
    )
    const characterPrompt = compareValue(
      fields.characterPrompt,
      project?.character?.prompt
    )
    const dialogue = compareValue(
      fields.dialogueExample,
      project?.dialogue?.raw
    )
    const sceneTitle = compareValue(fields.sceneTitle, project?.scene?.title)
    const scenePrompt = compareValue(fields.scenePrompt, project?.scene?.prompt)
    const messages = Array.isArray(project?.initialMessages)
      ? project.initialMessages
      : []
    const introParts = []

    if (!fields.initialMessages.length) {
      introParts.push({status: 'unavailable', equal: false})
    } else {
      const max = Math.max(messages.length, fields.initialMessages.length)

      for (let index = 0; index < max; index += 1) {
        const field = fields.initialMessages[index]
        const expected = messages[index]?.content ?? ''

        if (!field) {
          introParts.push({status: 'unavailable', equal: false})
        } else {
          introParts.push(compareValue(field, expected))
        }
      }
    }

    return {
      character: {
        status: summarizeGroup([characterName, characterPrompt]),
        parts: {name: characterName, prompt: characterPrompt}
      },
      dialogue: {
        status: dialogue.status,
        parts: {dialogue}
      },
      scene: {
        status: summarizeGroup([sceneTitle, scenePrompt]),
        parts: {title: sceneTitle, prompt: scenePrompt}
      },
      initials: {
        status: summarizeGroup(introParts),
        parts: introParts,
        projectCount: messages.length,
        clankCount: fields.initialMessages.length
      }
    }
  }

  window.DaedalusFieldDetector = {
    detectFields,
    getDetectionReport,
    getDetectedCount,
    setNativeValue,
    applyCharacterToClank,
    applyDialogueToClank,
    applySceneToClank,
    applyInitialMessagesToClank,
    applyProjectToClank,
    readCreateForm,
    getSyncStatus
  }
})()
