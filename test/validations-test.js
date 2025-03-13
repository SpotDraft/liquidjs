const chai = require("chai");
const sinonChai = require("sinon-chai");
const expect = chai.expect;
const Liquid = require("../index.js");
chai.use(sinonChai);

describe("check whether variable used in liquidjs expressions has been defined before usage", () => {
  const commonSetup = () => {
    const engine = Liquid({});
    return engine;
  };
  it("should return an empty array if all variables being used in computations have been defined earlier before being used", () => {
    const engine = commonSetup();
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
    const actualErrorArray = engine.checkVariableInComputation(expression);
    expect(actualErrorArray).to.deep.equal(expectedErrorArray);
  });
});
