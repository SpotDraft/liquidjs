const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const expect = chai.expect;

chai.use(sinonChai);

var depGraph = require("../dependency-graph");

describe("dependency-graph: assign expression parsing", function () {
  let engine;

  beforeEach(() => {
    engine = depGraph.createEngine();
  });

  it("Should have one variable that depends on one and variable and a literal", () => {
    const expression = `{% assign membership_fee_private_seats_percentaged_two = membership_fee_private_seats_percentaged_one | divided_by: 100.00 %}`;
    const tmpls = depGraph.getTemplates(expression, engine);
    const variableData = depGraph.parseAssign(tmpls[0], engine);
    expect(variableData.defined).to.equal(
      "membership_fee_private_seats_percentaged_two"
    );
    expect(variableData.dependsOn.length).to.equal(1);
  });

  it("Should have one variable that depends on more than one variable", () => {
    const expression = `{% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats | append: discounts_private_seats_percentage %}`;
    const tmpls = depGraph.getTemplates(expression, engine);
    const graph = depGraph.parseAssign(tmpls[0], engine);
    expect(graph.defined).to.equal(
      "membership_fee_private_seats_percentaged_one"
    );
    expect(graph.dependsOn.length).to.equal(2);
    expect(graph.dependsOn[0]).to.equal("membership_fee_private_seats");
    expect(graph.dependsOn[1]).to.equal("discounts_private_seats_percentage");
  });

  it("Should have one variable that is a re-assignment", () => {
    const expression = `{% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats %}`;
    const tmpls = depGraph.getTemplates(expression, engine);
    const graph = depGraph.parseAssign(tmpls[0], engine);
    expect(graph.defined).to.equal(
      "membership_fee_private_seats_percentaged_one"
    );
    expect(graph.dependsOn[0]).to.equal("membership_fee_private_seats");
  });
});

describe("dependency-graph: parsing complete templates", function () {
  it("should have 2 variables in the graph", () => {
    const expression = `{% assign a = x | times: 3 %} {% assign b = a | divided_by: 3 %}`;
    const graph = depGraph.createDependencyTree(expression);
    expect(Object.keys(graph).length).to.equal(2);
  });

  it(`should handle single if...else conditions`, () => {
    const expression = `
    {% if private_seats_percentage %}
      {% assign c = a | times: b %}
      {% assign d = c | divided_by: 100.00 %}
      {% assign e = a | minus: d %} 
      {% assign f = e | times: g %}
    {% else %}
      {% assign h = a | minus: i %}
      {% assign f = h | times: g %}
    {% endif %}
    `;
    const graph = depGraph.createDependencyTree(expression);
    expect(Object.keys(graph).length).to.equal(8);
    expect(graph["a"].length).to.equal(3);
    expect(graph["b"].length).to.equal(1);
    expect(graph["g"].length).to.equal(1);
  });

  it("Should handle complex templates", () => {
    const expression = `
    {% if private_seats %}
    {% if yes_discounts_private_seats %}
    {% if private_seats_percentage %}
        {% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats | times: discounts_private_seats_percentage %}
        {% assign membership_fee_private_seats_percentaged_two = membership_fee_private_seats_percentaged_one | divided_by: 100.00 %}
        {% assign membership_fee_private_seats_percentaged = membership_fee_private_seats | minus: membership_fee_private_seats_percentaged_two %} 
        {% assign total_membership_fee_private_seats = membership_fee_private_seats_percentaged | times: capacity_private_seats %}
    {% else %}
        {% assign membership_fee_private_seats_amount_one = membership_fee_private_seats | minus: discounts_seat_private_seats_amount %}
        {% assign total_membership_fee_private_seats = membership_fee_private_seats_amount_one | times: capacity_private_seats %}
    {% endif %}
    {% else %}
    {% assign total_membership_fee_private_seats = membership_fee_private_seats | times: capacity_private_seats %}
    {% endif %}
{% else %}
{% assign total_membership_fee_private_seats = total_membership_fee_private_seats | updateAttribute: "value", 0 %}
{% endif %}
{% assign total_membership_fee = total_membership_fee_dedicated_desks | plus: total_membership_fee_hot_desks %}
{% assign total_membership_fee_complete = total_membership_fee | plus: total_membership_fee_private_seats %}
{% assign security_deposit = total_membership_fee_complete| times: numberof_months %}
{% assign setup_fee = setup_feevalue | times: total_seats %}
    `;
    const graph = depGraph.createDependencyTree(expression);
    expect(Object.keys(graph).length).to.equal(16);
    expect(graph["membership_fee_private_seats"].length).to.equal(4);
  });
});

describe("dependency-graph: Affected Variables", function () {
  it("Should have 3 affected variables", () => {
    const expression = `
    {% assign x = a + z %}
    {% assign y = a | times:2 %}   
    {% assign t = x | times: 3 %}
    `;
    const graph = depGraph.createDependencyTree(expression);
    const affectedVars = depGraph.getAffectedVariables(graph, "a");
    expect(affectedVars.length).to.equals(3);
  });

  it("Should handle complex assignments", () => {
    const expression = `
    {% if private_seats %}
    {% if yes_discounts_private_seats %}
    {% if private_seats_percentage %}
        {% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats | times: discounts_private_seats_percentage %}
        {% assign membership_fee_private_seats_percentaged_two = membership_fee_private_seats_percentaged_one | divided_by: 100.00 %}
        {% assign membership_fee_private_seats_percentaged = membership_fee_private_seats | minus: membership_fee_private_seats_percentaged_two %} 
        {% assign total_membership_fee_private_seats = membership_fee_private_seats_percentaged | times: capacity_private_seats %}
    {% else %}
        {% assign membership_fee_private_seats_amount_one = membership_fee_private_seats | minus: discounts_seat_private_seats_amount %}
        {% assign total_membership_fee_private_seats = membership_fee_private_seats_amount_one | times: capacity_private_seats %}
    {% endif %}
    {% else %}
    {% assign total_membership_fee_private_seats = membership_fee_private_seats | times: capacity_private_seats %}
    {% endif %}
    {% else %}
    {% assign total_membership_fee_private_seats = total_membership_fee_private_seats | updateAttribute: "value", 0 %}
    {% endif %}
    {% assign total_membership_fee = total_membership_fee_dedicated_desks | plus: total_membership_fee_hot_desks %}
    {% assign total_membership_fee_complete = total_membership_fee | plus: total_membership_fee_private_seats %}
    {% assign security_deposit = total_membership_fee_complete| times: numberof_months %}
    {% assign setup_fee = setup_feevalue | times: total_seats %}
    `;
    const graph = depGraph.createDependencyTree(expression);
    const affectedVars = depGraph.getAffectedVariables(
      graph,
      "membership_fee_private_seats"
    );
    /**
     * How 7?
     *
     *  When `membership_fee_private_seats` is changed, it causes the following vars to change -
     *  - membership_fee_private_seats_percentaged_one
     *  -- membership_fee_private_seats_percentaged_two
     *  --- membership_fee_private_seats_percentaged
     *  ---- total_membership_fee_private_seats
     *  ----- total_membership_fee_complete
     *  ------ security_deposit
     *  - membership_fee_private_seats_amount_one
     *
     */
    expect(affectedVars.length).to.equal(7);
  });
});
