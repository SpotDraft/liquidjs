/**
 * Split Liquid template into per-variable assignment slices.
 * Uses the existing Liquid parser AST to isolate assignments per variable.
 *
 * @param {string} liquidText - The Liquid template source
 * @param {Object} options - Configuration options
 * @param {string[]} options.assignTags - Tag names that perform assignment (default: ['assign','assignVar','parseAssign'])
 * @param {boolean} options.includeOtherAssigns - Include assigns to other variables (default: false)
 * @param {boolean} options.pruneEmptyBlocks - Remove empty branches (default: true)
 * @param {boolean} options.includeComments - Include comments (default: false, not reconstructible from AST)
 * @param {boolean} options.keepNonAssign - Keep html, value, and non-control tags (default: false)
 * @param {string} options.outputOrder - 'first-appearance' (default)
 * @returns {string[]} Array of Liquid strings, one per variable, ordered by first appearance
 */
function splitAssignmentsByVariable (liquidText, options) {
  const Liquid = require('../index.js')
  const engine = Liquid()
  const opts = Object.assign({
    assignTags: ['assign', 'assignVar', 'parseAssign'],
    includeOtherAssigns: false,
    pruneEmptyBlocks: true,
    includeComments: false,
    keepNonAssign: false,
    outputOrder: 'first-appearance'
  }, options || {})

  const templates = engine.parse(liquidText)
  const varFirstAppearance = identifyAssignedVariables(templates, opts.assignTags)
  const orderedVars = Object.keys(varFirstAppearance).sort(
    (a, b) => varFirstAppearance[a] - varFirstAppearance[b]
  )

  return orderedVars.map(targetVar => {
    const filtered = filterTemplates(templates, targetVar, opts)
    return renderTemplatesToLiquid(filtered)
  })
}

/**
 * Traverse AST and collect assigned variables with first appearance index.
 */
function identifyAssignedVariables (templates, assignTags, indexRef) {
  indexRef = indexRef || { value: 0 }
  const result = {}

  function traverse (tpls) {
    if (!Array.isArray(tpls)) return
    for (const t of tpls) {
      if (t.type === 'tag' && assignTags.indexOf(t.name) >= 0 && t.tagImpl && t.tagImpl.key) {
        const key = t.tagImpl.key
        if (!(key in result)) {
          result[key] = indexRef.value
        }
      }
      indexRef.value++

      const childTpls = getChildTemplates(t)
      if (childTpls) traverse(childTpls)
    }
  }

  traverse(templates)
  return result
}

function getChildTemplates (template) {
  if (template.type !== 'tag') return null
  const impl = template.tagImpl
  const name = template.name
  if (name === 'if' && impl && impl.branches) {
    const all = []
    for (const b of impl.branches) all.push(...(b.templates || []))
    if (impl.elseTemplates) all.push(...impl.elseTemplates)
    return all
  }
  if (name === 'unless' && impl && (impl.templates || impl.elseTemplates)) {
    return [...(impl.templates || []), ...(impl.elseTemplates || [])]
  }
  if ((name === 'for' || name === 'tablerow') && impl && (impl.templates || impl.elseTemplates)) {
    return [...(impl.templates || []), ...(impl.elseTemplates || [])]
  }
  if (name === 'case' && impl && (impl.cases || impl.elseTemplates)) {
    const all = []
    for (const c of (impl.cases || [])) all.push(...(c.templates || []))
    if (impl.elseTemplates) all.push(...impl.elseTemplates)
    return all
  }
  if (name === 'capture' && impl && impl.templates) return impl.templates
  return null
}

/**
 * Filter templates to keep only control-flow and assigns to targetVar.
 */
