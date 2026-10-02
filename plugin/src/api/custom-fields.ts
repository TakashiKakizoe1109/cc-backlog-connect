import type { BacklogCustomField, CustomFieldValues, CustomFieldFilters } from "./types";

export class CustomFieldInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomFieldInputError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCustomFieldsJson<T = CustomFieldValues>(raw: string | boolean | undefined): T | undefined {
  if (raw === undefined) return undefined;
  let value: unknown;
  try { value = typeof raw === "string" ? JSON.parse(raw) : null; } catch { value = null; }
  if (!isObject(value)) {
    throw new CustomFieldInputError("Custom fields must be a JSON object keyed by field ID.");
  }
  return value as T;
}

export function hasCustomFields(fields: unknown): boolean {
  if (fields === undefined) return false;
  if (!isObject(fields)) throw new CustomFieldInputError("Custom fields must be a JSON object keyed by field ID.");
  for (const id of Object.keys(fields)) {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      throw new CustomFieldInputError("Custom field keys must be positive integer IDs (see project-info custom-fields).");
    }
  }
  return Object.keys(fields).length > 0;
}

function fail(id: string, message: string): never {
  throw new CustomFieldInputError(`Custom field ${id}: ${message}`);
}

function definition(id: string, definitions: BacklogCustomField[]): BacklogCustomField {
  const field = definitions.find(f => f.id === Number(id));
  if (!field) fail(id, "not found in the target project; check project-info custom-fields --refresh.");
  return field;
}

function date(value: unknown, id: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    fail(id, "expected a valid date in YYYY-MM-DD format.");
  }
  return value;
}

function numeric(value: unknown, id: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(id, "expected a finite JSON number.");
  return value;
}

function listIds(value: unknown, field: BacklogCustomField, id: string, multiple: boolean): number[] {
  const values = Array.isArray(value) ? value : [value];
  if ((!multiple && Array.isArray(value)) || values.length === 0 || values.some(v => !Number.isSafeInteger(v) || v <= 0)) {
    fail(id, multiple ? "expected one or more numeric list item IDs; empty arrays are not supported." : "expected one numeric list item ID.");
  }
  if (new Set(values).size !== values.length) fail(id, "duplicate list item IDs are not allowed.");
  if (values.some(v => !field.items?.some(item => item.id === v))) fail(id, "unknown list item ID.");
  return values;
}

function rangeCheck(value: number | string, field: BacklogCustomField, id: string): void {
  const bound = (v: number | string): number | string => field.typeId === 4 ? String(v).slice(0, 10) : Number(v);
  if (field.min != null && value < bound(field.min)) fail(id, "value is below the minimum.");
  if (field.max != null && value > bound(field.max)) fail(id, "value is above the maximum.");
}

/** Backlog's official SDK uses explicit indexes for customField_* arrays. */
export function serializeCustomFields(
  fields: CustomFieldValues,
  definitions: BacklogCustomField[],
  issueTypeId: number,
): Record<string, string | number> {
  hasCustomFields(fields);
  const result: Record<string, string | number> = {};
  for (const [id, input] of Object.entries(fields)) {
    const field = definition(id, definitions);
    if (field.applicableIssueTypes.length && !field.applicableIssueTypes.includes(issueTypeId)) {
      fail(id, "not applicable to the target issue type.");
    }
    const key = `customField_${id}`;
    if (field.typeId === 1 || field.typeId === 2) {
      if (typeof input !== "string") fail(id, "expected a JSON string.");
      if (field.required && input === "") fail(id, "this field is required.");
      result[key] = input;
    } else if (field.typeId === 3 || field.typeId === 4) {
      const value = field.typeId === 3 ? numeric(input, id) : date(input, id);
      rangeCheck(value, field, id);
      result[key] = value;
    } else if ([5, 6, 7, 8].includes(field.typeId)) {
      let value: unknown = input;
      let other: unknown;
      if (isObject(input)) {
        if (Object.keys(input).some(k => k !== "value" && k !== "otherValue")) fail(id, "only value and otherValue are allowed.");
        value = input.value;
        other = input.otherValue;
        if (other === undefined) fail(id, "otherValue is required for object input.");
      }
      if (other !== undefined) {
        if (!field.allowInput || typeof other !== "string") fail(id, "Other input is unavailable or is not a string.");
        if (field.required && value === undefined && other === "") fail(id, "this field is required.");
        result[`${key}_otherValue`] = other;
      }
      if (value !== undefined) {
        const multiple = field.typeId === 6 || field.typeId === 7;
        const values = listIds(value, field, id, multiple);
        if (multiple) values.forEach((v, i) => { result[`${key}[${i}]`] = v; });
        else result[key] = values[0];
      } else if (other === undefined) {
        fail(id, "a list item ID or Other input is required.");
      }
    } else {
      fail(id, `unsupported field type ${field.typeId}.`);
    }
  }
  return result;
}

export function serializeCustomFieldFilters(
  filters: CustomFieldFilters,
  definitions: BacklogCustomField[],
): Record<string, string> {
  hasCustomFields(filters);
  const result: Record<string, string> = {};
  for (const [id, input] of Object.entries(filters)) {
    const field = definition(id, definitions);
    const key = `customField_${id}`;
    if (field.typeId === 1 || field.typeId === 2) {
      if (typeof input !== "string" || input === "") fail(id, "search keyword must be a non-empty string.");
      result[key] = input;
    } else if (field.typeId === 3 || field.typeId === 4) {
      if (!isObject(input) || Object.keys(input).length === 0 || Object.keys(input).some(k => k !== "min" && k !== "max")) {
        fail(id, "expected an object containing min and/or max.");
      }
      const values: { min?: number | string; max?: number | string } = {};
      for (const bound of ["min", "max"] as const) {
        if (Object.hasOwn(input, bound)) {
          values[bound] = field.typeId === 3 ? numeric(input[bound], id) : date(input[bound], id);
          result[`${key}_${bound}`] = String(values[bound]);
        }
      }
      if (values.min !== undefined && values.max !== undefined && values.min > values.max) fail(id, "min must not exceed max.");
    } else if ([5, 6, 7, 8].includes(field.typeId)) {
      if (!Array.isArray(input)) fail(id, "list filters must be arrays of numeric item IDs.");
      listIds(input, field, id, true).forEach((v, i) => { result[`${key}[${i}]`] = String(v); });
    } else {
      fail(id, `unsupported field type ${field.typeId}.`);
    }
  }
  return result;
}
