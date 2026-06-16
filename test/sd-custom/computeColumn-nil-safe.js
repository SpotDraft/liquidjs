/**
 * Regression tests for SPD-23149:
 *   computeColumn sd_unit with bracket accessor on nil self.sd_product
 *   should not crash — mirrors the Wingify/VWO Order Details / sd_unit failure.
 *
 *   Before fix:
 *     unit_mapping[self.sd_product] where self.sd_product is nil/undefined
 *     caused: TypeError: Cannot read properties of undefined (reading 'length')
 *     at push() in scope.js propertyAccessSeq — blocked all document generation.
 *
 *   After fix:
 *     nil bracket key is coerced to '' → path collapses to ['unit_mapping'] →
 *     returns the mapping object instead of crashing. downcase/size/first/last/join
 *     filters also guard nil inputs.
 */
const chai = require('chai')
const expect = chai.expect
const Liquid = require('../../index.js')

describe('computeColumn nil-safe bracket access (SPD-23149)', function () {
  let engine

  beforeEach(function () {
    engine = Liquid({ root: __dirname })
  })

  it('should compute sd_unit via unit_mapping lookup correctly when sd_product is set', async function () {
    const tpl = `
{% computeColumn sd_order_details sd_unit %}
  {% parseAssign unit_mapping = '{"VWO Rollouts - Web":"sessions","VWO Testing - Web":"users"}' %}
  {% assign $$answer = unit_mapping[self.sd_product] %}
{% endcomputeColumn %}
`
    const ctx = {
      sd_order_details: [
        { sd_product: 'VWO Rollouts - Web', sd_quota: 100 },
        { sd_product: 'VWO Testing - Web', sd_quota: 50 },
      ]
    }
    await engine.parseAndRender(tpl, ctx)
    expect(ctx.sd_order_details[0].sd_unit).to.equal('sessions')
    expect(ctx.sd_order_details[1].sd_unit).to.equal('users')
  })

  it('should NOT crash when sd_product is missing from a row (nil bracket-variable safety)', async function () {
    const tpl = `
{% computeColumn sd_order_details sd_unit %}
  {% parseAssign unit_mapping = '{"VWO Rollouts - Web":"sessions"}' %}
  {% assign $$answer = unit_mapping[self.sd_product] %}
{% endcomputeColumn %}
`
    const ctx = {
      sd_order_details: [
        { sd_quota: 100 } // sd_product intentionally missing
      ]
    }
    // Before the fix: TypeError: Cannot read properties of undefined (reading 'length')
    // After the fix: no throw; formula completes (value may be the fallback mapping object)
    let threw = false
    try {
      await engine.parseAndRender(tpl, ctx)
    } catch (e) {
      threw = true
    }
    expect(threw).to.equal(false)
  })

  it('should NOT crash when downcase is applied to a nil sd_product field', async function () {
    const tpl = `
{% computeColumn sd_order_details sd_unit %}
  {% assign lc = self.sd_product | downcase %}
  {% if lc == 'vwo rollouts - web' %}
    {% assign $$answer = 'sessions' %}
  {% else %}
    {% assign $$answer = 'unknown' %}
  {% endif %}
{% endcomputeColumn %}
`
    const ctx = {
      sd_order_details: [
        { sd_product: 'VWO Rollouts - Web' },
        {} // no sd_product — previously crashed at | downcase on nil
      ]
    }
    await engine.parseAndRender(tpl, ctx)
    expect(ctx.sd_order_details[0].sd_unit).to.equal('sessions')
    expect(ctx.sd_order_details[1].sd_unit).to.equal('unknown')
  })

  it('should process all rows even when one row has missing fields', async function () {
    const tpl = `
{% computeColumn sd_order_details sd_unit %}
  {% parseAssign unit_mapping = '{"VWO Rollouts - Web":"sessions","VWO Testing - Web":"users"}' %}
  {% assign $$answer = unit_mapping[self.sd_product] %}
{% endcomputeColumn %}
`
    const ctx = {
      sd_order_details: [
        { sd_product: 'VWO Rollouts - Web', sd_quota: 500 },
        { sd_quota: 100 },  // missing sd_product — should not crash entire table
        { sd_product: 'VWO Testing - Web', sd_quota: 200 },
      ]
    }
    let threw = false
    try {
      await engine.parseAndRender(tpl, ctx)
    } catch (e) {
      threw = true
    }
    expect(threw).to.equal(false)
    expect(ctx.sd_order_details[0].sd_unit).to.equal('sessions')
    // row[1] sd_unit will be the fallback value (whole mapping), not crash
    expect(ctx.sd_order_details[2].sd_unit).to.equal('users')
  })
})
