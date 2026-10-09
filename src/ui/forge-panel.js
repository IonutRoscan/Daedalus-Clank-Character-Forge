;(() => {
  'use strict'

  // Forge workspace

  const BUILT_IN_FRAGMENTS = [
    {
      id: 'builtin-never-control-user',
      name: 'Never Control {{user}}',
      category: 'Roleplay',
      target: 'character',
      content:
        "{{char}} must not dictate {{user}}'s thoughts, dialogue, decisions, emotions, or actions. Leave {{user}} full agency over their own character."
    },
    {
      id: 'builtin-stay-in-character',
      name: 'Stay In Character',
      category: 'Core',
      target: 'character',
      content:
        '{{char}} remains consistent with their established personality, knowledge, motivations, relationships, and limitations. Do not break character without an explicit out-of-character request.'
    },
    {
      id: 'builtin-sensory-detail',
      name: 'Sensory Detail',
      category: 'Narration',
      target: 'character',
      content:
        'Use concrete sensory details, body language, environmental cues, and character-specific observations when they improve the scene. Avoid padding every response with unnecessary description.'
    },
    {
      id: 'builtin-slow-burn',
      name: 'Slow-Burn Relationship',
      category: 'Relationship',
      target: 'character',
      content:
        'Relationship changes should develop gradually through accumulated interactions, trust, conflict, vulnerability, and shared experiences rather than jumping immediately to intense attachment.'
    },
    {
      id: 'builtin-combat',
      name: 'Readable Combat',
      category: 'Action',
      target: 'character',
      content:
        'During combat, keep positions, injuries, momentum, available tools, and immediate threats consistent. Make actions readable and consequential rather than resolving every exchange instantly.'
    },
    {
      id: 'builtin-horror',
      name: 'Horror Tension',
      category: 'Atmosphere',
      target: 'scene',
      content:
        'Build tension through uncertainty, incomplete information, environmental changes, and escalating consequences. Preserve mystery long enough for discoveries to feel earned.'
    }
  ]

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function formatDate(value) {
    if (!value) {
      return 'Unknown time'
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value))
    } catch {
      return String(value)
    }
  }

  function sanitizeFilename(value) {
    return (
      String(value || 'Daedalus-Project')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'Daedalus-Project'
    )
  }

  function appendText(existing, addition) {
    const before = String(existing || '').trimEnd()
    const next = String(addition || '').trim()

    if (!next) {
      return before
    }

    return before ? `${before}\n\n${next}` : next
  }

  function makeDialogueExample(index) {
    return {
      id: window.DaedalusProjectStore.makeId('dialogue'),
      label: `Example ${index + 1}`,
      situation: '',
      user: '',
      char: ''
    }
  }

  function makeInitialMessage(index) {
    return {
      id: window.DaedalusProjectStore.makeId('intro'),
      label: `Initial Message ${index + 1}`,
      content: ''
    }
  }

  window.DaedalusForgePanel = {
    async create() {
      if (document.getElementById('daedalus-forge-root')) {
        return
      }

      const store = window.DaedalusProjectStore
      const compilers = window.DaedalusCompilers
      const rulesLibrary = window.DaedalusRulesLibrary
      const templates = window.DaedalusTemplates
      const inspector = window.DaedalusInspector
      const detector = window.DaedalusFieldDetector
      const planningCore = window.DaedalusPlanning
      const planningUi = window.DaedalusPlanningStation
      const guidanceUi = window.DaedalusGuidance
      const systemsCore = window.DaedalusSystems
      const systemsUi = window.DaedalusSystemsStudio

      if (
        !store ||
        !compilers ||
        !rulesLibrary ||
        !templates ||
        !inspector ||
        !detector ||
        !planningCore ||
        !planningUi ||
        !guidanceUi ||
        !systemsCore ||
        !systemsUi
      ) {
        throw new Error('One or more Daedalus core modules are unavailable.')
      }

      let project = await store.getOrCreateProject()
      let customFragments = await store.getCustomFragments()
      let customRules = await store.getCustomRules()
      let settings = await store.getSettings()
      let editingCustomRuleId = null
      let activeView = 'overview'
      let saveTimer = null
      let isSaving = false
      let pendingSave = false
      let focusedCard = null
      let findTargetId = null
      let findMatchIndex = -1
      let planningStation = null
      let guidanceStation = null
      let systemsStation = null

      const root = document.createElement('div')
      root.id = 'daedalus-forge-root'

      root.innerHTML = `
        <button id="daedalus-launcher" type="button" aria-label="Open Daedalus Character Forge" title="Open Daedalus Character Forge">
          <span class="daedalus-launcher-mark">D</span>
        </button>

        <div id="daedalus-workspace" class="daedalus-hidden" aria-hidden="true">
          <div id="daedalus-splash" class="daedalus-splash daedalus-hidden" aria-hidden="true" data-variant="full">
            <div class="daedalus-splash-grid"></div>
            <div class="daedalus-splash-card">
              <div class="daedalus-splash-mark-wrap">
                <div class="daedalus-splash-mark">D</div>
              </div>
              <div class="daedalus-splash-eyebrow">CLANK CHARACTER FORGE</div>
              <h2 class="daedalus-splash-title">DAEDALUS</h2>
              <p class="daedalus-splash-copy">Build characters. Shape worlds. Design roleplay.</p>
              <div class="daedalus-splash-tracks">
                <span>Character Forge</span>
                <span>RP Systems</span>
                <span>The Labyrinth</span>
              </div>
              <div class="daedalus-splash-actions">
                <button id="daedalus-splash-enter" class="daedalus-primary-button" type="button">Enter Forge</button>
                <button id="daedalus-splash-skip" class="daedalus-secondary-button" type="button">Skip</button>
              </div>
              <div class="daedalus-splash-modes">
                <span>Open animation:</span>
                <label><input type="radio" name="daedalus-splash-mode" value="full"> Full</label>
                <label><input type="radio" name="daedalus-splash-mode" value="minimal"> Minimal</label>
                <label><input type="radio" name="daedalus-splash-mode" value="off"> Off</label>
              </div>
            </div>
          </div>
          <div class="daedalus-shell">
            <header class="daedalus-topbar">
              <div class="daedalus-brand">
                <div class="daedalus-brand-mark">D</div>
                <div>
                  <div class="daedalus-brand-title">DAEDALUS</div>
                  <div class="daedalus-brand-subtitle">CLANK CHARACTER FORGE</div>
                </div>
              </div>

              <div class="daedalus-top-project">
                <span class="daedalus-top-project-label">PROJECT</span>
                <select id="daedalus-project-select" class="daedalus-project-select" aria-label="Current Daedalus project"></select>
              </div>

              <div class="daedalus-top-actions">
                <button id="daedalus-theme-toggle" class="daedalus-secondary-button daedalus-compact-button daedalus-theme-toggle" type="button" title="Switch Daedalus theme">☼ White</button>
                <button id="daedalus-replay-intro" class="daedalus-secondary-button daedalus-compact-button" type="button" title="Replay the Daedalus intro">Intro</button>
                <button id="daedalus-import-clank" class="daedalus-secondary-button daedalus-compact-button" type="button">Import from Clank</button>
                <button id="daedalus-apply-all" class="daedalus-primary-button daedalus-compact-button" type="button">Apply All</button>
                <button id="daedalus-close" class="daedalus-icon-button" type="button" aria-label="Close Daedalus" title="Close Daedalus">×</button>
              </div>
            </header>

            <div class="daedalus-main">
              <aside class="daedalus-sidebar">
                <div class="daedalus-sidebar-section">
                  <div class="daedalus-sidebar-heading">PROJECT</div>
                  <button class="daedalus-nav-item is-active" data-daedalus-view="overview" type="button"><span>◇</span><span>Overview</span></button>
                  <button class="daedalus-nav-item" data-daedalus-view="character" type="button"><span>⌁</span><span>Character</span></button>
                  <button class="daedalus-nav-item" data-daedalus-view="dialogue" type="button"><span>◈</span><span>Dialogue</span></button>
                  <button class="daedalus-nav-item" data-daedalus-view="scene" type="button"><span>▣</span><span>Scene</span></button>
                  <button class="daedalus-nav-item" data-daedalus-view="initials" type="button"><span>✦</span><span>Initial Messages</span></button>
                  <button class="daedalus-nav-item daedalus-nav-systems" data-daedalus-view="systems" type="button"><span>⬢</span><span>RP Systems</span><small>NEW</small></button>
                  <button class="daedalus-nav-item daedalus-nav-planning" data-daedalus-view="planning" type="button"><span>◎</span><span>Planning</span><small>1.3</small></button>
                </div>

                <div class="daedalus-sidebar-section">
                  <div class="daedalus-sidebar-heading">TOOLS</div>
                  <button class="daedalus-nav-item" data-daedalus-view="fragments" type="button"><span>◫</span><span>Fragments</span></button>
                  <button class="daedalus-nav-item" data-daedalus-view="inspector" type="button"><span>△</span><span>Inspector</span></button>
                  <button class="daedalus-nav-item daedalus-nav-guide" data-daedalus-view="guide" type="button"><span>?</span><span>Creator Guide</span><small>101</small></button>
                </div>

                <div class="daedalus-sidebar-footer">
                  <div class="daedalus-project-label">CURRENT PROJECT</div>
                  <div id="daedalus-current-project" class="daedalus-current-project">Loading project...</div>
                  <div id="daedalus-save-state" class="daedalus-save-state">Loading...</div>
                </div>
              </aside>

              <main class="daedalus-content">
                <!-- Overview -->
                <section class="daedalus-view" data-daedalus-view-panel="overview">
                  <div class="daedalus-page-header">
                    <div class="daedalus-eyebrow">PROJECT OVERVIEW</div>
                    <h1 id="daedalus-overview-project-name">Loading project...</h1>
                    <p>Your character lives here first. Daedalus saves locally while Clank stays untouched until you explicitly synchronize your work.</p>
                  </div>

                  <div class="daedalus-overview-stats">
                    <article class="daedalus-stat-card">
                      <span id="daedalus-detected-count" class="daedalus-stat-value">—</span>
                      <span class="daedalus-stat-label">Clank fields detected</span>
                    </article>
                    <article class="daedalus-stat-card">
                      <span id="daedalus-overview-prompt-count" class="daedalus-stat-value">0</span>
                      <span class="daedalus-stat-label">Prompt characters</span>
                    </article>
                    <article class="daedalus-stat-card">
                      <span id="daedalus-overview-intro-count" class="daedalus-stat-value">1</span>
                      <span class="daedalus-stat-label">Initial messages</span>
                    </article>
                    <article class="daedalus-stat-card">
                      <span id="daedalus-overview-issue-count" class="daedalus-stat-value">0</span>
                      <span class="daedalus-stat-label">Inspector notes</span>
                    </article>
                  </div>

                  <div class="daedalus-grid">
                    <article class="daedalus-card daedalus-card-large">
                      <div class="daedalus-card-label">FORGE ACTIONS</div>
                      <h2>Keep the project local until it is ready.</h2>
                      <p>Create variants, recover from mistakes, import the current Clank form, or push the completed project back into Clank when you are ready to publish.</p>
                      <div class="daedalus-card-actions daedalus-wrap-actions">
                        <button id="daedalus-start-building" class="daedalus-primary-button" type="button">Start Building</button>
                        <button id="daedalus-new-project" class="daedalus-secondary-button" type="button">New Project</button>
                        <button id="daedalus-duplicate-project" class="daedalus-secondary-button" type="button">Create Variant</button>
                        <button id="daedalus-snapshot" class="daedalus-secondary-button" type="button">Create Snapshot</button>
                        <button id="daedalus-export-project" class="daedalus-secondary-button" type="button">Export Project</button>
                        <button id="daedalus-import-project" class="daedalus-secondary-button" type="button">Import Project</button>
                        <button id="daedalus-export-backup" class="daedalus-secondary-button" type="button">Backup Everything</button>
                        <button id="daedalus-import-backup" class="daedalus-secondary-button" type="button">Restore Backup</button>
                        <input id="daedalus-import-project-file" type="file" accept="application/json,.json" hidden>
                        <input id="daedalus-import-backup-file" type="file" accept="application/json,.json" hidden>
                      </div>
                    </article>

                    <article class="daedalus-card daedalus-card-large daedalus-guide-overview-card">
                      <div class="daedalus-card-label">NEW TO CHARACTER CREATION?</div>
                      <div class="daedalus-guide-overview-layout">
                        <div>
                          <h2>Build the character with Daedalus beside you.</h2>
                          <p>Guided Creation asks normal creative questions, explains where each answer belongs, and fills the same Builder, Dialogue, Scene, Rules, and Initial Message tools you can edit manually later.</p>
                          <div class="daedalus-card-actions daedalus-wrap-actions">
                            <button id="daedalus-start-guided" class="daedalus-primary-button" type="button">Start Guided Creation</button>
                            <button id="daedalus-open-guide" class="daedalus-secondary-button" type="button">Character Creation 101</button>
                          </div>
                        </div>
                        <div class="daedalus-guide-overview-steps" aria-hidden="true">
                          <span>WHO</span><i></i><span>VOICE</span><i></i><span>SCENE</span><i></i><span>PLAY</span>
                        </div>
                      </div>
                    </article>

                    <article class="daedalus-card daedalus-card-large daedalus-systems-overview-card">
                      <div class="daedalus-card-label">NEW IN 1.2 · LIVING WORLD</div>
                      <div class="daedalus-guide-overview-layout">
                        <div>
                          <h2>Design what the roleplay keeps track of.</h2>
                          <p>Inventory, time, seasons, weather, location, relationships, conditions, quests, secrets, economy, reputation, and more — configured visually and compiled into clear prompt instructions.</p>
                          <div class="daedalus-card-actions daedalus-wrap-actions">
                            <button id="daedalus-open-systems" class="daedalus-primary-button" type="button">Open RP Systems Studio</button>
                            <button id="daedalus-open-systems-guide" class="daedalus-secondary-button" type="button">How Systems Work</button>
                          </div>
                        </div>
                        <div class="daedalus-systems-overview-glyph" aria-hidden="true">
                          <span>TIME</span><span>INV</span><span>LOC</span><span>REL</span><span>QUEST</span>
                        </div>
                      </div>
                    </article>

                    <article class="daedalus-card daedalus-card-large daedalus-planning-overview-card">
                      <div class="daedalus-card-label">NEW IN 1.3 · STORYCRAFT</div>
                      <div class="daedalus-planning-overview-layout">
                        <div>
                          <h2>The Labyrinth</h2>
                          <p>Map the world visually, then switch the same Planning data into Timeline, Plot Board, Relationships, and a portable Planning Document. The Labyrinth stays completely private and never syncs to Clank.</p>
                          <button id="daedalus-open-planning" class="daedalus-primary-button" type="button">Enter Planning Station</button>
                        </div>
                        <div class="daedalus-planning-overview-glyph" aria-hidden="true">
                          <span></span><span></span><span></span><span></span><span></span>
                        </div>
                      </div>
                    </article>

                    <article class="daedalus-card">
                      <div class="daedalus-card-label">PROJECT STATUS</div>
                      <div class="daedalus-status-list">
                        <div><span class="daedalus-status-dot"></span>Local autosave active</div>
                        <div><span class="daedalus-status-dot"></span>Draft survives refresh</div>
                        <div><span class="daedalus-status-dot"></span>Clank synchronization available</div>
                        <div><span class="daedalus-status-dot is-muted"></span>Image files remain manual</div>
                      </div>
                    </article>

                    <article class="daedalus-card">
                      <div class="daedalus-card-label">PUBLISH READINESS</div>
                      <div id="daedalus-ready-state" class="daedalus-ready-state">Checking project…</div>
                      <p id="daedalus-ready-detail">Inspector status will appear here.</p>
                      <button id="daedalus-open-inspector" class="daedalus-secondary-button daedalus-compact-button" type="button">Open Inspector</button>
                    </article>

                    <article class="daedalus-card">
                      <div class="daedalus-card-label">CLANK SYNC STATUS</div>
                      <div id="daedalus-sync-status-list" class="daedalus-sync-status-list"></div>
                    </article>

                    <article class="daedalus-card daedalus-card-large">
                      <div class="daedalus-card-label">PRIVATE PROJECT NOTES</div>
                      <h3>Scratchpad</h3>
                      <p>Notes stay inside Daedalus and are never sent to Clank.</p>
                      <textarea id="daedalus-project-notes" class="daedalus-medium-textarea" placeholder="Ideas to explore, canon references, alternate routes, reminders, things to rewrite later…"></textarea>
                    </article>

                    <article class="daedalus-card daedalus-danger-card">
                      <div class="daedalus-card-label">PROJECT MANAGEMENT</div>
                      <h3>Current project</h3>
                      <p id="daedalus-project-updated">Last updated —</p>
                      <button id="daedalus-delete-project" class="daedalus-danger-button" type="button">Delete Project</button>
                    </article>

                    <article class="daedalus-card daedalus-card-large">
                      <div class="daedalus-card-label">RECOVERY HISTORY</div>
                      <div id="daedalus-history-list" class="daedalus-history-list"></div>
                    </article>
                  </div>
                </section>

                <!-- Creator Guide -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="guide">
                  <div id="daedalus-guide-mount"></div>
                </section>

                <!-- Character -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="character">
                  <div class="daedalus-page-header daedalus-page-header-row">
                    <div>
                      <div class="daedalus-eyebrow">CHARACTER</div>
                      <h1>Character workspace</h1>
                      <p>Raw mode gives you the exact Clank prompt. Builder mode lets you design the character in organized sections, including voice and speech rules.</p>
                    </div>
                    <button id="daedalus-apply-character" class="daedalus-primary-button" type="button">Apply Character</button>
                  </div>

                  <article class="daedalus-editor-card">
                    <div class="daedalus-editor-heading">
                      <div><div class="daedalus-card-label">CHARACTER NAME</div><h2>Identity</h2></div>
                      <div id="daedalus-name-counter" class="daedalus-counter">0 / 100</div>
                    </div>
                    <input id="daedalus-character-name" class="daedalus-text-input" type="text" maxlength="100" placeholder="What's your character called?" autocomplete="off">
                    <div class="daedalus-field-note">Daedalus uses the character name as the local project title.</div>
                  </article>

                  <div class="daedalus-mode-tabs">
                    <button class="daedalus-mode-tab is-active" data-mode-group="character" data-mode="raw" type="button">Raw Prompt</button>
                    <button class="daedalus-mode-tab" data-mode-group="character" data-mode="builder" type="button">Builder</button>
                    <button class="daedalus-mode-tab" data-mode-group="character" data-mode="rules" type="button">AI & RP Rules</button>
                  </div>

                  <div data-mode-panel="character:raw">
                    <article class="daedalus-editor-card">
                      <div class="daedalus-editor-heading">
                        <div><div class="daedalus-card-label">CHARACTER PROMPT</div><h2>Core definition</h2></div>
                        <div id="daedalus-prompt-counter" class="daedalus-counter">0 / 25,000</div>
                      </div>
                      <div class="daedalus-editor-toolbar">
                        <button class="daedalus-tool-button" data-insert="{{char}}" data-target="daedalus-character-prompt" type="button">+ {{char}}</button>
                        <button class="daedalus-tool-button" data-insert="{{user}}" data-target="daedalus-character-prompt" type="button">+ {{user}}</button>
                        <button class="daedalus-tool-button" data-find-target="daedalus-character-prompt" type="button">Find / Replace</button>
                        <button class="daedalus-tool-button" data-copy-target="daedalus-character-prompt" type="button">Copy</button>
                        <button class="daedalus-tool-button" data-focus-target="daedalus-character-prompt" type="button">Focus</button>
                      </div>
                      <textarea id="daedalus-character-prompt" class="daedalus-large-textarea" maxlength="25000" placeholder="Define the character's personality, behavior, appearance, voice, relationships, goals and roleplay instructions..."></textarea>
                      <div class="daedalus-outline-panel">
                        <div><strong>Prompt Outline</strong><span>Detected Markdown-style headings</span></div>
                        <div id="daedalus-character-outline" class="daedalus-outline-list"></div>
                      </div>
                    </article>
                  </div>

                  <div class="daedalus-hidden" data-mode-panel="character:builder">
                    <div class="daedalus-builder-intro">
                      <div><strong>Structured Builder</strong><span>Fill only the sections you need. Voice & Speech describes how the character talks; actual examples live in Dialogue. AI & Roleplay Rules have their own studio and are included when you compile.</span></div>
                      <button id="daedalus-compile-character" class="daedalus-primary-button" type="button">Compile → Raw Prompt</button>
                    </div>
                    <article class="daedalus-template-panel">
                      <div>
                        <div class="daedalus-card-label">QUICK-START TEMPLATE</div>
                        <strong>Scaffold the workflow, not the character.</strong>
                        <p id="daedalus-template-description">Choose a template to arrange Builder sections, prepare useful example slots, and load a matching rules preset.</p>
                      </div>
                      <div class="daedalus-template-actions">
                        <select id="daedalus-template-select" class="daedalus-text-input" aria-label="Character quick-start template"></select>
                        <button id="daedalus-apply-template" class="daedalus-secondary-button" type="button">Apply Template</button>
                      </div>
                    </article>

                    <article class="daedalus-builder-order-panel">
                      <div>
                        <div class="daedalus-card-label">SECTION ORDER</div>
                        <strong>Prompt compilation order</strong>
                        <p>Move sections to control the order they appear in the compiled Character Prompt.</p>
                      </div>
                      <div id="daedalus-builder-order-list" class="daedalus-builder-order-list"></div>
                    </article>

                    <div id="daedalus-character-builder" class="daedalus-builder-grid">
                      <label class="daedalus-builder-field daedalus-builder-field-wide"><span>Identity</span><textarea data-character-builder="identity" placeholder="Who is {{char}}? Name, age if relevant, occupation, role, species, identity..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Appearance</span><textarea data-character-builder="appearance" placeholder="Physical appearance, clothing, distinctive features..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Personality</span><textarea data-character-builder="personality" placeholder="Core traits, contradictions, temperament, flaws, habits..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Behavior</span><textarea data-character-builder="behavior" placeholder="How {{char}} acts around strangers, allies, threats, embarrassment, pressure..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Voice & Speech</span><textarea data-character-builder="voice" placeholder="Tone, vocabulary, sentence style, verbal habits, formality, accent notes, things they avoid saying..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Relationships</span><textarea data-character-builder="relationships" placeholder="Relationship with {{user}} and important people or groups..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Backstory</span><textarea data-character-builder="backstory" placeholder="Relevant history and formative events..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Goals</span><textarea data-character-builder="goals" placeholder="Current wants, long-term motivations, fears, secrets..."></textarea></label>
                    </div>
                  </div>

                  <div class="daedalus-hidden" data-mode-panel="character:rules">
                    <section class="daedalus-rules-studio">
                      <div class="daedalus-rules-heading">
                        <div>
                          <div class="daedalus-card-label">AI & ROLEPLAY RULES</div>
                          <h2>Rules Studio</h2>
                          <p>Build the behavioral rules that will compile into the Character Prompt. Presets are starting points: every rule remains fully editable.</p>
                        </div>
                        <div class="daedalus-rules-heading-actions">
                          <div id="daedalus-rules-counter" class="daedalus-counter">0 characters</div>
                          <button id="daedalus-sync-rules-to-raw" class="daedalus-primary-button daedalus-compact-button" type="button">Sync Rules → Raw Prompt</button>
                        </div>
                      </div>

                      <article class="daedalus-rule-preset-panel">
                        <div class="daedalus-rule-preset-copy">
                          <strong>Genre presets</strong>
                          <span id="daedalus-rule-preset-description">Choose a preset to load a coordinated rule set.</span>
                        </div>
                        <div class="daedalus-rule-preset-actions">
                          <select id="daedalus-rule-preset-select" class="daedalus-text-input" aria-label="Roleplay rule preset"></select>
                          <button id="daedalus-append-rule-preset" class="daedalus-secondary-button" type="button">Append Preset</button>
                          <button id="daedalus-replace-rule-preset" class="daedalus-primary-button" type="button">Use Preset</button>
                        </div>
                      </article>

                      <article class="daedalus-editor-card daedalus-rules-editor-card">
                        <div class="daedalus-editor-heading">
                          <div><div class="daedalus-card-label">ACTIVE RULES</div><h2>Editable rules</h2></div>
                          <div class="daedalus-inline-actions">
                            <button class="daedalus-tool-button" data-insert="{{char}}" data-target="daedalus-roleplay-rules" type="button">+ {{char}}</button>
                            <button class="daedalus-tool-button" data-insert="{{user}}" data-target="daedalus-roleplay-rules" type="button">+ {{user}}</button>
                            <button id="daedalus-clear-rules" class="daedalus-mini-button is-danger" type="button">Clear</button>
                          </div>
                        </div>
                        <textarea id="daedalus-roleplay-rules" class="daedalus-large-textarea daedalus-rules-textarea" data-character-builder="rules" placeholder="- Never control {{user}}...&#10;- Stay fully in character...&#10;- Track location and ongoing state..."></textarea>
                        <div class="daedalus-field-note">These rules compile under the <strong>Roleplay Rules</strong> section of the Character Prompt.</div>
                      </article>

                      <div class="daedalus-rules-library-layout">
                        <div>
                          <div class="daedalus-section-title">Built-in rule library</div>
                          <div class="daedalus-rule-filter-row">
                            <input id="daedalus-rule-search" class="daedalus-text-input" type="search" placeholder="Search rules...">
                            <select id="daedalus-rule-category" class="daedalus-text-input" aria-label="Filter rule category"></select>
                          </div>
                          <div id="daedalus-built-in-rules" class="daedalus-rule-list"></div>
                        </div>

                        <div>
                          <div class="daedalus-section-title">Your custom rules</div>
                          <article class="daedalus-editor-card daedalus-custom-rule-editor">
                            <input id="daedalus-custom-rule-name" class="daedalus-text-input" type="text" placeholder="Rule name">
                            <input id="daedalus-custom-rule-category" class="daedalus-text-input" type="text" placeholder="Category, e.g. My Style">
                            <textarea id="daedalus-custom-rule-content" class="daedalus-medium-textarea" placeholder="Write the rule itself. Daedalus will format it as a bullet when inserted."></textarea>
                            <div class="daedalus-inline-actions">
                              <button id="daedalus-save-custom-rule" class="daedalus-primary-button" type="button">Save Custom Rule</button>
                              <button id="daedalus-cancel-rule-edit" class="daedalus-secondary-button daedalus-hidden" type="button">Cancel Edit</button>
                            </div>
                          </article>
                          <div id="daedalus-custom-rules" class="daedalus-rule-list"></div>
                        </div>
                      </div>
                    </section>
                  </div>
                </section>

                <!-- Dialogue -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="dialogue">
                  <div class="daedalus-page-header daedalus-page-header-row">
                    <div>
                      <div class="daedalus-eyebrow">DIALOGUE</div>
                      <h1>Voice examples</h1>
                      <p>Demonstrate the character in action. Keep speech rules in Character; use this tab for concrete examples of {{user}} and {{char}} interacting.</p>
                    </div>
                    <button id="daedalus-apply-dialogue" class="daedalus-primary-button" type="button">Apply Dialogue</button>
                  </div>

                  <div class="daedalus-mode-tabs">
                    <button class="daedalus-mode-tab is-active" data-mode-group="dialogue" data-mode="raw" type="button">Raw Dialogue</button>
                    <button class="daedalus-mode-tab" data-mode-group="dialogue" data-mode="builder" type="button">Example Builder</button>
                  </div>

                  <div data-mode-panel="dialogue:raw">
                    <article class="daedalus-editor-card">
                      <div class="daedalus-editor-heading">
                        <div><div class="daedalus-card-label">CLANK DIALOGUE EXAMPLE</div><h2>Raw examples</h2></div>
                        <div id="daedalus-dialogue-counter" class="daedalus-counter">0 / 20,000</div>
                      </div>
                      <div class="daedalus-editor-toolbar">
                        <button class="daedalus-tool-button" data-insert="{{char}}" data-target="daedalus-dialogue-raw" type="button">+ {{char}}</button>
                        <button class="daedalus-tool-button" data-insert="{{user}}" data-target="daedalus-dialogue-raw" type="button">+ {{user}}</button>
                        <button class="daedalus-tool-button" data-find-target="daedalus-dialogue-raw" type="button">Find / Replace</button>
                        <button class="daedalus-tool-button" data-copy-target="daedalus-dialogue-raw" type="button">Copy</button>
                        <button class="daedalus-tool-button" data-focus-target="daedalus-dialogue-raw" type="button">Focus</button>
                      </div>
                      <textarea id="daedalus-dialogue-raw" class="daedalus-large-textarea" maxlength="20000" placeholder="{{user}}: Hello...&#10;{{char}}: ..."></textarea>
                    </article>
                  </div>

                  <div class="daedalus-hidden" data-mode-panel="dialogue:builder">
                    <div class="daedalus-builder-intro">
                      <div><strong>Example Builder</strong><span>Create named situations, then compile them into Clank's single Dialogue Example field.</span></div>
                      <div class="daedalus-inline-actions">
                        <button id="daedalus-add-dialogue-example" class="daedalus-secondary-button" type="button">+ Add Example</button>
                        <button id="daedalus-compile-dialogue" class="daedalus-primary-button" type="button">Compile → Raw Dialogue</button>
                      </div>
                    </div>
                    <div id="daedalus-dialogue-examples" class="daedalus-repeat-list"></div>
                  </div>
                </section>

                <!-- Scene -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="scene">
                  <div class="daedalus-page-header daedalus-page-header-row">
                    <div>
                      <div class="daedalus-eyebrow">SCENE</div>
                      <h1>Introduction scene</h1>
                      <p>Design the context around the first encounter, then compile it into Clank's Scene Prompt.</p>
                    </div>
                    <button id="daedalus-apply-scene" class="daedalus-primary-button" type="button">Apply Scene</button>
                  </div>

                  <article class="daedalus-editor-card">
                    <div class="daedalus-editor-heading">
                      <div><div class="daedalus-card-label">SCENE TITLE</div><h2>Scene identity</h2></div>
                      <div id="daedalus-scene-title-counter" class="daedalus-counter">0 / 200</div>
                    </div>
                    <input id="daedalus-scene-title" class="daedalus-text-input" type="text" maxlength="200" placeholder="What's this story called?">
                  </article>

                  <div class="daedalus-mode-tabs">
                    <button class="daedalus-mode-tab is-active" data-mode-group="scene" data-mode="raw" type="button">Raw Scene</button>
                    <button class="daedalus-mode-tab" data-mode-group="scene" data-mode="builder" type="button">Scene Builder</button>
                  </div>

                  <div data-mode-panel="scene:raw">
                    <article class="daedalus-editor-card">
                      <div class="daedalus-editor-heading">
                        <div><div class="daedalus-card-label">SCENE PROMPT</div><h2>Context and plot</h2></div>
                        <div id="daedalus-scene-counter" class="daedalus-counter">0 / 10,000</div>
                      </div>
                      <div class="daedalus-editor-toolbar">
                        <button class="daedalus-tool-button" data-insert="{{char}}" data-target="daedalus-scene-prompt" type="button">+ {{char}}</button>
                        <button class="daedalus-tool-button" data-insert="{{user}}" data-target="daedalus-scene-prompt" type="button">+ {{user}}</button>
                        <button class="daedalus-tool-button" data-find-target="daedalus-scene-prompt" type="button">Find / Replace</button>
                        <button class="daedalus-tool-button" data-copy-target="daedalus-scene-prompt" type="button">Copy</button>
                        <button class="daedalus-tool-button" data-focus-target="daedalus-scene-prompt" type="button">Focus</button>
                      </div>
                      <textarea id="daedalus-scene-prompt" class="daedalus-large-textarea" maxlength="10000" placeholder="Define the plot of this story — what's the context? what's happening?"></textarea>
                    </article>
                  </div>

                  <div class="daedalus-hidden" data-mode-panel="scene:builder">
                    <div class="daedalus-builder-intro">
                      <div><strong>Scene Builder</strong><span>Use only what matters. Hidden information can hold secrets the roleplay should preserve until discovered.</span></div>
                      <button id="daedalus-compile-scene" class="daedalus-primary-button" type="button">Compile → Raw Scene</button>
                    </div>
                    <div id="daedalus-scene-builder" class="daedalus-builder-grid">
                      <label class="daedalus-builder-field"><span>Location</span><textarea data-scene-builder="location" placeholder="Where does the scene take place?"></textarea></label>
                      <label class="daedalus-builder-field"><span>Time</span><textarea data-scene-builder="time" placeholder="Time period, time of day, chronology..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Atmosphere</span><textarea data-scene-builder="atmosphere" placeholder="Mood, weather, sensory tone, tension..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Current Situation</span><textarea data-scene-builder="situation" placeholder="What is happening when the roleplay begins?"></textarea></label>
                      <label class="daedalus-builder-field"><span>{{char}}'s Goal</span><textarea data-scene-builder="characterGoal" placeholder="What does {{char}} want right now?"></textarea></label>
                      <label class="daedalus-builder-field"><span>{{user}}'s Role</span><textarea data-scene-builder="userRole" placeholder="What position does {{user}} occupy in this setup?"></textarea></label>
                      <label class="daedalus-builder-field"><span>Immediate Conflict</span><textarea data-scene-builder="conflict" placeholder="What pressure or problem drives the opening?"></textarea></label>
                      <label class="daedalus-builder-field"><span>Known Information</span><textarea data-scene-builder="knownInformation" placeholder="What can characters openly know at the start?"></textarea></label>
                      <label class="daedalus-builder-field"><span>Hidden Information</span><textarea data-scene-builder="hiddenInformation" placeholder="Secrets, twists, unknown motives, concealed facts..."></textarea></label>
                      <label class="daedalus-builder-field"><span>Scene Rules</span><textarea data-scene-builder="rules" placeholder="Special constraints, pacing rules, discovery rules..."></textarea></label>
                    </div>
                  </div>
                </section>

                <!-- Initial messages -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="initials">
                  <div class="daedalus-page-header daedalus-page-header-row">
                    <div>
                      <div class="daedalus-eyebrow">INITIAL MESSAGES</div>
                      <h1>Opening routes</h1>
                      <p>Give each intro a private Daedalus label, duplicate variants, reorder them, and synchronize the final set to Clank.</p>
                    </div>
                    <div class="daedalus-inline-actions">
                      <button id="daedalus-add-intro" class="daedalus-secondary-button" type="button">+ Add Message</button>
                      <button id="daedalus-apply-intros" class="daedalus-primary-button" type="button">Apply Messages</button>
                    </div>
                  </div>
                  <div class="daedalus-callout">Daedalus can add missing Clank intro fields automatically. If Clank already has more intro fields than this project, Daedalus leaves the extras untouched rather than deleting them blindly.</div>
                  <div id="daedalus-initial-list" class="daedalus-repeat-list"></div>
                </section>

                <!-- Planning Station -->
                <section class="daedalus-view daedalus-systems-view daedalus-hidden" data-daedalus-view-panel="systems">
                  <div id="daedalus-systems-mount"></div>
                </section>

                <section class="daedalus-view daedalus-planning-view daedalus-hidden" data-daedalus-view-panel="planning">
                  <div id="daedalus-planning-mount"></div>
                </section>

                <!-- Fragments -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="fragments">
                  <div class="daedalus-page-header">
                    <div class="daedalus-eyebrow">FRAGMENTS</div>
                    <h1>Reusable prompt pieces</h1>
                    <p>Keep frequently reused instructions outside individual characters, then append them to the Character Prompt, Dialogue, or Scene when needed.</p>
                  </div>

                  <div class="daedalus-fragment-layout">
                    <div>
                      <div class="daedalus-section-title">Built-in fragments</div>
                      <div id="daedalus-built-in-fragments" class="daedalus-fragment-list"></div>
                    </div>
                    <div>
                      <div class="daedalus-section-title">Your fragments</div>
                      <article class="daedalus-editor-card daedalus-fragment-editor">
                        <input id="daedalus-fragment-name" class="daedalus-text-input" type="text" placeholder="Fragment name">
                        <div class="daedalus-fragment-meta-row">
                          <input id="daedalus-fragment-category" class="daedalus-text-input" type="text" placeholder="Category, e.g. Horror">
                          <select id="daedalus-fragment-target" class="daedalus-text-input">
                            <option value="character">Character Prompt</option>
                            <option value="dialogue">Dialogue</option>
                            <option value="scene">Scene Prompt</option>
                          </select>
                        </div>
                        <textarea id="daedalus-fragment-content" class="daedalus-medium-textarea" placeholder="Reusable instructions..."></textarea>
                        <button id="daedalus-save-fragment" class="daedalus-primary-button" type="button">Save Fragment</button>
                      </article>
                      <div id="daedalus-custom-fragments" class="daedalus-fragment-list"></div>
                    </div>
                  </div>
                </section>

                <!-- Inspector -->
                <section class="daedalus-view daedalus-hidden" data-daedalus-view-panel="inspector">
                  <div class="daedalus-page-header daedalus-page-header-row">
                    <div>
                      <div class="daedalus-eyebrow">INSPECTOR</div>
                      <h1>Preflight checks</h1>
                      <p>Daedalus separates objective errors from warnings and optional suggestions. It does not assign a fake quality score.</p>
                    </div>
                    <button id="daedalus-refresh-inspector" class="daedalus-secondary-button" type="button">Refresh Inspector</button>
                  </div>
                  <div id="daedalus-inspector-summary" class="daedalus-inspector-summary"></div>
                  <div id="daedalus-inspector-list" class="daedalus-inspector-list"></div>
                </section>
              </main>
            </div>

            <footer class="daedalus-bottombar">
              <div>Daedalus 1.3.0 · Storycraft Update</div>
              <div id="daedalus-footer-status">Clank remains unchanged until you apply</div>
            </footer>
          </div>
        </div>

        <div id="daedalus-find-panel" class="daedalus-find-panel daedalus-hidden" role="dialog" aria-label="Find and replace">
          <div class="daedalus-find-title-row">
            <div><strong>Find & Replace</strong><span id="daedalus-find-target-label">Raw editor</span></div>
            <button id="daedalus-find-close" class="daedalus-icon-button" type="button" aria-label="Close find and replace">×</button>
          </div>
          <div class="daedalus-find-fields">
            <input id="daedalus-find-query" class="daedalus-text-input" type="text" placeholder="Find…">
            <input id="daedalus-replace-query" class="daedalus-text-input" type="text" placeholder="Replace with…">
          </div>
          <div class="daedalus-find-actions">
            <label class="daedalus-check"><input id="daedalus-find-case" type="checkbox"> Case sensitive</label>
            <span id="daedalus-find-status" class="daedalus-counter">No search</span>
            <button id="daedalus-find-prev" class="daedalus-mini-button" type="button">Previous</button>
            <button id="daedalus-find-next" class="daedalus-mini-button" type="button">Next</button>
            <button id="daedalus-find-replace" class="daedalus-secondary-button daedalus-compact-button" type="button">Replace</button>
            <button id="daedalus-find-replace-all" class="daedalus-primary-button daedalus-compact-button" type="button">Replace All</button>
          </div>
        </div>

        <div id="daedalus-toast-region" class="daedalus-toast-region" aria-live="polite"></div>
      `

      document.documentElement.appendChild(root)

      // Element references

      const workspace = root.querySelector('#daedalus-workspace')
      const launcher = root.querySelector('#daedalus-launcher')
      const closeButton = root.querySelector('#daedalus-close')
      const currentProjectName = root.querySelector('#daedalus-current-project')
      const overviewProjectName = root.querySelector(
        '#daedalus-overview-project-name'
      )
      const saveState = root.querySelector('#daedalus-save-state')
      const footerStatus = root.querySelector('#daedalus-footer-status')
      const projectSelect = root.querySelector('#daedalus-project-select')
      const importProjectFile = root.querySelector(
        '#daedalus-import-project-file'
      )
      const importBackupFile = root.querySelector(
        '#daedalus-import-backup-file'
      )
      const themeToggle = root.querySelector('#daedalus-theme-toggle')
      const replayIntroButton = root.querySelector('#daedalus-replay-intro')
      const splashOverlay = root.querySelector('#daedalus-splash')
      const splashEnterButton = root.querySelector('#daedalus-splash-enter')
      const splashSkipButton = root.querySelector('#daedalus-splash-skip')
      const splashModeInputs = Array.from(root.querySelectorAll('input[name="daedalus-splash-mode"]'))
      let splashTimer = null
      const projectNotesInput = root.querySelector('#daedalus-project-notes')
      const findPanel = root.querySelector('#daedalus-find-panel')
      const findQueryInput = root.querySelector('#daedalus-find-query')
      const replaceQueryInput = root.querySelector('#daedalus-replace-query')
      const findCaseInput = root.querySelector('#daedalus-find-case')
      const findStatus = root.querySelector('#daedalus-find-status')

      const characterNameInput = root.querySelector('#daedalus-character-name')
      const characterPromptInput = root.querySelector(
        '#daedalus-character-prompt'
      )
      const dialogueRawInput = root.querySelector('#daedalus-dialogue-raw')
      const sceneTitleInput = root.querySelector('#daedalus-scene-title')
      const scenePromptInput = root.querySelector('#daedalus-scene-prompt')

      // Theme

      function applyTheme(theme) {
        const nextTheme = theme === 'light' ? 'light' : 'dark'
        root.dataset.theme = nextTheme
        settings.theme = nextTheme
        themeToggle.textContent = nextTheme === 'light' ? '☾ Dark' : '☼ White'
        themeToggle.title =
          nextTheme === 'light'
            ? 'Switch Daedalus to dark theme'
            : 'Switch Daedalus to light theme'
      }

      applyTheme(settings.theme)
      syncSplashModeControls()

      themeToggle.addEventListener('click', async () => {
        const nextTheme = settings.theme === 'light' ? 'dark' : 'light'
        await saveNow()
        applyTheme(nextTheme)
        await store.setTheme(nextTheme)
      })

      // Notifications

      function toast(message, type = 'info') {
        const region = root.querySelector('#daedalus-toast-region')
        const item = document.createElement('div')
        item.className = `daedalus-toast is-${type}`
        item.textContent = message
        region.appendChild(item)

        requestAnimationFrame(() => item.classList.add('is-visible'))

        setTimeout(() => {
          item.classList.remove('is-visible')
          setTimeout(() => item.remove(), 180)
        }, 2600)
      }

      function setSaveState(text, state = '') {
        saveState.textContent = text
        saveState.dataset.state = state
      }

      function setFooter(text) {
        footerStatus.textContent = text
      }

      // Workspace visibility

      function syncSplashModeControls() {
        splashModeInputs.forEach(input => {
          input.checked = input.value === (settings.splashMode || 'minimal')
        })
      }

      function hideSplash() {
        clearTimeout(splashTimer)
        splashTimer = null
        splashOverlay.classList.add('daedalus-hidden')
        splashOverlay.setAttribute('aria-hidden', 'true')
        splashOverlay.dataset.variant = 'full'
      }

      async function setSplashMode(mode) {
        const nextMode = ['full', 'minimal', 'off'].includes(mode) ? mode : 'minimal'
        settings.splashMode = nextMode
        syncSplashModeControls()
        await store.setSplashMode?.(nextMode)
        toast(`Open animation set to ${nextMode}.`, 'success')
      }

      async function showSplash(options = {}) {
        clearTimeout(splashTimer)
        const force = options.force === true
        const firstTime = settings.splashSeen !== true
        if (!force && settings.splashMode === 'off') {
          hideSplash()
          if (firstTime) {
            settings.splashSeen = true
            await store.setSplashSeen?.(true)
          }
          return
        }
        const mode = force
          ? 'full'
          : firstTime
            ? 'full'
            : settings.splashMode || 'minimal'

        if (mode === 'off') {
          hideSplash()
          return
        }

        splashOverlay.dataset.variant = mode
        splashOverlay.classList.remove('daedalus-hidden')
        splashOverlay.setAttribute('aria-hidden', 'false')
        syncSplashModeControls()

        if (firstTime) {
          settings.splashSeen = true
          await store.setSplashSeen?.(true)
        }

        if (mode === 'minimal' && !force) {
          splashTimer = setTimeout(() => {
            hideSplash()
          }, 950)
        }
      }

      function openWorkspace() {
        workspace.classList.remove('daedalus-hidden')
        workspace.setAttribute('aria-hidden', 'false')
        document.documentElement.classList.add('daedalus-workspace-open')
        showSplash().catch(error => {
          console.warn('[Daedalus] Splash could not be shown:', error)
        })
      }

      function closeWorkspace() {
        if (!findPanel.classList.contains('daedalus-hidden')) {
          closeFindPanel()
          return
        }

        if (focusedCard) {
          exitFocusMode()
          return
        }

        hideSplash()
        workspace.classList.add('daedalus-hidden')
        workspace.setAttribute('aria-hidden', 'true')
        document.documentElement.classList.remove('daedalus-workspace-open')
      }

      launcher.addEventListener('click', openWorkspace)
      closeButton.addEventListener('click', closeWorkspace)
      replayIntroButton?.addEventListener('click', () => {
        if (workspace.classList.contains('daedalus-hidden')) {
          openWorkspace()
          return
        }
        showSplash({force: true}).catch(error => {
          console.warn('[Daedalus] Splash replay failed:', error)
        })
      })
      splashEnterButton?.addEventListener('click', hideSplash)
      splashSkipButton?.addEventListener('click', hideSplash)
      splashModeInputs.forEach(input => {
        input.addEventListener('change', event => {
          setSplashMode(event.target.value)
        })
      })

      // Saving

      function updateProjectTitleUi() {
        const title =
          project?.meta?.titleMode === 'custom'
            ? project?.meta?.title
            : project?.character?.name?.trim() ||
              project?.meta?.title ||
              'Untitled Character'
        currentProjectName.textContent = title || 'Untitled Character'
        overviewProjectName.textContent = title || 'Untitled Character'
      }

      async function saveNow() {
        if (isSaving) {
          pendingSave = true
          return project
        }

        clearTimeout(saveTimer)
        saveTimer = null
        isSaving = true
        setSaveState('Saving...', 'saving')

        try {
          project = await store.saveProject(project)
          setSaveState('Saved locally', 'saved')
          updateProjectTitleUi()
          await renderProjectSelector()
          renderOverviewMetrics()
          return project
        } catch (error) {
          console.error('[Daedalus] Save failed:', error)
          setSaveState('Save failed', 'error')
          toast('Daedalus could not save this draft.', 'error')
          throw error
        } finally {
          isSaving = false

          if (pendingSave) {
            pendingSave = false
            setTimeout(() => saveNow(), 0)
          }
        }
      }

      function scheduleSave() {
        clearTimeout(saveTimer)
        setSaveState('Unsaved changes...', 'dirty')
        saveTimer = setTimeout(() => saveNow(), 420)
      }

      planningStation = planningUi.mount({
        root,
        store,
        getProject: () => project,
        markDirty: scheduleSave,
        toast,
        isActive: () => activeView === 'planning'
      })

      guidanceStation = guidanceUi.mount({
        root,
        store,
        rulesLibrary,
        compilers,
        getProject: () => project,
        markDirty: scheduleSave,
        toast,
        navigate: viewName => showView(viewName),
        getSettings: () => settings,
        onSettingsChanged: patch => {
          settings = {...settings, ...patch}
        },
        refreshProject: () => renderProject()
      })

      systemsStation = await systemsUi.mount({
        root,
        store,
        getProject: () => project,
        markDirty: scheduleSave,
        toast,
        navigate: viewName => showView(viewName),
        refreshProject: () => renderProject(),
        isActive: () => activeView === 'systems'
      })

      // Navigation

      function showView(viewName) {
        activeView = viewName

        root
          .querySelector('.daedalus-content')
          ?.classList.toggle('daedalus-content-planning', viewName === 'planning')

        root.querySelectorAll('[data-daedalus-view-panel]').forEach(panel => {
          panel.classList.toggle(
            'daedalus-hidden',
            panel.dataset.daedalusViewPanel !== viewName
          )
        })

        root.querySelectorAll('[data-daedalus-view]').forEach(button => {
          button.classList.toggle(
            'is-active',
            button.dataset.daedalusView === viewName
          )
        })

        if (viewName === 'inspector') {
          renderInspector()
        }

        if (viewName === 'overview') {
          renderOverview()
        }

        if (viewName === 'planning') {
          planningStation?.onShow()
        }

        if (viewName === 'guide') {
          guidanceStation?.refresh()
        }

        if (viewName === 'systems') {
          systemsStation?.onShow()
        }
      }

      root.querySelectorAll('[data-daedalus-view]').forEach(button => {
        button.addEventListener('click', () =>
          showView(button.dataset.daedalusView)
        )
      })

      root
        .querySelector('#daedalus-start-building')
        .addEventListener('click', () => {
          showView('character')
        })

      root
        .querySelector('#daedalus-open-planning')
        .addEventListener('click', () => {
          showView('planning')
        })

      root
        .querySelector('#daedalus-open-systems')
        ?.addEventListener('click', () => {
          showView('systems')
        })

      root
        .querySelector('#daedalus-open-systems-guide')
        ?.addEventListener('click', () => {
          showView('guide')
          setTimeout(() => guidanceStation?.openTopic?.('systems'), 0)
        })

      root
        .querySelector('#daedalus-start-guided')
        ?.addEventListener('click', () => {
          guidanceStation?.startWizard()
        })

      root
        .querySelector('#daedalus-open-guide')
        ?.addEventListener('click', () => {
          showView('guide')
        })

      root
        .querySelector('#daedalus-open-inspector')
        .addEventListener('click', () => {
          showView('inspector')
        })

      root
        .querySelector('#daedalus-sync-status-list')
        .addEventListener('click', event => {
          const row = event.target.closest('[data-sync-view]')
          if (row) {
            showView(row.dataset.syncView)
          }
        })

      // Raw and builder modes

      root.querySelectorAll('[data-mode-group]').forEach(button => {
        button.addEventListener('click', () => {
          const group = button.dataset.modeGroup
          const mode = button.dataset.mode

          root
            .querySelectorAll(`[data-mode-group="${group}"]`)
            .forEach(item => {
              item.classList.toggle('is-active', item === button)
            })

          root
            .querySelectorAll(`[data-mode-panel^="${group}:"]`)
            .forEach(panel => {
              panel.classList.toggle(
                'daedalus-hidden',
                panel.dataset.modePanel !== `${group}:${mode}`
              )
            })
        })
      })

      // Counters

      function setCounter(id, value, limit) {
        const counter = root.querySelector(id)
        const length = String(value || '').length
        counter.textContent = `${length.toLocaleString()} / ${limit.toLocaleString()}`
        counter.classList.toggle('is-danger', length > limit)
        counter.classList.toggle(
          'is-near-limit',
          length > limit * 0.9 && length <= limit
        )
      }

      function updateCounters() {
        setCounter('#daedalus-name-counter', project.character.name, 100)
        setCounter('#daedalus-prompt-counter', project.character.prompt, 25000)
        setCounter('#daedalus-dialogue-counter', project.dialogue.raw, 20000)
        setCounter('#daedalus-scene-title-counter', project.scene.title, 200)
        setCounter('#daedalus-scene-counter', project.scene.prompt, 10000)
      }

      // Project selection

      async function renderProjectSelector() {
        const projects = await store.listProjects()
        projectSelect.innerHTML = ''

        for (const item of projects) {
          const option = document.createElement('option')
          option.value = item.id
          option.textContent = item.title
          option.selected = item.id === project.id
          projectSelect.appendChild(option)
        }
      }

      projectSelect.addEventListener('change', async () => {
        await saveNow()
        project = await store.setCurrentProject(projectSelect.value)
        renderProject()
        toast(`Opened ${project.meta.title}.`, 'success')
      })

      // Prompt outline

      function renderCharacterOutline() {
        const container = root.querySelector('#daedalus-character-outline')
        const text = String(project.character.prompt || '')
        const lines = text.split('\n')
        const headings = []
        let offset = 0

        for (const line of lines) {
          const match = line.match(/^\s*(#{1,4})\s+(.+?)\s*$/)
          if (match) {
            headings.push({
              level: match[1].length,
              label: match[2],
              offset: offset + line.indexOf('#')
            })
          }
          offset += line.length + 1
        }

        container.innerHTML = headings.length
          ? headings
              .map(
                item => `
              <button class="daedalus-outline-item is-level-${item.level}" data-outline-offset="${item.offset}" type="button">
                <span>${'›'.repeat(Math.max(1, item.level - 1))}</span>${escapeHtml(item.label)}
              </button>
            `
              )
              .join('')
          : '<span class="daedalus-outline-empty">No headings detected yet.</span>'
      }

      // Project rendering

      function renderStaticFields() {
        characterNameInput.value = project.character.name
        characterPromptInput.value = project.character.prompt
        dialogueRawInput.value = project.dialogue.raw
        sceneTitleInput.value = project.scene.title
        scenePromptInput.value = project.scene.prompt
        projectNotesInput.value = project.notes || ''

        root.querySelectorAll('[data-character-builder]').forEach(textarea => {
          textarea.value =
            project.character.builder[textarea.dataset.characterBuilder] || ''
        })

        root.querySelectorAll('[data-scene-builder]').forEach(textarea => {
          textarea.value =
            project.scene.builder[textarea.dataset.sceneBuilder] || ''
        })

        updateCounters()
        updateProjectTitleUi()
        renderCharacterOutline()
      }

      function renderDialogueExamples() {
        const container = root.querySelector('#daedalus-dialogue-examples')

        if (!project.dialogue.examples.length) {
          container.innerHTML = `
            <div class="daedalus-empty-state">
              <strong>No structured dialogue examples yet.</strong>
              <span>Add one for a situation such as casual conversation, anger, vulnerability, combat, or romance.</span>
            </div>
          `
          return
        }

        container.innerHTML = project.dialogue.examples
          .map(
            (example, index) => `
          <article class="daedalus-repeat-card" data-dialogue-id="${escapeHtml(example.id)}">
            <div class="daedalus-repeat-header">
              <div class="daedalus-repeat-number">${String(index + 1).padStart(2, '0')}</div>
              <input class="daedalus-inline-title-input" data-dialogue-field="label" value="${escapeHtml(example.label)}" placeholder="Example label">
              ${example.source === 'systems' ? '<span class="daedalus-target-badge">SYSTEMS</span>' : ''}
              <div class="daedalus-repeat-actions">
                <button class="daedalus-mini-button" data-dialogue-action="up" type="button" title="Move up">↑</button>
                <button class="daedalus-mini-button" data-dialogue-action="down" type="button" title="Move down">↓</button>
                <button class="daedalus-mini-button" data-dialogue-action="duplicate" type="button">Duplicate</button>
                <button class="daedalus-mini-button is-danger" data-dialogue-action="delete" type="button">Delete</button>
              </div>
            </div>
            <label class="daedalus-stack-field"><span>Situation ${'${'}example.source === 'systems' ? '<small>Generated from RP Systems Studio.</small>' : ''}</span><input class="daedalus-text-input" data-dialogue-field="situation" value="${escapeHtml(example.situation)}" placeholder="What is this example demonstrating?"></label>
            <div class="daedalus-exchange-grid">
              <label class="daedalus-stack-field"><span>{{user}}</span><textarea data-dialogue-field="user" placeholder="User line or action...">${escapeHtml(example.user)}</textarea></label>
              <label class="daedalus-stack-field"><span>{{char}}</span><textarea data-dialogue-field="char" placeholder="Character response...">${escapeHtml(example.char)}</textarea></label>
            </div>
          </article>
        `
          )
          .join('')
      }

      function renderInitialMessages() {
        const container = root.querySelector('#daedalus-initial-list')

        container.innerHTML = project.initialMessages
          .map(
            (message, index) => `
          <article class="daedalus-repeat-card" data-intro-id="${escapeHtml(message.id)}">
            <div class="daedalus-repeat-header">
              <div class="daedalus-repeat-number">${String(index + 1).padStart(2, '0')}</div>
              <input class="daedalus-inline-title-input" data-intro-field="label" value="${escapeHtml(message.label)}" placeholder="Private Daedalus label">
              <div class="daedalus-counter" data-intro-counter>${String(message.content || '').length.toLocaleString()} / 10,000</div>
              <div class="daedalus-repeat-actions">
                <button class="daedalus-mini-button" data-intro-action="up" type="button" title="Move up">↑</button>
                <button class="daedalus-mini-button" data-intro-action="down" type="button" title="Move down">↓</button>
                <button class="daedalus-mini-button" data-intro-action="duplicate" type="button">Duplicate</button>
                <button class="daedalus-mini-button is-danger" data-intro-action="delete" type="button">Delete</button>
              </div>
            </div>
            <div class="daedalus-editor-toolbar">
              <button class="daedalus-tool-button" data-intro-insert="{{char}}" type="button">+ {{char}}</button>
              <button class="daedalus-tool-button" data-intro-insert="{{user}}" type="button">+ {{user}}</button>
            </div>
            <textarea class="daedalus-large-textarea daedalus-intro-textarea" maxlength="10000" data-intro-field="content" placeholder="What's the first message this character will send to the user?">${escapeHtml(message.content)}</textarea>
          </article>
        `
          )
          .join('')
      }

      function fragmentCard(fragment, custom = false) {
        const targetLabel =
          {
            character: 'Character Prompt',
            dialogue: 'Dialogue',
            scene: 'Scene Prompt'
          }[fragment.target] || 'Character Prompt'

        return `
          <article class="daedalus-fragment-card" data-fragment-id="${escapeHtml(fragment.id)}" data-fragment-custom="${custom ? 'true' : 'false'}">
            <div class="daedalus-fragment-card-top">
              <div>
                <div class="daedalus-fragment-category">${escapeHtml(fragment.category)}</div>
                <h3>${escapeHtml(fragment.name)}</h3>
              </div>
              <span class="daedalus-target-badge">${escapeHtml(targetLabel)}</span>
            </div>
            <p>${escapeHtml(fragment.content)}</p>
            <div class="daedalus-inline-actions">
              <button class="daedalus-secondary-button daedalus-compact-button" data-fragment-action="insert" type="button">Insert Fragment</button>
              ${custom ? '<button class="daedalus-danger-button daedalus-compact-button" data-fragment-action="delete" type="button">Delete</button>' : ''}
            </div>
          </article>
        `
      }

      function renderFragments() {
        root.querySelector('#daedalus-built-in-fragments').innerHTML =
          BUILT_IN_FRAGMENTS.map(fragment =>
            fragmentCard(fragment, false)
          ).join('')

        const customContainer = root.querySelector('#daedalus-custom-fragments')

        customContainer.innerHTML = customFragments.length
          ? customFragments
              .map(fragment => fragmentCard(fragment, true))
              .join('')
          : '<div class="daedalus-empty-state"><strong>No custom fragments yet.</strong><span>Create reusable instructions above.</span></div>'
      }

      function updateRulesCounter() {
        const textarea = root.querySelector('#daedalus-roleplay-rules')
        const counter = root.querySelector('#daedalus-rules-counter')

        if (!textarea || !counter) {
          return
        }

        const length = textarea.value.length
        const ruleCount = textarea.value
          .split('\n')
          .filter(line => /^\s*[-*]\s+\S/.test(line)).length

        counter.textContent = `${length.toLocaleString()} characters · ${ruleCount} rule${ruleCount === 1 ? '' : 's'}`
      }

      function ruleCard(rule, custom = false) {
        return `
          <article class="daedalus-rule-card" data-rule-id="${escapeHtml(rule.id)}" data-rule-custom="${custom ? 'true' : 'false'}">
            <div class="daedalus-rule-card-top">
              <div>
                <div class="daedalus-fragment-category">${escapeHtml(rule.category)}</div>
                <h3>${escapeHtml(rule.name)}</h3>
              </div>
            </div>
            <p>${escapeHtml(rule.content)}</p>
            <div class="daedalus-inline-actions">
              <button class="daedalus-secondary-button daedalus-compact-button" data-rule-action="add" type="button">+ Add Rule</button>
              ${custom ? '<button class="daedalus-secondary-button daedalus-compact-button" data-rule-action="edit" type="button">Edit</button><button class="daedalus-danger-button daedalus-compact-button" data-rule-action="delete" type="button">Delete</button>' : ''}
            </div>
          </article>
        `
      }

      function renderRulePresetOptions() {
        const select = root.querySelector('#daedalus-rule-preset-select')
        const current = select.value

        select.innerHTML = rulesLibrary.RULE_PRESETS.map(
          preset => `
          <option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>
        `
        ).join('')

        if (
          current &&
          rulesLibrary.RULE_PRESETS.some(preset => preset.id === current)
        ) {
          select.value = current
        }

        const selected = rulesLibrary.RULE_PRESETS.find(
          preset => preset.id === select.value
        )
        root.querySelector('#daedalus-rule-preset-description').textContent =
          selected?.description ||
          'Choose a preset to load a coordinated rule set.'
      }

      function renderRuleCategories() {
        const select = root.querySelector('#daedalus-rule-category')
        const current = select.value || 'All'
        const categories = [
          ...new Set(rulesLibrary.BUILT_IN_RULES.map(rule => rule.category))
        ].sort((a, b) => a.localeCompare(b))

        select.innerHTML = [
          '<option value="All">All categories</option>',
          ...categories.map(
            category =>
              `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
          )
        ].join('')

        select.value = categories.includes(current) ? current : 'All'
      }

      function renderBuiltInRules() {
        const search = root
          .querySelector('#daedalus-rule-search')
          .value.trim()
          .toLowerCase()
        const category =
          root.querySelector('#daedalus-rule-category').value || 'All'
        const container = root.querySelector('#daedalus-built-in-rules')

        const matches = rulesLibrary.BUILT_IN_RULES.filter(rule => {
          const categoryMatches =
            category === 'All' || rule.category === category
          const haystack =
            `${rule.name} ${rule.category} ${rule.content}`.toLowerCase()
          return categoryMatches && (!search || haystack.includes(search))
        })

        container.innerHTML = matches.length
          ? matches.map(rule => ruleCard(rule, false)).join('')
          : '<div class="daedalus-empty-state"><strong>No matching rules.</strong><span>Try another search or category.</span></div>'
      }

      function renderCustomRules() {
        const container = root.querySelector('#daedalus-custom-rules')
        container.innerHTML = customRules.length
          ? customRules.map(rule => ruleCard(rule, true)).join('')
          : '<div class="daedalus-empty-state"><strong>No custom rules yet.</strong><span>Create your own reusable AI or roleplay instruction above.</span></div>'
      }

      function renderRulesStudio() {
        renderRulePresetOptions()
        renderRuleCategories()
        renderBuiltInRules()
        renderCustomRules()
        updateRulesCounter()
      }

      function renderTemplateOptions() {
        const select = root.querySelector('#daedalus-template-select')
        const current = select.value
        select.innerHTML = templates.TEMPLATES.map(
          template => `
          <option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>
        `
        ).join('')

        if (current && templates.getTemplate(current)) {
          select.value = current
        }

        const selected = templates.getTemplate(select.value)
        root.querySelector('#daedalus-template-description').textContent =
          selected?.description ||
          'Choose a template to scaffold the project workflow.'
      }

      function renderCharacterBuilderOrder() {
        const defaults = compilers.CHARACTER_SECTIONS.map(([key]) => key)
        const order =
          Array.isArray(project.character.builderOrder) &&
          project.character.builderOrder.length
            ? project.character.builderOrder
            : defaults
        const definitions = new Map(
          compilers.CHARACTER_SECTIONS.map(([key, label]) => [key, label])
        )
        const grid = root.querySelector('#daedalus-character-builder')
        const fields = new Map()

        grid.querySelectorAll('[data-character-builder]').forEach(textarea => {
          const field = textarea.closest('.daedalus-builder-field')
          if (field) {
            fields.set(textarea.dataset.characterBuilder, field)
          }
        })

        order.forEach(key => {
          const field = fields.get(key)
          if (field) {
            grid.appendChild(field)
          }
        })

        root.querySelector('#daedalus-builder-order-list').innerHTML = order
          .map(
            (key, index) => `
          <div class="daedalus-order-chip" data-builder-order-key="${escapeHtml(key)}">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <strong>${escapeHtml(definitions.get(key) || key)}</strong>
            <button class="daedalus-mini-button" data-builder-order-action="up" type="button" title="Move section up">↑</button>
            <button class="daedalus-mini-button" data-builder-order-action="down" type="button" title="Move section down">↓</button>
          </div>
        `
          )
          .join('')
      }

      function syncStatusRow(label, view, status) {
        const copy =
          status === 'synced'
            ? ['Synced', 'is-synced']
            : status === 'different'
              ? ['Daedalus / Clank differ', 'is-different']
              : status === 'systems-different'
                ? ['Needs prompt sync', 'is-different']
                : status === 'disabled'
                  ? ['Not configured', 'is-unavailable']
                  : ['Clank field unavailable', 'is-unavailable']

        return `
          <button class="daedalus-sync-row ${copy[1]}" data-sync-view="${view}" type="button">
            <span>${label}</span>
            <strong>${copy[0]}</strong>
          </button>
        `
      }

      function renderSyncStatus() {
        const status = detector.getSyncStatus(project)
        const enabledSystems = systemsCore.enabledModuleIds(project.systems)
        const hasSystems = enabledSystems.length > 0 || project.systems?.hud?.enabled === true
        const systemStatus = !hasSystems
          ? 'disabled'
          : systemsCore.upsertSystemsSection(project.character.prompt, project.systems).trim() === String(project.character.prompt || '').trim()
            ? 'synced'
            : 'systems-different'

        root.querySelector('#daedalus-sync-status-list').innerHTML = [
          syncStatusRow('Character', 'character', status.character.status),
          syncStatusRow('RP Systems', 'systems', systemStatus),
          syncStatusRow('Dialogue', 'dialogue', status.dialogue.status),
          syncStatusRow('Scene', 'scene', status.scene.status),
          syncStatusRow('Initial Messages', 'initials', status.initials.status)
        ].join('')
      }

      function renderReadiness() {
        const report = inspector.inspect(project)
        const state = root.querySelector('#daedalus-ready-state')
        const detail = root.querySelector('#daedalus-ready-detail')
        const requiredMissing =
          !project.character.name.trim() || !project.character.prompt.trim()

        if (report.counts.errors) {
          state.textContent = 'Blocked by errors'
          state.dataset.ready = 'blocked'
          detail.textContent = `${report.counts.errors} error${report.counts.errors === 1 ? '' : 's'} must be fixed before the project can safely fit Clank's limits.`
        } else if (requiredMissing) {
          state.textContent = 'Required fields missing'
          state.dataset.ready = 'review'
          detail.textContent =
            'Character Name and Character Prompt are required by Clank.'
        } else if (report.counts.warnings) {
          state.textContent = 'Ready after review'
          state.dataset.ready = 'review'
          detail.textContent = `${report.counts.warnings} warning${report.counts.warnings === 1 ? '' : 's'} should be reviewed. Suggestions remain optional.`
        } else {
          state.textContent = 'Ready for Clank'
          state.dataset.ready = 'ready'
          detail.textContent = report.counts.suggestions
            ? `No blocking issues. ${report.counts.suggestions} optional suggestion${report.counts.suggestions === 1 ? '' : 's'} remain.`
            : 'No current errors or warnings. The project is clear for synchronization.'
        }
      }

      function resetCustomRuleEditor() {
        editingCustomRuleId = null
        root.querySelector('#daedalus-custom-rule-name').value = ''
        root.querySelector('#daedalus-custom-rule-category').value = ''
        root.querySelector('#daedalus-custom-rule-content').value = ''
        root.querySelector('#daedalus-save-custom-rule').textContent =
          'Save Custom Rule'
        root
          .querySelector('#daedalus-cancel-rule-edit')
          .classList.add('daedalus-hidden')
      }

      function setActiveRules(text) {
        const textarea = root.querySelector('#daedalus-roleplay-rules')
        textarea.value = String(text || '')
        textarea.dispatchEvent(new Event('input', {bubbles: true}))
        updateRulesCounter()
      }

      function addRuleToActiveRules(rule) {
        if (!rule?.content) {
          return
        }

        const addition = rulesLibrary.formatRuleContent(rule.content)
        const next = rulesLibrary.appendRuleText(
          project.character.builder.rules,
          addition
        )
        setActiveRules(next)
        toast(`Added “${rule.name}” to Roleplay Rules.`, 'success')
      }

      function renderHistory() {
        const container = root.querySelector('#daedalus-history-list')

        if (!project.history.length) {
          container.innerHTML =
            '<div class="daedalus-empty-state"><strong>No snapshots yet.</strong><span>Create a snapshot before a major rewrite or use one of Daedalus\' automatic safety snapshots.</span></div>'
          return
        }

        container.innerHTML = project.history
          .map(
            snapshot => `
          <div class="daedalus-history-item" data-snapshot-id="${escapeHtml(snapshot.id)}">
            <div>
              <strong>${escapeHtml(snapshot.reason)}</strong>
              <span>${escapeHtml(formatDate(snapshot.createdAt))}</span>
            </div>
            <button class="daedalus-secondary-button daedalus-compact-button" data-snapshot-action="restore" type="button">Restore</button>
          </div>
        `
          )
          .join('')
      }

      function renderOverviewMetrics() {
        const report = inspector.inspect(project)
        root.querySelector('#daedalus-detected-count').textContent = String(
          detector.getDetectedCount()
        )
        root.querySelector('#daedalus-overview-prompt-count').textContent =
          project.character.prompt.length.toLocaleString()
        root.querySelector('#daedalus-overview-intro-count').textContent =
          String(project.initialMessages.length)
        root.querySelector('#daedalus-overview-issue-count').textContent =
          String(report.issues.length)
        root.querySelector('#daedalus-project-updated').textContent =
          `Last updated ${formatDate(project.meta.updatedAt)}`
      }

      function renderOverview() {
        renderOverviewMetrics()
        renderHistory()
        renderReadiness()
        renderSyncStatus()
      }

      function renderInspector() {
        const report = inspector.inspect(project)
        const summary = root.querySelector('#daedalus-inspector-summary')
        const list = root.querySelector('#daedalus-inspector-list')

        summary.innerHTML = `
          <div class="daedalus-inspector-pill is-error"><strong>${report.counts.errors}</strong><span>Errors</span></div>
          <div class="daedalus-inspector-pill is-warning"><strong>${report.counts.warnings}</strong><span>Warnings</span></div>
          <div class="daedalus-inspector-pill is-suggestion"><strong>${report.counts.suggestions}</strong><span>Suggestions</span></div>
        `

        if (!report.issues.length) {
          list.innerHTML =
            '<div class="daedalus-empty-state daedalus-success-state"><strong>No inspector notes.</strong><span>All current checks are clear.</span></div>'
          return
        }

        const areaViews = {
          Character: 'character',
          Dialogue: 'dialogue',
          Scene: 'scene',
          'Initial Messages': 'initials',
          Systems: 'systems',
          Project: 'overview'
        }

        list.innerHTML = report.issues
          .map(
            item => `
          <article class="daedalus-inspector-item is-${escapeHtml(item.severity)}">
            <div class="daedalus-inspector-icon">${item.severity === 'error' ? '!' : item.severity === 'warning' ? '△' : '◇'}</div>
            <div>
              <div class="daedalus-inspector-meta">${escapeHtml(item.area)} · ${escapeHtml(item.severity)}</div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.detail)}</p>
              <button class="daedalus-mini-button" data-inspector-view="${escapeHtml(areaViews[item.area] || 'overview')}" type="button">Open ${escapeHtml(item.area)}</button>
            </div>
          </article>
        `
          )
          .join('')
      }

      async function renderProject() {
        renderStaticFields()
        renderDialogueExamples()
        renderInitialMessages()
        renderFragments()
        renderRulesStudio()
        renderTemplateOptions()
        renderCharacterBuilderOrder()
        renderOverview()
        renderInspector()
        planningStation?.refresh()
        guidanceStation?.refresh()
        systemsStation?.refresh()
        await renderProjectSelector()
        setSaveState('Saved locally', 'saved')
      }

      // Static field editing

      characterNameInput.addEventListener('input', () => {
        project.character.name = characterNameInput.value
        updateCounters()
        updateProjectTitleUi()
        scheduleSave()
      })

      characterPromptInput.addEventListener('input', () => {
        project.character.prompt = characterPromptInput.value
        updateCounters()
        renderCharacterOutline()
        scheduleSave()
      })

      dialogueRawInput.addEventListener('input', () => {
        project.dialogue.raw = dialogueRawInput.value
        updateCounters()
        scheduleSave()
      })

      sceneTitleInput.addEventListener('input', () => {
        project.scene.title = sceneTitleInput.value
        updateCounters()
        scheduleSave()
      })

      scenePromptInput.addEventListener('input', () => {
        project.scene.prompt = scenePromptInput.value
        updateCounters()
        scheduleSave()
      })

      projectNotesInput.addEventListener('input', () => {
        project.notes = projectNotesInput.value
        scheduleSave()
      })

      root.querySelectorAll('[data-character-builder]').forEach(textarea => {
        textarea.addEventListener('input', () => {
          project.character.builder[textarea.dataset.characterBuilder] =
            textarea.value

          if (textarea.dataset.characterBuilder === 'rules') {
            updateRulesCounter()
          }

          scheduleSave()
        })
      })

      root.querySelectorAll('[data-scene-builder]').forEach(textarea => {
        textarea.addEventListener('input', () => {
          project.scene.builder[textarea.dataset.sceneBuilder] = textarea.value
          scheduleSave()
        })
      })

      // Token insertion

      function insertAtCursor(textarea, text) {
        const start = textarea.selectionStart ?? textarea.value.length
        const end = textarea.selectionEnd ?? start
        textarea.value =
          textarea.value.slice(0, start) + text + textarea.value.slice(end)
        const next = start + text.length
        textarea.setSelectionRange(next, next)
        textarea.focus()
        textarea.dispatchEvent(new Event('input', {bubbles: true}))
      }

      root.querySelectorAll('[data-insert]').forEach(button => {
        button.addEventListener('click', () => {
          const target = root.querySelector(`#${button.dataset.target}`)
          if (target) {
            insertAtCursor(target, button.dataset.insert)
          }
        })
      })

      // Clipboard and prompt outline navigation

      root.querySelectorAll('[data-copy-target]').forEach(button => {
        button.addEventListener('click', async () => {
          const target = root.querySelector(`#${button.dataset.copyTarget}`)
          if (!target) {
            return
          }

          try {
            await navigator.clipboard.writeText(target.value)
            toast('Copied editor text to clipboard.', 'success')
          } catch (error) {
            console.warn(
              '[Daedalus] Clipboard API unavailable, using fallback.',
              error
            )
            target.focus()
            target.select()
            const copied = document.execCommand?.('copy')
            target.setSelectionRange(target.value.length, target.value.length)
            toast(
              copied
                ? 'Copied editor text to clipboard.'
                : 'Could not copy automatically. The text is selected for you.',
              copied ? 'success' : 'warning'
            )
          }
        })
      })

      root
        .querySelector('#daedalus-character-outline')
        .addEventListener('click', event => {
          const button = event.target.closest('[data-outline-offset]')
          if (!button) {
            return
          }

          const offset = Number(button.dataset.outlineOffset || 0)
          const nextBreak = characterPromptInput.value.indexOf('\n', offset)
          const end =
            nextBreak < 0 ? characterPromptInput.value.length : nextBreak
          characterPromptInput.focus()
          characterPromptInput.setSelectionRange(offset, end)
        })

      // Find and replace

      function currentFindTarget() {
        return findTargetId ? root.querySelector(`#${findTargetId}`) : null
      }

      function normalizedSearch(value) {
        return findCaseInput.checked ? value : value.toLowerCase()
      }

      function findMatches(text, query) {
        if (!query) {
          return []
        }

        const haystack = normalizedSearch(text)
        const needle = normalizedSearch(query)
        const matches = []
        let start = 0

        while (start <= haystack.length - needle.length) {
          const index = haystack.indexOf(needle, start)
          if (index < 0) {
            break
          }
          matches.push(index)
          start = index + Math.max(1, needle.length)
        }

        return matches
      }

      function refreshFindStatus(selectMatch = false) {
        const target = currentFindTarget()
        const query = findQueryInput.value

        if (!target || !query) {
          findMatchIndex = -1
          findStatus.textContent = query ? '0 matches' : 'No search'
          return []
        }

        const matches = findMatches(target.value, query)

        if (!matches.length) {
          findMatchIndex = -1
          findStatus.textContent = '0 matches'
          return matches
        }

        if (findMatchIndex < 0 || findMatchIndex >= matches.length) {
          findMatchIndex = 0
        }

        findStatus.textContent = `${findMatchIndex + 1} / ${matches.length}`

        if (selectMatch) {
          const start = matches[findMatchIndex]
          target.focus()
          target.setSelectionRange(start, start + query.length)
        }

        return matches
      }

      function openFindPanel(targetId) {
        const target = root.querySelector(`#${targetId}`)
        if (!target) {
          return
        }

        findTargetId = targetId
        findMatchIndex = -1
        const labelMap = {
          'daedalus-character-prompt': 'Character Prompt',
          'daedalus-dialogue-raw': 'Dialogue Example',
          'daedalus-scene-prompt': 'Scene Prompt'
        }
        root.querySelector('#daedalus-find-target-label').textContent =
          labelMap[targetId] || 'Raw editor'
        findPanel.classList.remove('daedalus-hidden')

        const selectedText = target.value.slice(
          target.selectionStart || 0,
          target.selectionEnd || 0
        )
        if (selectedText && !selectedText.includes('\n')) {
          findQueryInput.value = selectedText
        }

        refreshFindStatus(Boolean(findQueryInput.value))
        findQueryInput.focus()
        findQueryInput.select()
      }

      function closeFindPanel() {
        findPanel.classList.add('daedalus-hidden')
        findTargetId = null
        findMatchIndex = -1
      }

      function stepFind(direction) {
        const matches = refreshFindStatus(false)
        if (!matches.length) {
          return
        }

        findMatchIndex =
          (findMatchIndex + direction + matches.length) % matches.length
        refreshFindStatus(true)
      }

      function replaceCurrentMatch() {
        const target = currentFindTarget()
        const query = findQueryInput.value
        const matches = refreshFindStatus(false)

        if (!target || !query || !matches.length) {
          return
        }

        const start = matches[Math.max(0, findMatchIndex)]
        const end = start + query.length
        target.value =
          target.value.slice(0, start) +
          replaceQueryInput.value +
          target.value.slice(end)
        target.dispatchEvent(new Event('input', {bubbles: true}))
        findMatchIndex = 0
        refreshFindStatus(true)
      }

      function replaceAllMatches() {
        const target = currentFindTarget()
        const query = findQueryInput.value

        if (!target || !query) {
          return
        }

        const matches = findMatches(target.value, query)
        if (!matches.length) {
          refreshFindStatus(false)
          return
        }

        if (findCaseInput.checked) {
          target.value = target.value.split(query).join(replaceQueryInput.value)
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          target.value = target.value.replace(
            new RegExp(escaped, 'gi'),
            replaceQueryInput.value
          )
        }

        target.dispatchEvent(new Event('input', {bubbles: true}))
        findMatchIndex = -1
        refreshFindStatus(false)
        toast(
          `Replaced ${matches.length} match${matches.length === 1 ? '' : 'es'}.`,
          'success'
        )
      }

      root.querySelectorAll('[data-find-target]').forEach(button => {
        button.addEventListener('click', () =>
          openFindPanel(button.dataset.findTarget)
        )
      })

      root
        .querySelector('#daedalus-find-close')
        .addEventListener('click', closeFindPanel)
      root
        .querySelector('#daedalus-find-next')
        .addEventListener('click', () => stepFind(1))
      root
        .querySelector('#daedalus-find-prev')
        .addEventListener('click', () => stepFind(-1))
      root
        .querySelector('#daedalus-find-replace')
        .addEventListener('click', replaceCurrentMatch)
      root
        .querySelector('#daedalus-find-replace-all')
        .addEventListener('click', replaceAllMatches)
      findQueryInput.addEventListener('input', () => {
        findMatchIndex = -1
        refreshFindStatus(true)
      })
      findCaseInput.addEventListener('change', () => {
        findMatchIndex = -1
        refreshFindStatus(true)
      })
      findQueryInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          stepFind(event.shiftKey ? -1 : 1)
        }
      })

      // Focus mode

      function enterFocusMode(textarea) {
        if (focusedCard) {
          exitFocusMode()
        }

        const card = textarea.closest('.daedalus-editor-card')
        if (!card) {
          return
        }

        focusedCard = card
        card.classList.add('is-focused')
        document.documentElement.classList.add('daedalus-editor-focused')
        textarea.focus()
      }

      function exitFocusMode() {
        focusedCard?.classList.remove('is-focused')
        focusedCard = null
        document.documentElement.classList.remove('daedalus-editor-focused')
      }

      root.querySelectorAll('[data-focus-target]').forEach(button => {
        button.addEventListener('click', () => {
          const target = root.querySelector(`#${button.dataset.focusTarget}`)
          if (target) {
            enterFocusMode(target)
          }
        })
      })

      // Quick-start templates and builder order

      const templateSelect = root.querySelector('#daedalus-template-select')

      templateSelect.addEventListener('change', () => {
        const selected = templates.getTemplate(templateSelect.value)
        root.querySelector('#daedalus-template-description').textContent =
          selected?.description ||
          'Choose a template to scaffold the project workflow.'
      })

      root
        .querySelector('#daedalus-apply-template')
        .addEventListener('click', async () => {
          const template = templates.getTemplate(templateSelect.value)

          if (!template) {
            toast('Choose a template first.', 'warning')
            return
          }

          const hasExistingScaffold = Boolean(
            project.character.builder.rules.trim() ||
            project.dialogue.examples.length ||
            project.initialMessages.some(message => message.content.trim())
          )

          if (
            hasExistingScaffold &&
            !confirm(
              `Apply the “${template.name}” workflow template? Builder text will be preserved, but section order and active Roleplay Rules will be updated. Existing dialogue examples and written initial messages will not be deleted.`
            )
          ) {
            return
          }

          if (hasExistingScaffold) {
            await saveNow()
            project = await store.createSnapshot(
              `Before applying ${template.name} template`
            )
          }

          project.character.builderOrder = [...template.builderOrder]

          if (template.rulePresetId) {
            const compiledRules = rulesLibrary.compilePreset(
              template.rulePresetId
            )
            if (compiledRules) {
              project.character.builder.rules = compiledRules
            }
          }

          if (!project.dialogue.examples.length) {
            project.dialogue.examples = template.dialogueLabels.map(
              (label, index) => ({
                ...makeDialogueExample(index),
                label
              })
            )
          }

          const introsAreBlank = project.initialMessages.every(
            message => !message.content.trim()
          )
          if (introsAreBlank) {
            project.initialMessages = template.introLabels.map(
              (label, index) => ({
                ...makeInitialMessage(index),
                label
              })
            )
          }

          await saveNow()
          renderProject()
          toast(
            `${template.name} template applied. No character prose was generated.`,
            'success'
          )
        })

      root
        .querySelector('#daedalus-builder-order-list')
        .addEventListener('click', event => {
          const action = event.target.dataset.builderOrderAction
          const chip = event.target.closest('[data-builder-order-key]')

          if (!action || !chip) {
            return
          }

          const order = project.character.builderOrder
          const index = order.indexOf(chip.dataset.builderOrderKey)
          const targetIndex = action === 'up' ? index - 1 : index + 1

          if (index < 0 || targetIndex < 0 || targetIndex >= order.length) {
            return
          }

          ;[order[index], order[targetIndex]] = [
            order[targetIndex],
            order[index]
          ]
          renderCharacterBuilderOrder()
          scheduleSave()
        })

      // Character builder compile

      root
        .querySelector('#daedalus-compile-character')
        .addEventListener('click', async () => {
          const compiled = compilers.compileCharacterBuilder(
            project.character.builder,
            project.character.builderOrder
          )

          if (!compiled) {
            toast('The Character Builder is empty.', 'warning')
            return
          }

          const finalCompiled = systemsCore.upsertSystemsSection(
            compiled,
            project.systems
          )

          if (finalCompiled.length > 25000) {
            toast(
              `Compiled Character Prompt would be ${finalCompiled.length.toLocaleString()} / 25,000 characters. Shorten the Builder or disable some RP Systems first.`,
              'error'
            )
            return
          }

          if (
            project.character.prompt.trim() &&
            project.character.prompt.trim() !== finalCompiled.trim() &&
            !confirm(
              'Compile Builder into the Raw Prompt? This will replace the current raw Character Prompt while preserving the current RP Systems section.'
            )
          ) {
            return
          }

          if (
            project.character.prompt.trim() &&
            project.character.prompt.trim() !== finalCompiled.trim()
          ) {
            await saveNow()
            project = await store.createSnapshot(
              'Before Character Builder compile'
            )
          }

          project.character.prompt = finalCompiled
          characterPromptInput.value = compiled
          updateCounters()
          renderCharacterOutline()
          await saveNow()
          toast('Character Builder compiled into the raw prompt.', 'success')
        })

      // Rules Studio

      const rulePresetSelect = root.querySelector(
        '#daedalus-rule-preset-select'
      )

      rulePresetSelect.addEventListener('change', () => {
        const preset = rulesLibrary.RULE_PRESETS.find(
          item => item.id === rulePresetSelect.value
        )
        root.querySelector('#daedalus-rule-preset-description').textContent =
          preset?.description ||
          'Choose a preset to load a coordinated rule set.'
      })

      root
        .querySelector('#daedalus-append-rule-preset')
        .addEventListener('click', () => {
          const preset = rulesLibrary.RULE_PRESETS.find(
            item => item.id === rulePresetSelect.value
          )
          const compiled = rulesLibrary.compilePreset(rulePresetSelect.value)

          if (!preset || !compiled) {
            toast('Choose a rules preset first.', 'warning')
            return
          }

          setActiveRules(
            rulesLibrary.appendRuleText(
              project.character.builder.rules,
              compiled
            )
          )
          toast(`Appended the ${preset.name} preset.`, 'success')
        })

      root
        .querySelector('#daedalus-replace-rule-preset')
        .addEventListener('click', () => {
          const preset = rulesLibrary.RULE_PRESETS.find(
            item => item.id === rulePresetSelect.value
          )
          const compiled = rulesLibrary.compilePreset(rulePresetSelect.value)

          if (!preset || !compiled) {
            toast('Choose a rules preset first.', 'warning')
            return
          }

          if (
            project.character.builder.rules.trim() &&
            !confirm(
              `Replace the current Roleplay Rules with the “${preset.name}” preset?`
            )
          ) {
            return
          }

          setActiveRules(compiled)
          toast(
            `Loaded the ${preset.name} preset. Everything remains editable.`,
            'success'
          )
        })

      root
        .querySelector('#daedalus-sync-rules-to-raw')
        .addEventListener('click', async () => {
          const rulesText = project.character.builder.rules.trim()

          if (!rulesText) {
            toast('There are no active Roleplay Rules to sync.', 'warning')
            return
          }

          project.character.prompt = rulesLibrary.upsertRulesSection(
            project.character.prompt,
            rulesText
          )
          characterPromptInput.value = project.character.prompt
          updateCounters()
          renderCharacterOutline()
          await saveNow()
          toast(
            'Roleplay Rules synchronized into the raw Character Prompt.',
            'success'
          )
        })

      root
        .querySelector('#daedalus-clear-rules')
        .addEventListener('click', () => {
          if (
            project.character.builder.rules.trim() &&
            !confirm('Clear all active Roleplay Rules?')
          ) {
            return
          }

          setActiveRules('')
        })

      root
        .querySelector('#daedalus-rule-search')
        .addEventListener('input', renderBuiltInRules)
      root
        .querySelector('#daedalus-rule-category')
        .addEventListener('change', renderBuiltInRules)

      root
        .querySelector('#daedalus-save-custom-rule')
        .addEventListener('click', async () => {
          const name = root
            .querySelector('#daedalus-custom-rule-name')
            .value.trim()
          const category = root
            .querySelector('#daedalus-custom-rule-category')
            .value.trim()
          const content = root
            .querySelector('#daedalus-custom-rule-content')
            .value.trim()

          if (!name || !content) {
            toast('A custom rule needs a name and rule text.', 'warning')
            return
          }

          const wasEditing = Boolean(editingCustomRuleId)

          await store.saveCustomRule({
            id: editingCustomRuleId || undefined,
            name,
            category,
            content
          })

          customRules = await store.getCustomRules()
          resetCustomRuleEditor()
          renderCustomRules()
          toast(
            wasEditing ? 'Custom rule updated.' : 'Custom rule saved.',
            'success'
          )
        })

      root
        .querySelector('#daedalus-cancel-rule-edit')
        .addEventListener('click', resetCustomRuleEditor)

      root.addEventListener('click', async event => {
        const card = event.target.closest('[data-rule-id]')
        const action = event.target.dataset.ruleAction

        if (!card || !action) {
          return
        }

        const isCustom = card.dataset.ruleCustom === 'true'
        const source = isCustom ? customRules : rulesLibrary.BUILT_IN_RULES
        const rule = source.find(item => item.id === card.dataset.ruleId)

        if (!rule) {
          return
        }

        if (action === 'add') {
          addRuleToActiveRules(rule)
          return
        }

        if (!isCustom) {
          return
        }

        if (action === 'edit') {
          editingCustomRuleId = rule.id
          root.querySelector('#daedalus-custom-rule-name').value = rule.name
          root.querySelector('#daedalus-custom-rule-category').value =
            rule.category
          root.querySelector('#daedalus-custom-rule-content').value =
            rule.content
          root.querySelector('#daedalus-save-custom-rule').textContent =
            'Update Custom Rule'
          root
            .querySelector('#daedalus-cancel-rule-edit')
            .classList.remove('daedalus-hidden')
          root.querySelector('#daedalus-custom-rule-name').focus()
          return
        }

        if (action === 'delete') {
          if (!confirm(`Delete the custom rule “${rule.name}”?`)) {
            return
          }

          await store.deleteCustomRule(rule.id)
          customRules = await store.getCustomRules()

          if (editingCustomRuleId === rule.id) {
            resetCustomRuleEditor()
          }

          renderCustomRules()
          toast('Custom rule deleted.', 'success')
        }
      })

      // Scene builder compile

      root
        .querySelector('#daedalus-compile-scene')
        .addEventListener('click', async () => {
          const compiled = compilers.compileSceneBuilder(project.scene.builder)

          if (!compiled) {
            toast('The Scene Builder is empty.', 'warning')
            return
          }

          if (
            project.scene.prompt.trim() &&
            project.scene.prompt.trim() !== compiled.trim() &&
            !confirm(
              'Compile Scene Builder into the Raw Scene? This will replace the current raw Scene Prompt.'
            )
          ) {
            return
          }

          if (
            project.scene.prompt.trim() &&
            project.scene.prompt.trim() !== compiled.trim()
          ) {
            await saveNow()
            project = await store.createSnapshot('Before Scene Builder compile')
          }

          project.scene.prompt = compiled
          scenePromptInput.value = compiled
          updateCounters()
          await saveNow()
          toast('Scene Builder compiled into the raw scene.', 'success')
        })

      // Dialogue builder

      root
        .querySelector('#daedalus-add-dialogue-example')
        .addEventListener('click', () => {
          project.dialogue.examples.push(
            makeDialogueExample(project.dialogue.examples.length)
          )
          renderDialogueExamples()
          scheduleSave()
        })

      root
        .querySelector('#daedalus-dialogue-examples')
        .addEventListener('input', event => {
          const card = event.target.closest('[data-dialogue-id]')
          const field = event.target.dataset.dialogueField

          if (!card || !field) {
            return
          }

          const example = project.dialogue.examples.find(
            item => item.id === card.dataset.dialogueId
          )
          if (!example) {
            return
          }

          example[field] = event.target.value
          scheduleSave()
        })

      root
        .querySelector('#daedalus-dialogue-examples')
        .addEventListener('click', event => {
          const action = event.target.dataset.dialogueAction
          const card = event.target.closest('[data-dialogue-id]')

          if (!action || !card) {
            return
          }

          const index = project.dialogue.examples.findIndex(
            item => item.id === card.dataset.dialogueId
          )
          if (index < 0) {
            return
          }

          if (action === 'delete') {
            project.dialogue.examples.splice(index, 1)
          } else if (action === 'duplicate') {
            const copy = JSON.parse(
              JSON.stringify(project.dialogue.examples[index])
            )
            copy.id = store.makeId('dialogue')
            copy.label = `${copy.label} Copy`
            project.dialogue.examples.splice(index + 1, 0, copy)
          } else if (action === 'up' && index > 0) {
            ;[
              project.dialogue.examples[index - 1],
              project.dialogue.examples[index]
            ] = [
              project.dialogue.examples[index],
              project.dialogue.examples[index - 1]
            ]
          } else if (
            action === 'down' &&
            index < project.dialogue.examples.length - 1
          ) {
            ;[
              project.dialogue.examples[index + 1],
              project.dialogue.examples[index]
            ] = [
              project.dialogue.examples[index],
              project.dialogue.examples[index + 1]
            ]
          }

          renderDialogueExamples()
          scheduleSave()
        })

      root
        .querySelector('#daedalus-compile-dialogue')
        .addEventListener('click', async () => {
          const compiled = compilers.compileDialogueExamples(
            project.dialogue.examples
          )

          if (!compiled) {
            toast(
              'There are no completed dialogue examples to compile.',
              'warning'
            )
            return
          }

          if (
            project.dialogue.raw.trim() &&
            project.dialogue.raw.trim() !== compiled.trim() &&
            !confirm(
              'Compile the Example Builder into Raw Dialogue? This will replace the current raw Dialogue Example.'
            )
          ) {
            return
          }

          project.dialogue.raw = compiled
          dialogueRawInput.value = compiled
          updateCounters()
          await saveNow()
          toast('Dialogue examples compiled into Raw Dialogue.', 'success')
        })

      // Initial messages

      root
        .querySelector('#daedalus-add-intro')
        .addEventListener('click', () => {
          project.initialMessages.push(
            makeInitialMessage(project.initialMessages.length)
          )
          renderInitialMessages()
          scheduleSave()
        })

      root
        .querySelector('#daedalus-initial-list')
        .addEventListener('input', event => {
          const card = event.target.closest('[data-intro-id]')
          const field = event.target.dataset.introField

          if (!card || !field) {
            return
          }

          const message = project.initialMessages.find(
            item => item.id === card.dataset.introId
          )
          if (!message) {
            return
          }

          message[field] = event.target.value

          if (field === 'content') {
            const counter = card.querySelector('[data-intro-counter]')
            const length = event.target.value.length
            counter.textContent = `${length.toLocaleString()} / 10,000`
            counter.classList.toggle('is-near-limit', length > 9000)
          }

          scheduleSave()
        })

      root
        .querySelector('#daedalus-initial-list')
        .addEventListener('click', event => {
          const card = event.target.closest('[data-intro-id]')

          if (!card) {
            return
          }

          const message = project.initialMessages.find(
            item => item.id === card.dataset.introId
          )
          const index = project.initialMessages.findIndex(
            item => item.id === card.dataset.introId
          )

          if (!message || index < 0) {
            return
          }

          if (event.target.dataset.introInsert) {
            const textarea = card.querySelector('[data-intro-field="content"]')
            insertAtCursor(textarea, event.target.dataset.introInsert)
            return
          }

          const action = event.target.dataset.introAction
          if (!action) {
            return
          }

          if (action === 'delete') {
            if (project.initialMessages.length === 1) {
              project.initialMessages[0].content = ''
              project.initialMessages[0].label = 'Initial Message 1'
            } else {
              project.initialMessages.splice(index, 1)
            }
          } else if (action === 'duplicate') {
            const copy = JSON.parse(JSON.stringify(message))
            copy.id = store.makeId('intro')
            copy.label = `${copy.label} Copy`
            project.initialMessages.splice(index + 1, 0, copy)
          } else if (action === 'up' && index > 0) {
            ;[
              project.initialMessages[index - 1],
              project.initialMessages[index]
            ] = [
              project.initialMessages[index],
              project.initialMessages[index - 1]
            ]
          } else if (
            action === 'down' &&
            index < project.initialMessages.length - 1
          ) {
            ;[
              project.initialMessages[index + 1],
              project.initialMessages[index]
            ] = [
              project.initialMessages[index],
              project.initialMessages[index + 1]
            ]
          }

          renderInitialMessages()
          scheduleSave()
        })

      // Fragments

      function allFragments() {
        return [...BUILT_IN_FRAGMENTS, ...customFragments]
      }

      async function insertFragment(fragment) {
        if (!fragment?.content) {
          return
        }

        if (fragment.target === 'dialogue') {
          project.dialogue.raw = appendText(
            project.dialogue.raw,
            fragment.content
          )
          dialogueRawInput.value = project.dialogue.raw
        } else if (fragment.target === 'scene') {
          project.scene.prompt = appendText(
            project.scene.prompt,
            fragment.content
          )
          scenePromptInput.value = project.scene.prompt
        } else {
          project.character.prompt = appendText(
            project.character.prompt,
            fragment.content
          )
          characterPromptInput.value = project.character.prompt
          renderCharacterOutline()
        }

        updateCounters()
        await saveNow()
        toast(`Inserted “${fragment.name}”.`, 'success')
      }

      root
        .querySelector('#daedalus-save-fragment')
        .addEventListener('click', async () => {
          const name = root
            .querySelector('#daedalus-fragment-name')
            .value.trim()
          const category = root
            .querySelector('#daedalus-fragment-category')
            .value.trim()
          const target = root.querySelector('#daedalus-fragment-target').value
          const content = root
            .querySelector('#daedalus-fragment-content')
            .value.trim()

          if (!name || !content) {
            toast('A fragment needs a name and content.', 'warning')
            return
          }

          await store.saveCustomFragment({name, category, target, content})
          customFragments = await store.getCustomFragments()
          root.querySelector('#daedalus-fragment-name').value = ''
          root.querySelector('#daedalus-fragment-category').value = ''
          root.querySelector('#daedalus-fragment-content').value = ''
          renderFragments()
          toast('Fragment saved.', 'success')
        })

      root.addEventListener('click', async event => {
        const card = event.target.closest('[data-fragment-id]')
        const action = event.target.dataset.fragmentAction

        if (!card || !action) {
          return
        }

        const fragment = allFragments().find(
          item => item.id === card.dataset.fragmentId
        )
        if (!fragment) {
          return
        }

        if (action === 'insert') {
          await insertFragment(fragment)
        } else if (
          action === 'delete' &&
          card.dataset.fragmentCustom === 'true'
        ) {
          await store.deleteCustomFragment(fragment.id)
          customFragments = await store.getCustomFragments()
          renderFragments()
          toast('Fragment deleted.', 'success')
        }
      })

      // Apply helpers

      function applyResultStats(result) {
        const entries = []

        for (const [key, value] of Object.entries(result || {})) {
          if (key === 'initialMessages' && Array.isArray(value)) {
            entries.push(...value)
          } else if (value && typeof value === 'object' && 'ok' in value) {
            if (key === 'images') {
              continue
            }
            entries.push(value)
          }
        }

        return {
          success: entries.filter(item => item.ok).length,
          failed: entries.filter(item => !item.ok).length
        }
      }

      async function runApply(label, action) {
        await saveNow()
        setFooter(`${label}...`)

        try {
          const result = await action()
          const stats = applyResultStats(result)

          if (stats.failed) {
            toast(
              `${label} finished with ${stats.failed} field issue${stats.failed === 1 ? '' : 's'}. Check Inspector and console.`,
              'warning'
            )
          } else {
            toast(`${label} complete.`, 'success')
          }

          setFooter('Clank synchronization complete')
          renderSyncStatus()
          return result
        } catch (error) {
          console.error(`[Daedalus] ${label} failed:`, error)
          toast(`${label} failed.`, 'error')
          setFooter('Synchronization failed')
          return null
        }
      }

      root
        .querySelector('#daedalus-apply-character')
        .addEventListener('click', () => {
          runApply('Character apply', () =>
            detector.applyCharacterToClank(project)
          )
        })

      root
        .querySelector('#daedalus-apply-dialogue')
        .addEventListener('click', () => {
          runApply('Dialogue apply', () =>
            detector.applyDialogueToClank(project)
          )
        })

      root
        .querySelector('#daedalus-apply-scene')
        .addEventListener('click', () => {
          runApply('Scene apply', () => detector.applySceneToClank(project))
        })

      root
        .querySelector('#daedalus-apply-intros')
        .addEventListener('click', () => {
          runApply('Initial message apply', () =>
            detector.applyInitialMessagesToClank(project)
          )
        })

      root
        .querySelector('#daedalus-apply-all')
        .addEventListener('click', async () => {
          const systemIds = systemsCore.enabledModuleIds(project.systems)
          const hasHud = project.systems?.hud?.enabled === true
          const systemsSynced = systemsCore.upsertSystemsSection(
            project.character.prompt,
            project.systems
          ).trim() === String(project.character.prompt || '').trim()

          if ((systemIds.length || hasHud) && !systemsSynced) {
            const syncNow = confirm(
              `This project has configured RP Systems that are not yet in the raw Character Prompt.

Press OK to sync them before Apply All, or Cancel to continue without syncing the Systems configuration.`
            )
            if (syncNow) {
              const nextPrompt = systemsCore.upsertSystemsSection(
                project.character.prompt,
                project.systems
              )
              if (nextPrompt.length > 25000) {
                toast(
                  `RP Systems would push Character Prompt to ${nextPrompt.length.toLocaleString()} / 25,000 characters.`,
                  'error'
                )
                showView('systems')
                return
              }
              project.character.prompt = nextPrompt
              await saveNow()
              renderProject()
            }
          }

          const report = inspector.inspect(project)

          if (
            report.counts.errors > 0 &&
            !confirm(
              `Inspector currently reports ${report.counts.errors} error${report.counts.errors === 1 ? '' : 's'}. Some fields may be rejected by Clank's limits. Apply everything anyway?`
            )
          ) {
            showView('inspector')
            return
          }

          runApply('Full project apply', () =>
            detector.applyProjectToClank(project)
          )
        })

      // Import from Clank

      root
        .querySelector('#daedalus-import-clank')
        .addEventListener('click', async () => {
          if (
            !confirm(
              'Import the current Clank form into this Daedalus project? Existing raw fields and initial messages in this project will be replaced.'
            )
          ) {
            return
          }

          await saveNow()
          project = await store.createSnapshot('Before import from Clank')
          const imported = await detector.readCreateForm()

          project.character.name = imported.character.name
          project.character.prompt = imported.character.prompt
          project.dialogue.raw = imported.dialogue.raw
          project.scene.title = imported.scene.title
          project.scene.prompt = imported.scene.prompt

          if (imported.initialMessages.length) {
            project.initialMessages = imported.initialMessages.map(
              (message, index) => ({
                id: store.makeId('intro'),
                label: project.initialMessages[index]?.label || message.label,
                content: message.content
              })
            )
          }

          project = await store.saveProject(project)
          renderProject()
          toast('Imported the current Clank form into Daedalus.', 'success')
        })

      // Project management

      root
        .querySelector('#daedalus-new-project')
        .addEventListener('click', async () => {
          await saveNow()
          const title = prompt(
            'Name the new Daedalus project:',
            'Untitled Character'
          )
          if (title === null) {
            return
          }
          project = await store.createProject(title)
          renderProject()
          toast('New project created.', 'success')
        })

      root
        .querySelector('#daedalus-duplicate-project')
        .addEventListener('click', async () => {
          await saveNow()
          const suggested = `${project.meta.title} — Variant`
          const title = prompt('Name this project variant:', suggested)

          if (title === null) {
            return
          }

          project = await store.duplicateProject(project.id, title)
          renderProject()
          toast(
            'Project variant created. The original remains untouched.',
            'success'
          )
        })

      root
        .querySelector('#daedalus-delete-project')
        .addEventListener('click', async () => {
          if (
            !confirm(
              `Delete “${project.meta.title}” from Daedalus local storage? This cannot be undone unless you exported it.`
            )
          ) {
            return
          }

          project = await store.deleteProject(project.id)
          renderProject()
          toast('Project deleted.', 'success')
        })

      root
        .querySelector('#daedalus-snapshot')
        .addEventListener('click', async () => {
          await saveNow()
          project = await store.createSnapshot('Manual snapshot')
          renderOverview()
          toast('Snapshot created.', 'success')
        })

      root
        .querySelector('#daedalus-history-list')
        .addEventListener('click', async event => {
          if (event.target.dataset.snapshotAction !== 'restore') {
            return
          }

          const item = event.target.closest('[data-snapshot-id]')
          if (
            !item ||
            !confirm(
              'Restore this snapshot? The current project contents will be replaced, but the snapshot history itself will remain.'
            )
          ) {
            return
          }

          await saveNow()
          project = await store.createSnapshot('Before snapshot restore')
          project = await store.restoreSnapshot(item.dataset.snapshotId)
          renderProject()
          toast('Snapshot restored.', 'success')
        })

      root
        .querySelector('#daedalus-export-project')
        .addEventListener('click', async () => {
          await saveNow()
          const payload = await store.exportCurrentProject()
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json'
          })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `${sanitizeFilename(project.meta.title)}.daedalus.json`
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          setTimeout(() => URL.revokeObjectURL(url), 500)
          toast('Project exported.', 'success')
        })

      root
        .querySelector('#daedalus-import-project')
        .addEventListener('click', () => {
          importProjectFile.value = ''
          importProjectFile.click()
        })

      importProjectFile.addEventListener('change', async () => {
        const file = importProjectFile.files?.[0]
        if (!file) {
          return
        }

        try {
          const payload = JSON.parse(await file.text())
          project = await store.importProject(payload)
          renderProject()
          toast('Daedalus project imported.', 'success')
        } catch (error) {
          console.error('[Daedalus] Project import failed:', error)
          toast('That file is not a valid Daedalus project.', 'error')
        }
      })

      root
        .querySelector('#daedalus-export-backup')
        .addEventListener('click', async () => {
          await saveNow()
          const payload = await store.exportBackup()
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json'
          })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `Daedalus-Backup-${new Date().toISOString().slice(0, 10)}.json`
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          setTimeout(() => URL.revokeObjectURL(url), 500)
          toast('Full Daedalus backup exported.', 'success')
        })

      root
        .querySelector('#daedalus-import-backup')
        .addEventListener('click', () => {
          importBackupFile.value = ''
          importBackupFile.click()
        })

      importBackupFile.addEventListener('change', async () => {
        const file = importBackupFile.files?.[0]
        if (!file) {
          return
        }

        if (
          !confirm(
            'Restore this Daedalus backup? It will replace all current Daedalus projects, custom rules, fragments, and preferences. Export a backup first if you need the current state.'
          )
        ) {
          return
        }

        try {
          const payload = JSON.parse(await file.text())
          project = await store.importBackup(payload)
          customFragments = await store.getCustomFragments()
          customRules = await store.getCustomRules()
          settings = await store.getSettings()
          applyTheme(settings.theme)
          syncSplashModeControls()
          renderProject()
          toast('Full Daedalus backup restored.', 'success')
        } catch (error) {
          console.error('[Daedalus] Backup restore failed:', error)
          toast('That file is not a valid Daedalus backup.', 'error')
        }
      })

      // Inspector

      root
        .querySelector('#daedalus-refresh-inspector')
        .addEventListener('click', () => {
          renderInspector()
          toast('Inspector refreshed.', 'success')
        })

      root
        .querySelector('#daedalus-inspector-list')
        .addEventListener('click', event => {
          const button = event.target.closest('[data-inspector-view]')
          if (button) {
            showView(button.dataset.inspectorView)
          }
        })

      // Keyboard handling

      document.addEventListener('keydown', event => {
        const open = !workspace.classList.contains('daedalus-hidden')

        if (!open) {
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          closeWorkspace()
          return
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'f'
        ) {
          const active = document.activeElement
          const supportedIds = [
            'daedalus-character-prompt',
            'daedalus-dialogue-raw',
            'daedalus-scene-prompt'
          ]
          const characterRawVisible = !root
            .querySelector('[data-mode-panel="character:raw"]')
            .classList.contains('daedalus-hidden')
          const dialogueRawVisible = !root
            .querySelector('[data-mode-panel="dialogue:raw"]')
            .classList.contains('daedalus-hidden')
          const sceneRawVisible = !root
            .querySelector('[data-mode-panel="scene:raw"]')
            .classList.contains('daedalus-hidden')
          const targetId = supportedIds.includes(active?.id)
            ? active.id
            : activeView === 'character' && characterRawVisible
              ? 'daedalus-character-prompt'
              : activeView === 'dialogue' && dialogueRawVisible
                ? 'daedalus-dialogue-raw'
                : activeView === 'scene' && sceneRawVisible
                  ? 'daedalus-scene-prompt'
                  : null

          if (targetId) {
            event.preventDefault()
            openFindPanel(targetId)
            return
          }
        }

        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 's'
        ) {
          event.preventDefault()
          saveNow().then(() => toast('Project saved.', 'success'))
        }
      })

      // Periodic Clank connection status

      const detectionTimer = setInterval(() => {
        if (!root.isConnected) {
          clearInterval(detectionTimer)
          return
        }

        const count = detector.getDetectedCount()
        const metric = root.querySelector('#daedalus-detected-count')
        if (metric) {
          metric.textContent = String(count)
        }

        if (activeView === 'overview') {
          renderSyncStatus()
        }
      }, 2500)

      // Initial render

      await renderProject()
      setFooter('Clank remains unchanged until you apply')
    }
  }
})()
