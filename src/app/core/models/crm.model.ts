/**
 * CRM service contracts (crm module) — mirrors the Java DTOs one-for-one.
 * Enum members match the Java enum constants exactly; they travel as strings.
 */

// ------------------------------------------------------------------ enums --

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DECIMAL = 'DECIMAL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PASSWORD = 'PASSWORD',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIME = 'TIME',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  URL = 'URL',
  JSON = 'JSON',
}

export enum FormStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum StageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum AutomationTrigger {
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  /** Fired when a record is moved to a different stage. */
  STAGE_CHANGED = 'STAGE_CHANGED',

  STATUS_CHANGED = 'STATUS_CHANGED',
}

export enum AutomationActionType {
  UPDATE_FIELD = 'UPDATE_FIELD',
  CHANGE_STAGE = 'CHANGE_STAGE',
  ASSIGN_USER = 'ASSIGN_USER',
  /** Email the address held in the record's actionField; subject/message may
      use {fieldKey} placeholders. */
  SEND_EMAIL = 'SEND_EMAIL',
  /** Add a signed amount to a numeric field: "10" adds, "-5" subtracts. */
  ADJUST_FIELD = 'ADJUST_FIELD',
  /** WhatsApp-message the phone held in actionField; the text (stored in
      emailMessage) may use {fieldKey} placeholders. */
  SEND_WHATSAPP = 'SEND_WHATSAPP',
  SEND_DOCUMENT = 'SEND_DOCUMENT',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
}

export enum IntegrationType {
  GENERIC_WEBHOOK = 'GENERIC_WEBHOOK',
  REST_API = 'REST_API',
  WHATSAPP = 'WHATSAPP',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  SHOPIFY = 'SHOPIFY',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
}

export enum IntegrationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

// ------------------------------------------------------------------ forms --

/** FormRequest */
export interface FormRequest {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}

/** FormResponse */
export interface FormResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}

// ----------------------------------------------------------------- fields --

/** FieldRequest */
export interface FieldRequest {
  label: string;
  fieldKey: string;
  fieldType: FieldType;
  required?: boolean;
  uniqueField?: boolean;
  placeholder?: string;
  defaultValue?: string;
  /** Raw JSON string, e.g. {"min":1,"max":10,"pattern":"..."} */
  validationJson?: string;
  /** Raw JSON string for choice fields, e.g. ["New","Won"] */
  optionsJson?: string;
  displayOrder?: number;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  hidden?: boolean;
}

/** FieldResponse */
export interface FieldResponse extends FieldRequest {
  id: number;
  formId: number;
}

/** Parsed `validationJson` — the keys the dynamic renderer understands. */
export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

// ----------------------------------------------------------------- stages --

/** StageRequest */
export interface StageRequest {
  name: string;
  code: string;
  color?: string;
  sequence: number;
  isDefault?: boolean;
  isFinal?: boolean;
  status: StageStatus;
}

/** StageResponse */
export interface StageResponse extends StageRequest {
  id: number;
  formId: number;
}

// ---------------------------------------------------------------- records --

/** RecordRequest — `data` is keyed by FieldResponse.fieldKey. */
export interface RecordRequest {
  data: Record<string, unknown>;
}

/** RecordResponse */
export interface RecordResponse {
  id: string;
  formId: number;
  stageId: number | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** RecordSearchRequest */
export interface RecordSearchRequest {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  /** Global free-text search. */
  search?: string;
  /** Field-keyed filters; a value may be a scalar or a FilterValue object. */
  filters?: Record<string, unknown>;
}

/** FilterValue — the object form accepted inside `filters`. */
export interface FilterValue {
  value?: unknown;
  min?: number;
  max?: number;
  /** yyyy-MM-dd */
  from?: string;
  /** yyyy-MM-dd */
  to?: string;
}

// ------------------------------------------------------------- automation --

/**
 * AutomationRequest — single-table rule: the automation row carries its own
 * trigger scope (triggerStageId) and one inline action.
 */
export interface AutomationRequest {
  name: string;
  description?: string;
  formId: number;
  trigger: AutomationTrigger;
  /** STAGE_CHANGED only: fire when the record lands on this stage (null = any). */
  triggerStageId?: number | null;
  documentId?: number | null;
  channel?: string | null;
  actionType?: AutomationActionType | null;
  /** Action target field; for SEND_EMAIL, the field holding the recipient. */
  actionFieldId?: number | null;
  /** UPDATE_FIELD: new value · CHANGE_STAGE: stage id · ASSIGN_USER: user id ·
      ADJUST_FIELD: signed amount. */
  actionValue?: string | null;
  emailSubject?: string | null;
  emailMessage?: string | null;
}

/** AutomationResponse */
export interface AutomationResponse {
  id: number;
  name: string;
  description?: string;
  formId: number;
  formName?: string;
  trigger: AutomationTrigger;
  active?: boolean;
  triggerStageId?: number | null;
  documentId?: number | null;
  channel?: string | null;
  actionType?: AutomationActionType | null;
  actionFieldId?: number | null;
  actionFieldName?: string | null;
  actionFieldKey?: string | null;
  actionValue?: string | null;
  emailSubject?: string | null;
  emailMessage?: string | null;
}

/** AutomationActionRequest (legacy multi-action chains) */
export interface AutomationActionRequest {
  actionType: AutomationActionType;
  formFieldId?: number | null;
  value?: string;
  emailSubject?: string | null;
  emailMessage?: string | null;
  executionOrder: number;
}

/** AutomationActionResponse — mapper also resolves the referenced field. */
export interface AutomationActionResponse {
  id: number;
  actionType: AutomationActionType;
  formFieldId: number | null;
  fieldName?: string | null;
  fieldKey?: string | null;
  value?: string;
  emailSubject?: string | null;
  emailMessage?: string | null;
  executionOrder: number;
}

/** AutomationConditionRequest */
export interface AutomationConditionRequest {
  formFieldId: number;
  operator: ConditionOperator;
  value: string;
}

/** AutomationConditionResponse */
export interface AutomationConditionResponse {
  id: number;
  formFieldId: number;
  fieldName?: string | null;
  fieldKey?: string | null;
  operator: ConditionOperator;
  value: string;
}

// ------------------------------------------------------------ integration --

/** IntegrationRequest */
export interface IntegrationRequest {
  name: string;
  description?: string;
  formId: number;
  type: IntegrationType;
}

/**
 * IntegrationResponse.
 *
 * `status` starts as PENDING and the backend flips it to ACTIVE the moment
 * field mappings are saved — ingest rejects anything that is not ACTIVE.
 */
export interface IntegrationResponse {
  id: number;
  name: string;
  description?: string;
  type: IntegrationType;
  formId: number;
  formName?: string;
  status: IntegrationStatus;
  integrationKey: string;
  apiKey: string;
  /** Public ingest path, e.g. /api/public/integrations/{integrationKey}. */
  endpoint: string;
}

/** MappingItemRequest */
export interface MappingItemRequest {
  sourceField: string;
  formFieldId: number;
}

/** SaveMappingRequest */
export interface SaveMappingRequest {
  mappings: MappingItemRequest[];
}

/** MappingItemResponse — the stored source key plus its resolved CRM field. */
export interface MappingItemResponse {
  id: number;
  sourceField: string;
  formFieldId: number;
  fieldKey?: string | null;
  fieldLabel?: string | null;
}