function filterTemplates (templates, targetVar, options) {
  if (!Array.isArray(templates)) return []
  const result = []
  const assignTags = options.assignTags || []
  const includeOtherAssigns = options.includeOtherAssigns
  const pruneEmptyBlocks = options.pruneEmptyBlocks
  const keepNonAssign = options.keepNonAssign

  for (const t of templates) {
    if (t.type === 'html') {
      if (keepNonAssign) result.push(t)
      continue
    }
    if (t.type === 'value') {
      if (keepNonAssign) result.push(t)
      continue
    }
    if (t.type === 'tag') {
      if (assignTags.indexOf(t.name) >= 0) {
        const key = t.tagImpl && t.tagImpl.key
        if (key === targetVar) {
          result.push(t)
        } else if (includeOtherAssigns) {
          result.push(t)
        }
        continue
      }
      if (t.name === 'comment' && !options.includeComments) continue
      if (t.name === 'raw') {
        if (keepNonAssign) result.push(t)
        continue
      }

      const filtered = filterControlFlow(t, targetVar, options)
      if (filtered) {
        if (pruneEmptyBlocks && isEmptyBlock(filtered)) continue
        result.push(filtered)
      }
    }
  }
  return result
}

function filterControlFlow (template, targetVar, options) {
  const impl = template.tagImpl
  const name = template.name
  if (name === 'if' && impl && impl.branches) {
    const elseFiltered = filterTemplates(impl.elseTemplates || [], targetVar, options)
    const branchFiltered = impl.branches.map(b => filterTemplates(b.templates || [], targetVar, options))
    const hasContentLater = (idx) =>
      branchFiltered.some((tpls, i) => i > idx && tpls.length > 0) || elseFiltered.length > 0

    const newBranches = []
    for (let i = 0; i < impl.branches.length; i++) {
      const b = impl.branches[i]
      const filtered = branchFiltered[i]
      const keep = filtered.length > 0 || !options.pruneEmptyBlocks ||
        (i === 0 && hasContentLater(0)) || (i > 0 && hasContentLater(i))
      if (keep) {
        newBranches.push({ cond: b.cond, templates: filtered })
      }
    }
    if (newBranches.length === 0 && elseFiltered.length === 0 && options.pruneEmptyBlocks) {
      return null
    }
    if (newBranches.length === 0 && elseFiltered.length > 0 && impl.branches.length > 0) {
      newBranches.push({ cond: impl.branches[0].cond, templates: [] })
    }
    const out = Object.create(template)
    out.tagImpl = Object.create(impl)
    out.tagImpl.branches = newBranches
    out.tagImpl.elseTemplates = elseFiltered
    return out
  }
  if (name === 'unless' && impl) {
    const templatesFiltered = filterTemplates(impl.templates || [], targetVar, options)
    const elseFiltered = filterTemplates(impl.elseTemplates || [], targetVar, options)
    if (templatesFiltered.length === 0 && elseFiltered.length === 0 && options.pruneEmptyBlocks) {
      return null
    }
    const out = Object.create(template)
    out.tagImpl = Object.create(impl)
    out.tagImpl.templates = templatesFiltered
    out.tagImpl.elseTemplates = elseFiltered
    return out
  }
  if ((name === 'for' || name === 'tablerow') && impl) {
    const templatesFiltered = filterTemplates(impl.templates || [], targetVar, options)
    const elseFiltered = filterTemplates(impl.elseTemplates || [], targetVar, options)
    if (templatesFiltered.length === 0 && elseFiltered.length === 0 && options.pruneEmptyBlocks) {
      return null
    }
    const out = Object.create(template)
    out.tagImpl = Object.create(impl)
    out.tagImpl.templates = templatesFiltered
    out.tagImpl.elseTemplates = elseFiltered
    return out
  }
  if (name === 'case' && impl) {
    const newCases = []
    for (const c of (impl.cases || [])) {
      const filtered = filterTemplates(c.templates || [], targetVar, options)
      if (filtered.length > 0 || !options.pruneEmptyBlocks) {
        newCases.push({ val: c.val, templates: filtered })
      }
    }
    const elseFiltered = filterTemplates(impl.elseTemplates || [], targetVar, options)
    if (newCases.length === 0 && elseFiltered.length === 0 && options.pruneEmptyBlocks) {
      return null
    }
    const out = Object.create(template)
    out.tagImpl = Object.create(impl)
    out.tagImpl.cases = newCases
    out.tagImpl.elseTemplates = elseFiltered
    return out
  }
  if (name === 'capture' && impl) {
    const filtered = filterTemplates(impl.templates || [], targetVar, options)
    if (filtered.length === 0 && options.pruneEmptyBlocks) return null
    const out = Object.create(template)
    out.tagImpl = Object.create(impl)
    out.tagImpl.templates = filtered
    return out
  }
  return null
}

