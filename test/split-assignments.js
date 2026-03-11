const chai = require('chai')
const expect = chai.expect
const path = require('path')
const fs = require('fs')
const { splitAssignmentsByVariable } = require('../src/split-assignments.js')

describe('split-assignments', function () {
  describe('splitAssignmentsByVariable', function () {
    it('should split sample input by variable', function () {
      const inputPath = path.join(__dirname, 'fixtures', 'sample-liquid-input.liquid')
      const outputPath = path.join(__dirname, 'fixtures', 'sample-liquid-output.liquid')
      const input = fs.readFileSync(inputPath, 'utf8')
      const expectedOutput = fs.readFileSync(outputPath, 'utf8')
      const expected = expectedOutput.split('---').map(s => s.trim()).filter(Boolean)

      const result = splitAssignmentsByVariable(input)
      expect(result).to.deep.equal(expected)
    })

    it('should prune empty branches when only one branch has target assign', function () {
      const input = `{% if x %}
  {% assign foo = 1 %}
{% else %}
  no assign here
{% endif %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.include('{% assign foo = 1 %}')
      expect(result[0]).to.include('{% if x %}')
      expect(result[0]).to.include('{% endif %}')
      expect(result[0]).not.to.include('{% else %}')
    })

    it('should preserve nested blocks structure', function () {
      const input = `{% unless outer %}
{% if inner %}
{% for item in items %}
  {% assign x = item %}
{% endfor %}
{% endif %}
{% endunless %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.include('{% unless outer %}')
      expect(result[0]).to.include('{% if inner %}')
      expect(result[0]).to.include('{% for item in items %}')
      expect(result[0]).to.include('{% assign x = item %}')
      expect(result[0]).to.include('{% endfor %}')
      expect(result[0]).to.include('{% endif %}')
      expect(result[0]).to.include('{% endunless %}')
    })

    it('should preserve raw block when keepNonAssign is true', function () {
      const input = `{% raw %}{% assign x = 1 %}{% endraw %}`
      const resultWithKeep = splitAssignmentsByVariable(input, { keepNonAssign: true })
      const resultWithoutKeep = splitAssignmentsByVariable(input, { keepNonAssign: false })

      expect(resultWithKeep).to.have.lengthOf(0)
      expect(resultWithoutKeep).to.have.lengthOf(0)

      const input2 = `{% assign a = 1 %}
{% raw %}some raw {{ content }}{% endraw %}
{% assign b = 2 %}`
      const result2 = splitAssignmentsByVariable(input2, { keepNonAssign: true })
      expect(result2).to.have.lengthOf(2)
      expect(result2[0]).to.include('{% assign a = 1 %}')
      expect(result2[0]).to.include('{% raw %}')
      expect(result2[0]).to.include('some raw {{ content }}')
      expect(result2[0]).to.include('{% endraw %}')
      expect(result2[1]).to.include('{% assign b = 2 %}')
    })

    it('should treat assignVar and parseAssign as assigns', function () {
      const input = `{% assign src = "hello" %}
{% assignVar dest = src %}
{% parseAssign arr = "[1,2,3]" %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.include('{% assign src = "hello" %}')
      expect(result[1]).to.include('{% assignVar dest = src %}')
      expect(result[2]).to.include('{% parseAssign arr = "[1,2,3]" %}')
    })

    it('should order output by first appearance', function () {
      const input = `{% assign z = 3 %}
{% assign a = 1 %}
{% assign m = 2 %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.include('z = 3')
      expect(result[1]).to.include('a = 1')
      expect(result[2]).to.include('m = 2')
    })

    it('should handle case/when blocks', function () {
      const input = `{% case x %}
{% when 1 %}
  {% assign a = "one" %}
{% when 2 %}
  {% assign b = "two" %}
{% else %}
  {% assign c = "other" %}
{% endcase %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.include('{% case x %}')
      expect(result[0]).to.include('{% when 1 %}')
      expect(result[0]).to.include('{% assign a = "one" %}')
      expect(result[0]).to.include('{% endcase %}')
      expect(result[0]).not.to.include('{% when 2 %}')
      expect(result[1]).to.include('{% when 2 %}')
      expect(result[1]).to.include('{% assign b = "two" %}')
      expect(result[2]).to.include('{% else %}')
      expect(result[2]).to.include('{% assign c = "other" %}')
    })

    it('should handle elsif branches', function () {
      const input = `{% if a %}
  {% assign x = 1 %}
{% elsif b %}
  {% assign y = 2 %}
{% else %}
  {% assign z = 3 %}
{% endif %}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.have.lengthOf(3)
      expect(result[0]).to.include('{% if a %}')
      expect(result[0]).to.include('{% assign x = 1 %}')
      expect(result[0]).to.include('{% endif %}')
      expect(result[0]).not.to.include('elsif')
      expect(result[1]).to.include('{% elsif b %}')
      expect(result[1]).to.include('{% assign y = 2 %}')
      expect(result[2]).to.include('{% else %}')
      expect(result[2]).to.include('{% assign z = 3 %}')
    })

    it('should return empty array when no assigns', function () {
      const input = `Hello {{ name }}`
      const result = splitAssignmentsByVariable(input)
      expect(result).to.deep.equal([])
    })
  })
})
