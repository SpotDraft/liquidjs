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
    const graph = depGraph.parseAssign(tmpls[0], engine);
    expect(graph.length).to.equal(2);
    expect(graph[0]).to.equal("membership_fee_private_seats_percentaged_two");
    expect(graph[1]).to.equal("membership_fee_private_seats_percentaged_one");
  });

  it("Should have one variable that depends on more than one variable", () => {
    const expression = `{% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats | append: discounts_private_seats_percentage %}`;
    const tmpls = depGraph.getTemplates(expression, engine);
    const graph = depGraph.parseAssign(tmpls[0], engine);
    expect(graph.length).to.equal(3);
    expect(graph[0]).to.equal("membership_fee_private_seats_percentaged_one");
    expect(graph[1]).to.equal("membership_fee_private_seats");
    expect(graph[2]).to.equal("discounts_private_seats_percentage");
  });

  it("Should have one variable that is a re-assignment", () => {
    const expression = `{% assign membership_fee_private_seats_percentaged_one = membership_fee_private_seats %}`;
    const tmpls = depGraph.getTemplates(expression, engine);
    const graph = depGraph.parseAssign(tmpls[0], engine);
    expect(graph.length).to.equal(2);
    expect(graph[0]).to.equal("membership_fee_private_seats_percentaged_one");
    expect(graph[1]).to.equal("membership_fee_private_seats");
  });
});
