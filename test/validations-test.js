const chai = require("chai");
const sinonChai = require("sinon-chai");
chai.use(sinonChai);

var validations = require("../validations");

describe.only("validation tests on liquid expressions", () => {
  describe("checkValidJSON function", () => {
    it("should return an empty array if parseAssign is assigned a valid JSON value", () => {
      const expression = `
      {% unless a == "EUR" %}
        {% parseAssign x4 = "test" %}
      {% endunless %}
      {% parseAssign x1 = '{"key": "value"}' %}
        {% parseAssign x0 = "100" %}
        {% if a == "USD" %}
          {% parseAssign x1 = "test" %}
        {% elsif a == "INR" %}
          {% parseAssign x2 = "[1, 2, 3]" %}
        {% else %}
          {% parseAssign x3 = "true" %}
        {% endif %}
      `;

      const validationErrors = validations.checkValidJSON(expression);
      expect(validationErrors).to.deep.equal([]);
    });

    it("should return array of errors if parseAssign is assigned invalid JSON value", () => {
      const expression = `
        {% parseAssign x0 = 10, 0 %}
        {% parseAssign y = a | plus: b %}
        {% if a == "USD" and b == "INR" % }
          {% parseAssign x1 = {"key": value } %}  <!-- Invalid JSON -->
        {% elsif a == "INR" %}
          {% parseAssign x2 = [1, 2,] %}      <!-- Invalid JSON -->
        {% else %}
          {% parseAssign x3 = unquotedString %} <!-- Invalid JSON -->
        {% endif %}
      `;
      const expectedValidationErrors = [
        {
          expression: "parseAssign x0 =  10, 0",
          errorMessage:
            "Invalid value assigned to parseAssign statement at line 2",
        },
        {
          expression: "parseAssign y =  a | plus: b",
          errorMessage:
            "Invalid value assigned to parseAssign statement at line 3",
        },
        {
          expression: "parseAssign x2 =  [1, 2,]",
          errorMessage:
            "Invalid value assigned to parseAssign statement at line 7",
        },
        {
          expression: "parseAssign x3 =  unquotedString",
          errorMessage:
            "Invalid value assigned to parseAssign statement at line 9",
        },
      ];
      const validationErrors = validations.checkValidJSON(expression);
      expect(validationErrors).to.deep.equal(expectedValidationErrors);
    });
  });

  describe("checkVariableInCompute", () => {
    it("should check if variable being used in computations has been defined earlier or not", () => {
      const expression = `
      {% if x %}
        {% if y %}
          {% assign c = a | times: b %}
        {% else %}
          {% assign d = x | times: y %}
        {% endif %}
      {% elsif x == "editor" %}
        {% if y %}
          {% assign c = a | times: b %}
        {% else %}
          {% assign d = x | times: y %}
        {% endif %}
      {% else %}
        {% if y %}
          {% assign c = a | times: b %}
        {% else %}
          {% assign d = x | times: y %}
        {% endif %}
      {% endif %}
    `;
      const expectedErrorArray = [
        'Variable "a" used before assignment in expression "c = a | times: b" on line 4',
        'Variable "b" used before assignment in expression "c = a | times: b" on line 4',
        'Variable "a" used before assignment in expression "c = a | times: b" on line 10',
        'Variable "b" used before assignment in expression "c = a | times: b" on line 10',
        'Variable "a" used before assignment in expression "c = a | times: b" on line 16',
        'Variable "b" used before assignment in expression "c = a | times: b" on line 16',
      ];
      const actualErrorArray =
        validations.checkVariableInComputation(expression);
      expect(actualErrorArray).to.deep.equal(expectedErrorArray);
    });
  });
});
