;(() => {
  'use strict'

  // Project storage

  const STATE_KEY = 'daedalus.state.v2'
  const LEGACY_KEY = 'daedalus.currentProject'
  const STATE_VERSION = 7
  const PROJECT_VERSION = 6
  const HISTORY_LIMIT = 8
  const DEFAULT_CHARACTER_ORDER = [
    'identity',
    'appearance',
    'personality',
    'behavior',
    'voice',
    'relationships',
    'backstory',
    'goals',
    'rules'
  ]

  const CHARACTER_BUILDER_FIELDS = [
    'identity',
    'appearance',
    'personality',
    'behavior',
    'voice',
    'relationships',
    'backstory',
    'goals',
    'rules'
  ]

  const SCENE_BUILDER_FIELDS = [
    'location',
    'time',
    'atmosphere',
    'situation',
    'characterGoal',
    'userRole',
    'conflict',
    'knownInformation',
    'hiddenInformation',
    'rules'
  ]

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function nowIso() {
    return new Date().toISOString()
  }

  function makeId(prefix = 'item') {
    if (globalThis.crypto?.randomUUID) {
      return `${prefix}-${globalThis.crypto.randomUUID()}`
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  function blankObject(keys) {
    return Object.fromEntries(keys.map(key => [key, '']))
  }

  function createDefaultProject(title = 'Untitled Character') {
    const now = nowIso()

    return {
      version: PROJECT_VERSION,
      id: makeId('project'),
      meta: {
        title:
          String(title || 'Untitled Character').trim() || 'Untitled Character',
        titleMode: 'character',
        createdAt: now,
        updatedAt: now
      },
      notes: '',
      character: {
        name: '',
        prompt: '',
        builder: blankObject(CHARACTER_BUILDER_FIELDS),
        builderOrder: [...DEFAULT_CHARACTER_ORDER]
      },
      dialogue: {
        raw: '',
        examples: []
      },
      scene: {
        title: '',
        prompt: '',
        builder: blankObject(SCENE_BUILDER_FIELDS)
      },
      initialMessages: [
        {
          id: makeId('intro'),
          label: 'Initial Message 1',
          content: ''
        }
      ],
      images: {
        character: null,
        scene: null
      },
      systems: window.DaedalusSystems?.createDefaultSystems?.() || {version: 1, modules: {}, hud: {enabled: false, blocks: [], customBlocks: []}, notes: ''},
      planning: {
        version: 2,
        entities: [],
        connections: [],
        frames: [],
        view: {
          panX: 180,
          panY: 120,
          zoom: 1,
          snapToGrid: true,
          gridSize: 20
        }
      },
      history: []
    }
  }

  function normalizeBuilder(input, keys) {
    const output = blankObject(keys)

    if (!input || typeof input !== 'object') {
      return output
    }

    for (const key of keys) {
      output[key] = String(input[key] || '')
    }

    return output
  }

  function normalizeOrder(input, allowed) {
    const source = Array.isArray(input) ? input : []
    const seen = new Set()
    const result = []

    for (const key of source) {
      if (allowed.includes(key) && !seen.has(key)) {
        seen.add(key)
        result.push(key)
      }
    }

    for (const key of allowed) {
      if (!seen.has(key)) {
        result.push(key)
      }
    }

    return result
  }

  function normalizeDialogueExample(example, index = 0) {
    return {
      id: String(example?.id || makeId('dialogue')),
      label: String(example?.label || `Example ${index + 1}`),
      situation: String(example?.situation || ''),
      user: String(example?.user || ''),
      char: String(example?.char || ''),
      source: example?.source === 'systems' ? 'systems' : ''
    }
  }

  function normalizeInitialMessage(message, index = 0) {
    return {
      id: String(message?.id || makeId('intro')),
      label: String(message?.label || `Initial Message ${index + 1}`),
      content: String(message?.content || '')
    }
  }

  function normalizePlanningEntity(entity) {
    const allowedTypes = [
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

    const type = allowedTypes.includes(entity?.type) ? entity.type : 'custom'
    const rawFields =
      entity?.fields && typeof entity.fields === 'object' ? entity.fields : {}

    return {
      id: String(entity?.id || makeId('entity')),
      type,
      name: String(entity?.name || 'Untitled'),
      subtitle: String(entity?.subtitle || ''),
      status: String(entity?.status || ''),
      tags: Array.isArray(entity?.tags)
        ? entity.tags.map(tag => String(tag)).filter(Boolean)
        : [],
      imageUrl: String(entity?.imageUrl || ''),
      description: String(entity?.description || ''),
      notes: String(entity?.notes || ''),
      favorite: Boolean(entity?.favorite),
      locked: Boolean(entity?.locked),
      hidden: Boolean(entity?.hidden),
      updatedAt: String(entity?.updatedAt || nowIso()),
      x: Number.isFinite(Number(entity?.x)) ? Number(entity.x) : 100,
      y: Number.isFinite(Number(entity?.y)) ? Number(entity.y) : 100,
      fields: Object.fromEntries(
        Object.entries(rawFields).map(([key, value]) => [
          String(key),
          String(value ?? '')
        ])
      ),
      customFields: Array.isArray(entity?.customFields)
        ? entity.customFields
            .map(field => ({
              id: String(field?.id || makeId('field')),
              label: String(field?.label || 'Custom field'),
              value: String(field?.value || '')
            }))
            .filter(field => field.label.trim())
        : []
    }
  }

  function normalizePlanningConnection(connection) {
    const styles = ['solid', 'dashed', 'dotted']
    const categories = ['relationship', 'ownership', 'membership', 'location', 'plot', 'knowledge', 'conflict', 'custom']
    return {
      id: String(connection?.id || makeId('connection')),
      sourceId: String(connection?.sourceId || ''),
      targetId: String(connection?.targetId || ''),
      label: String(connection?.label || 'connected to'),
      directed: connection?.directed !== false,
      category: categories.includes(connection?.category) ? connection.category : 'relationship',
      style: styles.includes(connection?.style) ? connection.style : 'solid',
      notes: String(connection?.notes || '')
    }
  }

  function normalizePlanningFrame(frame) {
    const height = Math.max(140, Number(frame?.height) || 320)

    return {
      id: String(frame?.id || makeId('frame')),
      name: String(frame?.name || 'New Frame'),
      x: Number.isFinite(Number(frame?.x)) ? Number(frame.x) : 80,
      y: Number.isFinite(Number(frame?.y)) ? Number(frame.y) : 80,
      width: Math.max(260, Number(frame?.width) || 520),
      height,
      collapsed: Boolean(frame?.collapsed),
      locked: Boolean(frame?.locked),
      color: ['neutral', 'green', 'blue', 'gold'].includes(frame?.color) ? frame.color : 'neutral',
      memberIds: Array.isArray(frame?.memberIds) ? frame.memberIds.map(String) : [],
      expandedHeight: Math.max(
        140,
        Number(frame?.expandedHeight) || height
      )
    }
  }

  function normalizePlanning(input) {
    const source = input && typeof input === 'object' ? input : {}
    const entities = Array.isArray(source.entities)
      ? source.entities.map(normalizePlanningEntity)
      : []
    const entityIds = new Set(entities.map(entity => entity.id))

    const connections = Array.isArray(source.connections)
      ? source.connections
          .map(normalizePlanningConnection)
          .filter(
            connection =>
              entityIds.has(connection.sourceId) &&
              entityIds.has(connection.targetId) &&
              connection.sourceId !== connection.targetId
          )
      : []

    const view = source.view && typeof source.view === 'object' ? source.view : {}

    const frames = Array.isArray(source.frames)
      ? source.frames.map(normalizePlanningFrame).map(frame => ({
          ...frame,
          memberIds: (frame.memberIds || []).filter(id => entityIds.has(id))
        }))
      : []

    return {
      version: 2,
      entities,
      connections,
      frames,
      view: {
        panX: Number.isFinite(Number(view.panX)) ? Number(view.panX) : 180,
        panY: Number.isFinite(Number(view.panY)) ? Number(view.panY) : 120,
        zoom: Math.min(
          2.2,
          Math.max(
            0.35,
            Number.isFinite(Number(view.zoom)) ? Number(view.zoom) : 1
          )
        ),
        snapToGrid: view.snapToGrid !== false,
        gridSize: Math.min(
          80,
          Math.max(
            10,
            Number.isFinite(Number(view.gridSize)) ? Number(view.gridSize) : 20
          )
        )
      }
    }
  }

  function normalizeProject(input) {
    const base = createDefaultProject(
      input?.meta?.title || input?.character?.name
    )
    const source = input && typeof input === 'object' ? input : {}

    base.id = String(source.id || base.id)
    base.version = PROJECT_VERSION
    base.meta.createdAt = String(source.meta?.createdAt || base.meta.createdAt)
    base.meta.updatedAt = String(source.meta?.updatedAt || base.meta.updatedAt)
    base.meta.title = String(
      source.meta?.title || source.character?.name || base.meta.title
    )
    base.meta.titleMode =
      source.meta?.titleMode === 'custom' ? 'custom' : 'character'

    base.notes = String(source.notes || '')

    base.character.name = String(source.character?.name || '')
    base.character.prompt = String(source.character?.prompt || '')
    base.character.builder = normalizeBuilder(
      source.character?.builder,
      CHARACTER_BUILDER_FIELDS
    )
    base.character.builderOrder = normalizeOrder(
      source.character?.builderOrder,
      CHARACTER_BUILDER_FIELDS
    )

    base.dialogue.raw = String(
      source.dialogue?.raw ?? source.character?.dialogueExample ?? ''
    )
    base.dialogue.examples = Array.isArray(source.dialogue?.examples)
      ? source.dialogue.examples.map(normalizeDialogueExample)
      : []

    base.scene.title = String(source.scene?.title || '')
    base.scene.prompt = String(source.scene?.prompt || '')
    base.scene.builder = normalizeBuilder(
      source.scene?.builder,
      SCENE_BUILDER_FIELDS
    )

    if (
      Array.isArray(source.initialMessages) &&
      source.initialMessages.length
    ) {
      base.initialMessages = source.initialMessages.map(normalizeInitialMessage)
    }

    base.images = {
      character: source.images?.character ?? null,
      scene: source.images?.scene ?? null
    }

    base.systems = window.DaedalusSystems?.normalizeSystems
      ? window.DaedalusSystems.normalizeSystems(source.systems)
      : clone(base.systems)

    base.planning = normalizePlanning(source.planning)

    base.history = Array.isArray(source.history)
      ? source.history
          .slice(0, HISTORY_LIMIT)
          .map(snapshot => ({
            id: String(snapshot?.id || makeId('snapshot')),
            createdAt: String(snapshot?.createdAt || nowIso()),
            reason: String(snapshot?.reason || 'Snapshot'),
            data:
              snapshot?.data && typeof snapshot.data === 'object'
                ? clone(snapshot.data)
                : null
          }))
          .filter(snapshot => snapshot.data)
      : []

    return base
  }

  function projectSnapshotData(project) {
    return {
      notes: String(project.notes || ''),
      character: clone(project.character),
      dialogue: clone(project.dialogue),
      scene: clone(project.scene),
      initialMessages: clone(project.initialMessages),
      images: clone(project.images),
      systems: clone(project.systems),
      planning: clone(project.planning)
    }
  }

  function createDefaultState() {
    const project = createDefaultProject()

    return {
      version: STATE_VERSION,
      currentProjectId: project.id,
      projects: [project],
      customFragments: [],
      customRules: [],
      customSystemRecipes: [],
      settings: {
        theme: 'dark',
        guidanceEnabled: true,
        splashMode: 'minimal',
        splashSeen: false
      }
    }
  }

  function normalizeState(input) {
    const state =
      input && typeof input === 'object' ? clone(input) : createDefaultState()

    state.version = STATE_VERSION
    state.projects = Array.isArray(state.projects)
      ? state.projects.map(normalizeProject)
      : []

    if (!state.projects.length) {
      const project = createDefaultProject()
      state.projects = [project]
      state.currentProjectId = project.id
    }

    if (
      !state.projects.some(project => project.id === state.currentProjectId)
    ) {
      state.currentProjectId = state.projects[0].id
    }

    state.customFragments = Array.isArray(state.customFragments)
      ? state.customFragments.map(fragment => ({
          id: String(fragment?.id || makeId('fragment')),
          name: String(fragment?.name || 'Untitled Fragment'),
          category: String(fragment?.category || 'Custom'),
          target: ['character', 'dialogue', 'scene'].includes(fragment?.target)
            ? fragment.target
            : 'character',
          content: String(fragment?.content || '')
        }))
      : []

    state.customRules = Array.isArray(state.customRules)
      ? state.customRules.map(rule => ({
          id: String(rule?.id || makeId('rule')),
          name: String(rule?.name || 'Untitled Rule').trim() || 'Untitled Rule',
          category: String(rule?.category || 'Custom').trim() || 'Custom',
          content: String(rule?.content || '')
        }))
      : []

    state.customSystemRecipes = Array.isArray(state.customSystemRecipes)
      ? state.customSystemRecipes.map(recipe => ({
          id: String(recipe?.id || makeId('system-recipe')),
          name: String(recipe?.name || 'Custom Recipe').trim() || 'Custom Recipe',
          description: String(recipe?.description || ''),
          rulesText: String(recipe?.rulesText || ''),
          systems: window.DaedalusSystems?.normalizeSystems
            ? window.DaedalusSystems.normalizeSystems(recipe?.systems)
            : clone(recipe?.systems || {})
        }))
      : []

    const theme = String(state.settings?.theme || 'dark')
    const splashMode = String(state.settings?.splashMode || 'minimal')
    state.settings = {
      theme: ['dark', 'light'].includes(theme) ? theme : 'dark',
      guidanceEnabled: state.settings?.guidanceEnabled !== false,
      splashMode: ['full', 'minimal', 'off'].includes(splashMode) ? splashMode : 'minimal',
      splashSeen: state.settings?.splashSeen === true
    }

    return state
  }

  async function loadState() {
    const result = await chrome.storage.local.get([STATE_KEY, LEGACY_KEY])

    if (result[STATE_KEY]) {
      return normalizeState(result[STATE_KEY])
    }

    if (result[LEGACY_KEY]) {
      const project = normalizeProject(result[LEGACY_KEY])
      const state = {
        version: STATE_VERSION,
        currentProjectId: project.id,
        projects: [project],
        customFragments: [],
        customRules: [],
        customSystemRecipes: [],
        settings: {theme: 'dark', guidanceEnabled: true, splashMode: 'minimal', splashSeen: false}
      }

      await chrome.storage.local.set({[STATE_KEY]: state})
      await chrome.storage.local.remove(LEGACY_KEY)
      console.info('[Daedalus] Migrated the legacy project store to v2.')
      return state
    }

    const state = createDefaultState()
    await chrome.storage.local.set({[STATE_KEY]: state})
    return state
  }

  async function saveState(state) {
    const normalized = normalizeState(state)
    await chrome.storage.local.set({[STATE_KEY]: normalized})
    return clone(normalized)
  }

  async function getCurrentProject() {
    const state = await loadState()
    return clone(
      state.projects.find(project => project.id === state.currentProjectId) ||
        state.projects[0]
    )
  }

  async function getOrCreateProject() {
    return getCurrentProject()
  }

  async function listProjects() {
    const state = await loadState()

    return state.projects
      .map(project => ({
        id: project.id,
        title: project.meta.title,
        updatedAt: project.meta.updatedAt,
        createdAt: project.meta.createdAt
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  async function saveProject(project) {
    const state = await loadState()
    const normalized = normalizeProject(project)

    normalized.meta.updatedAt = nowIso()

    if (
      normalized.meta.titleMode !== 'custom' &&
      normalized.character.name.trim()
    ) {
      normalized.meta.title = normalized.character.name.trim()
    }

    const index = state.projects.findIndex(item => item.id === normalized.id)

    if (index >= 0) {
      state.projects[index] = normalized
    } else {
      state.projects.push(normalized)
    }

    state.currentProjectId = normalized.id
    await saveState(state)
    return clone(normalized)
  }

  async function updateProject(mutator) {
    const project = await getCurrentProject()
    const workingCopy = clone(project)
    await mutator(workingCopy)
    return saveProject(workingCopy)
  }

  async function updateCharacterField(field, value) {
    return updateProject(project => {
      if (!(field in project.character)) {
        throw new Error(`Unknown character field: ${field}`)
      }

      project.character[field] = value
    })
  }

  async function createProject(title = 'Untitled Character') {
    const state = await loadState()
    const project = createDefaultProject(title)
    state.projects.push(project)
    state.currentProjectId = project.id
    await saveState(state)
    return clone(project)
  }

  async function setCurrentProject(projectId) {
    const state = await loadState()

    if (!state.projects.some(project => project.id === projectId)) {
      throw new Error('Project not found.')
    }

    state.currentProjectId = projectId
    await saveState(state)
    return getCurrentProject()
  }

  async function duplicateProject(projectId = null, requestedTitle = null) {
    const state = await loadState()
    const sourceId = projectId || state.currentProjectId
    const source = state.projects.find(project => project.id === sourceId)

    if (!source) {
      throw new Error('Project not found.')
    }

    const duplicate = normalizeProject(source)
    duplicate.id = makeId('project')
    duplicate.meta.createdAt = nowIso()
    duplicate.meta.updatedAt = duplicate.meta.createdAt
    const customTitle = String(requestedTitle || '').trim()
    duplicate.meta.title = customTitle || `${source.meta.title} — Variant`
    duplicate.meta.titleMode = 'custom'
    duplicate.character.name = source.character.name
    duplicate.history = []

    state.projects.push(duplicate)
    state.currentProjectId = duplicate.id
    await saveState(state)
    return clone(duplicate)
  }

  async function deleteProject(projectId) {
    const state = await loadState()
    state.projects = state.projects.filter(project => project.id !== projectId)

    if (!state.projects.length) {
      const replacement = createDefaultProject()
      state.projects.push(replacement)
      state.currentProjectId = replacement.id
    } else if (state.currentProjectId === projectId) {
      state.currentProjectId = state.projects[0].id
    }

    await saveState(state)
    return getCurrentProject()
  }

  async function createSnapshot(reason = 'Manual snapshot') {
    const project = await getCurrentProject()

    project.history.unshift({
      id: makeId('snapshot'),
      createdAt: nowIso(),
      reason: String(reason || 'Snapshot'),
      data: projectSnapshotData(project)
    })

    project.history = project.history.slice(0, HISTORY_LIMIT)
    return saveProject(project)
  }

  async function restoreSnapshot(snapshotId) {
    const project = await getCurrentProject()
    const snapshot = project.history.find(item => item.id === snapshotId)

    if (!snapshot?.data) {
      throw new Error('Snapshot not found.')
    }

    const history = clone(project.history)
    Object.assign(project, clone(snapshot.data))
    project.history = history
    return saveProject(project)
  }

  async function getCustomFragments() {
    const state = await loadState()
    return clone(state.customFragments)
  }

  async function saveCustomFragment(fragment) {
    const state = await loadState()
    const normalized = {
      id: String(fragment?.id || makeId('fragment')),
      name:
        String(fragment?.name || 'Untitled Fragment').trim() ||
        'Untitled Fragment',
      category: String(fragment?.category || 'Custom').trim() || 'Custom',
      target: ['character', 'dialogue', 'scene'].includes(fragment?.target)
        ? fragment.target
        : 'character',
      content: String(fragment?.content || '')
    }

    const index = state.customFragments.findIndex(
      item => item.id === normalized.id
    )

    if (index >= 0) {
      state.customFragments[index] = normalized
    } else {
      state.customFragments.push(normalized)
    }

    await saveState(state)
    return clone(normalized)
  }

  async function deleteCustomFragment(fragmentId) {
    const state = await loadState()
    state.customFragments = state.customFragments.filter(
      item => item.id !== fragmentId
    )
    await saveState(state)
    return clone(state.customFragments)
  }

  async function getCustomRules() {
    const state = await loadState()
    return clone(state.customRules)
  }

  async function saveCustomRule(rule) {
    const state = await loadState()
    const normalized = {
      id: String(rule?.id || makeId('rule')),
      name: String(rule?.name || 'Untitled Rule').trim() || 'Untitled Rule',
      category: String(rule?.category || 'Custom').trim() || 'Custom',
      content: String(rule?.content || '')
    }

    const index = state.customRules.findIndex(item => item.id === normalized.id)

    if (index >= 0) {
      state.customRules[index] = normalized
    } else {
      state.customRules.push(normalized)
    }

    await saveState(state)
    return clone(normalized)
  }

  async function deleteCustomRule(ruleId) {
    const state = await loadState()
    state.customRules = state.customRules.filter(item => item.id !== ruleId)
    await saveState(state)
    return clone(state.customRules)
  }

  async function getCustomSystemRecipes() {
    const state = await loadState()
    return clone(state.customSystemRecipes)
  }

  async function saveCustomSystemRecipe(recipe) {
    const state = await loadState()
    const normalized = {
      id: String(recipe?.id || makeId('system-recipe')),
      name: String(recipe?.name || 'Custom Recipe').trim() || 'Custom Recipe',
      description: String(recipe?.description || ''),
      rulesText: String(recipe?.rulesText || ''),
      systems: window.DaedalusSystems?.normalizeSystems
        ? window.DaedalusSystems.normalizeSystems(recipe?.systems)
        : clone(recipe?.systems || {})
    }
    const index = state.customSystemRecipes.findIndex(item => item.id === normalized.id)
    if (index >= 0) state.customSystemRecipes[index] = normalized
    else state.customSystemRecipes.push(normalized)
    await saveState(state)
    return clone(normalized)
  }

  async function deleteCustomSystemRecipe(recipeId) {
    const state = await loadState()
    state.customSystemRecipes = state.customSystemRecipes.filter(item => item.id !== recipeId)
    await saveState(state)
    return clone(state.customSystemRecipes)
  }

  async function getSettings() {
    const state = await loadState()
    return clone(state.settings)
  }

  async function setTheme(theme) {
    const state = await loadState()
    state.settings.theme = theme === 'light' ? 'light' : 'dark'
    await saveState(state)
    return state.settings.theme
  }

  async function setGuidanceEnabled(enabled) {
    const state = await loadState()
    state.settings.guidanceEnabled = enabled !== false
    await saveState(state)
    return state.settings.guidanceEnabled
  }
  async function setSplashMode(mode) {
    const state = await loadState()
    state.settings.splashMode = ['full', 'minimal', 'off'].includes(mode)
      ? mode
      : 'minimal'
    await saveState(state)
    return state.settings.splashMode
  }

  async function setSplashSeen(seen) {
    const state = await loadState()
    state.settings.splashSeen = seen === true
    await saveState(state)
    return state.settings.splashSeen
  }


  async function importProject(payload) {
    const state = await loadState()
    const source = payload?.project || payload

    if (!source || typeof source !== 'object') {
      throw new Error('Invalid Daedalus project file.')
    }

    const project = normalizeProject(source)
    project.id = makeId('project')
    project.meta.createdAt = nowIso()
    project.meta.updatedAt = project.meta.createdAt
    project.meta.title = `${project.meta.title || 'Imported Character'} (Imported)`
    project.history = []

    state.projects.push(project)
    state.currentProjectId = project.id
    await saveState(state)
    return clone(project)
  }

  async function exportCurrentProject() {
    const project = await getCurrentProject()

    return {
      kind: 'daedalus-project',
      formatVersion: 1,
      exportedAt: nowIso(),
      project: clone(project)
    }
  }

  async function exportBackup() {
    const state = await loadState()

    return {
      kind: 'daedalus-backup',
      formatVersion: 1,
      exportedAt: nowIso(),
      state: clone(state)
    }
  }

  async function importBackup(payload) {
    const source = payload?.state || payload

    if (!source || typeof source !== 'object') {
      throw new Error('Invalid Daedalus backup file.')
    }

    if (payload?.kind && payload.kind !== 'daedalus-backup') {
      throw new Error('This JSON file is not a Daedalus backup.')
    }

    const normalized = normalizeState(source)
    await saveState(normalized)
    return getCurrentProject()
  }

  async function clearProject() {
    const state = await loadState()
    return deleteProject(state.currentProjectId)
  }

  window.DaedalusProjectStore = {
    createDefaultProject,
    loadState,
    saveState,
    getCurrentProject,
    getOrCreateProject,
    listProjects,
    saveProject,
    updateProject,
    updateCharacterField,
    createProject,
    setCurrentProject,
    duplicateProject,
    deleteProject,
    createSnapshot,
    restoreSnapshot,
    getCustomFragments,
    saveCustomFragment,
    deleteCustomFragment,
    getCustomRules,
    saveCustomRule,
    deleteCustomRule,
    getCustomSystemRecipes,
    saveCustomSystemRecipe,
    deleteCustomSystemRecipe,
    getSettings,
    setTheme,
    setGuidanceEnabled,
    setSplashMode,
    setSplashSeen,
    importProject,
    exportCurrentProject,
    exportBackup,
    importBackup,
    clearProject,
    normalizePlanning,
    makeId
  }
})()
