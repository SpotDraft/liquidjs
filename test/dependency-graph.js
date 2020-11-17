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
});