function isEmptyBlock (template) {
  if (template.type !== 'tag') return false
  const impl = template.tagImpl
  if (template.name === 'if' && impl && impl.branches) {
    return impl.branches.every(b => (b.templates || []).length === 0) &&
      (impl.elseTemplates || []).length === 0
  }
  if (template.name === 'unless' && impl) {
    return (impl.templates || []).length === 0 && (impl.elseTemplates || []).length === 0
  }
  if ((template.name === 'for' || template.name === 'tablerow') && impl) {
    return (impl.templates || []).length === 0 && (impl.elseTemplates || []).length === 0
  }
  if (template.name === 'case' && impl) {
    return (impl.cases || []).every(c => (c.templates || []).length === 0) &&
      (impl.elseTemplates || []).length === 0
  }
  if (template.name === 'capture' && impl) {
    return (impl.templates || []).length === 0
  }
  return false
}

/**
 * Render pruned AST back to Liquid string.
 */
function renderTemplatesToLiquid (templates) {
  if (!Array.isArray(templates)) return ''
  return templates.map(t => renderTemplateToLiquid(t)).join('')
}

function renderTemplateToLiquid (template) {
  if (!template) return ''
  if (template.type === 'html') return template.raw || template.value || ''
  if (template.type === 'value') return (template.token && template.token.raw) || ''
  if (template.type !== 'tag') return ''

  const name = template.name
  const token = template.token

  if (['assign', 'assignVar', 'parseAssign'].indexOf(name) >= 0) {
    return (token && token.raw) || ''
  }

  const impl = template.tagImpl
  if (name === 'if' && impl && impl.branches && impl.branches.length > 0) {
    let out = (token && token.raw) || ''
    out += renderTemplatesToLiquid(impl.branches[0].templates || [])
    for (let i = 1; i < impl.branches.length; i++) {
      const b = impl.branches[i]
      out += `{% elsif ${b.cond} %}`
      out += renderTemplatesToLiquid(b.templates || [])
    }
    if ((impl.elseTemplates || []).length > 0) {
      out += '{% else %}'
      out += renderTemplatesToLiquid(impl.elseTemplates)
    }
    out += '{% endif %}'
    return out
  }

  if (name === 'unless' && impl) {
    let out = (token && token.raw) || ''
    out += renderTemplatesToLiquid(impl.templates || [])
    if ((impl.elseTemplates || []).length > 0) {
      out += '{% else %}'
      out += renderTemplatesToLiquid(impl.elseTemplates)
    }
    out += '{% endunless %}'
    return out
  }

  if (name === 'for' && impl) {
    let out = (token && token.raw) || ''
    out += renderTemplatesToLiquid(impl.templates || [])
    if ((impl.elseTemplates || []).length > 0) {
      out += '{% else %}'
      out += renderTemplatesToLiquid(impl.elseTemplates)
    }
    out += '{% endfor %}'
    return out
  }

  if (name === 'tablerow' && impl) {
    let out = (token && token.raw) || ''
    out += renderTemplatesToLiquid(impl.templates || [])
    if ((impl.elseTemplates || []).length > 0) {
      out += '{% else %}'
      out += renderTemplatesToLiquid(impl.elseTemplates)
    }
    out += '{% endtablerow %}'
    return out
  }

  if (name === 'case' && impl) {
    let out = (token && token.raw) || ''
    for (const c of (impl.cases || [])) {
      out += `{% when ${c.val} %}`
      out += renderTemplatesToLiquid(c.templates || [])
    }
    if ((impl.elseTemplates || []).length > 0) {
      out += '{% else %}'
      out += renderTemplatesToLiquid(impl.elseTemplates)
    }
    out += '{% endcase %}'
    return out
  }

  if (name === 'capture' && impl) {
    let out = (token && token.raw) || ''
    out += renderTemplatesToLiquid(impl.templates || [])
    out += '{% endcapture %}'
    return out
  }

  if (name === 'raw' && impl && impl.tokens) {
    let out = (token && token.raw) || ''
    out += impl.tokens.map(t => t.raw).join('')
    out += '{% endraw %}'
    return out
  }

  return ''
}

module.exports = { splitAssignmentsByVariable }
