;(() => {
  'use strict'

  // RP Systems Studio UI

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function option(value, label, current) {
    return `<option value="${escapeHtml(value)}" ${String(current) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`
  }

  function boolRow(id, label, checked, hint = '') {
    return `
      <label class="daedalus-systems-check-row">
        <input type="checkbox" data-system-field="${escapeHtml(id)}" ${checked ? 'checked' : ''}>
        <span><strong>${escapeHtml(label)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</span>
      </label>
    `
  }

  function textField(id, label, value, placeholder = '') {
    return `
      <label class="daedalus-plan-field">
        <span>${escapeHtml(label)}</span>
        <input type="text" data-system-field="${escapeHtml(id)}" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}">
      </label>
    `
  }

  function listField(id, label, value, placeholder = '') {
    const rendered = Array.isArray(value) ? value.join(', ') : String(value || '')
    return textField(id, label, rendered, placeholder)
  }

  function selectField(id, label, current, items) {
    return `
      <label class="daedalus-plan-field">
        <span>${escapeHtml(label)}</span>
        <select data-system-field="${escapeHtml(id)}">
          ${items.map(([value, text]) => option(value, text, current)).join('')}
        </select>
      </label>
    `
  }

  window.DaedalusSystemsStudio = {
    async mount(options) {
      const {
        root,
        store,
        getProject,
        markDirty,
        toast,
        navigate,
        refreshProject,
        isActive
      } = options || {}

      const core = window.DaedalusSystems
      const mount = root?.querySelector('#daedalus-systems-mount')

      if (!root || !store || !core || !mount) {
        throw new Error('RP Systems Studio could not initialize.')
      }

      const {MODULES, MODULE_ORDER, RECIPES, HUD_BLOCKS} = core
      let categoryFilter = 'all'
      let searchTerm = ''
      let modalModuleId = null
      let customRecipes = await store.getCustomSystemRecipes?.() || []

      mount.innerHTML = `
        <div class="daedalus-systems-shell">
          <header class="daedalus-systems-header">
            <div>
              <div class="daedalus-eyebrow">LIVING WORLD</div>
              <h1>RP Systems Studio</h1>
              <p>Choose what the roleplay should keep track of. Daedalus turns these visual settings into prompt instructions; it does not run or modify the chat itself.</p>
            </div>
            <div class="daedalus-systems-header-actions">
              <button id="daedalus-systems-sync-raw" class="daedalus-primary-button" type="button">Sync → Character Prompt</button>
              <button id="daedalus-systems-sync-builder" class="daedalus-secondary-button" type="button">Sync → Builder Rules</button>
            </div>
          </header>

          <div class="daedalus-systems-statusbar">
            <span id="daedalus-systems-enabled-count">0 systems enabled</span>
            <span id="daedalus-systems-sync-state" class="daedalus-systems-sync-pill">Not synced</span>
            <button id="daedalus-systems-remove-raw" type="button">Remove Systems from Raw Prompt</button>
          </div>

          <section class="daedalus-systems-section">
            <div class="daedalus-systems-section-head">
              <div>
                <div class="daedalus-card-label">BEHAVIOR RECIPES</div>
                <h2>Start with the experience you want.</h2>
                <p>Recipes configure a useful bundle of systems and rule foundations. They are starting points and stay completely editable.</p>
              </div>
              <button id="daedalus-systems-save-recipe" class="daedalus-secondary-button" type="button">Save Current as Recipe</button>
            </div>
            <div id="daedalus-systems-recipes" class="daedalus-systems-recipe-grid"></div>
          </section>

          <section class="daedalus-systems-section">
            <div class="daedalus-systems-section-head daedalus-systems-section-head-tools">
              <div>
                <div class="daedalus-card-label">SYSTEM MODULES</div>
                <h2>What should this RP remember?</h2>
              </div>
              <div class="daedalus-systems-filters">
                <label class="daedalus-plan-search">
                  <span>⌕</span>
                  <input id="daedalus-systems-search" type="search" placeholder="Find a system..." autocomplete="off">
                </label>
                <select id="daedalus-systems-category" class="daedalus-plan-select">
                  <option value="all">All categories</option>
                  <option value="Core">Core</option>
                  <option value="State">State</option>
                  <option value="World">World</option>
                  <option value="Continuity">Continuity</option>
                  <option value="Narrative">Narrative</option>
                  <option value="Character">Character</option>
                  <option value="Story">Story</option>
                  <option value="Game">Game</option>
                </select>
              </div>
            </div>
            <div id="daedalus-systems-grid" class="daedalus-systems-grid"></div>
          </section>

          <section class="daedalus-systems-section daedalus-hud-section">
            <div class="daedalus-systems-section-head">
              <div>
                <div class="daedalus-card-label">STATE DISPLAY DESIGNER</div>
                <h2>Design the optional response HUD.</h2>
                <p>This generates formatting instructions for Clank's AI. The example below is only a preview — Daedalus does not inject a runtime HUD into chat.</p>
              </div>
              <label class="daedalus-systems-master-toggle">
                <input id="daedalus-hud-enabled" type="checkbox">
                <span><strong>State Display</strong><small>Enable generated HUD instructions</small></span>
              </label>
            </div>

            <div class="daedalus-hud-layout">
              <div class="daedalus-hud-builder">
                <div class="daedalus-hud-options">
                  <label><span>Position</span><select id="daedalus-hud-position"><option value="top">Top of response</option><option value="bottom">Bottom of response</option></select></label>
                  <label><span>Style</span><select id="daedalus-hud-style"><option value="minimal">Minimal</option><option value="compact">Compact</option><option value="detailed">Detailed</option></select></label>
                  <label><span>Show</span><select id="daedalus-hud-display"><option value="every">Every response</option><option value="changed">When changed</option><option value="scene">Scene transitions</option><option value="asked">Only when asked</option></select></label>
                  <label><span>Title</span><input id="daedalus-hud-title" type="text" maxlength="60"></label>
                </div>

                <div class="daedalus-hud-block-head">
                  <strong>Blocks</strong>
                  <span>Enable and reorder what the model should display.</span>
                </div>
                <div id="daedalus-hud-blocks" class="daedalus-hud-blocks"></div>

                <div class="daedalus-hud-custom-add">
                  <input id="daedalus-hud-custom-label" type="text" placeholder="Custom block label...">
                  <input id="daedalus-hud-custom-hint" type="text" placeholder="What should it contain?">
                  <button id="daedalus-hud-custom-add-button" class="daedalus-secondary-button" type="button">＋ Add Custom Block</button>
                </div>
              </div>

              <div class="daedalus-hud-preview-card">
                <div class="daedalus-card-label">LIVE FORMAT PREVIEW</div>
                <pre id="daedalus-hud-preview"></pre>
                <small>Illustrative values only. The AI tracks the real state during roleplay.</small>
              </div>
            </div>
          </section>

          <section class="daedalus-systems-section">
            <div class="daedalus-systems-section-head">
              <div>
                <div class="daedalus-card-label">DIALOGUE REINFORCEMENT</div>
                <h2>Demonstrate state tracking in Dialogue Examples.</h2>
                <p>Rules tell the model what to track. A generated example can show what correct continuity and HUD formatting should look like.</p>
              </div>
            </div>
            <div class="daedalus-systems-reinforcement-shell">
              <div class="daedalus-hud-options daedalus-systems-reinforcement-options">
                <label class="daedalus-systems-master-toggle is-inline">
                  <input id="daedalus-reinforce-dialogue-enabled" type="checkbox">
                  <span><strong>Reinforce in Dialogue Examples</strong><small>Keep this optional and creator-controlled.</small></span>
                </label>
                <label><span>Example style</span><select id="daedalus-reinforce-dialogue-style"><option value="state">State only</option><option value="natural">Natural RP</option><option value="hud">HUD demonstration</option></select></label>
                <label class="daedalus-systems-check-row daedalus-systems-inline-check">
                  <input id="daedalus-reinforce-dialogue-hud" type="checkbox">
                  <span><strong>Include state display / HUD lines</strong><small>Useful when you want the formatting reinforced visually.</small></span>
                </label>
                <label class="daedalus-systems-check-row daedalus-systems-inline-check">
                  <input id="daedalus-reinforce-dialogue-auto" type="checkbox">
                  <span><strong>Auto-update generated example</strong><small>If enabled, changing Systems updates the generated Dialogue Builder example automatically.</small></span>
                </label>
              </div>
              <div class="daedalus-inline-actions">
                <button id="daedalus-reinforce-dialogue-sync" class="daedalus-primary-button" type="button">Insert / Update in Dialogue Builder</button>
                <button id="daedalus-reinforce-dialogue-remove" class="daedalus-secondary-button" type="button">Remove Generated Example</button>
              </div>
              <div id="daedalus-reinforce-dialogue-status" class="daedalus-systems-reinforcement-status"></div>
              <pre id="daedalus-reinforce-dialogue-preview" class="daedalus-systems-preview"></pre>
            </div>
          </section>

          <section class="daedalus-systems-section">
            <div class="daedalus-systems-section-head">
              <div>
                <div class="daedalus-card-label">GENERATED INSTRUCTIONS</div>
                <h2>See exactly what Daedalus will add.</h2>
              </div>
              <button id="daedalus-systems-copy" class="daedalus-secondary-button" type="button">Copy Instructions</button>
            </div>
            <div id="daedalus-systems-warnings" class="daedalus-systems-warnings"></div>
            <pre id="daedalus-systems-preview" class="daedalus-systems-preview"></pre>
            <label class="daedalus-plan-field">
              <span>Creator system notes <small>Optional instructions added after the generated systems.</small></span>
              <textarea id="daedalus-systems-notes" rows="5" placeholder="Any special system behavior that does not fit the controls above..."></textarea>
            </label>
          </section>
        </div>

        <div id="daedalus-systems-modal" class="daedalus-plan-modal-backdrop daedalus-hidden" role="dialog" aria-modal="true">
          <div id="daedalus-systems-modal-card" class="daedalus-plan-modal daedalus-systems-config-modal"></div>
        </div>
      `

      const grid = mount.querySelector('#daedalus-systems-grid')
      const recipes = mount.querySelector('#daedalus-systems-recipes')
      const warnings = mount.querySelector('#daedalus-systems-warnings')
      const preview = mount.querySelector('#daedalus-systems-preview')
      const hudBlocks = mount.querySelector('#daedalus-hud-blocks')
      const hudPreview = mount.querySelector('#daedalus-hud-preview')
      const modal = mount.querySelector('#daedalus-systems-modal')
      const modalCard = mount.querySelector('#daedalus-systems-modal-card')

      function project() {
        return getProject()
      }

      function systems() {
        if (!project().systems) {
          project().systems = core.createDefaultSystems()
        }
        return project().systems
      }

      function isSyncedToRaw() {
        const compiled = core.compileSystems(systems())
        const prompt = String(project().character?.prompt || '')
        if (!compiled) return !prompt.includes(core.SYSTEM_MARKER_START)
        return core.upsertSystemsSection(prompt, systems()).trim() === prompt.trim()
      }

      function enabledCount() {
        return core.enabledModuleIds(systems()).length
      }

      function moduleSearchMatch(id) {
        const def = MODULES[id]
        if (categoryFilter !== 'all' && def.category !== categoryFilter) return false
        if (!searchTerm) return true
        return `${def.label} ${def.description} ${def.category}`.toLowerCase().includes(searchTerm)
      }

      function renderRecipes() {
        const builtIns = RECIPES.map(recipe => `
          <article class="daedalus-systems-recipe-card">
            <div class="daedalus-systems-recipe-mark">${escapeHtml(recipe.name.slice(0, 1))}</div>
            <div>
              <h3>${escapeHtml(recipe.name)}</h3>
              <p>${escapeHtml(recipe.description)}</p>
              <small>${recipe.modules.length} systems · ${recipe.hud.length} HUD blocks · ${(recipe.rulePresetIds || []).length} rule packs</small>
            </div>
            <div class="daedalus-systems-recipe-actions">
              <button data-recipe-add="${escapeHtml(recipe.id)}" class="daedalus-secondary-button" type="button">Add</button>
              <button data-recipe-use="${escapeHtml(recipe.id)}" class="daedalus-primary-button" type="button">Use Recipe</button>
            </div>
          </article>
        `).join('')

        const custom = customRecipes.map(recipe => `
          <article class="daedalus-systems-recipe-card is-custom">
            <div class="daedalus-systems-recipe-mark">★</div>
            <div>
              <h3>${escapeHtml(recipe.name)}</h3>
              <p>${escapeHtml(recipe.description || 'Saved from your own Systems + Rules configuration.')}</p>
              <small>Custom recipe · available across Daedalus projects</small>
            </div>
            <div class="daedalus-systems-recipe-actions">
              <button data-custom-recipe-delete="${escapeHtml(recipe.id)}" class="daedalus-ghost-button" type="button">Delete</button>
              <button data-custom-recipe-add="${escapeHtml(recipe.id)}" class="daedalus-secondary-button" type="button">Add</button>
              <button data-custom-recipe-use="${escapeHtml(recipe.id)}" class="daedalus-primary-button" type="button">Use Recipe</button>
            </div>
          </article>
        `).join('')

        recipes.innerHTML = builtIns + custom
      }

      function renderModules() {
        const current = systems()
        const ids = MODULE_ORDER.filter(moduleSearchMatch)

        grid.innerHTML = ids.length
          ? ids.map(id => {
              const def = MODULES[id]
              const config = current.modules[id]
              return `
                <article class="daedalus-system-card ${config.enabled ? 'is-enabled' : ''}" data-system-card="${escapeHtml(id)}">
                  <div class="daedalus-system-card-top">
                    <span class="daedalus-system-icon">${escapeHtml(def.icon)}</span>
                    <span class="daedalus-system-category">${escapeHtml(def.category)}</span>
                    <label class="daedalus-system-toggle" title="Enable ${escapeHtml(def.label)}">
                      <input type="checkbox" data-system-toggle="${escapeHtml(id)}" ${config.enabled ? 'checked' : ''}>
                      <span></span>
                    </label>
                  </div>
                  <h3>${escapeHtml(def.label)}</h3>
                  <p>${escapeHtml(def.description)}</p>
                  <div class="daedalus-system-card-footer">
                    <span>${config.enabled ? 'Enabled' : 'Optional'}</span>
                    <button data-system-configure="${escapeHtml(id)}" type="button">Configure →</button>
                  </div>
                </article>
              `
            }).join('')
          : '<div class="daedalus-systems-empty"><strong>No matching systems.</strong><span>Try another search or category.</span></div>'
      }

      function hudRequiredModule(blockId) {
        return {
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
        }[blockId] || null
      }

      function orderedHudBlocks() {
        const hud = systems().hud
        const all = [
          ...(hud.blocks || []).map(block => ({...block, custom: false})),
          ...(hud.customBlocks || []).map(block => ({...block, custom: true}))
        ]
        const byId = new Map(all.map(block => [block.id, block]))
        return (hud.order || all.map(block => block.id))
          .map(id => byId.get(id))
          .filter(Boolean)
      }

      function renderHudBlocks() {
        const all = orderedHudBlocks()

        hudBlocks.innerHTML = all.map((block, index) => `
          <div class="daedalus-hud-block ${block.enabled ? 'is-enabled' : ''}" data-hud-block-id="${escapeHtml(block.id)}" data-hud-custom="${block.custom ? 'true' : 'false'}">
            <span class="daedalus-hud-grip">⋮⋮</span>
            <label class="daedalus-hud-block-check">
              <input type="checkbox" data-hud-action="toggle" ${block.enabled ? 'checked' : ''}>
              <span></span>
            </label>
            <input class="daedalus-hud-block-label" data-hud-action="label" value="${escapeHtml(block.label)}" aria-label="HUD block label">
            ${block.custom ? `<input class="daedalus-hud-block-hint" data-hud-action="hint" value="${escapeHtml(block.hint || '')}" placeholder="Content hint...">` : `<small>${escapeHtml(hudRequiredModule(block.id) ? MODULES[hudRequiredModule(block.id)].label : 'Display block')}</small>`}
            <div class="daedalus-hud-block-actions">
              <button data-hud-action="up" type="button" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button data-hud-action="down" type="button" ${index === all.length - 1 ? 'disabled' : ''}>↓</button>
              ${block.custom ? '<button data-hud-action="delete" type="button">×</button>' : ''}
            </div>
          </div>
        `).join('')
      }

      function renderWarnings() {
        const items = core.inspectSystems(systems())
        warnings.innerHTML = items.length
          ? items.map(item => `
              <div class="daedalus-systems-warning is-${escapeHtml(item.severity || 'suggestion')}">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.detail)}</span>
              </div>
            `).join('')
          : '<div class="daedalus-systems-warning is-clear"><strong>No system conflicts detected.</strong><span>The current configuration is internally consistent.</span></div>'
      }

      function findGeneratedDialogueExample() {
        return (project().dialogue.examples || []).find(example => example.source === 'systems') || null
      }

      function buildDialoguePreviewText() {
        const example = core.compileDialogueReinforcement(systems())
        if (!example) {
          return 'Enable at least one RP system to generate a Dialogue reinforcement example.'
        }
        return [
          `### ${example.label}`,
          example.situation ? `Situation: ${example.situation}` : '',
          example.user,
          example.char
        ].filter(Boolean).join('\n')
      }

      function renderDialogueReinforcement() {
        const previewEl = mount.querySelector('#daedalus-reinforce-dialogue-preview')
        const statusEl = mount.querySelector('#daedalus-reinforce-dialogue-status')
        const cfg = systems().reinforcement?.dialogue || {}
        const generated = findGeneratedDialogueExample()
        const previewText = buildDialoguePreviewText()
        previewEl.textContent = previewText

        if (!cfg.enabled) {
          statusEl.innerHTML = '<div class="daedalus-systems-warning is-suggestion"><strong>Dialogue reinforcement is optional and currently off.</strong><span>Turn it on if you want Daedalus to demonstrate your RP Systems inside the Dialogue Builder.</span></div>'
        } else if (generated) {
          statusEl.innerHTML = `<div class="daedalus-systems-warning is-clear"><strong>Generated example present in Dialogue Builder.</strong><span>${cfg.autoUpdate ? 'Auto-update is on.' : 'Auto-update is off. Update it manually when your Systems change.'}</span></div>`
        } else {
          statusEl.innerHTML = '<div class="daedalus-systems-warning is-suggestion"><strong>No generated dialogue example inserted yet.</strong><span>Use “Insert / Update in Dialogue Builder” to create one.</span></div>'
        }
      }

      function renderPreview() {
        const compiled = core.compileSystems(systems())
        preview.textContent = compiled || 'No RP systems are enabled yet. Enable a module or start from a Behavior Recipe.'
        hudPreview.textContent = core.hudPreview(systems())
        renderDialogueReinforcement()
      }

      function renderStatus() {
        const count = enabledCount()
        const cfg = systems().reinforcement?.dialogue || {}
        mount.querySelector('#daedalus-systems-enabled-count').textContent = `${count} system${count === 1 ? '' : 's'} enabled${systems().hud.enabled ? ' · HUD on' : ''}${cfg.enabled ? ' · Dialogue reinforcement on' : ''}`
        const sync = mount.querySelector('#daedalus-systems-sync-state')
        const synced = isSyncedToRaw()
        sync.textContent = synced ? 'Raw Prompt synced' : 'Raw Prompt needs sync'
        sync.classList.toggle('is-synced', synced)
      }

      function syncControls() {
        const hud = systems().hud
        const cfg = systems().reinforcement?.dialogue || {}
        mount.querySelector('#daedalus-hud-enabled').checked = hud.enabled
        mount.querySelector('#daedalus-hud-position').value = hud.position
        mount.querySelector('#daedalus-hud-style').value = hud.style
        mount.querySelector('#daedalus-hud-display').value = hud.displayMode
        mount.querySelector('#daedalus-hud-title').value = hud.title
        mount.querySelector('#daedalus-systems-notes').value = systems().notes || ''
        mount.querySelector('#daedalus-reinforce-dialogue-enabled').checked = cfg.enabled === true
        mount.querySelector('#daedalus-reinforce-dialogue-style').value = cfg.style || 'natural'
        mount.querySelector('#daedalus-reinforce-dialogue-hud').checked = cfg.includeHud !== false
        mount.querySelector('#daedalus-reinforce-dialogue-auto').checked = cfg.autoUpdate === true
      }

      function renderAll() {
        renderModules()
        renderHudBlocks()
        renderWarnings()
        renderPreview()
        renderStatus()
        syncControls()
      }

      function changed(message = null) {
        markDirty?.()
        if (systems().reinforcement?.dialogue?.enabled && systems().reinforcement.dialogue.autoUpdate) {
          upsertGeneratedDialogueExample(false)
        }
        renderWarnings()
        renderPreview()
        renderStatus()
        if (message) toast?.(message, 'success')
      }

      function moduleConfigFields(id, config) {
        if (id === 'worldState') {
          return [
            selectField('displayMode', 'Suggested display behavior', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            selectField('scope', 'State scope', config.scope, [['scene', 'Current scene'], ['session', 'Whole roleplay']]),
            boolRow('strictPersistence', 'Strict persistence', config.strictPersistence, 'Never silently reset established state.')
          ].join('')
        }

        if (id === 'inventory') {
          return [
            selectField('ownerMode', 'Whose inventory?', config.ownerMode, [['user', '{{user}}'], ['char', '{{char}}'], ['party', 'Party'], ['separate', 'Each character separately']]),
            selectField('displayMode', 'Display', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            boolRow('trackQuantities', 'Track quantities', config.trackQuantities),
            boolRow('trackEquipment', 'Track equipped items', config.trackEquipment),
            boolRow('trackKeyItems', 'Protect key items', config.trackKeyItems),
            boolRow('trackConsumables', 'Consume used items', config.trackConsumables)
          ].join('')
        }

        if (id === 'time') {
          return [
            selectField('calendar', 'Calendar', config.calendar, [['real', 'Normal / setting calendar'], ['fantasy', 'Fantasy calendar'], ['custom', 'Custom calendar']]),
            textField('customCalendar', 'Custom calendar description', config.customCalendar, 'Frostwane calendar, 12 months...'),
            selectField('progression', 'Time progression', config.progression, [['natural', 'Natural / inferred'], ['approximate', 'Approximate'], ['explicit', 'Only when explicitly advanced']]),
            boolRow('showExactTime', 'Track exact/approximate time', config.showExactTime),
            boolRow('showDate', 'Track date / day', config.showDate),
            boolRow('showSeason', 'Track season', config.showSeason)
          ].join('')
        }

        if (id === 'weather') {
          return [
            selectField('climate', 'Climate', config.climate, [['temperate', 'Temperate'], ['tropical', 'Tropical'], ['desert', 'Desert'], ['arctic', 'Arctic'], ['fantasy', 'Fantasy'], ['custom', 'Custom']]),
            textField('customClimate', 'Custom climate', config.customClimate, 'Describe the climate...'),
            selectField('persistence', 'Persistence', config.persistence, [['strong', 'Strong'], ['normal', 'Normal']]),
            boolRow('affectEnvironment', 'Weather affects environment', config.affectEnvironment, 'Clothing, visibility, travel, surfaces, ambience.')
          ].join('')
        }

        if (id === 'location') {
          return [
            boolRow('trackSubLocation', 'Track rooms / sub-locations', config.trackSubLocation),
            boolRow('trackNearbyCharacters', 'Track nearby characters', config.trackNearbyCharacters),
            boolRow('strictPositioning', 'Strict physical positioning', config.strictPositioning),
            boolRow('displayLocation', 'Allow location in HUD', config.displayLocation)
          ].join('')
        }

        if (id === 'thoughts') {
          return [
            selectField('scope', 'Whose thoughts?', config.scope, [['main', 'Main {{char}} only'], ['pov', 'Current POV character'], ['all', 'All major characters']]),
            selectField('frequency', 'Frequency', config.frequency, [['rare', 'Rare'], ['occasional', 'Occasional'], ['frequent', 'Frequent']]),
            selectField('format', 'Format', config.format, [['italics', 'Inline italics'], ['block', 'Dedicated thought block'], ['parenthetical', 'Parenthetical'], ['custom', 'Custom']]),
            textField('customFormat', 'Custom thought format', config.customFormat, 'e.g. Thought — Name: ...'),
            boolRow('dramaticIrony', 'Allow dramatic irony', config.dramaticIrony, 'Thoughts may reveal things {{user}} does not know in-character.')
          ].join('')
        }

        if (id === 'relationships') {
          return [
            listField('dimensions', 'Relationship dimensions', config.dimensions, 'trust, affection, respect, fear, suspicion'),
            selectField('display', 'Display style', config.display, [['hidden', 'Hidden / behavioral'], ['descriptive', 'Descriptive'], ['numeric', 'Numeric / game-like']]),
            boolRow('meaningfulChangesOnly', 'Meaningful changes only', config.meaningfulChangesOnly),
            boolRow('separatePerCharacter', 'Separate state per character', config.separatePerCharacter)
          ].join('')
        }

        if (id === 'conditions') {
          return [
            listField('trackers', 'Trackers', config.trackers, 'health, injuries, fatigue, hunger, stress, mana, stamina'),
            selectField('display', 'Display style', config.display, [['descriptive', 'Descriptive'], ['numeric', 'Numeric']]),
            boolRow('recoveryMustBeJustified', 'Recovery must be justified', config.recoveryMustBeJustified)
          ].join('')
        }

        if (id === 'objectives') {
          return [
            selectField('displayMode', 'Display', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            boolRow('main', 'Main objective', config.main),
            boolRow('side', 'Side objectives', config.side),
            boolRow('hidden', 'Hidden objectives', config.hidden),
            boolRow('completed', 'Remember completed objectives', config.completed)
          ].join('')
        }

        if (id === 'mystery') {
          return [
            selectField('displayMode', 'Display', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            boolRow('trackClues', 'Track discovered clues', config.trackClues),
            boolRow('trackQuestions', 'Track unresolved questions', config.trackQuestions),
            boolRow('trackRedHerrings', 'Track red herrings', config.trackRedHerrings),
            boolRow('protectUndiscovered', 'Protect undiscovered information', config.protectUndiscovered)
          ].join('')
        }

        if (id === 'knowledge') {
          return [
            boolRow('strictBoundaries', 'Strict knowledge boundaries', config.strictBoundaries),
            boolRow('trackSuspicions', 'Distinguish suspicions from facts', config.trackSuspicions),
            boolRow('trackFalseBeliefs', 'Allow persistent false beliefs', config.trackFalseBeliefs),
            boolRow('revealOnlyWhenJustified', 'Reveal secrets only when justified', config.revealOnlyWhenJustified)
          ].join('')
        }

        if (id === 'currency') {
          return [
            textField('currencyName', 'Currency', config.currencyName, 'gold, credits, dollars...'),
            selectField('displayMode', 'Display', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            boolRow('trackPurchases', 'Track purchases / transfers', config.trackPurchases),
            boolRow('enforceAffordability', 'Enforce affordability', config.enforceAffordability),
            boolRow('allowDebt', 'Allow debt / negative balance', config.allowDebt)
          ].join('')
        }

        if (id === 'appearance') {
          return [
            selectField('displayMode', 'Display', config.displayMode, [['hidden', 'Narrative only'], ['changed', 'When changed'], ['asked', 'Only when asked']]),
            boolRow('trackOutfit', 'Track clothing / layers', config.trackOutfit),
            boolRow('trackAccessories', 'Track accessories', config.trackAccessories),
            boolRow('trackDamage', 'Track damage / blood / tears', config.trackDamage),
            boolRow('trackWetDirty', 'Track wetness / dirt / dust', config.trackWetDirty)
          ].join('')
        }

        if (id === 'objects') {
          return [
            selectField('displayMode', 'Display', config.displayMode, [['every', 'Every response'], ['changed', 'When changed'], ['scene', 'Scene transitions'], ['asked', 'Only when asked']]),
            boolRow('trackOwnership', 'Track ownership', config.trackOwnership),
            boolRow('trackLocation', 'Track object location', config.trackLocation),
            boolRow('trackCondition', 'Track condition', config.trackCondition),
            boolRow('trackOpenClosed', 'Track open/closed/locked states', config.trackOpenClosed)
          ].join('')
        }

        if (id === 'skills') {
          return [
            listField('values', 'Skills / stats', config.values, 'strength, magic, perception, medicine'),
            selectField('mode', 'Value style', config.mode, [['descriptive', 'Descriptive'], ['numeric', 'Numeric'], ['hidden', 'Hidden']]),
            selectField('displayMode', 'Display', config.displayMode, [['hidden', 'Hidden'], ['changed', 'When changed'], ['every', 'Every response'], ['asked', 'Only when asked']]),
            boolRow('changesRequireCause', 'Changes require a cause', config.changesRequireCause)
          ].join('')
        }

        if (id === 'reputation') {
          return [
            selectField('display', 'Display style', config.display, [['hidden', 'Hidden / behavioral'], ['descriptive', 'Descriptive'], ['numeric', 'Numeric']]),
            boolRow('meaningfulChangesOnly', 'Meaningful changes only', config.meaningfulChangesOnly),
            boolRow('separatePerFaction', 'Separate reputation per faction', config.separatePerFaction)
          ].join('')
        }

        return '<p>No extra configuration is needed for this system.</p>'
      }

      function openModuleConfig(id) {
        const def = MODULES[id]
        const config = systems().modules[id]
        if (!def || !config) return
        modalModuleId = id

        modalCard.innerHTML = `
          <div class="daedalus-plan-modal-head">
            <div>
              <div class="daedalus-eyebrow">${escapeHtml(def.category)} SYSTEM</div>
              <h2>${escapeHtml(def.icon)} ${escapeHtml(def.label)}</h2>
              <p>${escapeHtml(def.description)}</p>
            </div>
            <button data-systems-modal-close type="button">×</button>
          </div>
          <div class="daedalus-systems-config-body">
            ${moduleConfigFields(id, config)}
          </div>
          <div class="daedalus-plan-modal-actions">
            <label class="daedalus-systems-master-toggle is-inline">
              <input id="daedalus-system-modal-enabled" type="checkbox" ${config.enabled ? 'checked' : ''}>
              <span><strong>Enable system</strong></span>
            </label>
            <button data-systems-modal-close class="daedalus-primary-button" type="button">Done</button>
          </div>
        `
        modal.classList.remove('daedalus-hidden')

        modalCard.querySelectorAll('[data-systems-modal-close]').forEach(button => {
          button.addEventListener('click', closeModal)
        })

        modalCard.querySelector('#daedalus-system-modal-enabled').addEventListener('change', event => {
          config.enabled = event.target.checked
          changed()
        })

        modalCard.querySelectorAll('[data-system-field]').forEach(control => {
          const eventName = control.matches('select, input[type="checkbox"]') ? 'change' : 'input'
          control.addEventListener(eventName, event => {
            const key = event.target.dataset.systemField
            if (event.target.type === 'checkbox') {
              config[key] = event.target.checked
            } else if (['dimensions', 'trackers', 'values'].includes(key)) {
              config[key] = event.target.value.split(',').map(item => item.trim()).filter(Boolean)
            } else {
              config[key] = event.target.value
            }
            changed()
          })
        })
      }

      function closeModal() {
        modal.classList.add('daedalus-hidden')
        modalCard.innerHTML = ''
        modalModuleId = null
        renderModules()
        renderStatus()
      }

      function upsertGeneratedDialogueExample(showToast = true) {
        const cfg = systems().reinforcement?.dialogue || {}
        if (!cfg.enabled) {
          if (showToast) toast?.('Enable Dialogue reinforcement first.', 'warning')
          return null
        }

        const generated = core.compileDialogueReinforcement(systems())
        if (!generated) {
          if (showToast) toast?.('Enable at least one RP system before generating a Dialogue reinforcement example.', 'warning')
          return null
        }

        const existingIndex = (project().dialogue.examples || []).findIndex(example => example.source === 'systems')
        const next = {
          id: existingIndex >= 0 ? project().dialogue.examples[existingIndex].id : store.makeId('dialogue'),
          label: generated.label,
          situation: generated.situation,
          user: generated.user,
          char: generated.char,
          source: 'systems'
        }

        if (existingIndex >= 0) {
          project().dialogue.examples.splice(existingIndex, 1, next)
        } else {
          project().dialogue.examples.unshift(next)
        }

        markDirty?.()
        refreshProject?.()
        renderDialogueReinforcement()
        if (showToast) {
          toast?.('Generated Dialogue reinforcement example updated in Dialogue Builder.', 'success')
        }
        return next
      }

      function removeGeneratedDialogueExample(showToast = true) {
        const before = project().dialogue.examples.length
        project().dialogue.examples = (project().dialogue.examples || []).filter(example => example.source !== 'systems')
        if (project().dialogue.examples.length === before) {
          if (showToast) toast?.('No generated Dialogue reinforcement example was found.', 'info')
          return false
        }
        markDirty?.()
        refreshProject?.()
        renderDialogueReinforcement()
        if (showToast) toast?.('Generated Dialogue reinforcement example removed.', 'success')
        return true
      }

      function applyCustomRecipe(recipe, replace) {
        if (!recipe) return
        if (replace) {
          project().systems = core.normalizeSystems(recipe.systems)
          if (recipe.rulesText) {
            project().character.builder.rules = recipe.rulesText
          }
        } else {
          const incoming = core.normalizeSystems(recipe.systems)
          const current = core.normalizeSystems(systems())
          for (const id of MODULE_ORDER) {
            if (incoming.modules[id]?.enabled) current.modules[id].enabled = true
          }
          if (incoming.hud.enabled) {
            current.hud.enabled = true
            const enabledIncoming = new Set([
              ...(incoming.hud.blocks || []).filter(block => block.enabled).map(block => block.id),
              ...(incoming.hud.customBlocks || []).filter(block => block.enabled !== false).map(block => block.id)
            ])
            current.hud.blocks = current.hud.blocks.map(block => ({
              ...block,
              enabled: block.enabled || enabledIncoming.has(block.id)
            }))
            for (const block of incoming.hud.customBlocks || []) {
              if (!current.hud.customBlocks.some(item => item.label === block.label)) {
                const cloned = {...block, id: store.makeId('hud')}
                current.hud.customBlocks.push(cloned)
                current.hud.order.push(cloned.id)
              }
            }
          }
          project().systems = current
          if (recipe.rulesText) {
            project().character.builder.rules = appendRulePack(
              project().character.builder.rules,
              recipe.rulesText
            )
          }
        }
        markDirty?.()
        refreshProject?.()
        renderAll()
        toast?.(`${recipe.name} ${replace ? 'recipe applied' : 'added to this project'}.`, 'success')
      }

      async function saveCurrentRecipe() {
        const name = prompt('Name this custom Behavior Recipe:')
        if (!name?.trim()) return
        const description = prompt('Optional short description:', '') || ''
        await store.saveCustomSystemRecipe?.({
          name: name.trim(),
          description: description.trim(),
          systems: core.clone(systems()),
          rulesText: String(project().character?.builder?.rules || '')
        })
        customRecipes = await store.getCustomSystemRecipes?.() || []
        renderRecipes()
        toast?.('Custom Behavior Recipe saved.', 'success')
      }

      function appendRulePack(existing, addition) {
        const before = String(existing || '').trim()
        const lines = String(addition || '')
          .split(/\n+/)
          .map(line => line.trim())
          .filter(Boolean)
        if (!lines.length) return before
        const currentLines = new Set(
          before.split(/\n+/).map(line => line.trim()).filter(Boolean)
        )
        const unique = lines.filter(line => !currentLines.has(line))
        if (!unique.length) return before
        return [before, unique.join('\n')].filter(Boolean).join('\n')
      }

      function applyRecipeRules(recipe, replace) {
        const rulesLibrary = window.DaedalusRulesLibrary
        if (!rulesLibrary || !recipe?.rulePresetIds?.length) return
        const compiled = recipe.rulePresetIds
          .map(id => rulesLibrary.compilePreset(id))
          .filter(Boolean)
          .join('\n')
        if (!compiled) return
        if (replace) {
          const currentRules = String(project().character?.builder?.rules || '')
          const withoutSystems = core.stripSystemsSection(currentRules)
          project().character.builder.rules = appendRulePack(withoutSystems, compiled)
        } else {
          project().character.builder.rules = appendRulePack(
            project().character.builder.rules,
            compiled
          )
        }
      }

      function applyRecipe(recipeId, replace) {
        const recipe = RECIPES.find(item => item.id === recipeId)
        if (!recipe) return

        if (replace) {
          project().systems = core.applyRecipe(systems(), recipeId)
        } else {
          const next = core.normalizeSystems(systems())
          for (const id of recipe.modules) next.modules[id].enabled = true
          next.hud.enabled = next.hud.enabled || recipe.hud.length > 0
          next.hud.blocks = next.hud.blocks.map(block => ({
            ...block,
            enabled: block.enabled || recipe.hud.includes(block.id)
          }))
          next.hud.order = [
            ...recipe.hud,
            ...next.hud.order.filter(id => !recipe.hud.includes(id))
          ]
          project().systems = next
        }

        applyRecipeRules(recipe, replace)
        markDirty?.()
        refreshProject?.()
        renderAll()
        toast?.(`${recipe.name} ${replace ? 'recipe applied' : 'systems and rule foundations added'}.`, 'success')
      }

      function syncToRaw() {
        const compiled = core.compileSystems(systems())
        const next = core.upsertSystemsSection(project().character.prompt, systems())

        if (next.length > 25000) {
          toast?.(`Systems would push Character Prompt to ${next.length.toLocaleString()} / 25,000 characters.`, 'error')
          return
        }

        project().character.prompt = next
        markDirty?.()
        refreshProject?.()
        renderStatus()
        toast?.(compiled ? 'RP Systems synced to Character Prompt.' : 'RP Systems section removed from Character Prompt.', 'success')
      }

      function syncToBuilder() {
        const current = String(project().character.builder?.rules || '')
        project().character.builder.rules = core.upsertSystemsSection(current, systems())
        markDirty?.()
        refreshProject?.()
        toast?.('RP Systems synced to Builder Rules. Compile the Character Builder when ready.', 'success')
      }

      function removeFromRaw() {
        project().character.prompt = core.stripSystemsSection(project().character.prompt)
        markDirty?.()
        refreshProject?.()
        renderStatus()
        toast?.('RP Systems section removed from the raw Character Prompt. Systems settings are still saved.', 'info')
      }

      function moveHudBlock(id, isCustom, direction) {
        const order = systems().hud.order
        const index = order.indexOf(id)
        const next = index + direction
        if (index < 0 || next < 0 || next >= order.length) return
        ;[order[index], order[next]] = [order[next], order[index]]
        markDirty?.()
        renderHudBlocks()
        renderPreview()
      }

      recipes.addEventListener('click', async event => {
        const customUse = event.target.closest('[data-custom-recipe-use]')
        if (customUse) {
          applyCustomRecipe(customRecipes.find(item => item.id === customUse.dataset.customRecipeUse), true)
          return
        }
        const customAdd = event.target.closest('[data-custom-recipe-add]')
        if (customAdd) {
          applyCustomRecipe(customRecipes.find(item => item.id === customAdd.dataset.customRecipeAdd), false)
          return
        }
        const customDelete = event.target.closest('[data-custom-recipe-delete]')
        if (customDelete) {
          const recipe = customRecipes.find(item => item.id === customDelete.dataset.customRecipeDelete)
          if (!recipe || !confirm(`Delete custom recipe “${recipe.name}”?`)) return
          customRecipes = await store.deleteCustomSystemRecipe?.(recipe.id) || []
          renderRecipes()
          toast?.('Custom Behavior Recipe deleted.', 'info')
          return
        }

        const use = event.target.closest('[data-recipe-use]')
        if (use) {
          applyRecipe(use.dataset.recipeUse, true)
          return
        }
        const add = event.target.closest('[data-recipe-add]')
        if (add) applyRecipe(add.dataset.recipeAdd, false)
      })

      grid.addEventListener('change', event => {
        const toggle = event.target.closest('[data-system-toggle]')
        if (!toggle) return
        const config = systems().modules[toggle.dataset.systemToggle]
        if (!config) return
        config.enabled = toggle.checked
        markDirty?.()
        renderModules()
        renderWarnings()
        renderPreview()
        renderStatus()
      })

      grid.addEventListener('click', event => {
        const button = event.target.closest('[data-system-configure]')
        if (button) openModuleConfig(button.dataset.systemConfigure)
      })

      mount.querySelector('#daedalus-systems-save-recipe').addEventListener('click', saveCurrentRecipe)

      mount.querySelector('#daedalus-systems-search').addEventListener('input', event => {
        searchTerm = event.target.value.trim().toLowerCase()
        renderModules()
      })

      mount.querySelector('#daedalus-systems-category').addEventListener('change', event => {
        categoryFilter = event.target.value
        renderModules()
      })

      mount.querySelector('#daedalus-systems-sync-raw').addEventListener('click', syncToRaw)
      mount.querySelector('#daedalus-systems-sync-builder').addEventListener('click', syncToBuilder)
      mount.querySelector('#daedalus-systems-remove-raw').addEventListener('click', removeFromRaw)

      mount.querySelector('#daedalus-reinforce-dialogue-enabled').addEventListener('change', event => {
        systems().reinforcement.dialogue.enabled = event.target.checked
        changed()
      })

      mount.querySelector('#daedalus-reinforce-dialogue-style').addEventListener('change', event => {
        systems().reinforcement.dialogue.style = event.target.value
        changed()
      })

      mount.querySelector('#daedalus-reinforce-dialogue-hud').addEventListener('change', event => {
        systems().reinforcement.dialogue.includeHud = event.target.checked
        changed()
      })

      mount.querySelector('#daedalus-reinforce-dialogue-auto').addEventListener('change', event => {
        systems().reinforcement.dialogue.autoUpdate = event.target.checked
        changed()
      })

      mount.querySelector('#daedalus-reinforce-dialogue-sync').addEventListener('click', () => {
        upsertGeneratedDialogueExample(true)
      })

      mount.querySelector('#daedalus-reinforce-dialogue-remove').addEventListener('click', () => {
        removeGeneratedDialogueExample(true)
      })

      mount.querySelector('#daedalus-hud-enabled').addEventListener('change', event => {
        systems().hud.enabled = event.target.checked
        changed()
        renderHudBlocks()
      })

      mount.querySelector('#daedalus-hud-position').addEventListener('change', event => {
        systems().hud.position = event.target.value
        changed()
      })

      mount.querySelector('#daedalus-hud-style').addEventListener('change', event => {
        systems().hud.style = event.target.value
        changed()
      })

      mount.querySelector('#daedalus-hud-display').addEventListener('change', event => {
        systems().hud.displayMode = event.target.value
        changed()
      })

      mount.querySelector('#daedalus-hud-title').addEventListener('input', event => {
        systems().hud.title = event.target.value
        changed()
      })

      hudBlocks.addEventListener('change', event => {
        const row = event.target.closest('[data-hud-block-id]')
        if (!row) return
        const id = row.dataset.hudBlockId
        const custom = row.dataset.hudCustom === 'true'
        const list = custom ? systems().hud.customBlocks : systems().hud.blocks
        const block = list.find(item => item.id === id)
        if (!block) return

        if (event.target.dataset.hudAction === 'toggle') {
          block.enabled = event.target.checked
          const moduleId = !custom ? hudRequiredModule(id) : null
          if (block.enabled && moduleId && !systems().modules[moduleId].enabled) {
            systems().modules[moduleId].enabled = true
            toast?.(`${MODULES[moduleId].label} was enabled because its HUD block needs a tracker.`, 'info')
          }
        }

        if (event.target.dataset.hudAction === 'label') block.label = event.target.value
        if (event.target.dataset.hudAction === 'hint' && custom) block.hint = event.target.value
        markDirty?.()
        renderHudBlocks()
        renderModules()
        renderWarnings()
        renderPreview()
        renderStatus()
      })

      hudBlocks.addEventListener('input', event => {
        const row = event.target.closest('[data-hud-block-id]')
        if (!row) return
        const id = row.dataset.hudBlockId
        const custom = row.dataset.hudCustom === 'true'
        const list = custom ? systems().hud.customBlocks : systems().hud.blocks
        const block = list.find(item => item.id === id)
        if (!block) return
        if (event.target.dataset.hudAction === 'label') block.label = event.target.value
        if (event.target.dataset.hudAction === 'hint' && custom) block.hint = event.target.value
        markDirty?.()
        renderPreview()
      })

      hudBlocks.addEventListener('click', event => {
        const button = event.target.closest('button[data-hud-action]')
        if (!button) return
        const row = button.closest('[data-hud-block-id]')
        const id = row.dataset.hudBlockId
        const custom = row.dataset.hudCustom === 'true'
        const action = button.dataset.hudAction

        if (action === 'up') moveHudBlock(id, custom, -1)
        if (action === 'down') moveHudBlock(id, custom, 1)
        if (action === 'delete' && custom) {
          systems().hud.customBlocks = systems().hud.customBlocks.filter(block => block.id !== id)
          systems().hud.order = systems().hud.order.filter(blockId => blockId !== id)
          markDirty?.()
          renderHudBlocks()
          renderPreview()
        }
      })

      mount.querySelector('#daedalus-hud-custom-add-button').addEventListener('click', () => {
        const labelInput = mount.querySelector('#daedalus-hud-custom-label')
        const hintInput = mount.querySelector('#daedalus-hud-custom-hint')
        const label = labelInput.value.trim()
        if (!label) {
          toast?.('Give the custom HUD block a label first.', 'warning')
          labelInput.focus()
          return
        }
        const newBlock = {
          id: store.makeId('hud'),
          label,
          hint: hintInput.value.trim(),
          enabled: true
        }
        systems().hud.customBlocks.push(newBlock)
        systems().hud.order.push(newBlock.id)
        labelInput.value = ''
        hintInput.value = ''
        markDirty?.()
        renderHudBlocks()
        renderPreview()
        renderWarnings()
      })

      mount.querySelector('#daedalus-systems-notes').addEventListener('input', event => {
        systems().notes = event.target.value
        markDirty?.()
        renderPreview()
        renderStatus()
      })

      mount.querySelector('#daedalus-systems-copy').addEventListener('click', async () => {
        const content = core.compileSystems(systems())
        if (!content) {
          toast?.('Enable at least one RP system first.', 'warning')
          return
        }
        try {
          await navigator.clipboard.writeText(content)
          toast?.('Generated RP Systems instructions copied.', 'success')
        } catch (error) {
          toast?.('Could not copy the generated instructions.', 'error')
        }
      })

      modal.addEventListener('click', event => {
        if (event.target === modal) closeModal()
      })

      document.addEventListener('keydown', event => {
        if (!isActive?.()) return
        if (event.key === 'Escape' && !modal.classList.contains('daedalus-hidden')) {
          closeModal()
        }
      })

      function refresh() {
        project().systems = core.normalizeSystems(project().systems)
        renderAll()
      }

      async function refreshGlobalRecipes() {
        customRecipes = await store.getCustomSystemRecipes?.() || []
        renderRecipes()
      }

      function onShow() {
        refresh()
        refreshGlobalRecipes()
      }

      renderRecipes()
      renderAll()

      return {
        refresh,
        onShow,
        syncToRaw
      }
    }
  }
})()
