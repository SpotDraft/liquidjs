const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
var liquid = require('..')()
chai.use(chaiAsPromised)
const moment = require("moment");

var ctx = {
  date: new Date(),
  date_string: new Date().toISOString(),
  formatted_date_string: moment().format("YYYY-MM-DD"),
  foo: 'bar',
  arr: [-2, 'a'],
  obj: {
    foo: 'bar'
  },
  func: function () {},
  posts: [{
    category: 'foo'
  }, {
    category: 'bar'
  }],

  duration_10_weeks: {value: 10, type: "WEEKS", days: 70},
  duration_20_days: {value: 20, type: "DAYS", days: 20},
  duration_2_months: {value: 2, type: "MONTHS", days: 60},
  duration_3_years: {value: 3, type: "YEARS", days: 1095},
  duration_fortnight_invalid: {value: 1, type: "FORTNIGHT", days: 14},
  currency_thousand: {value: 1000, type: "INR"},
  currency_hundred: {value: 100, type: "INR"},
  currency_ten: {value: 10, type: "INR"},
  currency_decimal: {value: 13.456, type:"USD"},
  currency_decimal_2: {value: 14.567, type:"USD"},
  currency_decimal_3: {value: 14.5674, type:"USD"},
  currency_val_null: {value: null, type: "INR"},
  duration_val_null: {value: null, type: "MONTHS", days: null},
  duration_empty_obj: {},
  from_date: new Date("January 1, 2020"),
  to_date: new Date("March 1, 2020"),
  from_date_string: new Date("January 1, 2020").toISOString(),
  to_date_string: new Date("March 1, 2020").toISOString(),
  from_date_formatted_string: moment(new Date("January 1, 2020")).format("YYYY-MM-DD"),
  to_date_formatted_string: moment(new Date("March 1, 2020")).format("YYYY-MM-DD"),
  variable_undefined: undefined,
  variable_null: null,
  currency_loop_1: {value: 1000, type: "INR"},
  currency_loop_2: {value: 100, type: "INR"},
  loop_counter: 2,
  loop_i: 1,
  arr_invalid: null,
  arr_empty: [],
  arr_numbers: [1, 2, 3, 4, 5],
  arr_numbers_with_mixed_datatypes: [undefined, 1, null, 2, {}, 3, 'a', 5, true],
  dynamic_table_with_numbers: [{cost: 100, quantity: 2}, {cost: 200, quantity: 3}, {cost: 300, quantity: 4}],
  dynamic_table_with_null: [{cost: 100, quantity: 2}, {cost: 200, quantity: 3}, {cost: null, quantity: 4}],
  dynamic_table_with_empty: [{cost: 100, quantity: 2}, {cost: 200, quantity: 3}, {}]
}

// This is added separately in ctx because we are using existing ctx items as individual items in array
ctx = {
  ...ctx,
  arr_duration: [ctx.duration_10_weeks, ctx.duration_20_days, ctx.duration_2_months, ctx.duration_3_years],
  arr_duration_with_val_null_1: [ctx.duration_10_weeks, ctx.duration_20_days, ctx.duration_val_null],
  arr_duration_with_val_null_2: [ctx.duration_10_weeks, ctx.duration_val_null, ctx.duration_20_days],
  arr_duration_with_val_null_3: [ctx.duration_val_null, ctx.duration_10_weeks, ctx.duration_20_days],
  arr_duration_with_number_1: [ctx.duration_10_weeks, ctx.duration_20_days, 3],
  arr_duration_with_number_2: [3, ctx.duration_10_weeks, ctx.duration_20_days],
  arr_duration_with_null: [ctx.duration_10_weeks, null, ctx.duration_20_days],
  arr_date_with_duration: [ctx.from_date, ctx.duration_10_weeks, ctx.duration_20_days],
  arr_two_dates: [ctx.from_date, ctx.duration_10_weeks, ctx.to_date],
  arr_currency: [ctx.currency_thousand, ctx.currency_hundred, ctx.currency_ten],
  arr_currency_with_decimal: [ctx.currency_thousand, ctx.currency_decimal, ctx.currency_decimal_2],
  arr_currency_with_val_null_1: [ctx.currency_thousand, ctx.currency_hundred, ctx.currency_val_null],
  arr_currency_with_val_null_2: [ctx.currency_thousand, ctx.currency_val_null, ctx.currency_hundred],
  arr_currency_with_val_null_3: [ctx.currency_val_null, ctx.currency_hundred, ctx.currency_ten],
  arr_currency_with_number_1: [ctx.currency_thousand, ctx.currency_hundred, 3],
  arr_currency_with_number_2: [3, ctx.currency_thousand, ctx.currency_hundred],
  arr_currency_with_null: [ctx.currency_thousand, null, ctx.currency_hundred],
  dynamic_table_with_duration: [{time: ctx.duration_10_weeks}, {time: ctx.duration_20_days}, {time: ctx.duration_2_months}],
  dynamic_table_with_duration_with_val_null: [{time: ctx.duration_10_weeks}, {time: ctx.duration_20_days}, {time: ctx.duration_val_null}],
  dynamic_table_with_currency: [{price: ctx.currency_thousand}, {price: ctx.currency_hundred}, {price: ctx.currency_ten}],
  dynamic_table_with_currency_with_val_null: [{price: ctx.currency_thousand}, {price: ctx.currency_val_null}, {price: ctx.currency_ten}]
}

function test (src, dst) {
  return expect(liquid.parseAndRender(src, ctx)).to.eventually.equal(dst)
}

function checkForError(src, errorMessage) {

  if(!errorMessage){
    return expect(liquid.parseAndRender(src, ctx)).to.be.rejected;
  }

  return expect(liquid.parseAndRender(src, ctx)).to.be.rejectedWith(
    errorMessage
  );
}

