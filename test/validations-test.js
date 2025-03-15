const chai = require("chai");
const sinonChai = require("sinon-chai");
const expect = chai.expect;
const Liquid = require("../index.js");
chai.use(sinonChai);

describe("performs validations on liquidJS expressions", () => {
  before(() => {
    engine = Liquid({}); // Initialize once before all tests
  });

  describe("checks whether valid JSON has been passed to parseAssign statements in liquid expressions", () => {
    it("should return an empty array if parseAssign is assigned a valid JSON value", () => {
      // const engine = commonSetup();
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

      const validationErrors = engine.checkValidJSON(expression);
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
      const validationErrors = engine.checkValidJSON(expression);
      expect(validationErrors).to.deep.equal(expectedValidationErrors);
    });
  });

  describe("dynamic table validations : checks for presence of $$answer = something in each branch of conditional statements and returns error if not found in a branch", () => {
    it("should return an empty array if $$answer = something is found in each outer conditional branch of liquid expression", () => {
      const expression = `
      {% if x %}
        {% if y %}
          $$answer = test
        {% elsif z %}
        {% else %}
          {% if a %}
            test
          {% else %}
            No answer
          {% endif %}
        {% endif %}
      {% elsif a %}
        {% for item in items %}
          {% if x %}
            {% if y %}
              $$random = test
            {% elsif z %}
            {% else %}
              {% if a %}
                test
              {% else %}
                No answer
              {% endif %}
            {% endif %}
          {% elsif a %}
            {% if y %}
              $$answer = test
            {% elsif z %}
              test
            {% else %}
              {% if a %}
                test
              {% else %}
                No answer
              {% endif %}
            {% endif %}
          {% endif %}
        {% endfor %}
      {% elsif b %}
        {% if c %}
          $$answer = test
        {% else %}
          Something else
        {% endif %}
      {% else %}
       $$answer = test
      {% endif %}
    `;

      const expectedValidationErrors = [];
      const validationErrors = engine.checkValidDynamicTable(expression);
      expect(validationErrors).to.deep.equal(expectedValidationErrors);
    });

    it("should return an array of errors if $$answer = something is not found in any outer conditional branch of liquid expression", () => {
      const expression = `
      {% if x %}
        {% if y %}
          $$answer = test
        {% elsif z %}
        {% else %}
          {% if a %}
            test
          {% else %}
            No answer
          {% endif %}
        {% endif %}
      {% elsif a %}
        {% for item in items %}
          {% if x %}
            {% if y %}
              $$random = test
            {% elsif z %}
            {% else %}
              {% if a %}
                test
              {% else %}
                No answer
              {% endif %}
            {% endif %}
          {% elsif a %}
            {% if y %}
              missing 
            {% elsif z %}
              test
            {% else %}
              {% if a %}
                test
              {% else %}
                No answer
              {% endif %}
            {% endif %}
          {% endif %}
        {% endfor %}
      {% elsif b %}
        {% if c %}
          $$answer = test
        {% else %}
          Something else
        {% endif %}
      {% else %}
       $$answer = test
      {% endif %}
    `;

      const expectedValidationErrors = [
        {
          branchCondition: "a",
          errorMessage:
            "The above branch doesn't contain $$answer assignment expression",
        },
      ];
      const validationErrors = engine.checkValidDynamicTable(expression);
      expect(validationErrors).to.deep.equal(expectedValidationErrors);
    });
  });
});
