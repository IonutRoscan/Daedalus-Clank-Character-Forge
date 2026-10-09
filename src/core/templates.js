;(() => {
  'use strict'

  // Quick-start project templates

  const TEMPLATES = [
    {
      id: 'template-original',
      name: 'Original Character',
      description:
        'A balanced starting structure for an original character without pre-writing the character for you.',
      rulePresetId: 'preset-immersive-core',
      builderOrder: [
        'identity',
        'personality',
        'appearance',
        'behavior',
        'voice',
        'relationships',
        'backstory',
        'goals',
        'rules'
      ],
      dialogueLabels: ['Casual Conversation', 'Under Pressure'],
      introLabels: ['Primary Opening']
    },
    {
      id: 'template-fandom',
      name: 'Fandom / Canon Character',
      description:
        'Prioritizes canon identity, personality, voice, relationships, and knowledge consistency.',
      rulePresetId: 'preset-immersive-core',
      builderOrder: [
        'identity',
        'personality',
        'voice',
        'relationships',
        'behavior',
        'appearance',
        'backstory',
        'goals',
        'rules'
      ],
      dialogueLabels: ['Canon-Neutral Conversation', 'Emotional Reaction'],
      introLabels: ['Canon-Friendly Opening']
    },
    {
      id: 'template-horror',
      name: 'Horror / Psychological Horror',
      description:
        'Sets up a tension-first workflow with horror rules, pressure examples, and alternate openings.',
      rulePresetId: 'preset-horror',
      builderOrder: [
        'behavior',
        'personality',
        'identity',
        'appearance',
        'voice',
        'relationships',
        'goals',
        'backstory',
        'rules'
      ],
      dialogueLabels: ['Quiet Tension', 'Escalation / Threat'],
      introLabels: ['First Encounter', 'Escalated Opening']
    },
    {
      id: 'template-romance',
      name: 'Romance / Slow Burn',
      description:
        'Prioritizes relationship dynamics, personality, voice, and slow progression rather than instant attachment.',
      rulePresetId: 'preset-romance',
      builderOrder: [
        'relationships',
        'personality',
        'voice',
        'behavior',
        'identity',
        'appearance',
        'backstory',
        'goals',
        'rules'
      ],
      dialogueLabels: ['Everyday Chemistry', 'Vulnerable Moment'],
      introLabels: ['First Meeting', 'Established Connection']
    },
    {
      id: 'template-rpg',
      name: 'Adventure / RPG Companion',
      description:
        'Organizes goals, journey continuity, relationships, and a living-world roleplay loop.',
      rulePresetId: 'preset-adventure',
      builderOrder: [
        'identity',
        'goals',
        'relationships',
        'personality',
        'behavior',
        'voice',
        'appearance',
        'backstory',
        'rules'
      ],
      dialogueLabels: ['Travel Conversation', 'Danger / Combat'],
      introLabels: ['Journey Begins', 'Already Traveling Together']
    },
    {
      id: 'template-villain',
      name: 'Villain / Antagonist',
      description:
        'Puts motives and behavior first so antagonism comes from goals and character rather than generic hostility.',
      rulePresetId: 'preset-action',
      builderOrder: [
        'identity',
        'goals',
        'behavior',
        'personality',
        'voice',
        'relationships',
        'backstory',
        'appearance',
        'rules'
      ],
      dialogueLabels: ['Controlled Conversation', 'Confrontation'],
      introLabels: ['First Confrontation', 'Uneasy Cooperation']
    },
    {
      id: 'template-ensemble',
      name: 'Multi-Character / Ensemble',
      description:
        'Centers relationships and group dynamics while keeping individual cast members distinct and balanced.',
      rulePresetId: 'preset-ensemble',
      builderOrder: [
        'identity',
        'relationships',
        'personality',
        'behavior',
        'voice',
        'goals',
        'backstory',
        'appearance',
        'rules'
      ],
      dialogueLabels: ['Group Banter', 'Group Conflict'],
      introLabels: ['Group Opening']
    },
    {
      id: 'template-narrator',
      name: 'Narrator / Game Master',
      description:
        'A world-running setup for adventure, scenario, or game-master characters that must preserve user agency.',
      rulePresetId: 'preset-adventure',
      builderOrder: [
        'identity',
        'behavior',
        'voice',
        'goals',
        'relationships',
        'personality',
        'backstory',
        'appearance',
        'rules'
      ],
      dialogueLabels: ['World Response', 'NPC Interaction'],
      introLabels: ['Campaign Opening']
    }
  ]

  function getTemplate(id) {
    return TEMPLATES.find(template => template.id === id) || null
  }

  window.DaedalusTemplates = {
    TEMPLATES,
    getTemplate
  }
})()