describe('filters', function () {
  describe('abs', function () {
    it('should return 3 for -3', () => test('{{ -3 | abs }}', '3'))
    it('should return 2 for arr[0]', () => test('{{ arr[0] | abs }}', '2'))
    it('should return convert string', () => test('{{ "-3" | abs }}', '3'))
  })

  describe('append', function () {
    it('should return "-3abc" for -3, "abc"',
      () => test('{{ -3 | append: "abc" }}', '-3abc'))
    it('should return "abar" for "a",foo', () => test('{{ "a" | append: foo }}', 'abar'))
    it('should get value from ctx appending variable and loop counter', function () {
      const dst = {value: 1000, type: "INR"};
      return test('{% assignVar updatedCurrency = "currency_loop_" | append: loop_i %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
    it('should get value from ctx appending variable and loop counter with conditions', function () {
      const dst = {value: 1000, type: "INR"};
      return test(`{% for i in (1..loop_counter) %}{% assignVar updatedCurrency = "currency_loop_" | append: i %}{% if updatedCurrency.value > 500 %}{{updatedCurrency}}{% endif %}{% endfor %}`, 
      JSON.stringify(dst))
    })
  })

  it('should support capitalize', () => test('{{ "i am good" | capitalize }}', 'I am good'))

  describe('ceil', function () {
    it('should return "2" for 1.2', () => test('{{ 1.2 | ceil }}', '2'))
    it('should return "2" for 2.0', () => test('{{ 2.0 | ceil }}', '2'))
    it('should return "4" for 3.5', () => test('{{ "3.5" | ceil }}', '4'))
    it('should return "184" for 183.357', () => test('{{ 183.357 | ceil }}', '184'))
  })

  describe('concat', function () {
    it('should concat arrays', () => test(`
      {%- assign fruits = "apples, oranges, peaches" | split: ", " -%}
      {%- assign vegetables = "carrots, turnips, potatoes" | split: ", " -%}

      {%- assign everything = fruits | concat: vegetables -%}

      {%- for item in everything -%}
      - {{ item }}
      {% endfor -%}`,
      `- apples
      - oranges
      - peaches
      - carrots
      - turnips
      - potatoes
      `))
    it('should support chained concat', () => test(`
      {%- assign fruits = "apples, oranges, peaches" | split: ", " -%}
      {%- assign vegetables = "carrots, turnips, potatoes" | split: ", " -%}
      {%- assign furniture = "chairs, tables, shelves" | split: ", " -%}
      {%- assign everything = fruits | concat: vegetables | concat: furniture -%}

      {%- for item in everything -%}
      - {{ item }}
      {% endfor -%}`,
      `- apples
      - oranges
      - peaches
      - carrots
      - turnips
      - potatoes
      - chairs
      - tables
      - shelves
      `))
    
  })

  describe('date', function () {
    it('should support date: %a %b %d %Y', function () {
      var str = ctx.date.toDateString()
      return test('{{ date | date:"%a %b %d %Y"}}', str)
    })
    it('should create a new Date when given "now"', function () {
      return test('{{ "now" | date: "%Y"}}', (new Date()).getFullYear().toString())
    })
    it('should parse as Date when given UTC string', function () {
      return test('{{ "1991-02-22T00:00:00" | date: "%Y"}}', '1991')
    })
    it('should render string as string if not valid', function () {
      return test('{{ "foo" | date: "%Y"}}', 'foo')
    })
    it('should render object as string if not valid', function () {
      return test('{{ obj | date: "%Y"}}', '{"foo":"bar"}')
    })
  })

  describe('default', function () {
    it('should use default when falsy', () => test('{{false |default: "a"}}', 'a'))
    it('should not use default when truthy', () => test('{{true |default: "a"}}', 'true'))
  })

  describe('divided_by', function () {
    it('should return 2 for 4,2', () => test('{{4 | divided_by: 2}}', '2'))
    it('should return 4 for 16,4', () => test('{{16 | divided_by: 4}}', '4'))
    it('should return 1 for 5,3', () => test('{{5 | divided_by: 3}}', '1.667'))
    it('should return 2160 for 216000,100', () => test('{{216000 | divided_by: 100.0}}', '2160'))
    it('should support currency divided by number', () => {
      const dst = {value: 10, type: "INR"};
      return test('{{ currency_thousand | divided_by: 100.0 }}', JSON.stringify(dst))
    })
    it('should support currency divided by currency', () => {
      const dst = {value: 100, type: "INR"};
      return test('{{ currency_thousand | divided_by: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency divided_by currency with decimals', () => {
      const dst = {value: 0.924, type: "USD"};
      return test('{{ currency_decimal | divided_by: currency_decimal_2 }}', JSON.stringify(dst))
    })
    it('should support currency divided_by currency with decimals', () => {
      const dst = {value: 0.9237, type: "USD"};
      return test('{{ currency_decimal | divided_by: currency_decimal_3 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals divided_by number', () => {
      const dst = {value: 6.728, type: "USD"};
      return test('{{ currency_decimal | divided_by: 2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals divided_by number with decimal', () => {
      const dst = {value: 1.094, type: "USD"};
      return test('{{ currency_decimal | divided_by: 12.3 }}', JSON.stringify(dst))
    })
    // Null variable tests for currency
    it('should support currency handling with one currency variable with value null in middle', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ currency_thousand | divided_by: currency_val_null | divided_by: currency_hundred }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null at last', () => {
      // It is null because last variable is null
      const dst = {value: null, type: "INR"};
      return test('{{ currency_thousand | divided_by: currency_hundred | divided_by: currency_val_null}}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null and a number', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ currency_val_null | divided_by: 2 }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null, a number and another currency', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ 2 | divided_by: currency_val_null | divided_by: currency_thousand}}', JSON.stringify(dst))
    })
    it('should convert string to number', () => test('{{"5" | divided_by: "3"}}', '1.667'))
    /* Test for null argument */
    it('should return "0" for 24,null', () => test('{{ 24 | divided_by: null }}', "0"))
    it('should return "0" for null, 24', () => test('{{ null | divided_by: 24 }}', "0"))
    it('should return "0" for null,null', () => test('{{ null | divided_by: null }}', "0"))
  })

  describe('downcase', function () {
    it('should return "parker moore" for "Parker Moore"',
      () => test('{{ "Parker Moore" | downcase }}', 'parker moore'))
    it('should return "apple" for "apple"',
      () => test('{{ "apple" | downcase }}', 'apple'))
  })

  describe('escape', function () {
    it('should escape \' and &', function () {
      return test('{{ "Have you read \'James & the Giant Peach\'?" | escape }}',
        'Have you read &#39;James &amp; the Giant Peach&#39;?')
    })
    it('should escape normal string', function () {
      return test('{{ "Tetsuro Takara" | escape }}', 'Tetsuro Takara')
    })
    it('should escape function', function () {
      return test('{{ func | escape }}', 'function () {}')
    })
  })

  describe('escape_once', function () {
    it('should do escape', () =>
      test('{{ "1 < 2 & 3" | escape_once }}', '1 &lt; 2 &amp; 3'))
    it('should not escape twice',
      () => test('{{ "1 &lt; 2 &amp; 3" | escape_once }}', '1 &lt; 2 &amp; 3'))
  })

  it('should support split/first', function () {
    var src = '{% assign my_array = "apples, oranges, peaches, plums" | split: ", " %}' +
            '{{ my_array | first }}'
    return test(src, 'apples')
  })

  describe('floor', function () {
    it('should return "1" for 1.2', () => test('{{ 1.2 | floor }}', '1'))
    it('should return "2" for 2.0', () => test('{{ 2.0 | floor }}', '2'))
    it('should return "183" for 183.357', () => test('{{ 183.357 | floor }}', '183'))
    it('should return "3" for 3.5', () => test('{{ "3.5" | floor }}', '3'))
  })

  it('should support join', function () {
    var src = '{% assign beatles = "John, Paul, George, Ringo" | split: ", " %}' +
            '{{ beatles | join: " and " }}'
    return test(src, 'John and Paul and George and Ringo')
  })

  it('should support split/last', function () {
    var src = '{% assign my_array = "zebra, octopus, giraffe, tiger" | split: ", " %}' +
            '{{ my_array|last }}'
    return test(src, 'tiger')
  })

  it('should support lstrip', function () {
    var src = '{{ "          So much room for activities!          " | lstrip }}'
    return test(src, 'So much room for activities!          ')
  })

  it('should support map', function () {
    return test('{{posts | map: "category"}}', '["foo","bar"]')
  })

  describe('minus', function () {
    it('should return "2" for 4,2', () => test('{{ 4 | minus: 2 }}', '2'))
    it('should return "12" for 16,4', () => test('{{ 16 | minus: 4 }}', '12'))
    it('should return "171.357" for 183.357,12',
      () => test('{{ 183.357 | minus: 12 }}', '171.357'))
    /* Test for null argument */
    it('should return "24" for 24,null', () => test('{{ 24 | minus: null }}', "24"))
    it('should return "-24" for null, 24', () => test('{{ null | minus: 24 }}', "-24"))
    it('should return "0" for null,null', () => test('{{ null | minus: null }}', "0"))
    it('should support currency minus number', () => {
      const dst = {value: 900, type: "INR"};
      return test('{{ currency_thousand | minus: 100.0 }}', JSON.stringify(dst))
    })
    it('should support currency minus currency', () => {
      const dst = {value: 990, type: "INR"};
      return test('{{ currency_thousand | minus: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency minus currency with decimals', () => {
      const dst = {value: -1.111, type: "USD"};
      return test('{{ currency_decimal | minus: currency_decimal_2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals minus number', () => {
      const dst = {value: 11.456, type: "USD"};
      return test('{{ currency_decimal | minus: 2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals minus number with decimal', () => {
      const dst = {value: 1.156, type: "USD"};
      return test('{{ currency_decimal | minus: 12.3 }}', JSON.stringify(dst))
    })
    // Null variable tests for currency
    it('should support currency handling with one currency variable with value null in middle', () => {
      const dst = {value: 90, type: "INR"};
      return test('{{ currency_hundred | minus: currency_val_null | minus: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null at last', () => {
      const dst = {value: 90, type: "INR"};
      return test('{{ currency_hundred | minus: currency_ten | minus: currency_val_null}}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null and a number', () => {
      const dst = {value: -2, type: "INR"};
      return test('{{ currency_val_null | minus: 2 }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null, a number and another currency', () => {
      const dst = {value: -998, type: "INR"};
      return test('{{ 2 | minus: currency_val_null | minus: currency_thousand}}', JSON.stringify(dst))
    })
    it('should convert first arg as number', () => test('{{ "4" | minus: 1 }}', '3'))
    it('should convert both args as number', () => test('{{ "4" | minus: "1" }}', '3'))
    /* Tests for date minus date */
    it('should return {"type":"days","value":6,"days": 6}', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date | minus: from_date %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} when v is string', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_string | minus: from_date %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} when arg is string', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date | minus: from_date_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} when both are dateString', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_string | minus: from_date_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} for date and formatted-string', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date | minus: from_date_formatted_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} for ISOstring and formatted-string', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_string | minus: from_date_formatted_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} for formatted-string and formatted-string', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_formatted_string | minus: from_date_formatted_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} for formatted-string and date', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_formatted_string | minus: from_date %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    it('should return {"type":"days","value":6,"days": 6} for formatted-string and ISOstring', () => {
      try {
        const dst = {type: "DAYS", value: 60, days: 60};
        return test('{% assign duration = to_date_formatted_string | minus: from_date_string %}{{duration}}', JSON.stringify(dst))
      } catch(e) {
        console.error(e.message)
      }
    })
    /* Tests for date minus duration */
    /* Tests for ISO string */
    it('should minus 3 years to current date when date in string', () => {
      const dst = new Date(moment(new Date()).subtract(3, "years")).toDateString()
      return test('{{ date_string | minus: duration_3_years | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 2 months to current date when date in string', () => {
      const dst = new Date(moment(new Date()).subtract(2, "months")).toDateString()
      return test('{{ date_string | minus: duration_2_months | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 20 days to current date when date in string', () => {
      const dst = new Date(moment(new Date()).subtract(20, "days")).toDateString()
      return test('{{ date_string | minus: duration_20_days | date: "%a %b %d %Y"}}', dst)
    })
    /* Tests for date */
    it('should minus 3 years to current date', () => {
      const dst = new Date(moment(new Date()).subtract(3, "years")).toDateString()
      return test('{{ date | minus: duration_3_years | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 2 months to current date', () => {
      const dst = new Date(moment(new Date()).subtract(2, "months")).toDateString()
      return test('{{ date | minus: duration_2_months | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 20 days to current date', () => {
      const dst = new Date(moment(new Date()).subtract(20, "days")).toDateString()
      return test('{{ date | minus: duration_20_days | date: "%a %b %d %Y"}}', dst)
    })
    /* Tests for formatted strings */
    it('should minus 3 years to current date when date is formatted string', () => {
      const dst = new Date(moment(new Date()).subtract(3, "years")).toDateString()
      return test('{{ formatted_date_string | minus: duration_3_years | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 2 months to current date when date is formatted string', () => {
      const dst = new Date(moment(new Date()).subtract(2, "months")).toDateString()
      return test('{{ formatted_date_string | minus: duration_2_months | date: "%a %b %d %Y"}}', dst)
    })
    it('should subtract 20 days to current date when date is formatted string', () => {
      const dst = new Date(moment(new Date()).subtract(20, "days")).toDateString()
      return test('{{ formatted_date_string | minus: duration_20_days | date: "%a %b %d %Y"}}', dst)
    })
  })

  describe('modulo', function () {
    it('should return "1" for 3,2', () => test('{{ 3 | modulo: 2 }}', '1'))
    it('should return "3" for 24,7', () => test('{{ 24 | modulo: 7 }}', '3'))
    it('should return "3.357" for 183.357,12',
      () => test('{{ 183.357 | modulo: 12 }}', '3.357'))
    it('should convert string', () => test('{{ "24" | modulo: "7" }}', '3'))
  })

  it('should support string_with_newlines', function () {
    var src = '{% capture string_with_newlines %}\n' +
            'Hello\n' +
            'there\n' +
            '{% endcapture %}' +
            '{{ string_with_newlines | newline_to_br }}'
    var dst = '<br />' +
            'Hello<br />' +
            'there<br />'
    return test(src, dst)
  })

  describe('plus', function () {
    it('should return "6" for 4,2', () => test('{{ 4 | plus: 2 }}', '6'))
    it('should return "20" for 16,4', () => test('{{ 16 | plus: 4 }}', '20'))
    it('should return "195.357" for 183.357,12',
      () => test('{{ 183.357 | plus: 12 }}', '195.357'))
    it('should convert first arg as number', () => test('{{ "4" | plus: 2 }}', '6'))
    it('should convert both args as number', () => test('{{ "4" | plus: "2" }}', '6'))
    /* Test for null argument */
    it('should return "24" for 24,null', () => test('{{ 24 | plus: null }}', "24"))
    it('should return "24" for null, 24', () => test('{{ null | plus: 24 }}', "24"))
    it('should return "0" for null,null', () => test('{{ null | plus: null }}', "0"))
    it('should support currency adding number', () => {
      const dst = {value: 1100, type: "INR"};
      return test('{{ currency_thousand | plus: 100.0 }}', JSON.stringify(dst))
    })
    it('should support currency adding currency', () => {
      const dst = {value: 110, type: "INR"};
      return test('{{ currency_hundred | plus: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency adding currency with decimals', () => {
      const dst = {value: 28.023, type: "USD"};
      return test('{{ currency_decimal | plus: currency_decimal_2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals add number', () => {
      const dst = {value: 15.456, type: "USD"};
      return test('{{ currency_decimal | plus: 2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals add number with decimal', () => {
      const dst = {value: 25.756, type: "USD"};
      return test('{{ currency_decimal | plus: 12.3 }}', JSON.stringify(dst))
    })
    // Null variable tests for currency
    it('should support currency handling with one currency variable with value null in middle', () => {
      const dst = {value: 1100, type: "INR"};
      return test('{{ currency_thousand | plus: currency_val_null | plus: currency_hundred }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null at last', () => {
      const dst = {value: 1100, type: "INR"};
      return test('{{ currency_thousand | plus: currency_hundred | plus: currency_val_null}}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null and a number', () => {
      const dst = {value: 2, type: "INR"};
      return test('{{ currency_val_null | plus: 2 }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null, a number and another currency', () => {
      const dst = {value: 1002, type: "INR"};
      return test('{{ 2 | plus: currency_val_null | plus: currency_thousand}}', JSON.stringify(dst))
    })
    /* Tests for date and duration */
    it('should add 10 weeks to current date', () => {
      const dst = new Date(moment(ctx.date).add(10, "weeks")).toDateString()
      return test('{% assign term = date | plus: duration_10_weeks | date: "%a %b %d %Y" %}{{ term }}', dst)
    })
    it('should add 20 days to current date', () => {
      const dst = new Date(moment(new Date()).add(20, "days")).toDateString()
      return test('{% assign term = date | plus: duration_20_days | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should add 20 days to current date when date in string', () => {
      const dst = new Date(moment(new Date()).add(20, "days")).toDateString()
      return test('{% assign term = date_string | plus: duration_20_days | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should return undefined when date is undefined', () => {
      const dst = "null"
      return test('{% assign term = variable_undefined | plus: duration_20_days "%}{{ term }}', dst)
    })
    it('should add 2 months to current date', () => {
      const dst = new Date(moment(new Date()).add(2, "months")).toDateString()
      return test('{% assign term = date | plus: duration_2_months | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should add 2 months to current date when date in string', () => {
      const dst = new Date(moment(new Date()).add(2, "months")).toDateString()
      return test('{% assign term = date_string | plus: duration_2_months | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should add 3 years to current date', () => {
      const dst = new Date(moment(new Date()).add(3, "years")).toDateString()
      return test('{{ date | plus: duration_3_years | date: "%a %b %d %Y"}}', dst)
    })
    it('should add 3 years to current date when date in string', () => {
      const dst = new Date(moment(new Date()).add(3, "years")).toDateString()
      return test('{{ date_string | plus: duration_3_years | date: "%a %b %d %Y"}}', dst)
    })
    /* Tests for duration and duration */
    it('should return {type: "days", value: 80, days: 80};', () => {
      const dst = {type: "DAYS", value: 80, days: 80};
      return test('{{ duration_20_days | plus: duration_2_months }}', JSON.stringify(dst))
    })
    it('should return {type: "days", value: 130, days: 130};', () => {
      const dst = {type: "DAYS", value: 130, days: 130};
      return test('{{ duration_10_weeks | plus: duration_2_months }}', JSON.stringify(dst))
    })
    it('should return current date when duration obj has null values', () => {
      const dst = new Date().toDateString()
      return test('{% assign term = date | plus: duration_val_null | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should return current date when duration is an empty object', () => {
      const dst = new Date().toDateString()
      return test('{% assign term = date | plus: duration_empty_obj | date: "%a %b %d %Y"%}{{ term }}', dst)
    })
    it('should return {type: "DAYS", value: 0, days: 0};', () => {
      const dst = {type: "DAYS", value: 0, days: 0};
      return test('{{ duration_val_null | plus: duration_val_null }}', JSON.stringify(dst))
    })
    it('should return {type: "DAYS", value: 0, days: 0};', () => {
      const dst = {type: "DAYS", value: 0, days: 0};
      return test('{{ duration_2_months | plus: duration_val_null }}', JSON.stringify(dst))
    })
  })

  describe('sumArray', function () {
    // Invalid array
    it('should throw error for invalid array', () => {
      return checkForError('{{ arr_invalid | sumArray }}', 'Input is not an array')
    })

    // Empty array
    it('should return "0" for empty array', () => test('{{ arr_empty | sumArray }}', '0'))
    it('should return default value for empty array', () => test('{{ arr_empty | sumArray: undefined, 10 }}', '10'))

    // Numeric arrays
    it('should return "15" for array [1, 2, 3, 4, 5]', () => test('{{ arr_numbers | sumArray }}', '15'))
    it('should return "11" for array with mixed datatypes [undefined, 1, null, 2, {}, 3, "a", 5, true]', () => test('{{ arr_numbers_with_mixed_datatypes | sumArray }}', '6'))

    // Duration arrays
    it('should return total days for duration array', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 1245, 'days': 1245})
      return test('{{ arr_duration | sumArray: }}', expectedResult)
    })

    it('should handle duration with val_null at last position', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 0, 'days': 0})
      return test('{{ arr_duration_with_val_null_1 | sumArray }}', expectedResult)
    })

    it('should handle duration with val_null at middle position', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 20, 'days': 20})
      return test('{{ arr_duration_with_val_null_2 | sumArray }}', expectedResult)
    })

    it('should handle duration with val_null at first position', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 20, 'days': 20})
      return test('{{ arr_duration_with_val_null_3 | sumArray }}', expectedResult)
    })

    it('should handle duration with number at different positions', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 93, 'days': 93})
      return test('{{ arr_duration_with_number_1 | sumArray }}', expectedResult) &&
            test('{{ arr_duration_with_number_2 | sumArray }}', expectedResult)
    })

    it('should handle duration with null', () => {
      const expectedResult = 'null'
      return test('{{ arr_duration_with_null | sumArray }}', expectedResult)
    })

    // Date with duration
    it('should return date after adding durations to date', () => {
      const expectedResult = new Date(moment(ctx.from_date).add(90, 'days')).toDateString()
      return test(`{% assign result = arr_date_with_duration | sumArray %}{{ result | date: "%a %b %d %Y" }}`, expectedResult)
    })

    it('should handle array with two dates and durations', () => {
      const expectedResult = 'null'
      return test('{{ arr_two_dates | sumArray }}', expectedResult)
    })

    // Currency arrays
    it('should return total value for currency array', () => {
      const expectedResult = JSON.stringify({ value: 1110, type: 'INR' })
      return test('{{ arr_currency | sumArray }}', expectedResult)
    })

    it('should handle currency with decimal values', () => {
      const expectedResult = JSON.stringify({ value: 1028.023, type: 'INR' })
      return test('{{ arr_currency_with_decimal | sumArray }}', expectedResult)
    })

    it('should handle currency with val_null at different positions', () => {
      const expectedResult = JSON.stringify({ value: 110, type: 'INR' })
      return test('{{ arr_currency_with_val_null_1 | sumArray }}', expectedResult) &&
            test('{{ arr_currency_with_val_null_2 | sumArray }}', expectedResult) &&
            test('{{ arr_currency_with_val_null_3 | sumArray }}', expectedResult)
    })

    it('should handle currency with number at different positions', () => {
      const expectedResult = JSON.stringify({ value: 1103, type: 'INR' })
      return test('{{ arr_currency_with_number_1 | sumArray }}', expectedResult) &&
            test('{{ arr_currency_with_number_2 | sumArray }}', expectedResult)
    })

    it('should handle currency with null', () => {
      const expectedResult = 'null'
      return test('{{ arr_currency_with_null | sumArray }}', expectedResult)
    })

    // Dynamic table with numbers
    it('should return total cost for dynamic table with numbers', () => {
      return test('{{ dynamic_table_with_numbers | sumArray: "cost" }}', '600')
    })

    // Dynamic table with null
    it('should handle dynamic table with null', () => {
      return test('{{ dynamic_table_with_null | sumArray: "cost" }}', '300')
    })

    // Dynamic table with empty object
    it('should handle dynamic table with empty object', () => {
      return test('{{ dynamic_table_with_empty | sumArray: "cost" }}', '300')
    })

    // Dynamic table with duration
    it('should return total duration for dynamic table', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 150, 'days': 150})
      return test('{{ dynamic_table_with_duration | sumArray: "time" }}', expectedResult)
    })

    it('should handle dynamic table with duration and val_null', () => {
      const expectedResult = JSON.stringify({'type': 'DAYS', 'value': 0, 'days': 0})
      return test('{{ dynamic_table_with_duration_with_val_null | sumArray: "time" }}', expectedResult)
    })

    // Dynamic table with currency
    it('should return total price for dynamic table', () => {
      const expectedResult = JSON.stringify({ value: 1110, type: 'INR' })
      return test('{{ dynamic_table_with_currency | sumArray: "price" }}', expectedResult)
    })

    it('should handle dynamic table with currency and val_null', () => {
      const expectedResult = JSON.stringify({ value: 1010, type: 'INR' })
      return test('{{ dynamic_table_with_currency_with_val_null | sumArray: "price" }}', expectedResult)
    })

    // Dynamic table with invalid column
    it('should handle dynamic table with invalid column', () => {
      return checkForError('{{ dynamic_table_with_currency | sumArray: 0 }}', 'Invalid key for sumArray filter')
    })
  })

  it('should support prepend', function () {
    return test('{% assign url = "liquidmarkup.com" %}' +
            '{{ "/index.html" | prepend: url }}',
    'liquidmarkup.com/index.html')
  })

  it('should support remove', function () {
    return test('{{ "I strained to see the train through the rain" | remove: "rain" }}',
      'I sted to see the t through the ')
  })

  it('should support remove_first', function () {
    return test('{{ "I strained to see the train through the rain" | remove_first: "rain" }}',
      'I sted to see the train through the rain')
  })

  it('should support replace', function () {
    return test('{{ "Take my protein pills and put my helmet on" | replace: "my", "your" }}',
      'Take your protein pills and put your helmet on')
  })

  it('should support replace_first', function () {
    return test('{% assign my_string = "Take my protein pills and put my helmet on" %}\n' +
            '{{ my_string | replace_first: "my", "your" }}',
    '\nTake your protein pills and put my helmet on')
  })

  it('should support reverse', function () {
    return test('{{ "Ground control to Major Tom." | split: "" | reverse | join: "" }}',
      '.moT rojaM ot lortnoc dnuorG')
  })

  describe('round', function () {
    it('should return "1" for 1.2', () => test('{{1.2|round}}', '1'))
    it('should return "3" for 2.7', () => test('{{2.7|round}}', '3'))
    it('should return "183.36" for 183.357,2',
      () => test('{{183.357|round: 2}}', '183.36'))
    it('should convert string to number', () => test('{{"2.7"|round}}', '3'))
  })

  it('should support rstrip', function () {
    return test('{{ "          So much room for activities!          " | rstrip }}',
      '          So much room for activities!')
  })

  describe('size', function () {
    it('should return string length',
      () => test('{{ "Ground control to Major Tom." | size }}', '28'))
    it('should return array size', function () {
      return test('{% assign my_array = "apples, oranges, peaches, plums"' +
                ' | split: ", " %}{{ my_array | size }}',
      '4')
    })
    it('should also be used with dot notation - string',
      () => test('{% assign my_string = "Ground control to Major Tom." %}{{ my_string.size }}', '28'))
    it('should also be used with dot notation - array',
      () => test('{% assign my_array = "apples, oranges, peaches, plums" | split: ", " %}{{ my_array.size }}', '4'))
  })

  describe('slice', function () {
    it('should slice first char by 0', () => test('{{ "Liquid" | slice: 0 }}', 'L'))
    it('should slice third char by 2', () => test('{{ "Liquid" | slice: 2 }}', 'q'))
    it('should slice substr by 2,5', () => test('{{ "Liquid" | slice: 2, 5 }}', 'quid'))
    it('should slice substr by -3,2', () => test('{{ "Liquid" | slice: -3, 2 }}', 'ui'))
  })

  it('should support sort', function () {
    return test('{% assign my_array = "zebra, octopus, giraffe, Sally Snake"' +
            ' | split: ", " %}' +
            '{{ my_array | sort | join: ", " }}',
    'Sally Snake, giraffe, octopus, zebra')
  })

  it('should support split', function () {
    return test('{% assign beatles = "John, Paul, George, Ringo" | split: ", " %}' +
            '{% for member in beatles %}' +
            '{{ member }} ' +
            '{% endfor %}',
    'John Paul George Ringo ')
  })

  it('should support strip', function () {
    return test('{{ "          So much room for activities!          " | strip }}',
      'So much room for activities!')
  })

  describe('strip_html', function () {
    it('should strip all tags', function () {
      return test('{{ "Have <em>you</em> read <strong>Ulysses</strong>?" | strip_html }}',
        'Have you read Ulysses?')
    })
    it('should strip until empty', function () {
      return test('{{"<br/><br />< p ></p></ p >" | strip_html }}', '')
    })
  })

  it('should support strip_newlines', function () {
    return test('{% capture string_with_newlines %}\n' +
            'Hello\nthere\n{% endcapture %}' +
            '{{ string_with_newlines | strip_newlines }}',
    'Hellothere')
  })

  describe('times', function () {
    it('should return "6" for 3,2', () => test('{{ 3 | times: 2 }}', '6'))
    it('should return "168" for 24,7', () => test('{{ 24 | times: 7 }}', '168'))
    it('should return "2200.284" for 183.357,12',
      () => test('{{ 183.357 | times: 12 }}', '2200.284'))
    it('should convert string to number', () => test('{{ "24" | times: "7" }}', '168'))
    it('should support currency times number', () => {
      const dst = {value: 1000, type: "INR"};
      return test('{{ currency_ten | times: 100.0 }}', JSON.stringify(dst))
    })
    it('should support currency times currency', () => {
      const dst = {value: 1000, type: "INR"};
      return test('{{ currency_hundred | times: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency multiply currency with decimals', () => {
      const dst = {value: 196.014, type: "USD"};
      return test('{{ currency_decimal | times: currency_decimal_2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals multiply number', () => {
      const dst = {value: 26.912, type: "USD"};
      return test('{{ currency_decimal | times: 2 }}', JSON.stringify(dst))
    })
    it('should support currency with decimals multiply number with decimal', () => {
      const dst = {value: 165.509, type: "USD"};
      return test('{{ currency_decimal | times: 12.3 }}', JSON.stringify(dst))
    })
    /* Test for null argument */
    it('should return "0" for 24,variable null', () => test('{{ 24 | times: variable_null }}', "0"))
    it('should return "0" for 24,null', () => test('{{ 24 | times: null }}', "0"))
    it('should return "0" for null, 24', () => test('{{ null | times: 24 }}', "0"))
    it('should return "0" for variable null, 24', () => test('{{ variable_null | times: 24 }}', "0"))
    it('should return "null" for variable_null, variable null', () => test('{{ variable_null | times: variable_null }}', "null"))
    // Null variable tests for currency
    it('should support currency handling with one currency variable with value null in middle', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ currency_hundred | times: currency_val_null | times: currency_ten }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null at last', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ currency_hundred | times: currency_ten | times: currency_val_null}}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null and a number', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ currency_val_null | times: 2 }}', JSON.stringify(dst))
    })
    it('should support currency handling with one currency variable with value null, a number and another currency', () => {
      const dst = {value: 0, type: "INR"};
      return test('{{ 2 | times: currency_val_null | times: currency_thousand}}', JSON.stringify(dst))
    })
  })

  describe("toCurrency", function(){
    const errMessage = "invalid currency value or type";

    it('should return {value: 8000, type: "INR"}"', () => {
      const dst = { value: 8000, type: "INR" };
      return test('{{ 8000 | toCurrency: "INR" }}', JSON.stringify(dst));
    });

    it('should return {value: 100, type: "USD"}', () => {
      const dst = { value: 100, type: "USD" };
      return test('{{ 100 | toCurrency: "USD" }}', JSON.stringify(dst));
    });

    it('should return {value: 150.1, type: "USD"}', () => {
      const dst = { value: 150.1, type: "USD" };
      return test('{{ 150.1 | toCurrency: "USD" }}', JSON.stringify(dst));
    });

    it("should return value and type same as existing variable", () => 
      test(
        "{% assign currVar = currency_thousand.value | toCurrency: currency_thousand.type %}{{currVar}}",
        JSON.stringify(ctx.currency_thousand)
      )
    );

    it("should throw error when assigning value from existing variable with null value", () =>
      checkForError(
        '{% assign currVar = currency_val_null.value  | toCurrency: currency_val_null.type %}{{currVar}}',
         errMessage));

    it("should throw error when currency value is a string", () =>
      checkForError('{{ test | toCurrency: "USD" }}', errMessage));

    it("should throw error when currency value is null", () =>
      checkForError('{{ null | toCurrency: "USD" }}', errMessage));

    it("should throw error when currency value is undefined", () =>
      checkForError('{{ undefined | toCurrency: "USD" }}', errMessage));

    it("should throw error when currency value is NaN", () =>
      checkForError('{{ NaN | toCurrency: "USD" }}', errMessage));

    it("should throw error when currency type is a number", () =>
      checkForError("{{ 100 | toCurrency: 1 }}", errMessage));

    it("should throw error when currency type is a symbol", () =>
      checkForError("{{ 100 | toCurrency: $ }}", errMessage));

    it("should throw error when currency type is null", () =>
      checkForError("{{ 100 | toCurrency: null }}", errMessage));

    it("should throw error when currency type is undefined", () =>
      checkForError("{{ 100 | toCurrency: undefined }}", errMessage));
  });

  describe("toDuration", function(){

    const invalidDurationTypeOrValueErrMsg = "invalid duration value or type";

    it("should return {value: 10, type: 'DAYS', days: 10}", () => {
      const dst = {value: 10, type: 'DAYS', days: 10};
      return test('{{ 10 | toDuration: "Days" }}', JSON.stringify(dst))
    })

    it("should return {value: 7, type: 'weeks', days: 49}", () => {
      const dst = {value: 7, type: 'WEEKS', days: 49};
      return test('{{ 7 | toDuration: "weeks" }}', JSON.stringify(dst))
    })

    it("should return {value: 5, type: 'MONTHS', days: 150}", () => {
      const dst = {value: 5, type: 'MONTHS', days: 150};
      return test('{{ 5 | toDuration: "months" }}', JSON.stringify(dst))
    })

    it("should return {value: 2, type: 'YEARS', days: 730}", () => {
      const dst = {value: 2, type: 'YEARS', days: 730};
      return test('{{ 2 | toDuration: "Years" }}', JSON.stringify(dst))
    })

    it("should return duration value, type as existing variable with days calculated", () => 
      test(
        '{% assign durVar = duration_10_weeks.value | toDuration: duration_10_weeks.type %}{{durVar}}', 
        JSON.stringify(ctx.duration_10_weeks)
      )
    )

    it("should return duration value, type as existing variable with days calculated", () => 
      test(
        '{% assign durVar = duration_3_years.value | toDuration: duration_3_years.type %}{{durVar}}', 
        JSON.stringify(ctx.duration_3_years)
      )
    )

    it("should throw error when duration value is a string", () =>
      checkForError('{{ "test" | toDuration: "days" }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration value is NaN", () =>
      checkForError('{{ NaN | toDuration: "days" }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration value is undefined", () =>
      checkForError('{{ undefined | toDuration: "months" }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration value is null", () =>
      checkForError('{{ null | toDuration: "months" }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration type is not days, weeks, months or years", () =>
      checkForError('{{ 2 | toDuration: duration_fortnight_invalid.type }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration type is a number", () =>
      checkForError('{{ 10 | toDuration: 10 }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration type is null", () =>
      checkForError('{{ 10 | toDuration: null }}', invalidDurationTypeOrValueErrMsg));

    it("should throw error when duration type is undefined", () =>
      checkForError('{{ 10 | toDuration: undefined }}', invalidDurationTypeOrValueErrMsg));
  })

  describe('truncate', function () {
    it('should truncate when string too long', function () {
      return test('{{ "Ground control to Major Tom." | truncate: 20 }}',
        'Ground control to...')
    })
    it('should not truncate when string not long enough', function () {
      return test('{{ "Ground control to Major Tom." | truncate: 80 }}',
        'Ground control to Major Tom.')
    })
    it('should truncate with custom ellipsis', function () {
      return test('{{ "Ground control to Major Tom." | truncate: 25,", and so on" }}',
        'Ground control, and so on')
    })
    it('should truncate with empty custom ellipsis', function () {
      return test('{{ "Ground control to Major Tom." | truncate: 20, "" }}',
        'Ground control to Ma')
    })
    it('should not truncate when short enough', function () {
      return test('{{ "12345" | truncate: 5 }}', '12345')
    })
    it('should default to 16', function () {
      return test('{{ "1234567890abcdefghi" | truncate }}', '1234567890abc...')
    })
  })

  describe('truncatewords', function () {
    it('should truncate when too many words', function () {
      return test('{{ "Ground control to Major Tom." | truncatewords: 3 }}',
        'Ground control to...')
    })
    it('should not truncate when not enough words', function () {
      return test('{{ "Ground control to Major Tom." | truncatewords: 8 }}',
        'Ground control to Major Tom.')
    })
    it('should truncate with custom ellipsis', function () {
      return test('{{ "Ground control to Major Tom." | truncatewords: 3, "--" }}',
        'Ground control to--')
    })
    it('should truncate with empty custom ellipsis', function () {
      return test('{{ "Ground control to Major Tom." | truncatewords: 3, "" }}',
        'Ground control to')
    })
  })

  describe('updateAttribute', function () {
    it('should update currency value ', function () {
      const dst = {value: 1000, type: "EUR"};
      return test('{% assign updatedCurrency = currency_thousand | updateAttribute: "type", "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
    it('should update currency value when value is null ', function () {
      const dst = {value: null, type: "EUR"};
      return test('{% assign updatedCurrency = currency_val_null | updateAttribute: "type", "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
    it('should update currency var is undefined ', function () {
      const dst = {type: "EUR"};
      return test('{% assign updatedCurrency = variable_undefined | updateAttribute: "type", "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
  })

  describe('updateTypeAttribute', function () {
    it('should update currency value ', function () {
      const dst = {value: 1000, type: "EUR"};
      return test('{% assign updatedCurrency = currency_thousand | updateTypeAttribute: "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
    it('should update currency value when value is null ', function () {
      const dst = {value: null, type: "EUR"};
      return test('{% assign updatedCurrency = currency_val_null | updateTypeAttribute: "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
    it('should update currency var is undefined ', function () {
      const dst = {type: "EUR"};
      return test('{% assign updatedCurrency = variable_undefined | updateTypeAttribute: "EUR" %}{{updatedCurrency}}', 
      JSON.stringify(dst))
    })
  })

  describe('uniq', function () {
    it('should uniq string list', function () {
      return test(
        '{% assign my_array = "ants, bugs, bees, bugs, ants" | split: ", " %}' +
        '{{ my_array | uniq | join: ", " }}',
        'ants, bugs, bees'
      )
    })
    it('should uniq falsy value', function () {
      return test('{{"" | uniq | join: ","}}', '')
    })
  })

  it('should support upcase', () => test('{{ "Parker Moore" | upcase }}', 'PARKER MOORE'))

  describe('url_encode', function () {
    it('should encode @',
      () => test('{{ "john@liquid.com" | url_encode }}', 'john%40liquid.com'))
    it('should encode <space>',
      () => test('{{ "Tetsuro Takara" | url_encode }}', 'Tetsuro%20Takara'))
  })

  describe('obj_test', function () {
    liquid.registerFilter('obj_test', function () {
      return Array.prototype.slice.call(arguments).join(',')
    })
    it('should support object', () => test('{{ "a" | obj_test: k1: "v1", k2: "v2" }}', 'a,k1,v1,k2,v2'))
  })
})
