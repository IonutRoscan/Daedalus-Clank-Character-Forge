;(() => {
  'use strict'

  // Storycraft helpers

  const PLOT_STAGES = ['Backlog', 'Active', 'Blocked', 'Resolved']
  const CONNECTION_CATEGORIES = [
    ['relationship', 'Relationship'],
    ['ownership', 'Ownership'],
    ['membership', 'Membership'],
    ['location', 'Location'],
    ['plot', 'Plot'],
    ['knowledge', 'Knowledge'],
    ['conflict', 'Conflict'],
    ['custom', 'Custom']
  ]

  function clone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function text(value) {
    return String(value ?? '').trim()
  }

  function timelineOrder(entity) {
    const value = text(entity?.fields?.date || entity?.fields?.order || '')
    if (!value) return {kind: 2, number: Number.MAX_SAFE_INTEGER, text: ''}
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return {kind: 0, number: asNumber, text: value}
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return {kind: 0, number: parsed, text: value}
    return {kind: 1, number: 0, text: value.toLowerCase()}
  }

  function sortTimeline(entities) {
    return (entities || [])
      .filter(entity => entity.type === 'event' || entity.type === 'scene')
      .slice()
      .sort((a, b) => {
        const aa = timelineOrder(a)
        const bb = timelineOrder(b)
        if (aa.kind !== bb.kind) return aa.kind - bb.kind
        if (aa.kind === 0 && aa.number !== bb.number) return aa.number - bb.number
        if (aa.text !== bb.text) return aa.text.localeCompare(bb.text)
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
  }

  function plotStage(entity) {
    const raw = text(entity?.fields?.stage).toLowerCase()
    if (/resolved|done|complete|closed|finished/.test(raw)) return 'Resolved'
    if (/blocked|stuck|hold|waiting/.test(raw)) return 'Blocked'
    if (/active|current|progress|ongoing/.test(raw)) return 'Active'
    return 'Backlog'
  }

  function plotColumns(entities) {
    const output = Object.fromEntries(PLOT_STAGES.map(stage => [stage, []]))
    for (const entity of entities || []) {
      if (entity.type !== 'plot') continue
      output[plotStage(entity)].push(entity)
    }
    return output
  }

  function relationMap(planning) {
    const entities = planning?.entities || []
    const connections = planning?.connections || []
    const byId = new Map(entities.map(entity => [entity.id, entity]))
    return connections
      .map(connection => ({
        ...connection,
        source: byId.get(connection.sourceId) || null,
        target: byId.get(connection.targetId) || null
      }))
      .filter(item => item.source && item.target)
  }

  function markdownEscape(value) {
    return text(value).replace(/\|/g, '\\|')
  }

  function planningDocument(planning, projectTitle = 'Daedalus Project', options = {}) {
    const detail = ['compact', 'standard', 'full'].includes(options.detail)
      ? options.detail
      : 'standard'
    const includeSecrets = options.includeSecrets !== false
    const includeNotes = options.includeNotes !== false
    const includeEmpty = Boolean(options.includeEmpty)
    const includeRelationships = options.includeRelationships !== false
    const includeTimeline = options.includeTimeline !== false
    const includePlotBoard = options.includePlotBoard !== false
    const includeHidden = Boolean(options.includeHidden)
    const plainText = options.format === 'text'
    const entities = (planning?.entities || []).filter(entity => includeHidden || !entity.hidden)
    const byId = new Map(entities.map(entity => [entity.id, entity]))
    const lines = []

    const heading = (level, value) => {
      if (plainText) {
        if (level <= 1) lines.push(String(value).toUpperCase(), '')
        else if (level === 2) lines.push(String(value).toUpperCase(), '')
        else lines.push(String(value), '')
      } else {
        lines.push(`${'#'.repeat(Math.max(1, Math.min(4, level)))} ${value}`, '')
      }
    }

    const fieldLine = (label, value) => {
      const clean = text(value)
      if (!clean && !includeEmpty) return
      if (plainText) lines.push(`${label}: ${clean || '—'}`)
      else lines.push(`**${label}:** ${clean || '—'}`)
    }

    heading(1, `${projectTitle} — Planning Document`)
    lines.push(
      plainText
        ? 'Generated from Daedalus Planning Station. This document is designed to be readable by humans or supplied to another planning/AI tool.'
        : '*Generated from Daedalus Planning Station. Designed for human reading or handoff to another planning/AI tool.*',
      ''
    )

    if (detail === 'full' && includeNotes && text(options.projectNotes)) {
      heading(2, 'Creator Project Notes')
      lines.push(text(options.projectNotes), '')
    }

    const order = window.DaedalusPlanning?.TYPE_ORDER || []
    const meta = window.DaedalusPlanning?.ENTITY_TYPES || {}

    for (const type of order) {
      const items = entities.filter(entity => entity.type === type)
      if (!items.length && !includeEmpty) continue
      heading(2, meta[type]?.label || type)
      if (!items.length) {
        lines.push(plainText ? 'None.' : '_None._', '')
        continue
      }

      for (const entity of items) {
        heading(3, entity.name || 'Untitled')
        if (entity.subtitle) {
          lines.push(plainText ? entity.subtitle : `*${entity.subtitle}*`, '')
        }
        fieldLine('Status', entity.status)
        if (entity.tags?.length || includeEmpty) fieldLine('Tags', (entity.tags || []).join(', '))
        if (entity.description || includeEmpty) fieldLine('Summary', entity.description)

        if (detail !== 'compact') {
          for (const [key, label] of meta[type]?.fields || []) {
            if (!includeSecrets && /secret|truth|hidden|reveal/i.test(`${key} ${label}`)) continue
            fieldLine(label, entity.fields?.[key])
          }
          for (const field of entity.customFields || []) {
            if (!includeSecrets && /secret|truth|hidden|reveal/i.test(String(field.label || ''))) continue
            fieldLine(field.label || 'Custom field', field.value)
          }
        }

        if (detail === 'full' && includeNotes) {
          fieldLine('Creator notes', entity.notes)
        }

        if (includeRelationships) {
          const related = (planning?.connections || []).filter(connection =>
            connection.sourceId === entity.id || connection.targetId === entity.id
          )
          if (related.length) {
            lines.push(plainText ? 'Connections:' : '**Connections:**')
            for (const connection of related) {
              const outgoing = connection.sourceId === entity.id
              const other = byId.get(outgoing ? connection.targetId : connection.sourceId)
              if (!other) continue
              const arrow = connection.directed === false ? '↔' : outgoing ? '→' : '←'
              lines.push(`- ${arrow} ${connection.label || 'connected to'}: ${other.name}`)
            }
          }
        }
        lines.push('')
      }
    }

    const frames = Array.isArray(planning?.frames) ? planning.frames : []
    if (frames.length) {
      heading(2, 'Planning Groups / Frames')
      for (const frame of frames) {
        heading(3, frame.name || 'Untitled Frame')
        const members = (frame.memberIds || []).map(id => byId.get(id)?.name).filter(Boolean)
        fieldLine('Members', members.join(', '))
        fieldLine('Collapsed in canvas', frame.collapsed ? 'Yes' : 'No')
        lines.push('')
      }
    }

    if (includeTimeline) {
      const timeline = sortTimeline(entities)
      if (timeline.length || includeEmpty) {
        heading(2, 'Timeline')
        if (!timeline.length) lines.push(plainText ? 'None.' : '_None._', '')
        timeline.forEach((entity, index) => {
          const orderLabel = text(entity.fields?.date || entity.fields?.order) || `Step ${index + 1}`
          lines.push(`- ${orderLabel} — ${entity.name}${entity.description ? `: ${entity.description}` : ''}`)
        })
        lines.push('')
      }
    }

    if (includePlotBoard) {
      const columns = plotColumns(entities)
      if (Object.values(columns).some(items => items.length) || includeEmpty) {
        heading(2, 'Plot Board')
        for (const stage of PLOT_STAGES) {
          if (!columns[stage].length && !includeEmpty) continue
          heading(3, stage)
          if (!columns[stage].length) lines.push(plainText ? 'None.' : '_None._', '')
          for (const entity of columns[stage]) {
            const objective = text(entity.fields?.objective)
            const stakes = text(entity.fields?.stakes)
            lines.push(`- ${entity.name}${objective ? ` — ${objective}` : ''}${stakes && detail === 'full' ? ` (Stakes: ${stakes})` : ''}`)
          }
          lines.push('')
        }
      }
    }

    if (includeRelationships) {
      const relations = relationMap({entities, connections: planning?.connections || []})
      if (relations.length || includeEmpty) {
        heading(2, 'Relationship & Connection Summary')
        if (!relations.length) lines.push(plainText ? 'None.' : '_None._', '')
        for (const relation of relations) {
          const arrow = relation.directed === false ? '↔' : '→'
          const category = relation.category && relation.category !== 'relationship'
            ? ` [${relation.category}]`
            : ''
          lines.push(`- ${relation.source.name} ${arrow} ${relation.label || 'connected to'} ${arrow} ${relation.target.name}${category}`)
          if (detail === 'full' && relation.notes) lines.push(`  ${relation.notes}`)
        }
        lines.push('')
      }
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  }

  window.DaedalusStorycraft = {
    PLOT_STAGES,
    CONNECTION_CATEGORIES,
    clone,
    timelineOrder,
    sortTimeline,
    plotStage,
    plotColumns,
    relationMap,
    planningDocument,
    markdownEscape
  }
})()
