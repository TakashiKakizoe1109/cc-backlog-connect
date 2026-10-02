import { describe, it, expect } from "vitest";
import { parseCustomFieldsJson, serializeCustomFields, serializeCustomFieldFilters } from "./custom-fields";
import type { BacklogCustomField } from "./types";

const field = (id: number, typeId: number, extra = {}): BacklogCustomField => ({
  id, typeId, name: `Field ${id}`, description: "", required: false, applicableIssueTypes: [], ...extra,
});
const definitions = [
  field(1, 1), field(2, 2), field(3, 3, { min: 0, max: 10 }), field(4, 4),
  ...[5, 6, 7, 8].map(id => field(id, id, { items: [{ id: 11, name: "A" }, { id: 12, name: "B" }], allowInput: id >= 7 })),
];

describe("custom field inputs", () => {
  it("parses JSON without losing zero, empty text, Unicode, or arrays", () => {
    expect(parseCustomFieldsJson('{"1":"","3":0,"6":[11,12]}')).toEqual({ 1: "", 3: 0, 6: [11,12] });
    expect(parseCustomFieldsJson(undefined)).toBeUndefined();
  });
  it.each([true, "", "{", "null", "[]", "1", '"text"'])("rejects missing/malformed/non-object JSON: %s", input => {
    expect(() => parseCustomFieldsJson(input as any)).toThrow(/JSON object/);
  });
  it("serializes all eight types and indexed list selections", () => {
    expect(serializeCustomFields({ 1: "日本語 &=", 2: "a\nb", 3: 0, 4: "2028-02-29", 5: 11, 6: [11,12], 7: { value: [11], otherValue: "other" }, 8: { otherValue: "custom" } }, definitions, 1)).toEqual({
      customField_1: "日本語 &=", customField_2: "a\nb", customField_3: 0, customField_4: "2028-02-29", customField_5: 11,
      "customField_6[0]": 11, "customField_6[1]": 12, "customField_7[0]": 11, customField_7_otherValue: "other", customField_8_otherValue: "custom",
    });
  });
  it.each([
    { apiKey: "oops" }, { "1_otherValue": "oops" }, { "01": "oops" }, { 99: "unknown" }, { 1: true }, { 1: null }, { 1: {} },
    { 3: "1" }, { 3: Infinity }, { 3: -1 }, { 3: 11 }, { 4: "2026-02-29" }, { 4: "2026-13-01" },
    { 5: [11,12] }, { 5: 999 }, { 6: [] }, { 6: ["11"] }, { 6: [11,11] }, { 6: [1.2] },
    { 5: { otherValue: "no" } }, { 7: { otherValue: false } }, { 7: { value: [11], typo: "oops" } },
  ])("rejects invalid values before serialization: %j", input => {
    expect(() => serializeCustomFields(input as any, definitions, 1)).toThrow();
  });
  it("rejects fields inapplicable to the target issue type and required empty text", () => {
    expect(() => serializeCustomFields({ 1: "text" }, [field(1, 1, { applicableIssueTypes: [2] })], 1)).toThrow(/issue type/);
    expect(() => serializeCustomFields({ 1: "" }, [field(1, 1, { required: true })], 1)).toThrow(/required/);
  });
  it("leaves omitted values/defaults to Backlog and accepts empty optional text", () => {
    expect(serializeCustomFields({}, [field(1, 1, { required: true })], 1)).toEqual({});
    expect(serializeCustomFields({ 1: "" }, definitions, 1)).toEqual({ customField_1: "" });
  });
  it("validates date limits and preserves numeric zero bounds", () => {
    expect(() => serializeCustomFields({ 4: "2026-10-01" }, [field(4,4,{min:"2026-10-02T00:00:00Z"})],1)).toThrow(/minimum/);
    expect(serializeCustomFieldFilters({ 3: { min: 0, max: 5 }, 4: { min: "2026-10-02" }, 1: "a&b", 6: [11,12] }, definitions)).toEqual({
      customField_3_min: "0", customField_3_max: "5", customField_4_min: "2026-10-02", customField_1: "a&b", "customField_6[0]": "11", "customField_6[1]": "12",
    });
  });
  it.each([{ 3: { min: 4, max: 1 } }, { 3: {} }, { 3: 4 }, { 4: { min: "2026-02-30" } }, { 1: [11] }, { 6: [] }, { 6: [999] }, { 3: { min: 0, typo: 1 } }])("rejects invalid filters: %j", input => {
    expect(() => serializeCustomFieldFilters(input as any, definitions)).toThrow();
  });
});

it("accepts exact bounds, fractions and valid leap dates; rejects upper date overflow", () => {
  const bounds = [field(3,3,{min:0,max:10}),field(4,4,{min:"2028-02-28T00:00:00Z",max:"2028-03-01T00:00:00Z"})];
  for (const value of [0,2.5,10]) expect(serializeCustomFields({3:value},bounds,1)).toEqual({customField_3:value});
  for (const value of ["2028-02-28","2028-02-29","2028-03-01"]) expect(serializeCustomFields({4:value},bounds,1)).toEqual({customField_4:value});
  expect(() => serializeCustomFields({4:"2028-03-02"},bounds,1)).toThrow(/maximum/);
});
it("rejects unknown future write/filter types without guessing", () => {
  expect(() => serializeCustomFields({1:"x"},[field(1,99)],1)).toThrow(/unsupported/);
  expect(() => serializeCustomFieldFilters({1:"x"},[field(1,99)])).toThrow(/unsupported/);
});
it.each(['{"__proto__":{"polluted":true}}','{"constructor":"x"}','{"9007199254740992":"x"}'])("rejects unsafe keys: %s", raw => {
  expect(() => serializeCustomFields(JSON.parse(raw),definitions,1)).toThrow(/positive integer/);
  expect(({} as any).polluted).toBeUndefined();
});
it("allows list filters on every selection type, including single/radio multiple choices", () => {
  for (const id of [5,6,7,8]) {
    expect(serializeCustomFieldFilters({[id]:[11,12]},definitions)).toEqual({[`customField_${id}[0]`]:"11",[`customField_${id}[1]`]:"12"});
  }
});
it("supports single selection Other and rejects required empty Other", () => {
  expect(serializeCustomFields({8:{value:11,otherValue:"Alternative"}},definitions,1)).toEqual({customField_8:11,customField_8_otherValue:"Alternative"});
  expect(() => serializeCustomFields({8:{otherValue:""}},[field(8,8,{required:true,allowInput:true})],1)).toThrow(/required/);
});
it("accepts one-sided and equal search bounds, rejecting non-finite bounds", () => {
  expect(serializeCustomFieldFilters({3:{max:0},4:{min:"2026-10-02",max:"2026-10-02"}},definitions)).toEqual({customField_3_max:"0",customField_4_min:"2026-10-02",customField_4_max:"2026-10-02"});
  expect(() => serializeCustomFieldFilters({3:{min:NaN}},definitions)).toThrow(/finite/);
  expect(() => serializeCustomFieldFilters({3:{max:Infinity}},definitions)).toThrow(/finite/);
});
