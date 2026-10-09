;(() => {
  'use strict'

  // Storycraft views inside Planning Station

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

  window.DaedalusStorycraftStudio = {
    mount(options = {}) {
      const {
        root,
        getPlanning,
        getProject,
        markDirty,
        selectEntity,
        openEntityModal,
        openConnectionModal,
        toast,
        setPlanningMode
      } = options

      const core = window.DaedalusStorycraft
      const planningCore = window.DaedalusPlanning
      if (!root || !core || !planningCore) {
        throw new Error('Storycraft could not initialize.')
      }

      const timelinePanel = root.querySelector('#daedalus-plan-timeline-panel')
      const plotPanel = root.querySelector('#daedalus-plan-plot-panel')
      const relationshipsPanel = root.querySelector('#daedalus-plan-relationships-panel')
      const documentPanel = root.querySelector('#daedalus-plan-document-panel')

      if (!timelinePanel || !plotPanel || !relationshipsPanel || !documentPanel) {
        throw new Error('Storycraft panels are missing from Planning Station.')
      }

      let relationshipCategory = 'all'

      let documentOptions = {
        detail: 'standard',
        includeSecrets: true,
        includeNotes: true,
        includeEmpty: false,
        includeHidden: false,
        includeRelationships: true,
        includeTimeline: true,
        includePlotBoard: true,
        format: 'markdown'
      }

      function planning() {
        return getPlanning()
      }

      function projectTitle() {
        const project = getProject()
        return project?.meta?.title || project?.character?.name || 'Daedalus Project'
      }

      function entityById(id) {
        return planning().entities.find(entity => entity.id === id) || null
      }

      function connectedNames(entityId) {
        const names = []
        for (const connection of planning().connections) {
          if (connection.sourceId !== entityId && connection.targetId !== entityId) continue
          const other = entityById(connection.sourceId === entityId ? connection.targetId : connection.sourceId)
          if (other) names.push(other.name)
        }
        return names
      }

      function renderTimeline() {
        const items = core.sortTimeline(planning().entities.filter(entity => !entity.hidden))
        timelinePanel.innerHTML = `
          <div class="daedalus-story-head">
            <div>
              <div class="daedalus-card-label">STORYCRAFT · TIMELINE</div>
              <h2>Put events in an order that makes sense.</h2>
              <p>Events and Scenes appear here. Use dates, chapter numbers, or simple ordering labels like “Before arrival”.</p>
            </div>
            <div class="daedalus-story-head-actions">
              <button data-story-add-event class="daedalus-primary-button" type="button">＋ Event</button>
              <button data-story-add-scene class="daedalus-secondary-button" type="button">＋ Scene</button>
            </div>
          </div>
          <div class="daedalus-story-timeline">
            ${items.length ? items.map((entity, index) => {
              const meta = planningCore.ENTITY_TYPES[entity.type] || planningCore.ENTITY_TYPES.custom
              const order = entity.fields?.date || entity.fields?.order || ''
              const connections = connectedNames(entity.id)
              return `
                <article class="daedalus-story-timeline-item daedalus-plan-type-${escapeHtml(entity.type)}" data-story-entity="${escapeHtml(entity.id)}">
                  <div class="daedalus-story-timeline-rail">
                    <span>${index + 1}</span>
                  </div>
                  <div class="daedalus-story-timeline-card">
                    <div class="daedalus-story-card-top">
                      <span class="daedalus-story-type">${escapeHtml(meta.icon)} ${escapeHtml(meta.label)}</span>
                      <button data-story-focus="${escapeHtml(entity.id)}" type="button">Open dossier</button>
                    </div>
                    <h3>${escapeHtml(entity.name || 'Untitled')}</h3>
                    ${entity.description ? `<p>${escapeHtml(entity.description)}</p>` : '<p class="daedalus-plan-muted">No summary yet.</p>'}
                    <label class="daedalus-story-inline-field">
                      <span>When / Order</span>
                      <input data-story-timeline-order="${escapeHtml(entity.id)}" type="text" value="${escapeHtml(order)}" placeholder="1, 2026-01-03, Chapter 2, Before arrival...">
                    </label>
                    ${connections.length ? `<div class="daedalus-story-linked"><span>Linked:</span>${connections.slice(0, 5).map(name => `<button data-story-jump-name="${escapeHtml(name)}" type="button">${escapeHtml(name)}</button>`).join('')}</div>` : ''}
                  </div>
                </article>
              `
            }).join('') : `
              <div class="daedalus-story-empty">
                <span>◷</span>
                <h3>No timeline entries yet.</h3>
                <p>Create an Event or Scene in the Labyrinth and give it an order.</p>
                <button data-story-add-event class="daedalus-primary-button" type="button">Create first event</button>
              </div>
            `}
          </div>
        `
      }

      function renderPlotBoard() {
        const columns = core.plotColumns(planning().entities.filter(entity => !entity.hidden))
        plotPanel.innerHTML = `
          <div class="daedalus-story-head">
            <div>
              <div class="daedalus-card-label">STORYCRAFT · PLOT BOARD</div>
              <h2>Move story threads from idea to resolution.</h2>
              <p>Drag Plot Thread cards between stages. Their Stage field stays synchronized with the board.</p>
            </div>
            <button data-story-add-plot class="daedalus-primary-button" type="button">＋ Plot Thread</button>
          </div>
          <div class="daedalus-story-kanban">
            ${core.PLOT_STAGES.map(stage => `
              <section class="daedalus-story-kanban-column" data-story-stage="${escapeHtml(stage)}">
                <header><strong>${escapeHtml(stage)}</strong><span>${columns[stage].length}</span></header>
                <div class="daedalus-story-kanban-list" data-story-drop-stage="${escapeHtml(stage)}">
                  ${columns[stage].map(entity => `
                    <article class="daedalus-story-plot-card" draggable="true" data-story-plot-id="${escapeHtml(entity.id)}">
                      <div class="daedalus-story-card-top">
                        <span>${(entity.tags || []).slice(0, 2).map(tag => `<small>${escapeHtml(tag)}</small>`).join('')}</span>
                        <button data-story-focus="${escapeHtml(entity.id)}" type="button">↗</button>
                      </div>
                      <h3>${escapeHtml(entity.name || 'Untitled')}</h3>
                      ${entity.fields?.objective ? `<p>${escapeHtml(entity.fields.objective)}</p>` : '<p class="daedalus-plan-muted">No objective yet.</p>'}
                      ${entity.fields?.stakes ? `<div class="daedalus-story-stakes"><span>Stakes</span>${escapeHtml(entity.fields.stakes)}</div>` : ''}
                    </article>
                  `).join('') || '<div class="daedalus-story-kanban-placeholder">Drop a plot thread here</div>'}
                </div>
              </section>
            `).join('')}
          </div>
        `
      }

      function relationshipEntities() {
        const preferred = new Set(['character', 'group', 'faction'])
        const items = planning().entities.filter(entity => !entity.hidden && preferred.has(entity.type))
        return items.length ? items : planning().entities.filter(entity => !entity.hidden)
      }

      function relationLabelBetween(a, b) {
        const relations = planning().connections.filter(connection =>
          ((connection.sourceId === a && connection.targetId === b) ||
          (connection.sourceId === b && connection.targetId === a)) &&
          (relationshipCategory === 'all' || (connection.category || 'relationship') === relationshipCategory)
        )
        return relations.map(item => item.label || 'connected').join(' / ')
      }

      function renderRelationships() {
        const entities = relationshipEntities()
        const relations = core.relationMap(planning()).filter(item =>
          !item.source.hidden && !item.target.hidden &&
          (relationshipCategory === 'all' || (item.category || 'relationship') === relationshipCategory)
        )
        const matrixEntities = entities.slice(0, 14)

        relationshipsPanel.innerHTML = `
          <div class="daedalus-story-head">
            <div>
              <div class="daedalus-card-label">STORYCRAFT · RELATIONSHIPS</div>
              <h2>See the cast and world as a relationship map.</h2>
              <p>The matrix prioritizes Characters, Groups, and Factions. All connection types remain visible below.</p>
            </div>
            <div class="daedalus-story-head-actions">
              <select data-story-relation-filter class="daedalus-plan-select" aria-label="Filter relationship category">
                <option value="all">All connections</option>
                ${core.CONNECTION_CATEGORIES.map(([value, label]) => `<option value="${escapeHtml(value)}" ${relationshipCategory === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
              </select>
              <button data-story-create-relation class="daedalus-primary-button" type="button">＋ Relationship</button>
            </div>
          </div>
          ${matrixEntities.length ? `
            <div class="daedalus-story-matrix-wrap">
              <table class="daedalus-story-matrix">
                <thead><tr><th>Entity</th>${matrixEntities.map(entity => `<th title="${escapeHtml(entity.name)}">${escapeHtml((entity.name || '?').slice(0, 12))}</th>`).join('')}</tr></thead>
                <tbody>
                  ${matrixEntities.map(row => `
                    <tr>
                      <th><button data-story-focus="${escapeHtml(row.id)}" type="button">${escapeHtml(row.name)}</button></th>
                      ${matrixEntities.map(column => {
                        if (row.id === column.id) return '<td class="is-self">—</td>'
                        const label = relationLabelBetween(row.id, column.id)
                        return `<td class="${label ? 'has-relation' : ''}" title="${escapeHtml(label)}">${label ? escapeHtml(label.slice(0, 18)) : '·'}</td>`
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="daedalus-story-empty"><span>↔</span><h3>No relationship entities yet.</h3><p>Create characters, groups, or factions first.</p></div>'}
          <div class="daedalus-story-relationship-list">
            ${relations.length ? relations.map(relation => `
              <article>
                <button data-story-focus="${escapeHtml(relation.source.id)}" type="button">${escapeHtml(relation.source.name)}</button>
                <span class="daedalus-story-relation-arrow">${relation.directed === false ? '↔' : '→'}</span>
                <button data-story-edit-relation="${escapeHtml(relation.id)}" type="button"><strong>${escapeHtml(relation.label || 'connected to')}</strong><small>${escapeHtml(relation.category || 'relationship')}</small></button>
                <span class="daedalus-story-relation-arrow">${relation.directed === false ? '↔' : '→'}</span>
                <button data-story-focus="${escapeHtml(relation.target.id)}" type="button">${escapeHtml(relation.target.name)}</button>
              </article>
            `).join('') : '<p class="daedalus-plan-muted">No connections yet.</p>'}
          </div>
        `
      }

      function documentText() {
        return core.planningDocument(planning(), projectTitle(), {
          ...documentOptions,
          projectNotes: getProject()?.notes || ''
        })
      }

      function renderDocument() {
        const doc = documentText()
        const counts = {
          entities: planning().entities.filter(entity => !entity.hidden).length,
          connections: planning().connections.length,
          events: planning().entities.filter(entity => entity.type === 'event' || entity.type === 'scene').length,
          plots: planning().entities.filter(entity => entity.type === 'plot').length
        }
        documentPanel.innerHTML = `
          <div class="daedalus-story-head">
            <div>
              <div class="daedalus-card-label">PLANNING DOCUMENT · EXPORT STUDIO</div>
              <h2>Turn the Labyrinth into a portable planning brief.</h2>
              <p>Preview exactly what a human — or another AI tool — will receive before you export it.</p>
            </div>
            <div class="daedalus-story-head-actions">
              <button data-story-download-md class="daedalus-secondary-button" type="button">Download .md</button>
              <button data-story-download-txt class="daedalus-secondary-button" type="button">Download .txt</button>
              <button data-story-copy-doc class="daedalus-primary-button" type="button">Copy document</button>
            </div>
          </div>
          <div class="daedalus-story-document-layout">
            <aside class="daedalus-story-document-settings">
              <div class="daedalus-story-stat-grid">
                <div><strong>${counts.entities}</strong><span>Entities</span></div>
                <div><strong>${counts.connections}</strong><span>Connections</span></div>
                <div><strong>${counts.events}</strong><span>Timeline</span></div>
                <div><strong>${counts.plots}</strong><span>Plots</span></div>
              </div>
              <label class="daedalus-plan-field"><span>Detail</span><select data-story-doc-option="detail">
                <option value="compact" ${documentOptions.detail === 'compact' ? 'selected' : ''}>Compact</option>
                <option value="standard" ${documentOptions.detail === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="full" ${documentOptions.detail === 'full' ? 'selected' : ''}>Full</option>
              </select></label>
              <label class="daedalus-plan-field"><span>Preview format</span><select data-story-doc-option="format">
                <option value="markdown" ${documentOptions.format === 'markdown' ? 'selected' : ''}>Markdown</option>
                <option value="text" ${documentOptions.format === 'text' ? 'selected' : ''}>Plain text</option>
              </select></label>
              ${[
                ['includeSecrets', 'Include secrets / hidden truths'],
                ['includeNotes', 'Include creator notes'],
                ['includeEmpty', 'Include empty sections'],
                ['includeHidden', 'Include hidden entities'],
                ['includeRelationships', 'Include relationships'],
                ['includeTimeline', 'Include timeline'],
                ['includePlotBoard', 'Include plot board']
              ].map(([key, label]) => `
                <label class="daedalus-plan-check-row"><input data-story-doc-check="${key}" type="checkbox" ${documentOptions[key] ? 'checked' : ''}><span>${label}</span></label>
              `).join('')}
            </aside>
            <div class="daedalus-story-document-preview-wrap">
              <div class="daedalus-story-document-preview-head"><span>${escapeHtml(projectTitle())}</span><small>${documentOptions.format === 'text' ? 'TXT preview' : 'Markdown preview'}</small></div>
              <pre class="daedalus-story-document-preview" data-story-doc-preview>${escapeHtml(doc)}</pre>
            </div>
          </div>
        `
      }

      function renderAll() {
        renderTimeline()
        renderPlotBoard()
        renderRelationships()
        renderDocument()
      }

      function focusEntity(id) {
        selectEntity?.(id, {focus: false})
        setPlanningMode?.('canvas')
        setTimeout(() => selectEntity?.(id, {focus: true}), 0)
      }

      timelinePanel.addEventListener('click', event => {
        if (event.target.closest('[data-story-add-event]')) openEntityModal?.('event')
        if (event.target.closest('[data-story-add-scene]')) openEntityModal?.('scene')
        const focus = event.target.closest('[data-story-focus]')
        if (focus) focusEntity(focus.dataset.storyFocus)
        const jump = event.target.closest('[data-story-jump-name]')
        if (jump) {
          const entity = planning().entities.find(item => item.name === jump.dataset.storyJumpName)
          if (entity) focusEntity(entity.id)
        }
      })

      timelinePanel.addEventListener('change', event => {
        const input = event.target.closest('[data-story-timeline-order]')
        if (!input) return
        const entity = entityById(input.dataset.storyTimelineOrder)
        if (!entity) return
        entity.fields = entity.fields || {}
        if (entity.type === 'event') entity.fields.date = input.value
        else entity.fields.order = input.value
        entity.updatedAt = new Date().toISOString()
        markDirty?.()
        renderTimeline()
      })

      plotPanel.addEventListener('click', event => {
        if (event.target.closest('[data-story-add-plot]')) openEntityModal?.('plot')
        const focus = event.target.closest('[data-story-focus]')
        if (focus) focusEntity(focus.dataset.storyFocus)
      })

      plotPanel.addEventListener('dragstart', event => {
        const card = event.target.closest('[data-story-plot-id]')
        if (!card || !event.dataTransfer) return
        event.dataTransfer.setData('text/daedalus-plot', card.dataset.storyPlotId)
        event.dataTransfer.effectAllowed = 'move'
        card.classList.add('is-dragging')
      })

      plotPanel.addEventListener('dragend', event => {
        event.target.closest('[data-story-plot-id]')?.classList.remove('is-dragging')
      })

      plotPanel.addEventListener('dragover', event => {
        const drop = event.target.closest('[data-story-drop-stage]')
        if (!drop) return
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      })

      plotPanel.addEventListener('drop', event => {
        const drop = event.target.closest('[data-story-drop-stage]')
        if (!drop || !event.dataTransfer) return
        event.preventDefault()
        const entity = entityById(event.dataTransfer.getData('text/daedalus-plot'))
        if (!entity || entity.type !== 'plot') return
        entity.fields = entity.fields || {}
        entity.fields.stage = drop.dataset.storyDropStage
        entity.updatedAt = new Date().toISOString()
        markDirty?.()
        renderPlotBoard()
        toast?.(`Plot moved to ${drop.dataset.storyDropStage}.`, 'success')
      })

      relationshipsPanel.addEventListener('change', event => {
        const filter = event.target.closest('[data-story-relation-filter]')
        if (!filter) return
        relationshipCategory = filter.value
        renderRelationships()
      })

      relationshipsPanel.addEventListener('click', event => {
        const focus = event.target.closest('[data-story-focus]')
        if (focus) focusEntity(focus.dataset.storyFocus)

        const edit = event.target.closest('[data-story-edit-relation]')
        if (edit) {
          const connection = planning().connections.find(item => item.id === edit.dataset.storyEditRelation)
          if (connection) openConnectionModal?.(connection.sourceId, connection.targetId, connection)
        }

        if (event.target.closest('[data-story-create-relation]')) {
          const entities = relationshipEntities()
          if (entities.length < 2) {
            toast?.('Create at least two Planning entities first.', 'warning')
            return
          }
          openConnectionModal?.(entities[0].id, entities[1].id, null, {allowEndpoints: true})
        }
      })

      documentPanel.addEventListener('change', event => {
        const select = event.target.closest('[data-story-doc-option]')
        if (select) {
          documentOptions[select.dataset.storyDocOption] = select.value
          renderDocument()
          return
        }
        const checkbox = event.target.closest('[data-story-doc-check]')
        if (checkbox) {
          documentOptions[checkbox.dataset.storyDocCheck] = checkbox.checked
          renderDocument()
        }
      })

      documentPanel.addEventListener('click', async event => {
        if (event.target.closest('[data-story-download-md]')) {
          const markdown = core.planningDocument(planning(), projectTitle(), {...documentOptions, format: 'markdown', projectNotes: getProject()?.notes || ''})
          downloadText(`${sanitizeFilename(projectTitle())}-Planning-Document.md`, markdown, 'text/markdown')
          toast?.('Planning Document exported as Markdown.', 'success')
        }
        if (event.target.closest('[data-story-download-txt]')) {
          const plain = core.planningDocument(planning(), projectTitle(), {...documentOptions, format: 'text', projectNotes: getProject()?.notes || ''})
          downloadText(`${sanitizeFilename(projectTitle())}-Planning-Document.txt`, plain, 'text/plain')
          toast?.('Planning Document exported as text.', 'success')
        }
        if (event.target.closest('[data-story-copy-doc]')) {
          try {
            await navigator.clipboard.writeText(documentText())
            toast?.('Planning Document copied.', 'success')
          } catch (error) {
            toast?.('Could not copy the Planning Document.', 'error')
          }
        }
      })

      renderAll()

      return {
        render: renderAll,
        renderTimeline,
        renderPlotBoard,
        renderRelationships,
        renderDocument
      }
    }
  }
})()
