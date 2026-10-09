;(() => {
  'use strict'

  // Planning Station UI

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function sanitizeFilename(value) {
    return (
      String(value || 'Daedalus-Planning')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'Daedalus-Planning'
    )
  }

  function downloadText(filename, content, mime = 'text/plain') {
    const blob = new Blob([content], {type: `${mime};charset=utf-8`})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.documentElement.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result || '')))
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
      reader.readAsText(file)
    })
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  window.DaedalusPlanningStation = {
    mount(options) {
      const {
        root,
        store,
        getProject,
        markDirty,
        toast,
        isActive
      } = options || {}

      const planningCore = window.DaedalusPlanning
      const storycraftUi = window.DaedalusStorycraftStudio
      const mount = root?.querySelector('#daedalus-planning-mount')

      if (!root || !store || !planningCore || !storycraftUi || !mount) {
        throw new Error('Planning Station could not initialize.')
      }

      const {ENTITY_TYPES, TYPE_ORDER, TEMPLATE_DEFINITIONS} = planningCore

      let selectedEntityId = null
      let connectFromId = null
      let activeMode = 'canvas'
      let spotlight = true
      let searchTerm = ''
      let typeFilter = 'all'
      let showHidden = false
      let dragState = null
      let panState = null
      let frameDragState = null
      let frameResizeState = null
      let saveViewTimer = null
      let imageRenderTimer = null
      let paletteOpen = false
      let wireDragState = null
      let contextMenuOpen = false
      let pendingCreatePoint = null
      let minimapBounds = null
      let historyStack = []
      let historyIndex = -1
      let historyLock = false
      let historyProjectId = null
      let storycraft = null
      let selectedEntityIds = new Set()
      let selectionClipboard = null
      let marqueeState = null

      mount.innerHTML = `
        <div class="daedalus-plan-shell">
          <header class="daedalus-plan-header">
            <div class="daedalus-plan-title-block">
              <div class="daedalus-eyebrow">PLANNING STATION</div>
              <div class="daedalus-plan-title-row">
                <h1>The Labyrinth</h1>
                <span id="daedalus-plan-count" class="daedalus-plan-count">0 entities</span>
              </div>
              <p>Build the world behind the character. Planning stays local to Daedalus and is never applied to Clank.</p>
            </div>

            <div class="daedalus-plan-header-actions">
              <div class="daedalus-plan-mode-switch" role="tablist" aria-label="Planning view">
                <button class="is-active" data-plan-mode="canvas" type="button">Canvas</button>
                <button data-plan-mode="library" type="button">Library</button>
                <button data-plan-mode="timeline" type="button">Timeline</button>
                <button data-plan-mode="plot" type="button">Plot Board</button>
                <button data-plan-mode="relationships" type="button">Relationships</button>
                <button data-plan-mode="document" type="button">Document</button>
              </div>
              <button id="daedalus-plan-template" class="daedalus-secondary-button daedalus-compact-button" type="button">Start Template</button>
              <button id="daedalus-plan-export" class="daedalus-secondary-button daedalus-compact-button" type="button">Export</button>
              <button id="daedalus-plan-import" class="daedalus-secondary-button daedalus-compact-button" type="button">Import</button>
              <button id="daedalus-plan-world-bible" class="daedalus-secondary-button daedalus-compact-button" type="button">Planning Document</button>
              <input id="daedalus-plan-import-file" type="file" accept="application/json,.json" hidden>
            </div>
          </header>

          <div class="daedalus-plan-toolbar">
            <label class="daedalus-plan-search">
              <span>⌕</span>
              <input id="daedalus-plan-search-input" type="search" placeholder="Search the world..." autocomplete="off">
              <kbd>Ctrl K</kbd>
            </label>

            <select id="daedalus-plan-type-filter" class="daedalus-plan-select" aria-label="Filter planning entity type">
              <option value="all">All entity types</option>
              ${TYPE_ORDER.map(type => `<option value="${type}">${escapeHtml(ENTITY_TYPES[type].label)}</option>`).join('')}
            </select>

            <button id="daedalus-plan-add" class="daedalus-primary-button daedalus-compact-button" type="button">＋ Add</button>
            <button id="daedalus-plan-add-frame" class="daedalus-secondary-button daedalus-compact-button" type="button">Frame</button>
            <button id="daedalus-plan-undo" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Undo the last Planning change">Undo</button>
            <button id="daedalus-plan-redo" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Redo the last Planning change">Redo</button>
            <button id="daedalus-plan-arrange" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Auto-arrange visible nodes into a clean grid">Arrange</button>
            <button id="daedalus-plan-selection" class="daedalus-secondary-button daedalus-compact-button daedalus-hidden" type="button" title="Selection actions">0 selected</button>
            <button id="daedalus-plan-snap" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Snap nodes to the Planning grid">Snap</button>
            <button id="daedalus-plan-spotlight" class="daedalus-secondary-button daedalus-compact-button is-active" type="button" title="Dim unrelated nodes when one entity is selected">Spotlight</button>
            <button id="daedalus-plan-hidden" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Temporarily reveal entities hidden from Planning views">Hidden</button>
            <button id="daedalus-plan-command" class="daedalus-secondary-button daedalus-compact-button" type="button">Command</button>
            <button id="daedalus-plan-help" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Canvas controls and shortcuts">? Help</button>
          </div>

          <div class="daedalus-plan-workspace">
            <section id="daedalus-plan-canvas-panel" class="daedalus-plan-panel">
              <div id="daedalus-plan-viewport" class="daedalus-plan-viewport" tabindex="0">
                <div id="daedalus-plan-world" class="daedalus-plan-world">
                  <svg id="daedalus-plan-connections" class="daedalus-plan-connections" aria-hidden="true">
                    <defs>
                      <marker id="daedalus-plan-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L8,4 L0,8 z"></path>
                      </marker>
                    </defs>
                    <g id="daedalus-plan-connection-layer"></g>
                    <path id="daedalus-plan-preview-wire" class="daedalus-plan-preview-wire daedalus-hidden"></path>
                  </svg>
                  <div id="daedalus-plan-frame-layer" class="daedalus-plan-frame-layer"></div>
                  <div id="daedalus-plan-node-layer" class="daedalus-plan-node-layer"></div>
                </div>

                <div id="daedalus-plan-empty" class="daedalus-plan-empty">
                  <div class="daedalus-plan-empty-orbit" aria-hidden="true"></div>
                  <div class="daedalus-plan-empty-card">
                    <div class="daedalus-eyebrow">EMPTY LABYRINTH</div>
                    <h2>Build your world.</h2>
                    <p>Start with one idea and let the connections grow around it.</p>
                    <div class="daedalus-plan-empty-actions">
                      <button data-plan-quick-type="character" type="button">◇ Character</button>
                      <button data-plan-quick-type="location" type="button">⌖ Location</button>
                      <button data-plan-quick-type="faction" type="button">⬡ Faction</button>
                      <button data-plan-quick-type="power" type="button">✦ Power</button>
                      <button data-plan-quick-type="plot" type="button">⌁ Plot Thread</button>
                      <button id="daedalus-plan-empty-template" type="button">Start from Template</button>
                    </div>
                  </div>
                </div>

                <div id="daedalus-plan-marquee" class="daedalus-plan-marquee daedalus-hidden" aria-hidden="true"></div>

                <div class="daedalus-plan-canvas-controls">
                  <button id="daedalus-plan-zoom-out" type="button" title="Zoom out">−</button>
                  <span id="daedalus-plan-zoom-label">100%</span>
                  <button id="daedalus-plan-zoom-in" type="button" title="Zoom in">＋</button>
                  <button id="daedalus-plan-fit" type="button" title="Fit world to view">Fit</button>
                </div>

                <div id="daedalus-plan-connect-banner" class="daedalus-plan-connect-banner daedalus-hidden">
                  <span>Connection mode — choose a target node.</span>
                  <button id="daedalus-plan-cancel-connect" type="button">Cancel</button>
                </div>

                <div id="daedalus-plan-minimap" class="daedalus-plan-minimap" aria-label="Planning minimap">
                  <div class="daedalus-plan-minimap-label">LABYRINTH</div>
                  <div id="daedalus-plan-minimap-content" class="daedalus-plan-minimap-content"></div>
                </div>
              </div>
            </section>

            <section id="daedalus-plan-library-panel" class="daedalus-plan-panel daedalus-hidden">
              <div class="daedalus-plan-library-head">
                <div>
                  <div class="daedalus-card-label">WORLD LIBRARY</div>
                  <h2>Every piece of the project, in one place.</h2>
                </div>
                <button id="daedalus-plan-library-add" class="daedalus-primary-button" type="button">＋ New Entity</button>
              </div>
              <div id="daedalus-plan-library" class="daedalus-plan-library"></div>
            </section>

            <section id="daedalus-plan-timeline-panel" class="daedalus-plan-panel daedalus-story-panel daedalus-hidden"></section>
            <section id="daedalus-plan-plot-panel" class="daedalus-plan-panel daedalus-story-panel daedalus-hidden"></section>
            <section id="daedalus-plan-relationships-panel" class="daedalus-plan-panel daedalus-story-panel daedalus-hidden"></section>
            <section id="daedalus-plan-document-panel" class="daedalus-plan-panel daedalus-story-panel daedalus-hidden"></section>

            <aside id="daedalus-plan-dossier" class="daedalus-plan-dossier daedalus-hidden" aria-label="Planning entity dossier"></aside>
          </div>
        </div>

        <div id="daedalus-plan-modal" class="daedalus-plan-modal-backdrop daedalus-hidden" role="dialog" aria-modal="true">
          <div class="daedalus-plan-modal" id="daedalus-plan-modal-card"></div>
        </div>

        <div id="daedalus-plan-palette" class="daedalus-plan-palette-backdrop daedalus-hidden" role="dialog" aria-modal="true" aria-label="Planning command palette">
          <div class="daedalus-plan-palette">
            <div class="daedalus-plan-palette-search">
              <span>⌕</span>
              <input id="daedalus-plan-palette-input" type="text" placeholder="Type a command or find an entity..." autocomplete="off">
              <kbd>Esc</kbd>
            </div>
            <div id="daedalus-plan-palette-results" class="daedalus-plan-palette-results"></div>
          </div>
        </div>

        <div id="daedalus-plan-context-menu" class="daedalus-plan-context-menu daedalus-hidden" role="menu"></div>
      `

      const viewport = mount.querySelector('#daedalus-plan-viewport')
      const world = mount.querySelector('#daedalus-plan-world')
      const nodeLayer = mount.querySelector('#daedalus-plan-node-layer')
      const frameLayer = mount.querySelector('#daedalus-plan-frame-layer')
      const connectionLayer = mount.querySelector('#daedalus-plan-connection-layer')
      const dossier = mount.querySelector('#daedalus-plan-dossier')
      const emptyState = mount.querySelector('#daedalus-plan-empty')
      const library = mount.querySelector('#daedalus-plan-library')
      const canvasPanel = mount.querySelector('#daedalus-plan-canvas-panel')
      const libraryPanel = mount.querySelector('#daedalus-plan-library-panel')
      const timelinePanel = mount.querySelector('#daedalus-plan-timeline-panel')
      const plotPanel = mount.querySelector('#daedalus-plan-plot-panel')
      const relationshipsPanel = mount.querySelector('#daedalus-plan-relationships-panel')
      const documentPanel = mount.querySelector('#daedalus-plan-document-panel')
      const marquee = mount.querySelector('#daedalus-plan-marquee')
      const modalBackdrop = mount.querySelector('#daedalus-plan-modal')
      const modalCard = mount.querySelector('#daedalus-plan-modal-card')
      const paletteBackdrop = mount.querySelector('#daedalus-plan-palette')
      const paletteInput = mount.querySelector('#daedalus-plan-palette-input')
      const paletteResults = mount.querySelector('#daedalus-plan-palette-results')
      const zoomLabel = mount.querySelector('#daedalus-plan-zoom-label')
      const connectBanner = mount.querySelector('#daedalus-plan-connect-banner')
      const previewWire = mount.querySelector('#daedalus-plan-preview-wire')
      const contextMenu = mount.querySelector('#daedalus-plan-context-menu')
      const snapButton = mount.querySelector('#daedalus-plan-snap')

      function project() {
        return getProject()
      }

      function planning() {
        const current = project()
        if (!current.planning) {
          current.planning = store.normalizePlanning(null)
        }
        return current.planning
      }

      function planningSnapshotString() {
        return JSON.stringify(planningCore.clone(planning()))
      }

      function syncHistoryButtons() {
        const undoButton = mount.querySelector('#daedalus-plan-undo')
        const redoButton = mount.querySelector('#daedalus-plan-redo')
        const canUndo = historyIndex > 0
        const canRedo = historyIndex >= 0 && historyIndex < historyStack.length - 1
        if (undoButton) undoButton.disabled = !canUndo
        if (redoButton) redoButton.disabled = !canRedo
      }

      function pushHistory(force = false) {
        if (historyLock) return
        const projectId = project()?.id || null
        if (historyProjectId !== projectId) {
          historyProjectId = projectId
          historyStack = []
          historyIndex = -1
          force = true
        }
        const snapshot = planningSnapshotString()
        if (!force && historyStack[historyIndex] === snapshot) {
          syncHistoryButtons()
          return
        }
        if (historyIndex < historyStack.length - 1) {
          historyStack = historyStack.slice(0, historyIndex + 1)
        }
        historyStack.push(snapshot)
        if (historyStack.length > 100) {
          historyStack.shift()
        }
        historyIndex = historyStack.length - 1
        syncHistoryButtons()
      }

      function restoreHistory(index) {
        if (index < 0 || index >= historyStack.length) return false
        try {
          historyLock = true
          project().planning = store.normalizePlanning(JSON.parse(historyStack[index]))
          historyIndex = index
          selectedEntityId = entityById(selectedEntityId) ? selectedEntityId : null
          connectFromId = entityById(connectFromId) ? connectFromId : null
          wireDragState = null
          previewWire.classList.add('daedalus-hidden')
          viewport.classList.remove('is-wiring')
          closeContextMenu()
          renderAll()
          markDirty()
          syncHistoryButtons()
          return true
        } catch (error) {
          console.warn('Daedalus Planning history restore failed.', error)
          return false
        } finally {
          historyLock = false
        }
      }

      function undoPlanning() {
        if (restoreHistory(historyIndex - 1)) {
          toast?.('Planning change undone.', 'info')
        }
      }

      function redoPlanning() {
        if (restoreHistory(historyIndex + 1)) {
          toast?.('Planning change restored.', 'info')
        }
      }

      function markPlanningDirty() {
        pushHistory()
        markDirty()
      }

      function markViewDirty() {
        clearTimeout(saveViewTimer)
        saveViewTimer = setTimeout(markPlanningDirty, 220)
      }

      function entityById(id) {
        return planning().entities.find(entity => entity.id === id) || null
      }

      function connectionCount(entityId) {
        return planning().connections.filter(
          connection =>
            connection.sourceId === entityId || connection.targetId === entityId
        ).length
      }

      function directNeighborIds(entityId) {
        const ids = new Set([entityId])
        for (const connection of planning().connections) {
          if (connection.sourceId === entityId) ids.add(connection.targetId)
          if (connection.targetId === entityId) ids.add(connection.sourceId)
        }
        return ids
      }

      function matchesFilters(entity) {
        if (entity.hidden && !showHidden) return false
        if (typeFilter !== 'all' && entity.type !== typeFilter) return false
        if (!searchTerm) return true

        const haystack = [
          entity.name,
          entity.subtitle,
          entity.status,
          entity.description,
          entity.notes,
          ...(entity.tags || []),
          ...Object.values(entity.fields || {}),
          ...(entity.customFields || []).flatMap(field => [field.label, field.value])
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(searchTerm)
      }

      function visibleEntities() {
        return planning().entities.filter(matchesFilters)
      }

      function collapsedFrameMemberIds() {
        const ids = new Set()
        planning().frames.forEach(frame => {
          if (!frame.collapsed) return
          ;(frame.memberIds || []).forEach(id => ids.add(id))
        })
        return ids
      }

      function worldPointFromClient(clientX, clientY) {
        const rect = viewport.getBoundingClientRect()
        const view = planning().view
        return {
          x: (clientX - rect.left - view.panX) / view.zoom,
          y: (clientY - rect.top - view.panY) / view.zoom
        }
      }

      function viewportCenterWorld() {
        const rect = viewport.getBoundingClientRect()
        if (!rect.width || !rect.height) {
          const entities = planning().entities
          if (entities.length) {
            const maxX = Math.max(...entities.map(entity => entity.x + 220))
            const minY = Math.min(...entities.map(entity => entity.y), 100)
            return {x: maxX + 180, y: minY + 120}
          }
          return {x: 420, y: 280}
        }
        return worldPointFromClient(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
      }

      function snapValue(value) {
        const view = planning().view
        if (view.snapToGrid === false) return value
        const size = Math.max(10, Number(view.gridSize) || 20)
        return Math.round(value / size) * size
      }

      function nodeAnchor(entity, side = 'right') {
        return {
          x: side === 'left' ? entity.x : entity.x + 220,
          y: entity.y + 58
        }
      }

      function nearestConnectionSides(source, target) {
        const sourceCenter = nodeCenter(source)
        const targetCenter = nodeCenter(target)
        return sourceCenter.x <= targetCenter.x
          ? {sourceSide: 'right', targetSide: 'left'}
          : {sourceSide: 'left', targetSide: 'right'}
      }

      function wirePathBetweenPoints(a, b, offset = 0) {
        const dx = b.x - a.x
        const direction = dx >= 0 ? 1 : -1
        const curve = Math.max(70, Math.min(240, Math.abs(dx) * 0.48 + 60))
        const c1x = a.x + curve * direction
        const c2x = b.x - curve * direction
        return `M ${a.x} ${a.y} C ${c1x} ${a.y + offset}, ${c2x} ${b.y + offset}, ${b.x} ${b.y}`
      }

      function syncSnapButton() {
        const enabled = planning().view.snapToGrid !== false
        snapButton?.classList.toggle('is-active', enabled)
        snapButton?.setAttribute('aria-pressed', String(enabled))
        if (snapButton) snapButton.textContent = enabled ? 'Snap ✓' : 'Snap'
      }

      function applyViewTransform() {
        const view = planning().view
        world.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`
        zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`

        const gridSize = Math.max(10, Number(view.gridSize) || 20) * view.zoom
        viewport.style.setProperty('--plan-grid-size', `${gridSize}px`)
        viewport.style.setProperty('--plan-grid-x', `${view.panX % gridSize}px`)
        viewport.style.setProperty('--plan-grid-y', `${view.panY % gridSize}px`)

        renderMinimap()
      }

      function nodeCenter(entity) {
        return {
          x: entity.x + 110,
          y: entity.y + 58
        }
      }

      function connectionPath(source, target, offset = 0) {
        const sides = nearestConnectionSides(source, target)
        const a = nodeAnchor(source, sides.sourceSide)
        const b = nodeAnchor(target, sides.targetSide)
        return wirePathBetweenPoints(a, b, offset)
      }

      function connectionLabelPoint(source, target, offset = 0) {
        const a = nodeCenter(source)
        const b = nodeCenter(target)
        return {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2 - 9 + offset * 0.72
        }
      }

      function renderConnections() {
        const collapsedIds = collapsedFrameMemberIds()
        const visibleIds = new Set(visibleEntities().filter(entity => !collapsedIds.has(entity.id)).map(entity => entity.id))
        const selectedNeighbors = selectedEntityId
          ? directNeighborIds(selectedEntityId)
          : null

        connectionLayer.innerHTML = planning().connections
          .filter(
            connection =>
              visibleIds.has(connection.sourceId) &&
              visibleIds.has(connection.targetId)
          )
          .map(connection => {
            const source = entityById(connection.sourceId)
            const target = entityById(connection.targetId)
            if (!source || !target) return ''

            const pairKey = [connection.sourceId, connection.targetId].sort().join('::')
            const siblings = planning().connections.filter(item =>
              [item.sourceId, item.targetId].sort().join('::') === pairKey
            )
            const siblingIndex = siblings.findIndex(item => item.id === connection.id)
            const parallelOffset = siblings.length > 1
              ? (siblingIndex - (siblings.length - 1) / 2) * 28
              : 0
            const label = connectionLabelPoint(source, target, parallelOffset)
            const path = connectionPath(source, target, parallelOffset)
            const hasSelection = selectedEntityIds.size > 0 || Boolean(selectedEntityId)
            const isRelated =
              !hasSelection ||
              selectedEntityIds.has(connection.sourceId) ||
              selectedEntityIds.has(connection.targetId) ||
              connection.sourceId === selectedEntityId ||
              connection.targetId === selectedEntityId
            const dim = spotlight && hasSelection && !isRelated
            const category = connection.category || 'relationship'
            const style = connection.style || 'solid'

            return `
              <g class="daedalus-plan-connection daedalus-plan-connection-category-${escapeHtml(category)} daedalus-plan-connection-style-${escapeHtml(style)} ${dim ? 'is-dimmed' : ''}" data-connection-id="${escapeHtml(connection.id)}">
                <title>${escapeHtml(source.name)} ${connection.directed === false ? '↔' : '→'} ${escapeHtml(connection.label || 'connected to')} ${connection.directed === false ? '↔' : '→'} ${escapeHtml(target.name)} · ${escapeHtml(category)}</title>
                <path class="daedalus-plan-connection-hit" d="${path}" data-connection-id="${escapeHtml(connection.id)}"></path>
                <path class="daedalus-plan-connection-line ${isRelated && hasSelection ? 'is-highlighted' : ''}" d="${path}" ${connection.directed ? 'marker-end="url(#daedalus-plan-arrow)"' : ''}></path>
                <g class="daedalus-plan-connection-label" transform="translate(${label.x} ${label.y})" data-connection-id="${escapeHtml(connection.id)}">
                  <rect x="-55" y="-13" width="110" height="25" rx="12"></rect>
                  <text text-anchor="middle" dominant-baseline="middle" data-connection-id="${escapeHtml(connection.id)}">${escapeHtml(connection.label || 'connected to')}</text>
                </g>
              </g>
            `
          })
          .join('')
      }

      function renderNodes() {
        const neighbors = selectedEntityId ? directNeighborIds(selectedEntityId) : null
        const collapsedIds = collapsedFrameMemberIds()

        nodeLayer.innerHTML = planning().entities
          .map(entity => {
            const meta = ENTITY_TYPES[entity.type] || ENTITY_TYPES.custom
            const filteredOut = !matchesFilters(entity) || collapsedIds.has(entity.id)
            const dimmed =
              spotlight &&
              selectedEntityId &&
              neighbors &&
              !neighbors.has(entity.id)
            const tags = (entity.tags || []).slice(0, 3)
            const isSelected = selectedEntityIds.has(entity.id) || entity.id === selectedEntityId
            const isConnectSource = entity.id === connectFromId

            return `
              <article
                class="daedalus-plan-node daedalus-plan-type-${escapeHtml(entity.type)} ${isSelected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''} ${filteredOut ? 'is-filtered' : ''} ${isConnectSource ? 'is-connect-source' : ''} ${entity.favorite ? 'is-favorite' : ''} ${entity.locked ? 'is-locked' : ''} ${entity.hidden ? 'is-hidden-entity' : ''}"
                data-plan-entity-id="${escapeHtml(entity.id)}"
                style="transform:translate(${entity.x}px, ${entity.y}px)"
              >
                <div class="daedalus-plan-node-accent"></div>
                <button class="daedalus-plan-node-port is-input" data-plan-port="input" data-plan-entity-id="${escapeHtml(entity.id)}" type="button" title="Connection input"></button>
                <button class="daedalus-plan-node-port is-output" data-plan-port="output" data-plan-entity-id="${escapeHtml(entity.id)}" type="button" title="Drag to connect"></button>
                <header class="daedalus-plan-node-header" data-plan-drag-handle="entity">
                  <span class="daedalus-plan-node-icon">${escapeHtml(meta.icon)}</span>
                  <span class="daedalus-plan-node-type">${escapeHtml(meta.label)}</span>
                  <span class="daedalus-plan-node-status-dot ${entity.status ? 'has-status' : ''}" title="${escapeHtml(entity.status || 'No status')}"></span>
                </header>
                <div class="daedalus-plan-node-body ${entity.imageUrl ? 'has-image is-image-loading' : ''}">
                  ${entity.imageUrl ? `<span class="daedalus-plan-node-image-shell"><img class="daedalus-plan-node-image" src="${escapeHtml(entity.imageUrl)}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer"></span>` : ''}
                  <div class="daedalus-plan-node-copy">
                    <h3>${escapeHtml(entity.name || 'Untitled')}</h3>
                    ${entity.subtitle ? `<p>${escapeHtml(entity.subtitle)}</p>` : `<p class="is-placeholder">Add a subtitle or role...</p>`}
                    ${tags.length ? `<div class="daedalus-plan-node-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                  </div>
                </div>
                <footer class="daedalus-plan-node-footer">
                  <span>${entity.favorite ? '★ · ' : ''}${entity.locked ? '🔒 · ' : ''}${connectionCount(entity.id)} connection${connectionCount(entity.id) === 1 ? '' : 's'}</span>
                  <button data-plan-node-action="connect" data-plan-entity-id="${escapeHtml(entity.id)}" type="button" title="Connect this entity">⌁</button>
                </footer>
              </article>
            `
          })
          .join('')

        nodeLayer.querySelectorAll('.daedalus-plan-node-image').forEach(image => {
          const body = image.closest('.daedalus-plan-node-body')

          const markLoaded = () => {
            body?.classList.remove('is-image-loading', 'is-image-error')
            body?.classList.add('is-image-loaded')
          }

          const markError = () => {
            body?.classList.remove('is-image-loading', 'is-image-loaded')
            body?.classList.add('is-image-error')
          }

          if (image.complete) {
            if (image.naturalWidth > 0) markLoaded()
            else markError()
          } else {
            image.addEventListener('load', markLoaded, {once: true})
            image.addEventListener('error', markError, {once: true})
          }
        })
      }


      function refreshNodeVisualStates() {
        const neighbors = selectedEntityId ? directNeighborIds(selectedEntityId) : null

        nodeLayer.querySelectorAll('.daedalus-plan-node').forEach(node => {
          const entity = entityById(node.dataset.planEntityId)
          if (!entity) return

          const isSelected = selectedEntityIds.has(entity.id) || entity.id === selectedEntityId
          const dimmed =
            spotlight &&
            selectedEntityId &&
            neighbors &&
            !neighbors.has(entity.id)

          node.classList.toggle('is-selected', isSelected)
          node.classList.toggle('is-dimmed', Boolean(dimmed))
          node.classList.toggle('is-filtered', !matchesFilters(entity))
          node.classList.toggle('is-connect-source', entity.id === connectFromId)
        })
      }

      function patchNodePosition(entity) {
        const node = nodeLayer.querySelector(
          `.daedalus-plan-node[data-plan-entity-id="${CSS.escape(entity.id)}"]`
        )
        if (node) node.style.transform = `translate(${entity.x}px, ${entity.y}px)`
      }

      function patchNodeContent(entity) {
        const node = nodeLayer.querySelector(
          `.daedalus-plan-node[data-plan-entity-id="${CSS.escape(entity.id)}"]`
        )
        if (!node) return

        const title = node.querySelector('.daedalus-plan-node-copy h3')
        if (title) title.textContent = entity.name || 'Untitled'

        const subtitle = node.querySelector('.daedalus-plan-node-copy p')
        if (subtitle) {
          subtitle.textContent = entity.subtitle || 'Add a subtitle or role...'
          subtitle.classList.toggle('is-placeholder', !entity.subtitle)
        }

        const status = node.querySelector('.daedalus-plan-node-status-dot')
        if (status) {
          status.classList.toggle('has-status', Boolean(entity.status))
          status.title = entity.status || 'No status'
        }

        const copy = node.querySelector('.daedalus-plan-node-copy')
        const existingTags = node.querySelector('.daedalus-plan-node-tags')
        const tags = (entity.tags || []).slice(0, 3)
        if (existingTags) existingTags.remove()
        if (copy && tags.length) {
          const tagsElement = document.createElement('div')
          tagsElement.className = 'daedalus-plan-node-tags'
          tagsElement.innerHTML = tags
            .map(tag => `<span>${escapeHtml(tag)}</span>`)
            .join('')
          copy.appendChild(tagsElement)
        }
      }

      function renderFrames() {
        frameLayer.innerHTML = planning().frames
          .map(frame => {
            const height = frame.collapsed ? 52 : frame.height
            return `
              <section
                class="daedalus-plan-frame ${frame.collapsed ? 'is-collapsed' : ''} ${frame.locked ? 'is-locked' : ''} daedalus-plan-frame-color-${escapeHtml(frame.color || 'neutral')}"
                data-plan-frame-id="${escapeHtml(frame.id)}"
                style="transform:translate(${frame.x}px, ${frame.y}px); width:${frame.width}px; height:${height}px"
              >
                <header class="daedalus-plan-frame-header" data-plan-drag-handle="frame">
                  <span class="daedalus-plan-frame-mark">FRAME</span>
                  <strong>${escapeHtml(frame.name)}</strong>
                  <div class="daedalus-plan-frame-actions">
                    <button data-plan-frame-action="select" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">Select</button>
                    <button data-plan-frame-action="rename" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">Rename</button>
                    <button data-plan-frame-action="lock" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">${frame.locked ? 'Unlock' : 'Lock'}</button>
                    <button data-plan-frame-action="color" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">Color</button>
                    <button data-plan-frame-action="duplicate" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">Duplicate</button>
                    <button data-plan-frame-action="collapse" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">${frame.collapsed ? 'Expand' : 'Collapse'}</button>
                    <button data-plan-frame-action="delete" data-plan-frame-id="${escapeHtml(frame.id)}" type="button">×</button>
                  </div>
                </header>
                ${frame.collapsed || frame.locked ? '' : '<div class="daedalus-plan-frame-resize" data-plan-frame-resize="true"></div>'}
              </section>
            `
          })
          .join('')
      }

      function renderLibrary() {
        const items = visibleEntities().slice().sort((a, b) => {
          if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1
          const timeDiff = Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)
          if (Number.isFinite(timeDiff) && timeDiff !== 0) return timeDiff
          return String(a.name || '').localeCompare(String(b.name || ''))
        })
        if (!items.length) {
          library.innerHTML = `
            <div class="daedalus-plan-library-empty">
              <span>∅</span>
              <h3>No matching entities.</h3>
              <p>Try another search or create something new.</p>
            </div>
          `
          return
        }

        library.innerHTML = items
          .map(entity => {
            const meta = ENTITY_TYPES[entity.type] || ENTITY_TYPES.custom
            return `
              <button class="daedalus-plan-library-card daedalus-plan-type-${escapeHtml(entity.type)}" data-plan-library-entity="${escapeHtml(entity.id)}" type="button">
                <span class="daedalus-plan-library-icon">${escapeHtml(meta.icon)}</span>
                <span class="daedalus-plan-library-copy">
                  <small>${escapeHtml(meta.label)}${entity.status ? ` · ${escapeHtml(entity.status)}` : ''}</small>
                  <strong>${escapeHtml(entity.name || 'Untitled')}</strong>
                  <span>${escapeHtml(entity.description || entity.subtitle || 'No description yet.')}</span>
                </span>
                <span class="daedalus-plan-library-meta">${entity.favorite ? '★ ' : ''}${connectionCount(entity.id)}⌁</span>
              </button>
            `
          })
          .join('')
      }

      function renderDossier() {
        const entity = entityById(selectedEntityId)
        if (!entity) {
          dossier.classList.add('daedalus-hidden')
          dossier.innerHTML = ''
          return
        }

        const meta = ENTITY_TYPES[entity.type] || ENTITY_TYPES.custom
        const connections = planning().connections.filter(
          connection =>
            connection.sourceId === entity.id || connection.targetId === entity.id
        )

        dossier.classList.remove('daedalus-hidden')
        dossier.innerHTML = `
          <div class="daedalus-plan-dossier-head">
            <div>
              <span class="daedalus-plan-dossier-type">${escapeHtml(meta.icon)} ${escapeHtml(meta.label)}</span>
              <h2>${escapeHtml(entity.name || 'Untitled')}</h2>
            </div>
            <button data-plan-dossier-close type="button" aria-label="Close dossier">×</button>
          </div>

          <div class="daedalus-plan-dossier-utility">
            <button class="${entity.favorite ? 'is-active' : ''}" data-plan-entity-toggle="favorite" type="button">${entity.favorite ? '★ Favorite' : '☆ Favorite'}</button>
            <button class="${entity.locked ? 'is-active' : ''}" data-plan-entity-toggle="locked" type="button">${entity.locked ? '🔒 Locked' : 'Lock position'}</button>
            <button class="${entity.hidden ? 'is-active' : ''}" data-plan-entity-toggle="hidden" type="button">${entity.hidden ? 'Hidden' : 'Hide from views'}</button>
          </div>

          <div class="daedalus-plan-dossier-scroll">
            <label class="daedalus-plan-field">
              <span>Name</span>
              <input data-plan-field="name" type="text" value="${escapeHtml(entity.name)}">
            </label>

            <div class="daedalus-plan-field-grid">
              <label class="daedalus-plan-field">
                <span>Type</span>
                <select data-plan-field="type">
                  ${TYPE_ORDER.map(type => `<option value="${type}" ${type === entity.type ? 'selected' : ''}>${escapeHtml(ENTITY_TYPES[type].label)}</option>`).join('')}
                </select>
              </label>
              <label class="daedalus-plan-field">
                <span>Status</span>
                <input data-plan-field="status" type="text" value="${escapeHtml(entity.status)}" placeholder="Active, hidden, resolved...">
              </label>
            </div>

            <label class="daedalus-plan-field">
              <span>Subtitle / role</span>
              <input data-plan-field="subtitle" type="text" value="${escapeHtml(entity.subtitle)}" placeholder="A quick label visible on the node">
            </label>

            <label class="daedalus-plan-field">
              <span>Planning tags</span>
              <input data-plan-field="tags" type="text" value="${escapeHtml((entity.tags || []).join(', '))}" placeholder="main cast, act one, secret">
            </label>

            <label class="daedalus-plan-field">
              <span>Image URL <small>optional · direct image links work best</small></span>
              <input data-plan-field="imageUrl" type="url" value="${escapeHtml(entity.imageUrl)}" placeholder="https://.../image.png">
            </label>

            ${entity.imageUrl ? `
              <div class="daedalus-plan-image-preview is-loading" data-plan-image-preview>
                <div class="daedalus-plan-image-preview-media">
                  <img src="${escapeHtml(entity.imageUrl)}" alt="Planning image preview for ${escapeHtml(entity.name || 'entity')}" loading="eager" decoding="async" referrerpolicy="no-referrer">
                </div>
                <div class="daedalus-plan-image-preview-copy">
                  <strong>Node image</strong>
                  <span data-plan-image-status>Loading image…</span>
                  <a href="${escapeHtml(entity.imageUrl)}" target="_blank" rel="noopener noreferrer">Open original ↗</a>
                </div>
              </div>
            ` : ''}

            <label class="daedalus-plan-field">
              <span>Short description</span>
              <textarea data-plan-field="description" rows="3" placeholder="What should you remember at a glance?">${escapeHtml(entity.description)}</textarea>
            </label>

            <div class="daedalus-plan-dossier-section">
              <div class="daedalus-plan-dossier-section-head">
                <strong>${escapeHtml(meta.label)} details</strong>
                <span>${meta.fields.length} fields</span>
              </div>
              ${meta.fields
                .map(([key, label, kind]) => `
                  <label class="daedalus-plan-field">
                    <span>${escapeHtml(label)}</span>
                    ${kind === 'textarea'
                      ? `<textarea data-plan-specific-field="${escapeHtml(key)}" rows="3">${escapeHtml(entity.fields?.[key] || '')}</textarea>`
                      : `<input data-plan-specific-field="${escapeHtml(key)}" type="text" value="${escapeHtml(entity.fields?.[key] || '')}">`
                    }
                  </label>
                `)
                .join('')}
            </div>

            <div class="daedalus-plan-dossier-section">
              <div class="daedalus-plan-dossier-section-head">
                <strong>Custom fields</strong>
                <button data-plan-add-custom-field type="button">＋ Add field</button>
              </div>
              <div class="daedalus-plan-custom-fields">
                ${(entity.customFields || []).length ? (entity.customFields || []).map(field => `
                  <div class="daedalus-plan-custom-field" data-plan-custom-field-row="${escapeHtml(field.id)}">
                    <input data-plan-custom-field-label="${escapeHtml(field.id)}" type="text" value="${escapeHtml(field.label)}" placeholder="Field name">
                    <textarea data-plan-custom-field-value="${escapeHtml(field.id)}" rows="2" placeholder="Value...">${escapeHtml(field.value)}</textarea>
                    <button data-plan-remove-custom-field="${escapeHtml(field.id)}" type="button" aria-label="Remove custom field">×</button>
                  </div>
                `).join('') : '<p class="daedalus-plan-muted">Add any project-specific detail that the built-in dossier does not cover.</p>'}
              </div>
            </div>

            <label class="daedalus-plan-field">
              <span>Long notes</span>
              <textarea data-plan-field="notes" rows="7" placeholder="Private planning notes...">${escapeHtml(entity.notes)}</textarea>
            </label>

            <div class="daedalus-plan-dossier-section">
              <div class="daedalus-plan-dossier-section-head">
                <strong>Connections</strong>
                <button data-plan-dossier-connect type="button">＋ Connect</button>
              </div>
              <div class="daedalus-plan-dossier-connections">
                ${connections.length
                  ? connections
                      .map(connection => {
                        const outgoing = connection.sourceId === entity.id
                        const other = entityById(outgoing ? connection.targetId : connection.sourceId)
                        if (!other) return ''
                        const arrow = connection.directed === false ? '↔' : outgoing ? '→' : '←'
                        return `
                          <div class="daedalus-plan-dossier-connection">
                            <span class="daedalus-plan-dossier-connection-arrow">${arrow}</span>
                            <span><strong>${escapeHtml(connection.label || 'connected to')}</strong><small>${escapeHtml(other.name)} · ${escapeHtml(connection.category || 'relationship')}</small></span>
                            <button data-plan-edit-connection="${escapeHtml(connection.id)}" type="button">Edit</button>
                            <button data-plan-delete-connection="${escapeHtml(connection.id)}" type="button">×</button>
                          </div>
                        `
                      })
                      .join('')
                  : '<p class="daedalus-plan-muted">No connections yet.</p>'}
              </div>
            </div>

            <div class="daedalus-plan-dossier-actions">
              <button data-plan-duplicate-entity class="daedalus-secondary-button" type="button">Duplicate</button>
              <button data-plan-delete-entity class="daedalus-danger-button" type="button">Delete Entity</button>
            </div>
          </div>
        `

        wireDossierImagePreview()
      }


      function wireDossierImagePreview() {
        const preview = dossier.querySelector('[data-plan-image-preview]')
        const image = preview?.querySelector('img')
        const status = preview?.querySelector('[data-plan-image-status]')
        if (!preview || !image || !status) return

        const loaded = () => {
          preview.classList.remove('is-loading', 'is-error')
          preview.classList.add('is-loaded')
          status.textContent = `${image.naturalWidth} × ${image.naturalHeight} · loaded`
        }

        const failed = () => {
          preview.classList.remove('is-loading', 'is-loaded')
          preview.classList.add('is-error')
          status.textContent = 'Could not load this image. Check that the URL opens the image directly.'
        }

        if (image.complete) {
          if (image.naturalWidth > 0) loaded()
          else failed()
        } else {
          image.addEventListener('load', loaded, {once: true})
          image.addEventListener('error', failed, {once: true})
        }
      }

      function renderMinimap() {
        const target = mount.querySelector('#daedalus-plan-minimap-content')
        const collapsedIds = collapsedFrameMemberIds()
        const entities = planning().entities.filter(entity => matchesFilters(entity) && !collapsedIds.has(entity.id))
        if (!target) return

        if (!entities.length) {
          minimapBounds = null
          target.innerHTML = '<div class="daedalus-plan-minimap-empty">empty</div>'
          return
        }

        const minX = Math.min(...entities.map(entity => entity.x), 0)
        const minY = Math.min(...entities.map(entity => entity.y), 0)
        const maxX = Math.max(...entities.map(entity => entity.x + 220), 900)
        const maxY = Math.max(...entities.map(entity => entity.y + 116), 600)
        const width = Math.max(600, maxX - minX)
        const height = Math.max(400, maxY - minY)
        minimapBounds = {minX, minY, width, height}

        target.innerHTML = entities
          .map(entity => {
            const left = ((entity.x - minX) / width) * 100
            const top = ((entity.y - minY) / height) * 100
            return `<span class="daedalus-plan-minimap-dot daedalus-plan-type-${escapeHtml(entity.type)} ${entity.id === selectedEntityId ? 'is-selected' : ''}" style="left:${left}%;top:${top}%"></span>`
          })
          .join('')
      }

      function renderCounts() {
        const count = planning().entities.length
        mount.querySelector('#daedalus-plan-count').textContent =
          `${count} ${count === 1 ? 'entity' : 'entities'} · ${planning().connections.length} connections`
      }

      function renderAll() {
        renderCounts()
        renderFrames()
        renderNodes()
        renderConnections()
        renderLibrary()
        renderDossier()
        applyViewTransform()
        emptyState.classList.toggle('daedalus-hidden', planning().entities.length > 0)
        connectBanner.classList.toggle('daedalus-hidden', !connectFromId)
        syncSnapButton()
        syncSelectionButton()
        storycraft?.render()
      }

      function normalizeSelection() {
        selectedEntityIds = new Set(
          [...selectedEntityIds].filter(id => Boolean(entityById(id)))
        )
        if (selectedEntityId && !entityById(selectedEntityId)) selectedEntityId = null
        if (!selectedEntityId && selectedEntityIds.size) selectedEntityId = [...selectedEntityIds][selectedEntityIds.size - 1]
        if (selectedEntityId) selectedEntityIds.add(selectedEntityId)
      }

      function syncSelectionButton() {
        normalizeSelection()
        const button = mount.querySelector('#daedalus-plan-selection')
        if (!button) return
        const count = selectedEntityIds.size
        button.classList.toggle('daedalus-hidden', count < 2)
        button.textContent = `${count} selected`
      }

      function selectEntity(entityId, options = {}) {
        const validId = entityById(entityId) ? entityId : null
        if (!validId) {
          selectedEntityId = null
          selectedEntityIds.clear()
        } else if (options.toggle) {
          if (selectedEntityIds.has(validId)) {
            selectedEntityIds.delete(validId)
            if (selectedEntityId === validId) selectedEntityId = [...selectedEntityIds].at(-1) || null
          } else {
            selectedEntityIds.add(validId)
            selectedEntityId = validId
          }
        } else if (options.add) {
          selectedEntityIds.add(validId)
          selectedEntityId = validId
        } else {
          selectedEntityIds = new Set([validId])
          selectedEntityId = validId
        }
        syncSelectionButton()
        refreshNodeVisualStates()
        renderConnections()
        renderDossier()
        renderMinimap()

        if (options.focus && selectedEntityId) {
          focusEntity(selectedEntityId)
        }
      }

      function focusEntity(entityId) {
        const entity = entityById(entityId)
        if (!entity) return
        const rect = viewport.getBoundingClientRect()
        const view = planning().view
        view.panX = rect.width / 2 - (entity.x + 110) * view.zoom
        view.panY = rect.height / 2 - (entity.y + 58) * view.zoom
        applyViewTransform()
        markViewDirty()
      }

      function fitToContent() {
        const collapsedIds = collapsedFrameMemberIds()
        const entities = visibleEntities().filter(entity => !collapsedIds.has(entity.id))
        const frames = planning().frames
        if (!entities.length && !frames.length) {
          const snapToGrid = planning().view.snapToGrid !== false
          const gridSize = Math.max(10, Number(planning().view.gridSize) || 20)
          planning().view = {panX: 180, panY: 120, zoom: 1, snapToGrid, gridSize}
          applyViewTransform()
          markViewDirty()
          return
        }

        const xs = entities.map(entity => entity.x)
        const ys = entities.map(entity => entity.y)
        const maxXs = entities.map(entity => entity.x + 220)
        const maxYs = entities.map(entity => entity.y + 116)

        for (const frame of frames) {
          xs.push(frame.x)
          ys.push(frame.y)
          maxXs.push(frame.x + frame.width)
          maxYs.push(frame.y + (frame.collapsed ? 52 : frame.height))
        }

        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...maxXs)
        const maxY = Math.max(...maxYs)
        const contentWidth = Math.max(320, maxX - minX)
        const contentHeight = Math.max(220, maxY - minY)
        const rect = viewport.getBoundingClientRect()
        const zoom = clamp(
          Math.min((rect.width - 180) / contentWidth, (rect.height - 150) / contentHeight),
          0.35,
          1.35
        )

        planning().view.zoom = zoom
        planning().view.panX = rect.width / 2 - (minX + contentWidth / 2) * zoom
        planning().view.panY = rect.height / 2 - (minY + contentHeight / 2) * zoom
        applyViewTransform()
        markViewDirty()
      }

      function autoArrangeVisible() {
        const collapsedIds = collapsedFrameMemberIds()
        const items = visibleEntities()
          .filter(entity => !entity.locked && !collapsedIds.has(entity.id))
          .slice()
          .sort((a, b) => {
            const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
            if (typeDiff !== 0) return typeDiff
            return String(a.name || '').localeCompare(String(b.name || ''))
          })

        if (!items.length) {
          toast?.('Nothing is visible to arrange.', 'warning')
          return
        }

        const columns = items.length > 8 ? 4 : 3
        const startX = 100
        const startY = 100
        const stepX = 310
        const stepY = 176

        items.forEach((entity, index) => {
          const column = index % columns
          const row = Math.floor(index / columns)
          entity.x = snapValue(startX + column * stepX)
          entity.y = snapValue(startY + row * stepY)
        })

        markPlanningDirty()
        renderAll()
        requestAnimationFrame(fitToContent)
        toast?.('Visible nodes arranged into a clean grid.', 'success')
      }

      function setZoom(nextZoom, anchorClientX = null, anchorClientY = null) {
        const view = planning().view
        const oldZoom = view.zoom
        const next = clamp(nextZoom, 0.35, 2.2)
        if (Math.abs(next - oldZoom) < 0.001) return

        const rect = viewport.getBoundingClientRect()
        const clientX = anchorClientX ?? rect.left + rect.width / 2
        const clientY = anchorClientY ?? rect.top + rect.height / 2
        const worldX = (clientX - rect.left - view.panX) / oldZoom
        const worldY = (clientY - rect.top - view.panY) / oldZoom

        view.zoom = next
        view.panX = clientX - rect.left - worldX * next
        view.panY = clientY - rect.top - worldY * next
        applyViewTransform()
        markViewDirty()
      }

      function openModal(html, onReady = null) {
        modalCard.innerHTML = html
        modalBackdrop.classList.remove('daedalus-hidden')
        onReady?.(modalCard)
      }

      function closeModal() {
        modalBackdrop.classList.add('daedalus-hidden')
        modalCard.innerHTML = ''
      }

      function openEntityModal(preselectedType = 'character', createPoint = null, createOptions = {}) {
        openModal(
          `
            <div class="daedalus-plan-modal-head">
              <div>
                <div class="daedalus-eyebrow">QUICK CREATE</div>
                <h2>Add to the Labyrinth</h2>
              </div>
              <button data-plan-modal-close type="button">×</button>
            </div>
            <div class="daedalus-plan-type-grid">
              ${TYPE_ORDER.map(type => `
                <button class="daedalus-plan-type-card ${type === preselectedType ? 'is-selected' : ''}" data-plan-create-type="${type}" type="button">
                  <span>${escapeHtml(ENTITY_TYPES[type].icon)}</span>
                  <strong>${escapeHtml(ENTITY_TYPES[type].label)}</strong>
                </button>
              `).join('')}
            </div>
            <label class="daedalus-plan-field">
              <span>Name</span>
              <input id="daedalus-plan-new-name" type="text" placeholder="Name this entity...">
            </label>
            <div class="daedalus-plan-modal-actions">
              <button data-plan-modal-close class="daedalus-secondary-button" type="button">Cancel</button>
              <button id="daedalus-plan-create-confirm" class="daedalus-primary-button" type="button">Create Entity</button>
            </div>
          `,
          card => {
            let selectedType = preselectedType
            const nameInput = card.querySelector('#daedalus-plan-new-name')
            nameInput.focus()

            card.querySelectorAll('[data-plan-create-type]').forEach(button => {
              button.addEventListener('click', () => {
                selectedType = button.dataset.planCreateType
                card.querySelectorAll('[data-plan-create-type]').forEach(item =>
                  item.classList.toggle('is-selected', item === button)
                )
              })
            })

            card.querySelector('#daedalus-plan-create-confirm').addEventListener('click', () => {
              const center = createPoint || pendingCreatePoint || viewportCenterWorld()
              pendingCreatePoint = null
              const meta = ENTITY_TYPES[selectedType]
              const name = nameInput.value.trim() || meta.label
              const entity = planningCore.makeEntity(
                selectedType,
                name,
                snapValue(center.x - 110),
                snapValue(center.y - 58),
                store.makeId
              )
              planning().entities.push(entity)
              selectedEntityId = entity.id
              selectedEntityIds = new Set([entity.id])
              closeModal()
              markPlanningDirty()
              renderAll()
              toast?.(`${meta.label} added to Planning.`, 'success')

              if (
                createOptions.connectFromId &&
                entityById(createOptions.connectFromId) &&
                createOptions.connectFromId !== entity.id
              ) {
                openConnectionModal(createOptions.connectFromId, entity.id)
              }
            })

            card.querySelectorAll('[data-plan-modal-close]').forEach(button =>
              button.addEventListener('click', closeModal)
            )
          }
        )
      }

      function openConnectionModal(sourceId, targetId, existingConnection = null, options = {}) {
        let currentSourceId = sourceId
        let currentTargetId = targetId
        const source = entityById(currentSourceId)
        const target = entityById(currentTargetId)
        if (!source || !target) return

        const categories = window.DaedalusStorycraft?.CONNECTION_CATEGORIES || [
          ['relationship', 'Relationship'],
          ['ownership', 'Ownership'],
          ['membership', 'Membership'],
          ['location', 'Location'],
          ['plot', 'Plot'],
          ['knowledge', 'Knowledge'],
          ['conflict', 'Conflict'],
          ['custom', 'Custom']
        ]

        const endpointSelects = options.allowEndpoints
          ? `
            <div class="daedalus-plan-field-grid">
              <label class="daedalus-plan-field"><span>From</span><select id="daedalus-plan-connection-source">
                ${planning().entities.filter(entity => !entity.hidden).map(entity => `<option value="${escapeHtml(entity.id)}" ${entity.id === currentSourceId ? 'selected' : ''}>${escapeHtml(entity.name)}</option>`).join('')}
              </select></label>
              <label class="daedalus-plan-field"><span>To</span><select id="daedalus-plan-connection-target">
                ${planning().entities.filter(entity => !entity.hidden).map(entity => `<option value="${escapeHtml(entity.id)}" ${entity.id === currentTargetId ? 'selected' : ''}>${escapeHtml(entity.name)}</option>`).join('')}
              </select></label>
            </div>
          `
          : ''

        openModal(
          `
            <div class="daedalus-plan-modal-head">
              <div>
                <div class="daedalus-eyebrow">RELATIONSHIP</div>
                <h2>${existingConnection ? 'Edit connection' : 'Connect entities'}</h2>
                <p>Relationships can carry a category, direction, line style, and private planning notes.</p>
              </div>
              <button data-plan-modal-close type="button">×</button>
            </div>
            ${endpointSelects}
            <div class="daedalus-plan-connection-preview">
              <span data-plan-connection-preview-source>${escapeHtml(source.name)}</span>
              <strong>⌁</strong>
              <span data-plan-connection-preview-target>${escapeHtml(target.name)}</span>
            </div>
            <label class="daedalus-plan-field">
              <span>Relationship label</span>
              <input id="daedalus-plan-connection-label-input" type="text" value="${escapeHtml(existingConnection?.label || '')}" placeholder="trusts, works for, owns, lives in...">
            </label>
            <div class="daedalus-plan-relationship-presets" aria-label="Relationship label suggestions">
              ${['trusts', 'loves', 'rivals', 'fears', 'protects', 'works for', 'member of', 'lives in', 'owns', 'uses', 'created by', 'knows secret about', 'allied with', 'enemy of', 'pursues', 'caused', 'happened at']
                .map(label => `<button data-plan-relationship-preset="${escapeHtml(label)}" type="button">${escapeHtml(label)}</button>`)
                .join('')}
            </div>
            <div class="daedalus-plan-field-grid">
              <label class="daedalus-plan-field">
                <span>Category</span>
                <select id="daedalus-plan-connection-category">
                  ${categories.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === (existingConnection?.category || 'relationship') ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
                </select>
              </label>
              <label class="daedalus-plan-field">
                <span>Line style</span>
                <select id="daedalus-plan-connection-style">
                  ${['solid', 'dashed', 'dotted'].map(style => `<option value="${style}" ${style === (existingConnection?.style || 'solid') ? 'selected' : ''}>${style[0].toUpperCase() + style.slice(1)}</option>`).join('')}
                </select>
              </label>
            </div>
            <label class="daedalus-plan-check-row">
              <input id="daedalus-plan-connection-directed" type="checkbox" ${existingConnection?.directed === false ? '' : 'checked'}>
              <span>Directional relationship <small data-plan-direction-preview>${escapeHtml(source.name)} → ${escapeHtml(target.name)}</small></span>
            </label>
            <label class="daedalus-plan-field">
              <span>Private relationship notes <small>optional</small></span>
              <textarea id="daedalus-plan-connection-notes" rows="3" placeholder="Why does this relationship matter?">${escapeHtml(existingConnection?.notes || '')}</textarea>
            </label>
            <div class="daedalus-plan-modal-actions">
              ${existingConnection ? '<button id="daedalus-plan-connection-delete" class="daedalus-danger-button" type="button">Delete Connection</button>' : ''}
              <button data-plan-modal-close class="daedalus-secondary-button" type="button">Cancel</button>
              <button id="daedalus-plan-connection-save" class="daedalus-primary-button" type="button">${existingConnection ? 'Save Connection' : 'Create Connection'}</button>
            </div>
          `,
          card => {
            const input = card.querySelector('#daedalus-plan-connection-label-input')
            const sourceSelect = card.querySelector('#daedalus-plan-connection-source')
            const targetSelect = card.querySelector('#daedalus-plan-connection-target')
            const previewSource = card.querySelector('[data-plan-connection-preview-source]')
            const previewTarget = card.querySelector('[data-plan-connection-preview-target]')
            const directionPreview = card.querySelector('[data-plan-direction-preview]')

            const syncEndpoints = () => {
              if (sourceSelect) currentSourceId = sourceSelect.value
              if (targetSelect) currentTargetId = targetSelect.value
              const currentSource = entityById(currentSourceId)
              const currentTarget = entityById(currentTargetId)
              if (previewSource) previewSource.textContent = currentSource?.name || 'Unknown'
              if (previewTarget) previewTarget.textContent = currentTarget?.name || 'Unknown'
              if (directionPreview) directionPreview.textContent = `${currentSource?.name || 'Unknown'} → ${currentTarget?.name || 'Unknown'}`
            }

            sourceSelect?.addEventListener('change', syncEndpoints)
            targetSelect?.addEventListener('change', syncEndpoints)
            input.focus()
            card.querySelectorAll('[data-plan-relationship-preset]').forEach(button => {
              button.addEventListener('click', () => {
                input.value = button.dataset.planRelationshipPreset || ''
                input.focus()
                input.select()
              })
            })
            card.querySelector('#daedalus-plan-connection-save').addEventListener('click', () => {
              syncEndpoints()
              if (currentSourceId === currentTargetId) {
                toast?.('A relationship needs two different entities.', 'warning')
                return
              }
              const label = input.value.trim() || 'connected to'
              const directed = card.querySelector('#daedalus-plan-connection-directed').checked
              const category = card.querySelector('#daedalus-plan-connection-category').value
              const style = card.querySelector('#daedalus-plan-connection-style').value
              const notes = card.querySelector('#daedalus-plan-connection-notes').value

              if (existingConnection) {
                existingConnection.sourceId = currentSourceId
                existingConnection.targetId = currentTargetId
                existingConnection.label = label
                existingConnection.directed = directed
                existingConnection.category = category
                existingConnection.style = style
                existingConnection.notes = notes
              } else {
                planning().connections.push({
                  id: store.makeId('connection'),
                  sourceId: currentSourceId,
                  targetId: currentTargetId,
                  label,
                  directed,
                  category,
                  style,
                  notes
                })
              }

              connectFromId = null
              closeModal()
              markPlanningDirty()
              refreshNodeVisualStates()
              renderConnections()
              renderDossier()
              renderCounts()
              storycraft?.render()
              connectBanner.classList.add('daedalus-hidden')
            })

            card.querySelector('#daedalus-plan-connection-delete')?.addEventListener('click', () => {
              if (!confirm('Delete this relationship?')) return
              planning().connections = planning().connections.filter(item => item.id !== existingConnection.id)
              closeModal()
              markPlanningDirty()
              renderConnections()
              renderDossier()
              renderCounts()
              storycraft?.render()
            })

            card.querySelectorAll('[data-plan-modal-close]').forEach(button =>
              button.addEventListener('click', closeModal)
            )
          }
        )
      }

      function openCanvasHelp() {
        openModal(`
          <div class="daedalus-plan-modal-head">
            <div>
              <div class="daedalus-eyebrow">LABYRINTH CONTROLS</div>
              <h2>Work like a node editor.</h2>
              <p>The canvas is designed around quick graph-building rather than form-by-form planning.</p>
            </div>
            <button data-plan-modal-close type="button">×</button>
          </div>
          <div class="daedalus-plan-help-grid">
            <div><kbd>Drag</kbd><strong>Move nodes</strong><span>Grab a node header. If several nodes are selected, they move together.</span></div>
            <div><kbd>Drag socket</kbd><strong>Create a relationship</strong><span>Pull a wire from the right socket to another node. Drop on empty canvas to create a connected entity.</span></div>
            <div><kbd>Double click</kbd><strong>Quick Create</strong><span>Double-click empty canvas to create exactly where you clicked.</span></div>
            <div><kbd>Right click</kbd><strong>Context actions</strong><span>Open node or canvas actions without travelling back to the toolbar.</span></div>
            <div><kbd>Wheel</kbd><strong>Zoom</strong><span>Zoom around the pointer. Drag empty canvas to pan.</span></div>
            <div><kbd>Ctrl K</kbd><strong>Command palette</strong><span>Create, find and focus entities or run Planning commands.</span></div>
            <div><kbd>Ctrl D</kbd><strong>Duplicate</strong><span>Clone the current node or the entire multi-selection.</span></div>
            <div><kbd>F</kbd><strong>Focus</strong><span>Center the selected entity in the viewport.</span></div>
            <div><kbd>Arrows</kbd><strong>Nudge</strong><span>Move selected nodes precisely. Hold Shift for a larger step.</span></div>
            <div><kbd>Shift + drag</kbd><strong>Box select</strong><span>Draw a marquee on empty canvas to select several nodes.</span></div>
            <div><kbd>Shift / Ctrl click</kbd><strong>Multi-select</strong><span>Add or remove individual nodes from the current selection.</span></div>
            <div><kbd>Ctrl C / V</kbd><strong>Copy / Paste</strong><span>Copy selected nodes together with relationships that exist inside the selection.</span></div>
            <div><kbd>Ctrl A</kbd><strong>Select visible</strong><span>Select every visible node after current filters are applied.</span></div>
            <div><kbd>Delete</kbd><strong>Delete</strong><span>Remove the selected node or selected group after confirmation.</span></div>
          </div>
          <div class="daedalus-plan-help-tip">
            <strong>Tip</strong>
            <span>Direct image URLs ending in .png, .jpg, .jpeg, .webp or .gif are the most reliable for node portraits. Daedalus keeps those images stable while you edit the dossier.</span>
          </div>
          <div class="daedalus-plan-modal-actions">
            <button data-plan-modal-close class="daedalus-primary-button" type="button">Got it</button>
          </div>
        `)
        modalCard.querySelectorAll('[data-plan-modal-close]').forEach(button =>
          button.addEventListener('click', closeModal)
        )
      }

      function openTemplateModal() {
        openModal(
          `
            <div class="daedalus-plan-modal-head">
              <div>
                <div class="daedalus-eyebrow">PLANNING TEMPLATES</div>
                <h2>Choose a starting structure</h2>
                <p>Templates create empty planning scaffolds. They do not write your story.</p>
              </div>
              <button data-plan-modal-close type="button">×</button>
            </div>
            <div class="daedalus-plan-template-grid">
              ${TEMPLATE_DEFINITIONS.map(template => `
                <button class="daedalus-plan-template-card" data-plan-template-id="${escapeHtml(template.id)}" type="button">
                  <span class="daedalus-plan-template-mark">⌘</span>
                  <strong>${escapeHtml(template.name)}</strong>
                  <p>${escapeHtml(template.description)}</p>
                  <small>${template.nodes.length} nodes · ${(template.connections || []).length} starter links · ${(template.frames || []).length} frame${(template.frames || []).length === 1 ? '' : 's'}</small>
                </button>
              `).join('')}
              <button class="daedalus-plan-template-card" data-plan-template-blank type="button">
                <span class="daedalus-plan-template-mark">＋</span>
                <strong>Blank Canvas</strong>
                <p>Clear Planning and begin with nothing but the canvas.</p>
              </button>
            </div>
          `,
          card => {
            card.querySelectorAll('[data-plan-template-id]').forEach(button => {
              button.addEventListener('click', () => {
                const hasContent = planning().entities.length || planning().frames.length
                if (
                  hasContent &&
                  !confirm('Replace the current Planning Station with this template? Your character project is safe, but the current Planning canvas will be replaced.')
                ) {
                  return
                }

                const next = planningCore.createTemplatePlanning(
                  button.dataset.planTemplateId,
                  store.makeId
                )
                project().planning = store.normalizePlanning(next)
                selectedEntityId = null
                selectedEntityIds.clear()
                connectFromId = null
                closeModal()
                markPlanningDirty()
                renderAll()
                setTimeout(fitToContent, 30)
                toast?.('Planning template created.', 'success')
              })
            })

            card.querySelector('[data-plan-template-blank]').addEventListener('click', () => {
              const hasContent = planning().entities.length || planning().frames.length
              if (hasContent && !confirm('Clear the Planning Station and start with a blank canvas?')) return
              project().planning = store.normalizePlanning(null)
              selectedEntityId = null
              selectedEntityIds.clear()
              connectFromId = null
              closeModal()
              markPlanningDirty()
              renderAll()
            })

            card.querySelectorAll('[data-plan-modal-close]').forEach(button =>
              button.addEventListener('click', closeModal)
            )
          }
        )
      }

      function addFrame() {
        const name = prompt('Name this planning frame:', 'New Frame')
        if (name === null) return
        const center = viewportCenterWorld()
        planning().frames.push(
          planningCore.makeFrame(
            name.trim() || 'New Frame',
            center.x - 260,
            center.y - 160,
            520,
            320,
            store.makeId
          )
        )
        markPlanningDirty()
        renderFrames()
        renderMinimap()
      }

      function closeContextMenu() {
        contextMenuOpen = false
        contextMenu.classList.add('daedalus-hidden')
        contextMenu.innerHTML = ''
      }

      function openContextMenu(clientX, clientY, entityId = null) {
        contextMenuOpen = true
        const entity = entityId ? entityById(entityId) : null
        const bulkEntityAction = entity && selectedEntityIds.size > 1 && selectedEntityIds.has(entity.id)
        contextMenu.innerHTML = entity
          ? `
              <button data-plan-context-action="focus" type="button"><span>◎</span><strong>${bulkEntityAction ? 'Fit selection' : 'Focus node'}</strong><kbd>F</kbd></button>
              <button data-plan-context-action="connect" type="button"><span>⌁</span><strong>Connect from here</strong></button>
              <button data-plan-context-action="duplicate" type="button"><span>⧉</span><strong>${bulkEntityAction ? `Duplicate ${selectedEntityIds.size} nodes` : 'Duplicate'}</strong><kbd>Ctrl D</kbd></button>
              <div class="daedalus-plan-context-separator"></div>
              <button class="is-danger" data-plan-context-action="delete" type="button"><span>×</span><strong>${bulkEntityAction ? `Delete ${selectedEntityIds.size} nodes` : 'Delete node'}</strong><kbd>Del</kbd></button>
            `
          : `
              <button data-plan-context-create="character" type="button"><span>${escapeHtml(ENTITY_TYPES.character.icon)}</span><strong>New Character</strong></button>
              <button data-plan-context-create="location" type="button"><span>${escapeHtml(ENTITY_TYPES.location.icon)}</span><strong>New Location</strong></button>
              <button data-plan-context-create="faction" type="button"><span>${escapeHtml(ENTITY_TYPES.faction.icon)}</span><strong>New Faction</strong></button>
              <button data-plan-context-create="power" type="button"><span>${escapeHtml(ENTITY_TYPES.power.icon)}</span><strong>New Power</strong></button>
              <button data-plan-context-create="plot" type="button"><span>${escapeHtml(ENTITY_TYPES.plot.icon)}</span><strong>New Plot Thread</strong></button>
              <div class="daedalus-plan-context-separator"></div>
              <button data-plan-context-action="add" type="button"><span>＋</span><strong>More entity types…</strong></button>
              <button data-plan-context-action="frame" type="button"><span>▢</span><strong>Create frame</strong></button>
              <button data-plan-context-action="arrange" type="button"><span>⇄</span><strong>Auto-arrange visible</strong></button>
              <button data-plan-context-action="fit" type="button"><span>⌗</span><strong>Fit world to view</strong></button>
            `

        const rect = mount.getBoundingClientRect()
        const width = 240
        const height = entity ? 190 : 330
        const left = Math.min(clientX - rect.left, rect.width - width - 12)
        const top = Math.min(clientY - rect.top, rect.height - height - 12)
        contextMenu.style.left = `${Math.max(12, left)}px`
        contextMenu.style.top = `${Math.max(12, top)}px`
        contextMenu.dataset.planContextEntity = entityId || ''
        contextMenu.classList.remove('daedalus-hidden')
      }

      function openPalette() {
        if (!isActive?.()) return
        paletteOpen = true
        paletteBackdrop.classList.remove('daedalus-hidden')
        paletteInput.value = ''
        renderPalette('')
        setTimeout(() => paletteInput.focus(), 0)
      }

      function closePalette() {
        paletteOpen = false
        paletteBackdrop.classList.add('daedalus-hidden')
      }

      function setMode(mode) {
        const allowed = ['canvas', 'library', 'timeline', 'plot', 'relationships', 'document']
        activeMode = allowed.includes(mode) ? mode : 'canvas'
        canvasPanel.classList.toggle('daedalus-hidden', activeMode !== 'canvas')
        libraryPanel.classList.toggle('daedalus-hidden', activeMode !== 'library')
        timelinePanel.classList.toggle('daedalus-hidden', activeMode !== 'timeline')
        plotPanel.classList.toggle('daedalus-hidden', activeMode !== 'plot')
        relationshipsPanel.classList.toggle('daedalus-hidden', activeMode !== 'relationships')
        documentPanel.classList.toggle('daedalus-hidden', activeMode !== 'document')
        mount.querySelectorAll('[data-plan-mode]').forEach(button =>
          button.classList.toggle('is-active', button.dataset.planMode === activeMode)
        )
        if (activeMode === 'canvas') requestAnimationFrame(applyViewTransform)
        if (activeMode === 'timeline') storycraft?.renderTimeline()
        if (activeMode === 'plot') storycraft?.renderPlotBoard()
        if (activeMode === 'relationships') storycraft?.renderRelationships()
        if (activeMode === 'document') storycraft?.renderDocument()
      }

      function paletteCommands(query = '') {
        const base = [
          {label: 'Open Canvas', hint: 'View', run: () => setMode('canvas')},
          {label: 'Open Library', hint: 'View', run: () => setMode('library')},
          {label: 'Open Timeline', hint: 'Storycraft', run: () => setMode('timeline')},
          {label: 'Open Plot Board', hint: 'Storycraft', run: () => setMode('plot')},
          {label: 'Open Relationships', hint: 'Storycraft', run: () => setMode('relationships')},
          {label: 'Open Planning Document', hint: 'Storycraft', run: () => setMode('document')},
          {label: 'Fit canvas to world', hint: 'Canvas', run: fitToContent},
          {label: 'Auto-arrange visible nodes', hint: 'Canvas', run: autoArrangeVisible},
          {label: 'Undo last Planning change', hint: 'History', run: undoPlanning},
          {label: 'Redo last Planning change', hint: 'History', run: redoPlanning},
          {label: 'Create frame', hint: 'Canvas', run: addFrame},
          {label: 'Arrange current selection', hint: 'Selection', run: arrangeSelectionGrid},
          {label: 'Frame current selection', hint: 'Selection', run: frameSelection},
          {label: 'Fit current selection', hint: 'Selection', run: fitToSelection},
          {label: 'Duplicate current selection', hint: 'Selection', run: duplicateSelection},
          {label: 'Align selection left', hint: 'Selection', run: () => alignSelection('left')},
          {label: 'Align selection top', hint: 'Selection', run: () => alignSelection('top')},
          {label: 'Distribute selection horizontally', hint: 'Selection', run: () => distributeSelection('x')},
          {label: 'Distribute selection vertically', hint: 'Selection', run: () => distributeSelection('y')},
          {label: 'Canvas controls & shortcuts', hint: 'Help', run: openCanvasHelp},
          {label: 'Start from template', hint: 'Planning', run: openTemplateModal},
          {label: 'Export Planning JSON', hint: 'Export', run: exportPlanning},
          {label: 'Preview Planning Document', hint: 'Export', run: () => setMode('document')},
          ...TYPE_ORDER.map(type => ({
            label: `Create ${ENTITY_TYPES[type].label}`,
            hint: 'Create',
            run: () => openEntityModal(type)
          }))
        ]

        const entities = planning().entities.map(entity => ({
          label: entity.name || 'Untitled',
          hint: ENTITY_TYPES[entity.type]?.label || 'Entity',
          run: () => {
            setMode('canvas')
            selectEntity(entity.id, {focus: true})
          }
        }))

        const needle = String(query || '').trim().toLowerCase()
        return [...base, ...entities]
          .filter(command =>
            !needle || `${command.label} ${command.hint}`.toLowerCase().includes(needle)
          )
          .slice(0, 20)
      }

      function renderPalette(query) {
        const commands = paletteCommands(query)
        paletteResults.innerHTML = commands.length
          ? commands
              .map((command, index) => `
                <button data-plan-command-index="${index}" type="button">
                  <span>${escapeHtml(command.label)}</span>
                  <small>${escapeHtml(command.hint)}</small>
                </button>
              `)
              .join('')
          : '<div class="daedalus-plan-palette-empty">No matching command.</div>'

        paletteResults.querySelectorAll('[data-plan-command-index]').forEach(button => {
          button.addEventListener('click', () => {
            const command = commands[Number(button.dataset.planCommandIndex)]
            closePalette()
            command?.run()
          })
        })
      }

      function exportPlanning() {
        const payload = {
          kind: 'daedalus-planning',
          formatVersion: 1,
          exportedAt: new Date().toISOString(),
          projectTitle: project().meta?.title || project().character?.name || 'Daedalus Project',
          planning: planningCore.clone(planning())
        }
        downloadText(
          `${sanitizeFilename(payload.projectTitle)}-Planning.json`,
          JSON.stringify(payload, null, 2),
          'application/json'
        )
        toast?.('Planning JSON exported.', 'success')
      }

      function exportWorldBible(format = 'markdown') {
        const title = project().meta?.title || project().character?.name || 'Daedalus Project'
        if (format === 'text') {
          const plainText = planningCore.planningToText(planning(), title)
          downloadText(`${sanitizeFilename(title)}-Planning-Brief.txt`, plainText, 'text/plain')
          toast?.('Planning Brief exported as text.', 'success')
          return
        }
        const markdown = planningCore.planningToMarkdown(planning(), title)
        downloadText(`${sanitizeFilename(title)}-World-Bible.md`, markdown, 'text/markdown')
        toast?.('World Bible exported as Markdown.', 'success')
      }

      function openWorldBiblePreview(initialFormat = 'markdown') {
        const title = project().meta?.title || project().character?.name || 'Daedalus Project'
        const markdown = planningCore.planningToMarkdown(planning(), title)
        const plainText = planningCore.planningToText(planning(), title)

        openModal(
          `
            <div class="daedalus-plan-modal-head">
              <div>
                <div class="daedalus-eyebrow">PLANNING DOCUMENT</div>
                <h2>Preview your export</h2>
              </div>
              <button data-plan-modal-close type="button">×</button>
            </div>
            <div class="daedalus-plan-export-shell">
              <div class="daedalus-plan-export-topbar">
                <div class="daedalus-plan-mode-switch" role="tablist" aria-label="Export format">
                  <button data-plan-export-format="markdown" type="button">Markdown</button>
                  <button data-plan-export-format="text" type="button">Plain text</button>
                </div>
                <div class="daedalus-plan-export-actions">
                  <button id="daedalus-plan-export-download-md" class="daedalus-secondary-button" type="button">Download .md</button>
                  <button id="daedalus-plan-export-download-txt" class="daedalus-secondary-button" type="button">Download .txt</button>
                  <button id="daedalus-plan-export-copy" class="daedalus-primary-button" type="button">Copy Current</button>
                </div>
              </div>
              <p class="daedalus-plan-export-intro">Use this preview as a world-bible / planning brief you can keep for yourself or feed into another AI tool later.</p>
              <pre id="daedalus-plan-export-preview" class="daedalus-plan-export-preview"></pre>
            </div>
          `,
          card => {
            let currentFormat = initialFormat === 'text' ? 'text' : 'markdown'
            const preview = card.querySelector('#daedalus-plan-export-preview')
            const buttons = Array.from(card.querySelectorAll('[data-plan-export-format]'))

            function syncPreview() {
              preview.textContent = currentFormat === 'text' ? plainText : markdown
              buttons.forEach(button => {
                button.classList.toggle('is-active', button.dataset.planExportFormat === currentFormat)
              })
            }

            buttons.forEach(button => {
              button.addEventListener('click', () => {
                currentFormat = button.dataset.planExportFormat === 'text' ? 'text' : 'markdown'
                syncPreview()
              })
            })

            card.querySelector('#daedalus-plan-export-download-md').addEventListener('click', () => exportWorldBible('markdown'))
            card.querySelector('#daedalus-plan-export-download-txt').addEventListener('click', () => exportWorldBible('text'))
            card.querySelector('#daedalus-plan-export-copy').addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(currentFormat === 'text' ? plainText : markdown)
                toast?.('Planning document copied to clipboard.', 'success')
              } catch (error) {
                toast?.('Could not copy the planning document.', 'error')
              }
            })
            card.querySelectorAll('[data-plan-modal-close]').forEach(button => button.addEventListener('click', closeModal))
            syncPreview()
          }
        )
      }

      function startConnection(entityId) {
        if (!entityById(entityId)) return
        connectFromId = entityId
        selectedEntityId = entityId
        selectedEntityIds = new Set([entityId])
        syncSelectionButton()
        refreshNodeVisualStates()
        renderConnections()
        renderDossier()
        connectBanner.classList.remove('daedalus-hidden')
        toast?.('Choose another node to create a relationship.', 'info')
      }

      function deleteEntity(entityId) {
        const entity = entityById(entityId)
        if (!entity) return
        if (!confirm(`Delete “${entity.name}” and its connections from Planning?`)) return
        planning().entities = planning().entities.filter(item => item.id !== entityId)
        planning().connections = planning().connections.filter(
          connection =>
            connection.sourceId !== entityId && connection.targetId !== entityId
        )
        if (selectedEntityId === entityId) selectedEntityId = null
        selectedEntityIds.delete(entityId)
        if (connectFromId === entityId) connectFromId = null
        markPlanningDirty()
        renderAll()
      }

      function duplicateEntity(entityId) {
        const source = entityById(entityId)
        if (!source) return
        const copy = planningCore.clone(source)
        copy.id = store.makeId('entity')
        copy.name = `${source.name} — Copy`
        copy.x = snapValue(copy.x + 40)
        copy.y = snapValue(copy.y + 40)
        copy.updatedAt = new Date().toISOString()
        planning().entities.push(copy)
        selectedEntityId = copy.id
        selectedEntityIds = new Set([copy.id])
        markPlanningDirty()
        renderAll()
      }

      function selectedEntities() {
        normalizeSelection()
        return [...selectedEntityIds].map(entityById).filter(Boolean)
      }

      function copySelection() {
        const entities = selectedEntities()
        if (!entities.length) return
        const ids = new Set(entities.map(entity => entity.id))
        selectionClipboard = {
          entities: planningCore.clone(entities),
          connections: planningCore.clone(
            planning().connections.filter(connection =>
              ids.has(connection.sourceId) && ids.has(connection.targetId)
            )
          )
        }
        toast?.(`${entities.length} Planning ${entities.length === 1 ? 'node' : 'nodes'} copied.`, 'info')
      }

      function pasteSelection() {
        if (!selectionClipboard?.entities?.length) return
        const idMap = new Map()
        const copies = selectionClipboard.entities.map(source => {
          const copy = planningCore.clone(source)
          const oldId = copy.id
          copy.id = store.makeId('entity')
          idMap.set(oldId, copy.id)
          copy.x = snapValue((Number(copy.x) || 0) + 60)
          copy.y = snapValue((Number(copy.y) || 0) + 60)
          copy.updatedAt = new Date().toISOString()
          return copy
        })
        const connections = (selectionClipboard.connections || []).map(source => ({
          ...planningCore.clone(source),
          id: store.makeId('connection'),
          sourceId: idMap.get(source.sourceId),
          targetId: idMap.get(source.targetId)
        })).filter(connection => connection.sourceId && connection.targetId)

        planning().entities.push(...copies)
        planning().connections.push(...connections)
        selectedEntityIds = new Set(copies.map(entity => entity.id))
        selectedEntityId = copies.at(-1)?.id || null
        markPlanningDirty()
        renderAll()
        toast?.(`${copies.length} Planning ${copies.length === 1 ? 'node' : 'nodes'} pasted.`, 'success')
      }

      function duplicateSelection() {
        if (selectedEntityIds.size <= 1) {
          if (selectedEntityId) duplicateEntity(selectedEntityId)
          return
        }
        copySelection()
        pasteSelection()
      }

      function deleteSelection() {
        const entities = selectedEntities()
        if (!entities.length) return
        if (!confirm(`Delete ${entities.length} selected Planning ${entities.length === 1 ? 'node' : 'nodes'} and their connections?`)) return
        const ids = new Set(entities.map(entity => entity.id))
        planning().entities = planning().entities.filter(entity => !ids.has(entity.id))
        planning().connections = planning().connections.filter(connection =>
          !ids.has(connection.sourceId) && !ids.has(connection.targetId)
        )
        planning().frames.forEach(frame => {
          frame.memberIds = (frame.memberIds || []).filter(id => !ids.has(id))
        })
        selectedEntityIds.clear()
        selectedEntityId = null
        if (ids.has(connectFromId)) connectFromId = null
        markPlanningDirty()
        renderAll()
      }

      function alignSelection(kind) {
        const items = selectedEntities().filter(entity => !entity.locked)
        if (items.length < 2) return
        const xs = items.map(entity => entity.x)
        const ys = items.map(entity => entity.y)
        const right = items.map(entity => entity.x + 220)
        const bottom = items.map(entity => entity.y + 116)
        const centersX = items.map(entity => entity.x + 110)
        const centersY = items.map(entity => entity.y + 58)
        if (kind === 'left') items.forEach(entity => { entity.x = Math.min(...xs) })
        if (kind === 'right') items.forEach(entity => { entity.x = Math.max(...right) - 220 })
        if (kind === 'top') items.forEach(entity => { entity.y = Math.min(...ys) })
        if (kind === 'bottom') items.forEach(entity => { entity.y = Math.max(...bottom) - 116 })
        if (kind === 'hcenter') {
          const center = centersX.reduce((a, b) => a + b, 0) / centersX.length
          items.forEach(entity => { entity.x = center - 110 })
        }
        if (kind === 'vcenter') {
          const center = centersY.reduce((a, b) => a + b, 0) / centersY.length
          items.forEach(entity => { entity.y = center - 58 })
        }
        items.forEach(entity => {
          entity.x = snapValue(entity.x)
          entity.y = snapValue(entity.y)
          entity.updatedAt = new Date().toISOString()
        })
        markPlanningDirty()
        renderAll()
      }

      function distributeSelection(axis) {
        const items = selectedEntities().filter(entity => !entity.locked)
        if (items.length < 3) return
        const sorted = items.slice().sort((a, b) => axis === 'x' ? a.x - b.x : a.y - b.y)
        const first = axis === 'x' ? sorted[0].x : sorted[0].y
        const last = axis === 'x' ? sorted.at(-1).x : sorted.at(-1).y
        const gap = (last - first) / (sorted.length - 1)
        sorted.forEach((entity, index) => {
          if (axis === 'x') entity.x = snapValue(first + gap * index)
          else entity.y = snapValue(first + gap * index)
          entity.updatedAt = new Date().toISOString()
        })
        markPlanningDirty()
        renderAll()
      }

      function arrangeSelectionGrid() {
        const items = selectedEntities().filter(entity => !entity.locked)
        if (items.length < 2) return
        const minX = Math.min(...items.map(entity => entity.x))
        const minY = Math.min(...items.map(entity => entity.y))
        const columns = Math.max(2, Math.ceil(Math.sqrt(items.length)))
        const stepX = 300
        const stepY = 170
        items.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).forEach((entity, index) => {
          entity.x = snapValue(minX + (index % columns) * stepX)
          entity.y = snapValue(minY + Math.floor(index / columns) * stepY)
          entity.updatedAt = new Date().toISOString()
        })
        markPlanningDirty()
        renderAll()
      }

      function fitToSelection() {
        const items = selectedEntities()
        if (!items.length) return
        const rect = viewport.getBoundingClientRect()
        const minX = Math.min(...items.map(entity => entity.x))
        const minY = Math.min(...items.map(entity => entity.y))
        const maxX = Math.max(...items.map(entity => entity.x + 220))
        const maxY = Math.max(...items.map(entity => entity.y + 116))
        const width = Math.max(220, maxX - minX)
        const height = Math.max(116, maxY - minY)
        const zoom = clamp(Math.min((rect.width - 180) / width, (rect.height - 180) / height), 0.35, 1.6)
        planning().view.zoom = zoom
        planning().view.panX = rect.width / 2 - (minX + width / 2) * zoom
        planning().view.panY = rect.height / 2 - (minY + height / 2) * zoom
        applyViewTransform()
        markViewDirty()
      }

      function frameSelection() {
        const items = selectedEntities()
        if (!items.length) return
        const name = prompt('Frame name:', 'New Group')
        if (name === null) return
        const minX = Math.min(...items.map(entity => entity.x)) - 50
        const minY = Math.min(...items.map(entity => entity.y)) - 70
        const maxX = Math.max(...items.map(entity => entity.x + 220)) + 50
        const maxY = Math.max(...items.map(entity => entity.y + 116)) + 50
        const frame = planningCore.makeFrame(name.trim() || 'New Group', minX, minY, maxX - minX, maxY - minY, store.makeId)
        frame.memberIds = items.map(entity => entity.id)
        planning().frames.push(frame)
        markPlanningDirty()
        renderFrames()
        renderMinimap()
        toast?.('Frame created around selection.', 'success')
      }

      function reorderSelection(position) {
        const ids = new Set(selectedEntityIds)
        if (!ids.size) return
        const selected = planning().entities.filter(entity => ids.has(entity.id))
        const rest = planning().entities.filter(entity => !ids.has(entity.id))
        planning().entities = position === 'back' ? [...selected, ...rest] : [...rest, ...selected]
        markPlanningDirty()
        renderNodes()
        renderConnections()
      }

      function toggleSelectionProperty(key) {
        const items = selectedEntities()
        if (!items.length) return
        const shouldEnable = !items.every(entity => Boolean(entity[key]))
        items.forEach(entity => {
          entity[key] = shouldEnable
          entity.updatedAt = new Date().toISOString()
        })
        markPlanningDirty()
        renderAll()
      }

      function openSelectionModal() {
        const count = selectedEntityIds.size
        if (count < 2) return
        openModal(`
          <div class="daedalus-plan-modal-head"><div><div class="daedalus-eyebrow">SELECTION</div><h2>${count} nodes selected</h2><p>Organize, duplicate, frame, or focus the current selection.</p></div><button data-plan-modal-close type="button">×</button></div>
          <div class="daedalus-plan-selection-grid">
            <button data-plan-bulk="left" type="button">Align left</button>
            <button data-plan-bulk="right" type="button">Align right</button>
            <button data-plan-bulk="top" type="button">Align top</button>
            <button data-plan-bulk="bottom" type="button">Align bottom</button>
            <button data-plan-bulk="hcenter" type="button">Center horizontally</button>
            <button data-plan-bulk="vcenter" type="button">Center vertically</button>
            <button data-plan-bulk="dist-x" type="button">Distribute horizontally</button>
            <button data-plan-bulk="dist-y" type="button">Distribute vertically</button>
            <button data-plan-bulk="arrange" type="button">Arrange selection</button>
            <button data-plan-bulk="frame" type="button">Frame selection</button>
            <button data-plan-bulk="fit" type="button">Fit selection</button>
            <button data-plan-bulk="front" type="button">Bring to front</button>
            <button data-plan-bulk="back" type="button">Send to back</button>
            <button data-plan-bulk="lock" type="button">Lock / unlock</button>
            <button data-plan-bulk="favorite" type="button">Favorite / unfavorite</button>
            <button data-plan-bulk="duplicate" type="button">Duplicate selection</button>
            <button class="is-danger" data-plan-bulk="delete" type="button">Delete selection</button>
          </div>
        `, card => {
          card.querySelectorAll('[data-plan-bulk]').forEach(button => button.addEventListener('click', () => {
            const action = button.dataset.planBulk
            if (['left','right','top','bottom','hcenter','vcenter'].includes(action)) alignSelection(action)
            if (action === 'dist-x') distributeSelection('x')
            if (action === 'dist-y') distributeSelection('y')
            if (action === 'arrange') arrangeSelectionGrid()
            if (action === 'frame') frameSelection()
            if (action === 'fit') fitToSelection()
            if (action === 'front') reorderSelection('front')
            if (action === 'back') reorderSelection('back')
            if (action === 'lock') toggleSelectionProperty('locked')
            if (action === 'favorite') toggleSelectionProperty('favorite')
            if (action === 'duplicate') duplicateSelection()
            if (action === 'delete') deleteSelection()
            if (action !== 'fit') closeModal()
          }))
          card.querySelectorAll('[data-plan-modal-close]').forEach(button => button.addEventListener('click', closeModal))
        })
      }

      function updateDossierField(target, eventType = 'input') {
        const entity = entityById(selectedEntityId)
        if (!entity) return

        let changedField = ''

        if (target.dataset.planField) {
          const field = target.dataset.planField
          changedField = field

          if (field === 'tags') {
            entity.tags = target.value
              .split(',')
              .map(item => item.trim())
              .filter(Boolean)
          } else if (field === 'type') {
            const nextType = ENTITY_TYPES[target.value] ? target.value : 'custom'
            entity.type = nextType
            const schema = ENTITY_TYPES[nextType].fields
            entity.fields = Object.fromEntries(
              schema.map(([key]) => [key, String(entity.fields?.[key] || '')])
            )
          } else {
            entity[field] = target.value
          }
        }

        if (target.dataset.planSpecificField) {
          entity.fields[target.dataset.planSpecificField] = target.value
          changedField = 'specific'
        }

        if (target.dataset.planCustomFieldLabel) {
          const field = (entity.customFields || []).find(item => item.id === target.dataset.planCustomFieldLabel)
          if (field) field.label = target.value
          changedField = 'custom'
        }

        if (target.dataset.planCustomFieldValue) {
          const field = (entity.customFields || []).find(item => item.id === target.dataset.planCustomFieldValue)
          if (field) field.value = target.value
          changedField = 'custom'
        }

        entity.updatedAt = new Date().toISOString()
        markPlanningDirty()

        // Keep node DOM stable while typing. Rebuilding every node used to make
        // remote images restart their load/decode cycle during dossier edits.
        if (changedField === 'type') {
          renderNodes()
          renderConnections()
          renderLibrary()
          renderDossier()
          return
        }

        if (changedField === 'imageUrl') {
          clearTimeout(imageRenderTimer)

          if (eventType === 'input') {
            imageRenderTimer = setTimeout(() => {
              renderNodes()
              renderLibrary()
            }, 420)
          } else {
            renderNodes()
            renderLibrary()
            renderDossier()
          }
          return
        }

        if (['name', 'subtitle', 'status', 'tags'].includes(changedField)) {
          patchNodeContent(entity)
          refreshNodeVisualStates()
          renderLibrary()
        } else if (changedField === 'description' && eventType === 'change') {
          renderLibrary()
        }
      }

      // Toolbar

      mount.querySelectorAll('[data-plan-mode]').forEach(button => {
        button.addEventListener('click', () => setMode(button.dataset.planMode))
      })

      mount.querySelector('#daedalus-plan-add').addEventListener('click', () => openEntityModal())
      mount.querySelector('#daedalus-plan-library-add').addEventListener('click', () => openEntityModal())
      mount.querySelector('#daedalus-plan-add-frame').addEventListener('click', addFrame)
      mount.querySelector('#daedalus-plan-template').addEventListener('click', openTemplateModal)
      mount.querySelector('#daedalus-plan-empty-template').addEventListener('click', openTemplateModal)
      mount.querySelector('#daedalus-plan-export').addEventListener('click', exportPlanning)
      mount.querySelector('#daedalus-plan-world-bible').addEventListener('click', () => setMode('document'))
      mount.querySelector('#daedalus-plan-undo').addEventListener('click', undoPlanning)
      mount.querySelector('#daedalus-plan-redo').addEventListener('click', redoPlanning)
      mount.querySelector('#daedalus-plan-arrange').addEventListener('click', autoArrangeVisible)
      mount.querySelector('#daedalus-plan-selection').addEventListener('click', openSelectionModal)
      mount.querySelector('#daedalus-plan-command').addEventListener('click', openPalette)
      mount.querySelector('#daedalus-plan-help').addEventListener('click', openCanvasHelp)

      mount.querySelectorAll('[data-plan-quick-type]').forEach(button => {
        button.addEventListener('click', () => openEntityModal(button.dataset.planQuickType))
      })

      mount.querySelector('#daedalus-plan-spotlight').addEventListener('click', event => {
        spotlight = !spotlight
        event.currentTarget.classList.toggle('is-active', spotlight)
        refreshNodeVisualStates()
        renderConnections()
      })

      mount.querySelector('#daedalus-plan-hidden').addEventListener('click', event => {
        showHidden = !showHidden
        event.currentTarget.classList.toggle('is-active', showHidden)
        event.currentTarget.textContent = showHidden ? 'Hidden ✓' : 'Hidden'
        refreshNodeVisualStates()
        renderConnections()
        renderLibrary()
      })

      mount.querySelector('#daedalus-plan-search-input').addEventListener('input', event => {
        searchTerm = event.target.value.trim().toLowerCase()
        refreshNodeVisualStates()
        renderConnections()
        renderLibrary()
      })

      mount.querySelector('#daedalus-plan-type-filter').addEventListener('change', event => {
        typeFilter = event.target.value
        refreshNodeVisualStates()
        renderConnections()
        renderLibrary()
      })

      mount.querySelector('#daedalus-plan-import').addEventListener('click', () => {
        mount.querySelector('#daedalus-plan-import-file').click()
      })

      mount.querySelector('#daedalus-plan-import-file').addEventListener('change', async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        try {
          const payload = await readJsonFile(file)
          if (payload?.kind && payload.kind !== 'daedalus-planning') {
            throw new Error('This JSON is not a Daedalus Planning export.')
          }
          const source = payload?.planning || payload
          if (!source || typeof source !== 'object') {
            throw new Error('Invalid Planning data.')
          }
          if (
            (planning().entities.length || planning().frames.length) &&
            !confirm('Replace the current Planning Station with the imported file?')
          ) {
            return
          }
          project().planning = store.normalizePlanning(source)
          selectedEntityId = null
          selectedEntityIds.clear()
          connectFromId = null
          markPlanningDirty()
          renderAll()
          setTimeout(fitToContent, 20)
          toast?.('Planning data imported.', 'success')
        } catch (error) {
          console.error('[Daedalus] Planning import failed:', error)
          toast?.('Could not import this Planning file.', 'error')
        }
      })

      // Canvas controls

      mount.querySelector('#daedalus-plan-zoom-in').addEventListener('click', () =>
        setZoom(planning().view.zoom + 0.12)
      )
      mount.querySelector('#daedalus-plan-zoom-out').addEventListener('click', () =>
        setZoom(planning().view.zoom - 0.12)
      )
      mount.querySelector('#daedalus-plan-fit').addEventListener('click', fitToContent)
      snapButton.addEventListener('click', () => {
        planning().view.snapToGrid = planning().view.snapToGrid === false
        syncSnapButton()
        markPlanningDirty()
      })
      zoomLabel.addEventListener('click', () => setZoom(1))
      mount.querySelector('#daedalus-plan-cancel-connect').addEventListener('click', () => {
        connectFromId = null
        renderAll()
      })

      viewport.addEventListener(
        'wheel',
        event => {
          if (event.target.closest('.daedalus-plan-dossier')) return
          event.preventDefault()
          const factor = event.deltaY > 0 ? 0.9 : 1.1
          setZoom(planning().view.zoom * factor, event.clientX, event.clientY)
        },
        {passive: false}
      )

      viewport.addEventListener('pointerdown', event => {
        closeContextMenu()
        const node = event.target.closest('.daedalus-plan-node')
        const frame = event.target.closest('[data-plan-frame-id]')
        const resizeHandle = event.target.closest('[data-plan-frame-resize]')
        const port = event.target.closest('[data-plan-port]')

        if (port && node) {
          const entityId = node.dataset.planEntityId
          const entity = entityById(entityId)
          if (!entity) return
          selectedEntityId = entityId
          selectedEntityIds = new Set([entityId])
          syncSelectionButton()
          const side = port.dataset.planPort === 'input' ? 'left' : 'right'
          const anchor = nodeAnchor(entity, side)
          wireDragState = {
            sourceId: entityId,
            start: anchor,
            sourceSide: side,
            clientX: event.clientX,
            clientY: event.clientY
          }
          previewWire.setAttribute('d', wirePathBetweenPoints(anchor, anchor))
          previewWire.classList.remove('daedalus-hidden')
          viewport.classList.add('is-wiring')
          refreshNodeVisualStates()
          event.preventDefault()
          event.stopPropagation()
          return
        }

        if (resizeHandle && frame) {
          const data = planning().frames.find(item => item.id === frame.dataset.planFrameId)
          if (!data) return
          frameResizeState = {
            id: data.id,
            startX: event.clientX,
            startY: event.clientY,
            width: data.width,
            height: data.height
          }
          event.preventDefault()
          return
        }

        if (node) {
          const entityId = node.dataset.planEntityId
          if (event.target.closest('[data-plan-node-action]')) return

          if (connectFromId && connectFromId !== entityId) {
            const source = connectFromId
            connectFromId = null
            renderAll()
            openConnectionModal(source, entityId)
            event.preventDefault()
            return
          }

          const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey
          if (additiveSelection) selectEntity(entityId, {toggle: true})
          else if (!selectedEntityIds.has(entityId) || selectedEntityIds.size <= 1) selectEntity(entityId)
          else {
            selectedEntityId = entityId
            syncSelectionButton()
            refreshNodeVisualStates()
            renderDossier()
          }

          if (event.target.closest('[data-plan-drag-handle="entity"]')) {
            const entity = entityById(entityId)
            if (!entity || entity.locked) return
            const movingIds = selectedEntityIds.has(entityId)
              ? [...selectedEntityIds]
              : [entityId]
            const items = movingIds
              .map(id => entityById(id))
              .filter(item => item && !item.locked)
              .map(item => ({id: item.id, x: item.x, y: item.y}))
            dragState = {
              id: entityId,
              startX: event.clientX,
              startY: event.clientY,
              items
            }
            node.setPointerCapture?.(event.pointerId)
            items.forEach(item => {
              nodeLayer.querySelector(`[data-plan-entity-id="${CSS.escape(item.id)}"]`)?.classList.add('is-dragging')
            })
            event.preventDefault()
          }
          return
        }

        if (frame) {
          if (event.target.closest('[data-plan-frame-action]')) return
          if (event.target.closest('[data-plan-drag-handle="frame"]')) {
            const data = planning().frames.find(item => item.id === frame.dataset.planFrameId)
            if (!data) return
            if (data.locked) return
            const explicitMembers = new Set(data.memberIds || [])
            const contained = planning().entities
              .filter(entity => {
                if (explicitMembers.size) return explicitMembers.has(entity.id)
                const centerX = entity.x + 110
                const centerY = entity.y + 58
                return (
                  centerX >= data.x &&
                  centerX <= data.x + data.width &&
                  centerY >= data.y &&
                  centerY <= data.y + (data.collapsed ? 52 : data.height)
                )
              })
              .map(entity => ({id: entity.id, x: entity.x, y: entity.y}))
            if (!(data.memberIds || []).length && contained.length) {
              data.memberIds = contained.map(item => item.id)
            }

            frameDragState = {
              id: data.id,
              startX: event.clientX,
              startY: event.clientY,
              x: data.x,
              y: data.y,
              contained
            }
            event.preventDefault()
          }
          return
        }

        if (
          event.target === viewport ||
          event.target === world ||
          event.target.closest('#daedalus-plan-node-layer') === nodeLayer ||
          event.target.closest('#daedalus-plan-frame-layer') === frameLayer
        ) {
          if (event.shiftKey) {
            const rect = viewport.getBoundingClientRect()
            marqueeState = {
              startX: event.clientX,
              startY: event.clientY,
              left: event.clientX - rect.left,
              top: event.clientY - rect.top,
              initial: event.ctrlKey || event.metaKey ? new Set(selectedEntityIds) : new Set()
            }
            if (!event.ctrlKey && !event.metaKey) {
              selectedEntityIds.clear()
              selectedEntityId = null
            }
            marquee.style.left = `${marqueeState.left}px`
            marquee.style.top = `${marqueeState.top}px`
            marquee.style.width = '0px'
            marquee.style.height = '0px'
            marquee.classList.remove('daedalus-hidden')
            viewport.classList.add('is-selecting')
            event.preventDefault()
            return
          }

          selectEntity(null)
          const view = planning().view
          panState = {
            startX: event.clientX,
            startY: event.clientY,
            panX: view.panX,
            panY: view.panY
          }
          viewport.classList.add('is-panning')
          event.preventDefault()
        }
      })

      window.addEventListener('pointermove', event => {
        if (wireDragState) {
          const end = worldPointFromClient(event.clientX, event.clientY)
          previewWire.setAttribute(
            'd',
            wirePathBetweenPoints(wireDragState.start, end)
          )
          wireDragState.clientX = event.clientX
          wireDragState.clientY = event.clientY
          return
        }

        if (dragState) {
          const zoom = planning().view.zoom
          const dx = (event.clientX - dragState.startX) / zoom
          const dy = (event.clientY - dragState.startY) / zoom
          for (const original of dragState.items || []) {
            const entity = entityById(original.id)
            if (!entity) continue
            entity.x = snapValue(original.x + dx)
            entity.y = snapValue(original.y + dy)
            patchNodePosition(entity)
          }
          renderConnections()
          renderMinimap()
          return
        }

        if (marqueeState) {
          const rect = viewport.getBoundingClientRect()
          const currentX = clamp(event.clientX - rect.left, 0, rect.width)
          const currentY = clamp(event.clientY - rect.top, 0, rect.height)
          const left = Math.min(marqueeState.left, currentX)
          const top = Math.min(marqueeState.top, currentY)
          const width = Math.abs(currentX - marqueeState.left)
          const height = Math.abs(currentY - marqueeState.top)
          marquee.style.left = `${left}px`
          marquee.style.top = `${top}px`
          marquee.style.width = `${width}px`
          marquee.style.height = `${height}px`

          const selectionRect = {left: rect.left + left, top: rect.top + top, right: rect.left + left + width, bottom: rect.top + top + height}
          const next = new Set(marqueeState.initial)
          nodeLayer.querySelectorAll('.daedalus-plan-node:not(.is-filtered)').forEach(node => {
            const nodeRect = node.getBoundingClientRect()
            const intersects = !(
              nodeRect.right < selectionRect.left ||
              nodeRect.left > selectionRect.right ||
              nodeRect.bottom < selectionRect.top ||
              nodeRect.top > selectionRect.bottom
            )
            if (intersects) next.add(node.dataset.planEntityId)
          })
          selectedEntityIds = next
          selectedEntityId = [...selectedEntityIds].at(-1) || null
          syncSelectionButton()
          refreshNodeVisualStates()
          renderConnections()
          renderDossier()
          return
        }

        if (frameDragState) {
          const frame = planning().frames.find(item => item.id === frameDragState.id)
          if (!frame) return
          const zoom = planning().view.zoom
          const dx = (event.clientX - frameDragState.startX) / zoom
          const dy = (event.clientY - frameDragState.startY) / zoom
          frame.x = frameDragState.x + dx
          frame.y = frameDragState.y + dy
          for (const original of frameDragState.contained) {
            const entity = entityById(original.id)
            if (entity) {
              entity.x = original.x + dx
              entity.y = original.y + dy
            }
          }
          renderFrames()
          for (const original of frameDragState.contained) {
            const entity = entityById(original.id)
            if (entity) patchNodePosition(entity)
          }
          renderConnections()
          renderMinimap()
          return
        }

        if (frameResizeState) {
          const frame = planning().frames.find(item => item.id === frameResizeState.id)
          if (!frame) return
          const zoom = planning().view.zoom
          frame.width = Math.max(
            260,
            frameResizeState.width + (event.clientX - frameResizeState.startX) / zoom
          )
          frame.height = Math.max(
            140,
            frameResizeState.height + (event.clientY - frameResizeState.startY) / zoom
          )
          frame.expandedHeight = frame.height
          renderFrames()
          return
        }

        if (panState) {
          planning().view.panX = panState.panX + event.clientX - panState.startX
          planning().view.panY = panState.panY + event.clientY - panState.startY
          applyViewTransform()
        }
      })

      window.addEventListener('pointerup', event => {
        if (wireDragState) {
          const sourceId = wireDragState.sourceId
          const targetElement = document.elementFromPoint(event.clientX, event.clientY)
          const targetNode = targetElement?.closest?.('.daedalus-plan-node')
          const targetId = targetNode?.dataset.planEntityId || null
          wireDragState = null
          previewWire.classList.add('daedalus-hidden')
          viewport.classList.remove('is-wiring')
          if (targetId && targetId !== sourceId) {
            openConnectionModal(sourceId, targetId)
          } else {
            const dropPoint = worldPointFromClient(event.clientX, event.clientY)
            refreshNodeVisualStates()
            openEntityModal('character', dropPoint, {connectFromId: sourceId})
          }
          return
        }

        const hadChange = dragState || frameDragState || frameResizeState || panState
        const hadMarquee = marqueeState
        dragState = null
        frameDragState = null
        frameResizeState = null
        panState = null
        marqueeState = null
        viewport.classList.remove('is-panning', 'is-selecting')
        marquee.classList.add('daedalus-hidden')
        nodeLayer.querySelectorAll('.is-dragging').forEach(node => node.classList.remove('is-dragging'))
        if (hadChange) markPlanningDirty()
        if (hadMarquee) syncSelectionButton()
      })

      viewport.addEventListener('dblclick', event => {
        if (event.target.closest('.daedalus-plan-node, .daedalus-plan-frame, .daedalus-plan-connection, .daedalus-plan-dossier, .daedalus-plan-canvas-controls, .daedalus-plan-minimap')) return
        pendingCreatePoint = worldPointFromClient(event.clientX, event.clientY)
        openEntityModal('character', pendingCreatePoint)
        event.preventDefault()
      })

      viewport.addEventListener('contextmenu', event => {
        if (event.target.closest('.daedalus-plan-dossier, .daedalus-plan-canvas-controls, .daedalus-plan-minimap')) return
        event.preventDefault()
        const node = event.target.closest('.daedalus-plan-node')
        pendingCreatePoint = worldPointFromClient(event.clientX, event.clientY)
        if (node) {
          const entityId = node.dataset.planEntityId
          if (!selectedEntityIds.has(entityId)) selectEntity(entityId)
          else {
            selectedEntityId = entityId
            syncSelectionButton()
            refreshNodeVisualStates()
            renderDossier()
          }
          openContextMenu(event.clientX, event.clientY, entityId)
        } else {
          openContextMenu(event.clientX, event.clientY)
        }
      })

      mount.querySelector('#daedalus-plan-minimap-content').addEventListener('click', event => {
        if (!minimapBounds) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (!rect.width || !rect.height) return
        const ratioX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
        const ratioY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
        const worldX = minimapBounds.minX + ratioX * minimapBounds.width
        const worldY = minimapBounds.minY + ratioY * minimapBounds.height
        const viewportRect = viewport.getBoundingClientRect()
        const view = planning().view
        view.panX = viewportRect.width / 2 - worldX * view.zoom
        view.panY = viewportRect.height / 2 - worldY * view.zoom
        applyViewTransform()
        markViewDirty()
      })

      nodeLayer.addEventListener('click', event => {
        const action = event.target.closest('[data-plan-node-action]')
        if (action?.dataset.planNodeAction === 'connect') {
          event.stopPropagation()
          startConnection(action.dataset.planEntityId)
        }
      })

      connectionLayer.addEventListener('click', event => {
        const target = event.target.closest('[data-connection-id]')
        const id = target?.dataset.connectionId
        if (!id) return
        const connection = planning().connections.find(item => item.id === id)
        if (!connection) return
        openConnectionModal(
          connection.sourceId,
          connection.targetId,
          connection
        )
      })

      frameLayer.addEventListener('click', event => {
        const button = event.target.closest('[data-plan-frame-action]')
        if (!button) return
        const frame = planning().frames.find(item => item.id === button.dataset.planFrameId)
        if (!frame) return

        if (button.dataset.planFrameAction === 'select') {
          const ids = (frame.memberIds || []).filter(id => entityById(id))
          if (!ids.length) {
            const height = frame.collapsed ? 52 : frame.height
            ids.push(...planning().entities.filter(entity => {
              const centerX = entity.x + 110
              const centerY = entity.y + 58
              return centerX >= frame.x && centerX <= frame.x + frame.width && centerY >= frame.y && centerY <= frame.y + height
            }).map(entity => entity.id))
            frame.memberIds = [...ids]
          }
          selectedEntityIds = new Set(ids)
          selectedEntityId = ids.at(-1) || null
          syncSelectionButton()
          refreshNodeVisualStates()
          renderConnections()
          renderDossier()
        }

        if (button.dataset.planFrameAction === 'rename') {
          const name = prompt('Rename frame:', frame.name)
          if (name !== null) frame.name = name.trim() || frame.name
        }

        if (button.dataset.planFrameAction === 'lock') {
          frame.locked = !frame.locked
        }

        if (button.dataset.planFrameAction === 'color') {
          const colors = ['neutral', 'green', 'blue', 'gold']
          const index = Math.max(0, colors.indexOf(frame.color || 'neutral'))
          frame.color = colors[(index + 1) % colors.length]
        }

        if (button.dataset.planFrameAction === 'duplicate') {
          const memberIds = new Set(frame.memberIds || [])
          const copies = planning().entities.filter(entity => memberIds.has(entity.id))
          const idMap = new Map()
          const entityCopies = copies.map(source => {
            const copy = planningCore.clone(source)
            const oldId = copy.id
            copy.id = store.makeId('entity')
            idMap.set(oldId, copy.id)
            copy.x = snapValue(copy.x + 70)
            copy.y = snapValue(copy.y + 70)
            copy.updatedAt = new Date().toISOString()
            return copy
          })
          const connectionCopies = planning().connections
            .filter(connection => memberIds.has(connection.sourceId) && memberIds.has(connection.targetId))
            .map(connection => ({
              ...planningCore.clone(connection),
              id: store.makeId('connection'),
              sourceId: idMap.get(connection.sourceId),
              targetId: idMap.get(connection.targetId)
            }))
          const frameCopy = planningCore.clone(frame)
          frameCopy.id = store.makeId('frame')
          frameCopy.name = `${frame.name} — Copy`
          frameCopy.x += 70
          frameCopy.y += 70
          frameCopy.memberIds = entityCopies.map(entity => entity.id)
          planning().entities.push(...entityCopies)
          planning().connections.push(...connectionCopies)
          planning().frames.push(frameCopy)
          selectedEntityIds = new Set(frameCopy.memberIds)
          selectedEntityId = frameCopy.memberIds.at(-1) || null
        }

        if (button.dataset.planFrameAction === 'collapse') {
          if (!frame.collapsed) {
            frame.expandedHeight = frame.height
            if (!(frame.memberIds || []).length) {
              frame.memberIds = planning().entities.filter(entity => {
                const centerX = entity.x + 110
                const centerY = entity.y + 58
                return centerX >= frame.x && centerX <= frame.x + frame.width && centerY >= frame.y && centerY <= frame.y + frame.height
              }).map(entity => entity.id)
            }
          }
          frame.collapsed = !frame.collapsed
          if (!frame.collapsed) frame.height = frame.expandedHeight || frame.height
        }

        if (button.dataset.planFrameAction === 'delete') {
          if (!confirm(`Delete frame “${frame.name}”? Entities inside it will remain.`)) return
          planning().frames = planning().frames.filter(item => item.id !== frame.id)
        }

        markPlanningDirty()
        renderAll()
      })

      library.addEventListener('click', event => {
        const card = event.target.closest('[data-plan-library-entity]')
        if (!card) return
        selectEntity(card.dataset.planLibraryEntity)
      })

      dossier.addEventListener('input', event => updateDossierField(event.target, 'input'))
      dossier.addEventListener('change', event => updateDossierField(event.target, 'change'))
      dossier.addEventListener('click', event => {
        if (event.target.closest('[data-plan-dossier-close]')) {
          selectEntity(null)
          return
        }
        const entityToggle = event.target.closest('[data-plan-entity-toggle]')
        if (entityToggle) {
          const entity = entityById(selectedEntityId)
          if (!entity) return
          const key = entityToggle.dataset.planEntityToggle
          if (key === 'favorite') entity.favorite = !entity.favorite
          if (key === 'locked') entity.locked = !entity.locked
          if (key === 'hidden') entity.hidden = !entity.hidden
          entity.updatedAt = new Date().toISOString()
          markPlanningDirty()
          if (key === 'hidden' && entity.hidden) {
            selectEntity(null)
            renderAll()
          } else {
            renderAll()
          }
          return
        }
        if (event.target.closest('[data-plan-add-custom-field]')) {
          const entity = entityById(selectedEntityId)
          if (!entity) return
          entity.customFields = entity.customFields || []
          entity.customFields.push({id: store.makeId('field'), label: 'Custom field', value: ''})
          entity.updatedAt = new Date().toISOString()
          markPlanningDirty()
          renderDossier()
          return
        }
        const removeCustomField = event.target.closest('[data-plan-remove-custom-field]')
        if (removeCustomField) {
          const entity = entityById(selectedEntityId)
          if (!entity) return
          entity.customFields = (entity.customFields || []).filter(field => field.id !== removeCustomField.dataset.planRemoveCustomField)
          entity.updatedAt = new Date().toISOString()
          markPlanningDirty()
          renderDossier()
          return
        }
        if (event.target.closest('[data-plan-dossier-connect]')) {
          startConnection(selectedEntityId)
          return
        }
        if (event.target.closest('[data-plan-duplicate-entity]')) {
          duplicateEntity(selectedEntityId)
          return
        }
        if (event.target.closest('[data-plan-delete-entity]')) {
          deleteEntity(selectedEntityId)
          return
        }
        const edit = event.target.closest('[data-plan-edit-connection]')
        if (edit) {
          const connection = planning().connections.find(
            item => item.id === edit.dataset.planEditConnection
          )
          if (connection) {
            openConnectionModal(connection.sourceId, connection.targetId, connection)
          }
          return
        }
        const remove = event.target.closest('[data-plan-delete-connection]')
        if (remove) {
          planning().connections = planning().connections.filter(
            item => item.id !== remove.dataset.planDeleteConnection
          )
          markPlanningDirty()
          renderConnections()
          renderDossier()
          renderCounts()
          storycraft?.render()
        }
      })

      contextMenu.addEventListener('click', event => {
        const create = event.target.closest('[data-plan-context-create]')
        if (create) {
          const type = create.dataset.planContextCreate
          closeContextMenu()
          openEntityModal(type, pendingCreatePoint)
          return
        }

        const action = event.target.closest('[data-plan-context-action]')
        if (!action) return
        const entityId = contextMenu.dataset.planContextEntity || selectedEntityId
        const name = action.dataset.planContextAction
        closeContextMenu()

        if (name === 'focus' && entityId) {
          if (selectedEntityIds.size > 1 && selectedEntityIds.has(entityId)) fitToSelection()
          else focusEntity(entityId)
        }
        if (name === 'connect' && entityId) startConnection(entityId)
        if (name === 'duplicate' && entityId) {
          if (selectedEntityIds.size > 1 && selectedEntityIds.has(entityId)) duplicateSelection()
          else duplicateEntity(entityId)
        }
        if (name === 'delete' && entityId) {
          if (selectedEntityIds.size > 1 && selectedEntityIds.has(entityId)) deleteSelection()
          else deleteEntity(entityId)
        }
        if (name === 'add') openEntityModal('character', pendingCreatePoint)
        if (name === 'frame') addFrame()
        if (name === 'arrange') autoArrangeVisible()
        if (name === 'fit') fitToContent()
      })

      modalBackdrop.addEventListener('click', event => {
        if (event.target === modalBackdrop) closeModal()
      })

      paletteBackdrop.addEventListener('click', event => {
        if (event.target === paletteBackdrop) closePalette()
      })
      paletteInput.addEventListener('input', event => renderPalette(event.target.value))
      paletteInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          const first = paletteResults.querySelector('[data-plan-command-index]')
          first?.click()
        }
      })

      document.addEventListener('pointerdown', event => {
        if (
          contextMenuOpen &&
          !event.target.closest('#daedalus-plan-context-menu')
        ) {
          closeContextMenu()
        }
      })

      document.addEventListener('keydown', event => {
        if (!isActive?.()) return

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          openPalette()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'z' &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          if (event.shiftKey) redoPlanning()
          else undoPlanning()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'y' &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          redoPlanning()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'c' &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          copySelection()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'v' &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          pasteSelection()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'a' &&
          activeMode === 'canvas' &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          const collapsedIds = collapsedFrameMemberIds()
          selectedEntityIds = new Set(visibleEntities().filter(entity => !collapsedIds.has(entity.id)).map(entity => entity.id))
          selectedEntityId = [...selectedEntityIds].at(-1) || null
          syncSelectionButton()
          refreshNodeVisualStates()
          renderConnections()
          renderDossier()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'd' &&
          selectedEntityId &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          duplicateSelection()
          return
        }

        if (
          event.key.toLowerCase() === 'f' &&
          selectedEntityId &&
          !event.target.matches('input, textarea, select')
        ) {
          event.preventDefault()
          focusEntity(selectedEntityId)
          return
        }

        if (
          selectedEntityId &&
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) &&
          !event.target.matches('input, textarea, select')
        ) {
          const items = selectedEntities().filter(entity => !entity.locked)
          if (items.length) {
            const step = event.shiftKey ? 20 : 5
            items.forEach(entity => {
              if (event.key === 'ArrowLeft') entity.x -= step
              if (event.key === 'ArrowRight') entity.x += step
              if (event.key === 'ArrowUp') entity.y -= step
              if (event.key === 'ArrowDown') entity.y += step
              if (planning().view.snapToGrid !== false && event.shiftKey) {
                entity.x = snapValue(entity.x)
                entity.y = snapValue(entity.y)
              }
              patchNodePosition(entity)
            })
            event.preventDefault()
            markPlanningDirty()
            renderConnections()
            renderMinimap()
          }
          return
        }

        if (event.key === 'Escape') {
          if (contextMenuOpen) {
            closeContextMenu()
            return
          }
          if (wireDragState) {
            wireDragState = null
            previewWire.classList.add('daedalus-hidden')
            viewport.classList.remove('is-wiring')
            refreshNodeVisualStates()
            return
          }
          if (paletteOpen) {
            closePalette()
            return
          }
          if (!modalBackdrop.classList.contains('daedalus-hidden')) {
            closeModal()
            return
          }
          if (connectFromId) {
            connectFromId = null
            renderAll()
            return
          }
        }

        if (
          event.key === 'Delete' &&
          selectedEntityId &&
          !event.target.matches('input, textarea, select')
        ) {
          if (selectedEntityIds.size > 1) deleteSelection()
          else deleteEntity(selectedEntityId)
        }
      })

      function refresh() {
        const nextProjectId = project()?.id || null
        if (historyProjectId !== nextProjectId) {
          historyProjectId = nextProjectId
          historyStack = []
          historyIndex = -1
          selectedEntityId = null
          selectedEntityIds.clear()
          connectFromId = null
        }
        selectedEntityId = entityById(selectedEntityId) ? selectedEntityId : null
        normalizeSelection()
        closeContextMenu()
        syncSnapButton()
        connectFromId = entityById(connectFromId) ? connectFromId : null
        renderAll()
        pushHistory(false)
      }

      function onShow() {
        refresh()
        requestAnimationFrame(() => {
          applyViewTransform()
          if (planning().entities.length && !planning().view?.zoom) fitToContent()
        })
      }

      storycraft = storycraftUi.mount({
        root: mount,
        getPlanning: planning,
        getProject: project,
        markDirty: markPlanningDirty,
        selectEntity,
        openEntityModal,
        openConnectionModal,
        toast,
        setPlanningMode: setMode
      })

      renderAll()
      pushHistory(true)

      return {
        refresh,
        onShow,
        fitToContent,
        openPalette
      }
    }
  }
})()
