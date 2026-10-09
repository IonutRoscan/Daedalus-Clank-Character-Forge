;(() => {
  'use strict'

  // Beginner guidance and guided creation wizard

  const HELP_TOPICS = {
    character: {
      title: 'Character Prompt',
      subtitle: 'Who the character is over the long term.',
      purpose:
        'This is the main definition of the character. Put information here that should remain true throughout the roleplay.',
      belongs: [
        'Personality and behavior',
        'Appearance and physical mannerisms',
        'Voice and speech patterns',
        'Important relationships',
        'Backstory, goals, fears, and motivations',
        'Long-term roleplay rules'
      ],
      avoid: [
        'Writing the entire opening scene here',
        'Temporary weather, time, or one-scene details',
        'Long demonstrations of dialogue that belong in Dialogue Examples',
        'Repeating the same fact many times without adding meaning'
      ],
      basic: 'Mira is shy, kind, smart, and likes books.',
      useful:
        'Mira is reserved around unfamiliar people and often hides nervousness behind dry humor. She avoids direct confrontation, but becomes surprisingly stubborn when somebody she cares about is threatened. She shows affection through practical help more often than verbal reassurance.',
      why:
        'The second version describes observable behavior, situations that change the character, and how personality affects actual roleplay.'
    },
    dialogue: {
      title: 'Dialogue Examples',
      subtitle: 'Show what the character sounds like in practice.',
      purpose:
        'Dialogue Examples demonstrate speech, reactions, pacing, mannerisms, and behavior. They are examples, not another biography.',
      belongs: [
        'Short {{user}} / {{char}} exchanges',
        'Different emotional situations',
        'Character-specific vocabulary and rhythm',
        'Examples of how personality appears in conversation'
      ],
      avoid: [
        'Repeating the full Character Prompt',
        'Writing only generic greetings',
        'Making every example the same emotional tone',
        'Using examples to force exact future dialogue'
      ],
      basic: '{{user}}: Are you okay?\n{{char}}: Yes, I am fine.',
      useful:
        '{{user}}: Are you okay?\n{{char}}: *She keeps her eyes on the cracked cup instead of looking up.* "I said I am. That does not mean I want to talk about it."',
      why:
        'The useful example reveals tone, body language, avoidance, and sentence style instead of only answering the question.'
    },
    scene: {
      title: 'Scene Prompt',
      subtitle: 'What is happening when this roleplay begins.',
      purpose:
        'The Scene Prompt describes the current situation, location, atmosphere, immediate conflict, and what the characters know right now.',
      belongs: [
        'Where the scene starts',
        'Time, weather, or atmosphere when relevant',
        'Immediate goals and conflict',
        'What {{char}} and {{user}} currently know',
        'Temporary facts that matter to this opening scenario'
      ],
      avoid: [
        'Repeating the entire permanent character definition',
        'Resolving the scene before the roleplay starts',
        'Forcing actions or emotions onto {{user}}',
        'Overloading the opening with every piece of world lore'
      ],
      basic: 'They are in a forest at night.',
      useful:
        'A cold rain has turned the northern forest road to mud. {{char}} has been following signs of something moving parallel to the path for the last hour, but neither character has seen it directly. The nearest village is still several kilometers away.',
      why:
        'The second version establishes playable circumstances, uncertainty, and immediate context without deciding what {{user}} does.'
    },
    initials: {
      title: 'Initial Message',
      subtitle: 'The first playable moment.',
      purpose:
        'The Initial Message is the opening turn of the roleplay. It should establish enough context to be interesting while leaving a natural place for {{user}} to respond.',
      belongs: [
        'A concrete action, event, question, discovery, or tension point',
        'Enough sensory/context detail to understand the moment',
        'Character voice and behavior',
        'A clear opening for {{user}} to act'
      ],
      avoid: [
        'Narrating what {{user}} thinks or chooses',
        'Explaining the whole backstory before play begins',
        'Ending after the character has already solved the scene',
        'A greeting with no hook unless the RP is intentionally very casual'
      ],
      basic: '"Hello. Nice to meet you."',
      useful:
        '*The library door clicks shut behind you. Mira looks up from a desk covered in maps, then quickly places one hand over a page marked in red ink.* "You were not supposed to be back until tomorrow."',
      why:
        'The second version immediately creates a situation, shows personality, and gives {{user}} several natural ways to react.'
    },
    rules: {
      title: 'AI & Roleplay Rules',
      subtitle: 'How the roleplay should behave consistently.',
      purpose:
        'Rules are useful for recurring behavior such as protecting {{user}} agency, pacing scenes, maintaining spatial continuity, or preserving secrets.',
      belongs: [
        'User-agency rules',
        'Formatting preferences',
        'Pacing and immersion rules',
        'Knowledge boundaries',
        'Continuity expectations',
        'Genre-specific behavior'
      ],
      avoid: [
        'One-time plot facts that belong in the Scene',
        'Dozens of rules that say nearly the same thing',
        'Rules that contradict the character definition',
        'Trying to control exact future responses instead of general behavior'
      ],
      basic: 'Be immersive and stay in character.',
      useful:
        'Remain fully in character as {{char}}. Never decide {{user}}\'s actions, dialogue, thoughts, or emotions. Maintain current positioning and physical distance. Let important emotional moments unfold rather than skipping through them.',
      why:
        'The useful version turns a vague preference into behaviors the model can apply during actual scenes.'
    },
    fragments: {
      title: 'Fragments',
      subtitle: 'Reusable pieces of creator-written prompt text.',
      purpose:
        'Fragments save text you commonly reuse across characters. They are building blocks, not mandatory presets.',
      belongs: [
        'Formatting conventions',
        'Reusable world rules',
        'Narration preferences',
        'Repeated character-creation structures'
      ],
      avoid: [
        'Character-specific facts you will never reuse',
        'Huge full prompts when a smaller reusable section is enough'
      ],
      basic: 'Use third person.',
      useful:
        'Write narration in clear third-person prose focused on observable action, environment, and character-specific detail.',
      why:
        'A fragment is most useful when it can be dropped into many different projects without needing major rewriting.'
    },
    systems: {
      title: 'RP Systems Studio',
      subtitle: 'Choose what the roleplay should keep track of.',
      purpose:
        'RP Systems let you configure recurring state and continuity behavior such as inventory, time, weather, relationships, health, quests, secrets, or a response HUD without writing the prompting from scratch.',
      belongs: [
        'Persistent state you want the AI to remember',
        'Inventory, time, weather, locations, conditions, and objectives',
        'Relationship or reputation tracking',
        'Knowledge / secret boundaries',
        'Optional state-display formatting'
      ],
      avoid: [
        'Enabling every system just because it exists',
        'Using Systems for one-time scene facts',
        'Assuming Daedalus runs these systems after character creation',
        'Showing a huge HUD every response when the RP does not need it'
      ],
      basic: 'Remember the inventory.',
      useful:
        'Track inventory persistently. Items change only through justified in-story actions, consumables decrease when used, and key items remain until transferred, lost, destroyed, or consumed.',
      why:
        'The Systems Studio turns a vague request into explicit persistence rules and optional formatting while remaining editable.'
    },
    planning: {
      title: 'Planning Station',
      subtitle: 'Private worldbuilding that never syncs to Clank.',
      purpose:
        'The Labyrinth is your private planning board for characters, places, factions, mysteries, powers, artifacts, and relationships.',
      belongs: [
        'Worldbuilding notes',
        'Relationship maps',
        'Secrets and mysteries',
        'Power systems',
        'Plot threads and events',
        'Timeline ordering and scene beats',
        'Relationship matrices and faction webs',
        'Anything useful to you as the creator'
      ],
      avoid: [
        'Assuming Planning automatically enters the Character Prompt',
        'Treating every note as something the AI must know',
        'Putting secrets into an export unless you actually want the recipient to see them'
      ],
      basic: 'Character A knows Character B.',
      useful:
        'Character A → distrusts → Character B, because B covered up the Archive Incident. B does not know A discovered the evidence.',
      why:
        'Planning can preserve creator-only context and relationships without overloading the actual Clank prompt. Storycraft views can turn the same data into a Timeline, Plot Board, relationship matrix, or portable Planning Document.'
    }
  }

  const GENRE_RULES = {
    immersive: ['rule-user-agency', 'rule-stay-in-character', 'rule-character-consistency', 'rule-natural-turns'],
    horror: ['rule-horror-tension', 'rule-horror-restraint', 'rule-spatial-awareness', 'rule-knowledge-boundaries'],
    romance: ['rule-slow-romance', 'rule-romantic-subtext', 'rule-natural-turns', 'rule-spatial-awareness'],
    adventure: ['rule-adventure-continuity', 'rule-rpg-world', 'rule-consequences'],
    mystery: ['rule-mystery-clues', 'rule-mystery-preserve', 'rule-knowledge-boundaries'],
    domestic: ['rule-domestic-details', 'rule-offscreen-routines', 'rule-world-lives'],
    ensemble: ['rule-ensemble-balance', 'rule-ensemble-relationships', 'rule-knowledge-boundaries'],
    action: ['rule-readable-combat', 'rule-no-plot-armor', 'rule-spatial-awareness']
  }

  const WIZARD_STEPS = [
    {
      id: 'basics',
      title: 'The character',
      kicker: 'STEP 1',
      intro: 'Start with the simplest version of the idea. You do not need a perfect prompt yet.',
      coach: [
        'Describe the role the character plays in the story, not only their job.',
        'A one-sentence concept is enough to begin.',
        'Specific details can be added later in Builder.'
      ]
    },
    {
      id: 'personality',
      title: 'Personality that affects behavior',
      kicker: 'STEP 2',
      intro: 'Traits are more useful when they tell you how the character actually reacts.',
      coach: [
        'Try 2–4 strong traits rather than a long adjective list.',
        'Give at least one contradiction, weakness, or situation that changes their behavior.',
        'Habits and small tells help a character feel consistent.'
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance & physical presence',
      kicker: 'STEP 3',
      intro: 'Focus on details another character could actually notice and details worth remembering.',
      coach: [
        'You do not need to catalog every body measurement.',
        'Clothing, posture, movement, scars, accessories, and repeated mannerisms often matter more.',
        'Include only details you care about staying consistent.'
      ]
    },
    {
      id: 'voice',
      title: 'Voice & speech',
      kicker: 'STEP 4',
      intro: 'Describe the rules of how they talk. Dialogue Examples will demonstrate those rules later.',
      coach: [
        'Think about vocabulary, sentence length, formality, humor, hesitation, and emotional changes.',
        'A useful voice description tells the model what changes when the character is angry, nervous, comfortable, or afraid.',
        'List phrases or habits to avoid if they would feel out of character.'
      ]
    },
    {
      id: 'relationship',
      title: 'Relationship with {{user}}',
      kicker: 'STEP 5',
      intro: 'Define where the relationship starts. It can still change naturally during the roleplay.',
      coach: [
        'Separate what {{char}} feels from what {{char}} knows.',
        'Shared history gives the model concrete material to reference.',
        'Do not pre-decide {{user}}\'s emotions or choices.'
      ]
    },
    {
      id: 'motivation',
      title: 'Backstory, goals & pressure points',
      kicker: 'STEP 6',
      intro: 'Give the character reasons to act instead of waiting passively for the user.',
      coach: [
        'Backstory is most useful when it explains present behavior.',
        'Goals create direction without forcing a single plot.',
        'Fears, secrets, or unresolved problems give scenes something to push against.'
      ]
    },
    {
      id: 'style',
      title: 'What kind of roleplay is this?',
      kicker: 'STEP 7',
      intro: 'Choose the experience you want. Daedalus can add useful rule foundations without writing the character for you.',
      coach: [
        'You can mix genres.',
        'Recommended rules remain fully editable in the Rules Studio.',
        'Choosing nothing is completely valid.'
      ]
    },
    {
      id: 'systems',
      title: 'What should the roleplay keep track of?',
      kicker: 'STEP 8',
      intro: 'Optional systems can handle recurring continuity like inventory, time, relationships, health, quests, secrets, and a compact state display.',
      coach: [
        'Only enable systems that matter to this particular roleplay.',
        'Behavior Recipes are editable starting points, not locked modes.',
        "Daedalus generates instructions; Clank\'s AI performs the tracking during roleplay."
      ]
    },
    {
      id: 'dialogue',
      title: 'Show how the character sounds',
      kicker: 'STEP 9',
      intro: 'One useful exchange is better than five generic greetings.',
      coach: [
        'Choose a situation that reveals personality.',
        'Let the example demonstrate voice, reaction, and mannerisms.',
        'This is an example, not dialogue the character must repeat later.'
      ]
    },
    {
      id: 'scene',
      title: 'Opening scenario',
      kicker: 'STEP 10',
      intro: 'Describe what is true right now when the roleplay begins.',
      coach: [
        'Location + immediate situation are usually enough to establish a scene.',
        'Use hidden information only if it genuinely matters.',
        'Leave room for the user to choose what happens next.'
      ]
    },
    {
      id: 'initial',
      title: 'The first playable moment',
      kicker: 'STEP 11',
      intro: 'Write the first message as an actual turn of roleplay, not a setup document.',
      coach: [
        'End with a question, tension point, discovery, action, or other natural opening.',
        'Show the character immediately instead of explaining them.',
        'Never decide what {{user}} does.'
      ]
    },
    {
      id: 'review',
      title: 'Review & continue',
      kicker: 'FINAL STEP',
      intro: 'Your answers are already stored in the normal Daedalus project. Nothing is trapped inside the wizard.',
      coach: [
        'You can keep editing every section manually after the wizard.',
        'Compile only when you want the structured Builder data turned into raw Clank text.',
        'Inspector can help you review the finished project.'
      ]
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

  function lines(values) {
    return values
      .map(([label, value]) => {
        const text = String(value || '').trim()
        return text ? `${label}: ${text}` : ''
      })
      .filter(Boolean)
      .join('\n')
  }

  function appendUniqueParagraph(existing, addition) {
    const source = String(existing || '').trim()
    const next = String(addition || '').trim()
    if (!next) return source
    if (!source) return next
    if (source.includes(next)) return source
    return `${source}\n\n${next}`
  }

  window.DaedalusGuidance = {
    HELP_TOPICS,

    mount(options) {
      const {
        root,
        store,
        rulesLibrary,
        compilers,
        getProject,
        markDirty,
        toast,
        navigate,
        getSettings,
        onSettingsChanged,
        refreshProject
      } = options || {}

      const mount = root?.querySelector('#daedalus-guide-mount')
      if (!root || !mount || !store || !getProject || !compilers) {
        throw new Error('Daedalus beginner guidance could not initialize.')
      }

      let guidanceEnabled = getSettings?.()?.guidanceEnabled !== false
      let wizardStep = 0
      let wizardOpen = false
      let coachOpen = false
      let wizardDraft = {}
      let wizardGenres = new Set()
      let wizardAddRules = true

      mount.innerHTML = `
        <div class="daedalus-guide-shell">
          <header class="daedalus-page-header daedalus-page-header-row">
            <div>
              <div class="daedalus-eyebrow">CREATOR GUIDE</div>
              <h1>Character Creation 101</h1>
              <p>Learn what each Clank field actually does, or build a character step-by-step without needing to know prompt-engineering terminology first.</p>
            </div>
            <button id="daedalus-guide-start-wizard" class="daedalus-primary-button" type="button">Start Guided Creation</button>
          </header>

          <div class="daedalus-guide-toolbar">
            <div>
              <strong>Guidance throughout Daedalus</strong>
              <span>Show short coaching notes inside the main workspaces.</span>
            </div>
            <button id="daedalus-guide-toggle" class="daedalus-secondary-button" type="button"></button>
          </div>

          <section class="daedalus-guide-map">
            <div class="daedalus-card-label">HOW CLANK CHARACTER CREATION FITS TOGETHER</div>
            <div class="daedalus-guide-flow">
              ${[
                ['character', '⌁', 'Character Prompt', 'Who they are', 'character'],
                ['dialogue', '◈', 'Dialogue Examples', 'How they sound', 'dialogue'],
                ['scene', '▣', 'Scene Prompt', 'What is happening now', 'scene'],
                ['initials', '✦', 'Initial Message', 'The first playable moment', 'initials'],
                ['rules', '△', 'AI & RP Rules', 'How the RP behaves', 'character'],
                ['systems', '⬢', 'RP Systems', 'What the RP keeps track of', 'systems']
              ]
                .map(
                  ([topic, icon, name, desc, view]) => `
                    <button class="daedalus-guide-flow-card" data-guide-topic="${topic}" data-guide-view="${view}" type="button">
                      <span class="daedalus-guide-flow-icon">${icon}</span>
                      <strong>${name}</strong>
                      <small>${desc}</small>
                      <span class="daedalus-guide-flow-more">Explain →</span>
                    </button>
                  `
                )
                .join('')}
            </div>
          </section>

          <section class="daedalus-guide-progress-card">
            <div>
              <div class="daedalus-card-label">YOUR PROJECT AT A GLANCE</div>
              <h2>What should you work on next?</h2>
              <p>There is no required perfect order. This simply shows which major creation pieces already contain something.</p>
            </div>
            <div id="daedalus-guide-project-progress" class="daedalus-guide-project-progress"></div>
          </section>

          <div class="daedalus-guide-grid">
            <article class="daedalus-guide-feature-card">
              <div class="daedalus-card-label">BEGINNER WORKFLOW</div>
              <h2>Build by answering normal questions.</h2>
              <p>The Guided Creation wizard fills the same Character Builder, Dialogue, Scene, Rules, and Initial Message tools that advanced creators use.</p>
              <button data-guide-launch-wizard class="daedalus-primary-button" type="button">Begin the Wizard</button>
            </article>

            <article class="daedalus-guide-feature-card">
              <div class="daedalus-card-label">A USEFUL MENTAL MODEL</div>
              <h2>Describe behavior, not only adjectives.</h2>
              <div class="daedalus-guide-example-mini">
                <span>Basic</span>
                <p>"Shy, nice, smart."</p>
                <span>More useful</span>
                <p>"Reserved with strangers, avoids direct confrontation, but becomes stubborn when somebody she cares about is threatened."</p>
              </div>
            </article>

            <article class="daedalus-guide-feature-card">
              <div class="daedalus-card-label">USER AGENCY</div>
              <h2>Leave {{user}} playable.</h2>
              <p>Strong roleplay prompts usually define the character and world without deciding what the user says, thinks, feels, or chooses.</p>
              <button class="daedalus-secondary-button" data-guide-topic="rules" type="button">See roleplay-rule guidance</button>
            </article>

            <article class="daedalus-guide-feature-card">
              <div class="daedalus-card-label">WHEN YOU GET STUCK</div>
              <h2>Ask what changes behavior.</h2>
              <p>Instead of adding more adjectives, ask what the character wants, fears, misunderstands, hides, refuses to do, or behaves differently around.</p>
            </article>
          </div>

          <section class="daedalus-guide-examples">
            <div class="daedalus-card-label">FIELD-BY-FIELD EXAMPLES</div>
            <h2>Basic vs. more useful</h2>
            <p>These are teaching examples, not rules about the "correct" way to write.</p>
            <div class="daedalus-guide-example-grid">
              ${['character', 'dialogue', 'scene', 'initials', 'rules', 'systems']
                .map(topic => {
                  const item = HELP_TOPICS[topic]
                  return `
                    <article>
                      <div class="daedalus-guide-example-head">
                        <strong>${escapeHtml(item.title)}</strong>
                        <button data-guide-topic="${topic}" type="button">Full explanation</button>
                      </div>
                      <div class="daedalus-guide-example-columns">
                        <div><span>Basic</span><p>${escapeHtml(item.basic)}</p></div>
                        <div><span>More useful</span><p>${escapeHtml(item.useful)}</p></div>
                      </div>
                    </article>
                  `
                })
                .join('')}
            </div>
          </section>
        </div>
      `

      const overlay = document.createElement('div')
      overlay.id = 'daedalus-guidance-overlay'
      overlay.className = 'daedalus-guidance-overlay daedalus-hidden'
      root.appendChild(overlay)

      function project() {
        return getProject()
      }

      function currentTopic(topicId) {
        return HELP_TOPICS[topicId] || HELP_TOPICS.character
      }

      function renderGuideProgress() {
        const p = project()
        const builder = p.character?.builder || {}
        const characterReady = Boolean(
          String(p.character?.prompt || '').trim() ||
          [builder.identity, builder.personality, builder.voice, builder.goals].some(value => String(value || '').trim())
        )
        const dialogueReady = Boolean(
          String(p.dialogue?.raw || '').trim() ||
          (p.dialogue?.examples || []).some(example => String(example?.char || example?.user || '').trim())
        )
        const sceneReady = Boolean(
          String(p.scene?.prompt || '').trim() ||
          Object.values(p.scene?.builder || {}).some(value => String(value || '').trim())
        )
        const initialReady = Boolean((p.initialMessages || []).some(item => String(item?.content || '').trim()))
        const rulesReady = Boolean(String(builder.rules || '').trim())
        const systemsReady = Boolean(
          window.DaedalusSystems?.enabledModuleIds(p.systems).length ||
          p.systems?.hud?.enabled
        )

        const rows = [
          ['character', 'Character foundation', characterReady, 'Core'],
          ['dialogue', 'Dialogue examples', dialogueReady, 'Recommended'],
          ['scene', 'Opening scene', sceneReady, 'Optional'],
          ['initials', 'Initial message', initialReady, 'Recommended'],
          ['rules', 'AI & RP rules', rulesReady, 'Optional'],
          ['systems', 'RP Systems', systemsReady, 'Optional']
        ]

        const target = mount.querySelector('#daedalus-guide-project-progress')
        if (!target) return
        target.innerHTML = rows.map(([topic, label, ready, importance]) => `
          <button data-guide-progress-topic="${topic}" type="button">
            <span class="daedalus-guide-progress-state ${ready ? 'is-ready' : ''}">${ready ? '✓' : '○'}</span>
            <span><strong>${label}</strong><small>${ready ? 'Contains content' : 'Not started'} · ${importance}</small></span>
            <span class="daedalus-guide-progress-arrow">→</span>
          </button>
        `).join('')
      }

      function syncGuidanceState() {
        root.classList.toggle('daedalus-guidance-enabled', guidanceEnabled)
        const button = mount.querySelector('#daedalus-guide-toggle')
        if (button) {
          button.textContent = guidanceEnabled ? 'Guidance On' : 'Guidance Off'
          button.classList.toggle('is-active', guidanceEnabled)
        }
        root.querySelectorAll('.daedalus-context-coach').forEach(item => {
          item.classList.toggle('daedalus-hidden', !guidanceEnabled)
        })
      }

      async function setGuidance(enabled) {
        guidanceEnabled = enabled !== false
        await store.setGuidanceEnabled?.(guidanceEnabled)
        onSettingsChanged?.({guidanceEnabled})
        syncGuidanceState()
        toast?.(
          guidanceEnabled ? 'Creator guidance enabled.' : 'Creator guidance hidden.',
          'info'
        )
      }

      function installContextCoaching() {
        const definitions = [
          ['character', 'character', 'Character Prompt defines who the character is long-term. Dialogue and one-time scene details belong elsewhere.'],
          ['dialogue', 'dialogue', 'Use Dialogue Examples to demonstrate voice and behavior rather than repeating the character biography.'],
          ['scene', 'scene', 'Scene Prompt is temporary opening context: where you are, what is happening, and what matters right now.'],
          ['initials', 'initials', 'The first message should feel like the first playable turn and leave {{user}} somewhere natural to respond.'],
          ['fragments', 'fragments', 'Fragments are reusable creator-written building blocks. Keep them broad enough to reuse.'],
          ['planning', 'planning', 'Planning is private creator space. Nothing here is automatically sent to Clank.']
        ]

        for (const [view, topic, text] of definitions) {
          const panel = root.querySelector(`[data-daedalus-view-panel="${view}"]`)
          if (!panel || panel.querySelector(`[data-context-topic="${topic}"]`)) continue
          const header = panel.querySelector('.daedalus-page-header, .daedalus-plan-header')
          if (!header) continue

          const coach = document.createElement('div')
          coach.className = 'daedalus-context-coach'
          coach.dataset.contextTopic = topic
          coach.innerHTML = `
            <span class="daedalus-context-coach-icon">?</span>
            <p>${escapeHtml(text)}</p>
            <button data-guide-topic="${topic}" type="button">Explain this</button>
          `
          header.insertAdjacentElement('afterend', coach)
        }

        syncGuidanceState()
      }

      function openHelp(topicId) {
        const item = currentTopic(topicId)
        wizardOpen = false
        overlay.classList.remove('daedalus-hidden')
        overlay.innerHTML = `
          <div class="daedalus-guidance-backdrop" data-guidance-close></div>
          <section class="daedalus-help-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(item.title)} help">
            <header class="daedalus-help-sheet-head">
              <div>
                <div class="daedalus-eyebrow">CREATOR GUIDE</div>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.subtitle)}</p>
              </div>
              <button class="daedalus-icon-button" data-guidance-close type="button" aria-label="Close help">×</button>
            </header>

            <div class="daedalus-help-sheet-body">
              <article class="daedalus-help-primary">
                <div class="daedalus-card-label">WHAT IT DOES</div>
                <p>${escapeHtml(item.purpose)}</p>
              </article>

              <div class="daedalus-help-two-column">
                <article>
                  <div class="daedalus-card-label">GOOD THINGS TO PUT HERE</div>
                  <ul>${item.belongs.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>
                </article>
                <article>
                  <div class="daedalus-card-label">USUALLY AVOID</div>
                  <ul>${item.avoid.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>
                </article>
              </div>

              <article class="daedalus-help-comparison">
                <div class="daedalus-card-label">BASIC VS. MORE USEFUL</div>
                <div class="daedalus-guide-example-columns">
                  <div><span>Basic</span><pre>${escapeHtml(item.basic)}</pre></div>
                  <div><span>More useful</span><pre>${escapeHtml(item.useful)}</pre></div>
                </div>
                <p><strong>Why:</strong> ${escapeHtml(item.why)}</p>
              </article>
            </div>

            <footer class="daedalus-help-sheet-footer">
              <button class="daedalus-secondary-button" data-guidance-close type="button">Close</button>
              <button class="daedalus-primary-button" data-guide-open-workspace="${topicId}" type="button">Open Workspace</button>
            </footer>
          </section>
        `
      }

      function closeOverlay() {
        const hadWizard = wizardOpen
        if (hadWizard) captureWizardDraft()
        overlay.classList.add('daedalus-hidden')
        overlay.innerHTML = ''
        wizardOpen = false
        coachOpen = false
        if (hadWizard) refreshProject?.()
      }

      function wizardExistingValue(id) {
        if (Object.prototype.hasOwnProperty.call(wizardDraft, id)) {
          return String(wizardDraft[id] || '')
        }
        const p = project()
        const b = p.character?.builder || {}
        const s = p.scene?.builder || {}
        const firstDialogue = p.dialogue?.examples?.[0] || {}
        const firstIntro = p.initialMessages?.[0] || {}

        const map = {
          name: p.character?.name,
          concept: b.identity,
          traits: b.personality,
          appearance: b.appearance,
          voiceStyle: b.voice,
          relationshipType: b.relationships,
          backstory: b.backstory,
          goals: b.goals,
          dialogueLabel: firstDialogue.label,
          dialogueSituation: firstDialogue.situation,
          dialogueUser: firstDialogue.user,
          dialogueChar: firstDialogue.char,
          sceneLocation: s.location,
          sceneTime: s.time,
          sceneAtmosphere: s.atmosphere,
          sceneSituation: s.situation,
          sceneCharGoal: s.characterGoal,
          sceneUserRole: s.userRole,
          sceneConflict: s.conflict,
          initialMessage: firstIntro.content
        }
        return String(map[id] || '')
      }

      function captureWizardDraft() {
        if (!wizardOpen || overlay.classList.contains('daedalus-hidden')) return
        overlay.querySelectorAll('input[id^="guide-"], textarea[id^="guide-"], select[id^="guide-"]').forEach(control => {
          const key = control.id.replace(/^guide-/, '')
          if (control.type === 'checkbox') {
            wizardDraft[key] = control.checked
            return
          }
          wizardDraft[key] = control.value
        })
        wizardGenres = new Set(
          Array.from(overlay.querySelectorAll('[data-guide-genre]:checked')).map(input => input.dataset.guideGenre)
        )
        const addRules = overlay.querySelector('#guide-add-rules')
        if (addRules) wizardAddRules = addRules.checked
      }

      function field(id, label, placeholder = '', kind = 'input', note = '') {
        const value = wizardExistingValue(id)
        const control =
          kind === 'textarea'
            ? `<textarea id="guide-${id}" rows="4" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
            : `<input id="guide-${id}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`
        return `
          <label class="daedalus-wizard-field">
            <span>${label}</span>
            ${note ? `<small>${note}</small>` : ''}
            ${control}
          </label>
        `
      }

      function stepForm(stepId) {
        if (stepId === 'basics') {
          return `
            ${field('name', 'Character name', 'Mira')}
            ${field('concept', 'One-sentence concept', 'A reserved archivist hiding evidence of a magical conspiracy.', 'textarea', 'What makes this character interesting in one or two sentences?')}
            ${field('role', 'Role in the story', 'Archivist, reluctant guide, possible ally')}
            ${field('identityNotes', 'Anything essential about who they are', 'Age/species/occupation/origin only if it matters to the RP.', 'textarea')}
          `
        }

        if (stepId === 'personality') {
          return `
            ${field('traits', 'Core traits', 'Reserved, observant, dryly funny, quietly stubborn', 'textarea')}
            ${field('contradiction', 'Contradiction or weakness', 'Usually patient, but becomes reckless around forbidden magic.', 'textarea')}
            ${field('habits', 'Habits / tells', 'Avoids eye contact when lying; reorganizes nearby objects when anxious.', 'textarea')}
            ${field('values', 'What matters to them?', 'Protecting records, keeping promises, proving the truth.', 'textarea')}
          `
        }

        if (stepId === 'appearance') {
          return `
            ${field('appearance', 'Notable appearance', 'Dark hair cut unevenly at the jaw, tired gray eyes, ink-stained fingers.', 'textarea')}
            ${field('clothing', 'Clothing / visual style', 'Practical layered clothing, oversized coat, old brass key on a cord.', 'textarea')}
            ${field('mannerisms', 'Physical mannerisms', 'Keeps one shoulder slightly turned away when uncomfortable.', 'textarea')}
          `
        }

        if (stepId === 'voice') {
          return `
            ${field('voiceStyle', 'General speech style', 'Quiet, concise, dry humor; becomes more formal when nervous.', 'textarea')}
            ${field('speechHabits', 'Repeated speech habits', 'Pauses before admitting uncertainty; rarely uses exaggerated praise.', 'textarea')}
            ${field('emotionalSpeech', 'How does speech change under emotion?', 'Anger makes her unusually precise instead of loud.', 'textarea')}
            ${field('voiceAvoid', 'What should they rarely / never sound like?', 'No bubbly slang, motivational speeches, or theatrical monologues.', 'textarea')}
          `
        }

        if (stepId === 'relationship') {
          return `
            ${field('relationshipType', 'Starting relationship', 'Strangers / friends / rivals / coworkers / partners...')}
            ${field('relationshipFeeling', 'How does {{char}} currently feel?', 'Interested but cautious; respects {{user}} more than she admits.', 'textarea')}
            ${field('relationshipHistory', 'Shared history', 'They worked together once before, but neither discussed what happened afterward.', 'textarea')}
            ${field('relationshipKnowledge', 'What does {{char}} know about {{user}}?', 'Only information that is established before the RP starts.', 'textarea')}
          `
        }

        if (stepId === 'motivation') {
          return `
            ${field('backstory', 'Backstory that still affects them', 'Focus on events that explain current behavior.', 'textarea')}
            ${field('goals', 'Current goals', 'What do they actively want right now?', 'textarea')}
            ${field('fears', 'Fears / pressure points', 'What can make them hesitate, panic, overreact, or withdraw?', 'textarea')}
            ${field('secrets', 'Secrets / unresolved problems', 'Things they hide, misunderstand, or have not resolved.', 'textarea')}
          `
        }

        if (stepId === 'style') {
          return `
            <div class="daedalus-wizard-choice-grid">
              ${[
                ['immersive', 'Immersive RP', 'Agency, character consistency, natural turns'],
                ['horror', 'Horror', 'Tension, restraint, knowledge boundaries'],
                ['romance', 'Romance', 'Slow development and subtext'],
                ['adventure', 'Adventure / RPG', 'Journey and world continuity'],
                ['mystery', 'Mystery', 'Fair clues and protected secrets'],
                ['domestic', 'Slice of Life', 'Routines and lived-in detail'],
                ['ensemble', 'Ensemble', 'Group balance and relationships'],
                ['action', 'Action', 'Readable combat and consequences']
              ]
                .map(
                  ([id, title, desc]) => `
                    <label class="daedalus-wizard-choice">
                      <input type="checkbox" data-guide-genre="${id}" ${wizardGenres.has(id) ? 'checked' : ''}>
                      <span><strong>${title}</strong><small>${desc}</small></span>
                    </label>
                  `
                )
                .join('')}
            </div>
            <label class="daedalus-wizard-choice daedalus-wizard-choice-wide">
              <input id="guide-add-rules" type="checkbox" ${wizardAddRules ? 'checked' : ''}>
              <span><strong>Add recommended rules to the Rules Studio</strong><small>Daedalus only adds rules that are not already present. You can edit or remove them afterward.</small></span>
            </label>
          `
        }

        if (stepId === 'systems') {
          const systemsCore = window.DaedalusSystems
          const currentSystems = systemsCore?.normalizeSystems(project().systems)
          const enabled = systemsCore?.enabledModuleIds(currentSystems).length || 0
          return `
            <div class="daedalus-wizard-systems-intro">
              <strong>${enabled ? `${enabled} system${enabled === 1 ? '' : 's'} already enabled` : 'Systems are optional'}</strong>
              <p>Pick a Behavior Recipe if one matches your RP. You can customize every individual tracker later in the RP Systems Studio.</p>
            </div>
            <label class="daedalus-wizard-field">
              <span>Behavior Recipe</span>
              <select id="guide-system-recipe">
                <option value="">Do not change my systems</option>
                ${(systemsCore?.RECIPES || []).map(recipe => `<option value="${escapeHtml(recipe.id)}" ${wizardDraft['system-recipe'] === recipe.id ? 'selected' : ''}>${escapeHtml(recipe.name)} — ${escapeHtml(recipe.description)}</option>`).join('')}
              </select>
            </label>
            <label class="daedalus-wizard-choice daedalus-wizard-choice-wide">
              <input id="guide-open-systems-after" type="checkbox" ${wizardDraft['open-systems-after'] ? 'checked' : ''}>
              <span><strong>Open RP Systems after the wizard</strong><small>Useful if you want to customize trackers or the optional State Display in detail.</small></span>
            </label>
            <div class="daedalus-wizard-systems-examples">
              <span>Examples</span>
              <p><strong>Survival Horror</strong> → inventory, time, location, injuries, objectives, clues, secrets, world objects.</p>
              <p><strong>Romance</strong> → time, location, internal thoughts, relationship evolution, appearance continuity.</p>
              <p><strong>RPG Adventure</strong> → inventory, currency, quests, conditions, stats, factions, world state.</p>
            </div>
          `
        }

        if (stepId === 'dialogue') {
          return `
            ${field('dialogueLabel', 'Example name', 'A difficult question')}
            ${field('dialogueSituation', 'Situation', 'What is happening that makes this exchange useful?', 'textarea')}
            ${field('dialogueUser', '{{user}} says / does', 'Are you actually afraid of what is in that room?', 'textarea')}
            ${field('dialogueChar', '{{char}} response', '*She looks at the locked door.* "Afraid is not the word I would use. I would still prefer you not open it."', 'textarea')}
          `
        }

        if (stepId === 'scene') {
          return `
            <div class="daedalus-wizard-field-grid">
              ${field('sceneLocation', 'Location', 'Archive basement')}
              ${field('sceneTime', 'Time', 'Late evening')}
            </div>
            ${field('sceneAtmosphere', 'Atmosphere', 'Cold, quiet, dust in the flashlight beam, distant pipes knocking.', 'textarea')}
            ${field('sceneSituation', 'Current situation', 'Why are the characters here right now?', 'textarea')}
            ${field('sceneCharGoal', '{{char}}\'s immediate goal', 'What does the character want from this scene?', 'textarea')}
            ${field('sceneUserRole', '{{user}}\'s starting role / position', 'What is established about the user without controlling their choices?', 'textarea')}
            ${field('sceneConflict', 'Immediate conflict / uncertainty', 'What makes this moment playable?', 'textarea')}
          `
        }

        if (stepId === 'initial') {
          return `
            ${field('initialMessage', 'Initial message', '*Write the actual first turn here...*', 'textarea')}
            <div class="daedalus-wizard-initial-checklist">
              <span>Quick check</span>
              <ul>
                <li>Does it show {{char}} behaving like themselves?</li>
                <li>Does the user understand what is happening?</li>
                <li>Does it leave {{user}} a natural turn?</li>
              </ul>
            </div>
          `
        }

        if (stepId === 'review') {
          const p = project()
          const builder = p.character?.builder || {}
          const filledCharacter = Object.values(builder).filter(value => String(value || '').trim()).length
          const dialogueCount = (p.dialogue?.examples || []).filter(example => example.user || example.char).length
          const sceneCount = Object.values(p.scene?.builder || {}).filter(value => String(value || '').trim()).length
          const introReady = Boolean(p.initialMessages?.[0]?.content?.trim())

          return `
            <div class="daedalus-wizard-review-grid">
              <article><strong>${filledCharacter}</strong><span>Character Builder sections filled</span></article>
              <article><strong>${dialogueCount}</strong><span>Dialogue example${dialogueCount === 1 ? '' : 's'}</span></article>
              <article><strong>${sceneCount}</strong><span>Scene sections filled</span></article>
              <article><strong>${introReady ? 'Ready' : 'Optional'}</strong><span>Initial message</span></article>
              <article><strong>${window.DaedalusSystems?.enabledModuleIds(p.systems).length || 0}</strong><span>RP systems enabled</span></article>
            </div>
            <div class="daedalus-wizard-review-actions">
              <button id="guide-compile-character" class="daedalus-secondary-button" type="button">Compile Character Prompt</button>
              <button id="guide-compile-dialogue" class="daedalus-secondary-button" type="button">Compile Dialogue Examples</button>
              <button id="guide-compile-scene" class="daedalus-secondary-button" type="button">Compile Scene Prompt</button>
              <button id="guide-compile-all" class="daedalus-primary-button" type="button">Compile All Structured Work</button>
            </div>
            <div class="daedalus-wizard-review-note">
              <strong>Nothing has been sent to Clank.</strong>
              <p>The wizard edits your local Daedalus project only. Use Apply buttons later when you actually want to synchronize.</p>
            </div>
          `
        }

        return ''
      }

      function inputValue(id) {
        return String(overlay.querySelector(`#guide-${id}`)?.value || '').trim()
      }

      function saveCurrentStep() {
        captureWizardDraft()
        const p = project()
        p.character = p.character || {name: '', prompt: '', builder: {}, builderOrder: []}
        p.character.builder = p.character.builder || {}
        p.dialogue = p.dialogue || {raw: '', examples: []}
        p.scene = p.scene || {title: '', prompt: '', builder: {}}
        p.scene.builder = p.scene.builder || {}
        p.initialMessages = Array.isArray(p.initialMessages) && p.initialMessages.length
          ? p.initialMessages
          : [{id: store.makeId('intro'), label: 'Initial Message 1', content: ''}]

        const step = WIZARD_STEPS[wizardStep]
        if (!step) return

        if (step.id === 'basics') {
          const name = inputValue('name')
          if (name) p.character.name = name
          const identity = lines([
            ['Concept', inputValue('concept')],
            ['Role', inputValue('role')],
            ['Identity notes', inputValue('identityNotes')]
          ])
          if (identity) p.character.builder.identity = identity
        }

        if (step.id === 'personality') {
          const personality = lines([
            ['Core traits', inputValue('traits')],
            ['Contradiction / weakness', inputValue('contradiction')],
            ['Habits / tells', inputValue('habits')],
            ['Values', inputValue('values')]
          ])
          if (personality) p.character.builder.personality = personality
        }

        if (step.id === 'appearance') {
          const appearance = lines([
            ['Appearance', inputValue('appearance')],
            ['Clothing / style', inputValue('clothing')],
            ['Physical mannerisms', inputValue('mannerisms')]
          ])
          if (appearance) p.character.builder.appearance = appearance
        }

        if (step.id === 'voice') {
          const voice = lines([
            ['Speech style', inputValue('voiceStyle')],
            ['Speech habits', inputValue('speechHabits')],
            ['Under emotion', inputValue('emotionalSpeech')],
            ['Avoid', inputValue('voiceAvoid')]
          ])
          if (voice) p.character.builder.voice = voice
        }

        if (step.id === 'relationship') {
          const relationship = lines([
            ['Starting relationship', inputValue('relationshipType')],
            ['{{char}} current feelings', inputValue('relationshipFeeling')],
            ['Shared history', inputValue('relationshipHistory')],
            ['What {{char}} knows about {{user}}', inputValue('relationshipKnowledge')]
          ])
          if (relationship) p.character.builder.relationships = relationship
        }

        if (step.id === 'motivation') {
          const backstory = lines([
            ['Backstory', inputValue('backstory')],
            ['Fears / pressure points', inputValue('fears')],
            ['Secrets / unresolved problems', inputValue('secrets')]
          ])
          if (backstory) p.character.builder.backstory = backstory
          if (inputValue('goals')) p.character.builder.goals = inputValue('goals')
        }

        if (step.id === 'style') {
          const genres = [...wizardGenres]
          const addRules = wizardAddRules
          if (addRules && genres.length && rulesLibrary?.BUILT_IN_RULES) {
            const byId = new Map(rulesLibrary.BUILT_IN_RULES.map(rule => [rule.id, rule]))
            const contents = []
            for (const genre of genres) {
              for (const id of GENRE_RULES[genre] || []) {
                const rule = byId.get(id)
                if (rule && !contents.includes(rule.content)) contents.push(rule.content)
              }
            }
            for (const content of contents) {
              p.character.builder.rules = appendUniqueParagraph(
                p.character.builder.rules,
                `- ${content}`
              )
            }
          }
          if (genres.length) {
            p.character.builder.behavior = appendUniqueParagraph(
              p.character.builder.behavior,
              `Roleplay focus: ${genres.join(', ')}.`
            )
          }
        }

        if (step.id === 'systems') {
          const systemsCore = window.DaedalusSystems
          const recipeId = String(overlay.querySelector('#guide-system-recipe')?.value || wizardDraft['system-recipe'] || '')
          if (systemsCore && recipeId) {
            p.systems = systemsCore.applyRecipe(p.systems, recipeId)
          }
          wizardDraft.openSystemsAfter = Boolean(
            overlay.querySelector('#guide-open-systems-after')?.checked ?? wizardDraft['open-systems-after']
          )
        }

        if (step.id === 'dialogue') {
          const user = inputValue('dialogueUser')
          const char = inputValue('dialogueChar')
          const situation = inputValue('dialogueSituation')
          if (user || char || situation) {
            let example = p.dialogue.examples.find(item => item?.label === 'Guided Example')
            if (!example) {
              example = {
                id: store.makeId('dialogue'),
                label: inputValue('dialogueLabel') || 'Guided Example',
                situation: '',
                user: '',
                char: ''
              }
              p.dialogue.examples.push(example)
            }
            example.label = inputValue('dialogueLabel') || example.label || 'Guided Example'
            example.situation = situation
            example.user = user
            example.char = char
          }
        }

        if (step.id === 'scene') {
          const mappings = [
            ['location', 'sceneLocation'],
            ['time', 'sceneTime'],
            ['atmosphere', 'sceneAtmosphere'],
            ['situation', 'sceneSituation'],
            ['characterGoal', 'sceneCharGoal'],
            ['userRole', 'sceneUserRole'],
            ['conflict', 'sceneConflict']
          ]
          for (const [target, source] of mappings) {
            const value = inputValue(source)
            if (value) p.scene.builder[target] = value
          }
        }

        if (step.id === 'initial') {
          const content = inputValue('initialMessage')
          if (content) p.initialMessages[0].content = content
        }

        markDirty?.()
      }

      function compileCharacter() {
        const p = project()
        const basePrompt = compilers.compileCharacterBuilder(
          p.character.builder,
          p.character.builderOrder
        )
        p.character.prompt = window.DaedalusSystems
          ? window.DaedalusSystems.upsertSystemsSection(basePrompt, p.systems)
          : basePrompt
        markDirty?.()
        refreshProject?.()
        toast?.('Character Builder compiled into the raw prompt.', 'success')
      }

      function compileDialogue() {
        const p = project()
        p.dialogue.raw = compilers.compileDialogueExamples(p.dialogue.examples)
        markDirty?.()
        refreshProject?.()
        toast?.('Dialogue examples compiled.', 'success')
      }

      function compileScene() {
        const p = project()
        p.scene.prompt = compilers.compileSceneBuilder(p.scene.builder)
        markDirty?.()
        refreshProject?.()
        toast?.('Scene Builder compiled into the raw scene prompt.', 'success')
      }

      function renderWizard() {
        wizardOpen = true
        const step = WIZARD_STEPS[wizardStep]
        overlay.classList.remove('daedalus-hidden')
        overlay.innerHTML = `
          <div class="daedalus-guidance-backdrop"></div>
          <section class="daedalus-wizard" role="dialog" aria-modal="true" aria-label="Guided character creation">
            <aside class="daedalus-wizard-rail">
              <div class="daedalus-wizard-brand">
                <span>D</span>
                <div><strong>GUIDED CREATION</strong><small>Character Creation 101</small></div>
              </div>
              <div class="daedalus-wizard-progress">
                ${WIZARD_STEPS.map(
                  (item, index) => `
                    <button class="${index === wizardStep ? 'is-active' : ''} ${index < wizardStep ? 'is-complete' : ''}" data-wizard-step="${index}" type="button">
                      <span>${index < wizardStep ? '✓' : index + 1}</span>
                      <small>${escapeHtml(item.title)}</small>
                    </button>
                  `
                ).join('')}
              </div>
              <div class="daedalus-wizard-rail-note">
                <strong>Local only</strong>
                <span>Nothing is sent to Clank while you use this wizard.</span>
              </div>
            </aside>

            <main class="daedalus-wizard-main">
              <header class="daedalus-wizard-head">
                <div>
                  <div class="daedalus-eyebrow">${escapeHtml(step.kicker)}</div>
                  <h1>${escapeHtml(step.title)}</h1>
                  <p>${escapeHtml(step.intro)}</p>
                </div>
                <button class="daedalus-icon-button" data-guidance-close type="button" aria-label="Close wizard">×</button>
              </header>

              <div class="daedalus-wizard-content">
                <section class="daedalus-wizard-form">
                  ${stepForm(step.id)}
                </section>

                <aside class="daedalus-wizard-coach ${coachOpen ? 'is-open' : ''}">
                  <button id="daedalus-wizard-coach-toggle" type="button">
                    <span>?</span>
                    <strong>${coachOpen ? 'Hide help' : "I'm not sure"}</strong>
                  </button>
                  <div class="daedalus-wizard-coach-body">
                    <div class="daedalus-card-label">IDEAS TO THINK ABOUT</div>
                    <ul>${step.coach.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                  </div>
                </aside>
              </div>

              <footer class="daedalus-wizard-footer">
                <div>
                  ${wizardStep > 0 ? '<button id="daedalus-wizard-back" class="daedalus-secondary-button" type="button">← Back</button>' : ''}
                  ${step.id !== 'review' ? '<button id="daedalus-wizard-skip" class="daedalus-ghost-button" type="button">Skip this step</button>' : ''}
                </div>
                <div>
                  <span class="daedalus-wizard-step-count">${wizardStep + 1} / ${WIZARD_STEPS.length}</span>
                  ${step.id === 'review'
                    ? '<button id="daedalus-wizard-finish" class="daedalus-primary-button" type="button">Finish & Open Character</button>'
                    : '<button id="daedalus-wizard-next" class="daedalus-primary-button" type="button">Save & Continue →</button>'}
                </div>
              </footer>
            </main>
          </section>
        `

        overlay.querySelectorAll('[data-wizard-step]').forEach(button => {
          button.addEventListener('click', () => {
            saveCurrentStep()
            wizardStep = Number(button.dataset.wizardStep) || 0
            coachOpen = false
            renderWizard()
          })
        })

        overlay.querySelector('[data-guidance-close]')?.addEventListener('click', closeOverlay)
        overlay.querySelector('#daedalus-wizard-coach-toggle')?.addEventListener('click', () => {
          captureWizardDraft()
          coachOpen = !coachOpen
          renderWizard()
        })
        overlay.querySelector('#daedalus-wizard-back')?.addEventListener('click', () => {
          saveCurrentStep()
          wizardStep = Math.max(0, wizardStep - 1)
          coachOpen = false
          renderWizard()
        })
        overlay.querySelector('#daedalus-wizard-skip')?.addEventListener('click', () => {
          captureWizardDraft()
          wizardStep = Math.min(WIZARD_STEPS.length - 1, wizardStep + 1)
          coachOpen = false
          renderWizard()
        })
        overlay.querySelector('#daedalus-wizard-next')?.addEventListener('click', () => {
          saveCurrentStep()
          wizardStep = Math.min(WIZARD_STEPS.length - 1, wizardStep + 1)
          coachOpen = false
          renderWizard()
        })
        overlay.querySelector('#guide-compile-character')?.addEventListener('click', compileCharacter)
        overlay.querySelector('#guide-compile-dialogue')?.addEventListener('click', compileDialogue)
        overlay.querySelector('#guide-compile-scene')?.addEventListener('click', compileScene)
        overlay.querySelector('#guide-compile-all')?.addEventListener('click', () => {
          compileCharacter()
          compileDialogue()
          compileScene()
          renderWizard()
        })
        overlay.querySelector('#daedalus-wizard-finish')?.addEventListener('click', () => {
          const openSystems = wizardDraft.openSystemsAfter === true
          closeOverlay()
          navigate?.(openSystems ? 'systems' : 'character')
          toast?.('Guided Creation complete. Everything remains editable.', 'success')
        })
      }

      function startWizard() {
        wizardStep = 0
        coachOpen = false
        wizardDraft = {}
        wizardGenres = new Set()
        wizardAddRules = true
        renderWizard()
      }

      function openWorkspaceForTopic(topic) {
        closeOverlay()
        const map = {
          character: 'character',
          dialogue: 'dialogue',
          scene: 'scene',
          initials: 'initials',
          rules: 'character',
          fragments: 'fragments',
          systems: 'systems',
          planning: 'planning'
        }
        navigate?.(map[topic] || 'character')

        if (topic === 'rules') {
          setTimeout(() => {
            root
              .querySelector('[data-mode-group="character"][data-mode="rules"]')
              ?.click()
          }, 0)
        }
      }

      mount.addEventListener('click', event => {
        const topic = event.target.closest('[data-guide-topic]')?.dataset.guideTopic
        if (topic) {
          openHelp(topic)
          return
        }
        const progressTopic = event.target.closest('[data-guide-progress-topic]')?.dataset.guideProgressTopic
        if (progressTopic) {
          openWorkspaceForTopic(progressTopic)
          return
        }
        if (event.target.closest('[data-guide-launch-wizard], #daedalus-guide-start-wizard')) {
          startWizard()
        }
      })

      mount.querySelector('#daedalus-guide-toggle')?.addEventListener('click', () => {
        setGuidance(!guidanceEnabled)
      })

      root.addEventListener('click', event => {
        const topicButton = event.target.closest('[data-guide-topic]')
        if (topicButton && !mount.contains(topicButton)) {
          openHelp(topicButton.dataset.guideTopic)
          return
        }

        const workspaceButton = event.target.closest('[data-guide-open-workspace]')
        if (workspaceButton) {
          openWorkspaceForTopic(workspaceButton.dataset.guideOpenWorkspace)
          return
        }

        if (event.target.matches('[data-guidance-close]')) {
          closeOverlay()
        }
      })

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !overlay.classList.contains('daedalus-hidden')) {
          closeOverlay()
        }
      })

      installContextCoaching()
      renderGuideProgress()
      syncGuidanceState()

      return {
        startWizard,
        openHelp,
        openTopic: openHelp,
        refresh() {
          installContextCoaching()
          renderGuideProgress()
          syncGuidanceState()
        },
        setEnabled(value) {
          guidanceEnabled = value !== false
          syncGuidanceState()
        }
      }
    }
  }
})()
