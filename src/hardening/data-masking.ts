/**
 * Data Masking for Trust Boundary
 *
 * Masks sensitive data (PII, financial data) in logs and telemetry
 * to prevent data leakage across the trust boundary.
 *
 * @module hardening/data-masking
 */

// =============================================================================
// SENSITIVE FIELD PATTERNS
// =============================================================================

/**
 * PII field patterns (case-insensitive)
 */
const PII_PATTERNS: readonly RegExp[] = [
  /^(first|last|full)?_?name$/i,
  /^email(_address)?$/i,
  /^phone(_number)?$/i,
  /^mobile(_number)?$/i,
  /^ssn$/i,
  /^social_security(_number)?$/i,
  /^tax_?id$/i,
  /^national_id$/i,
  /^passport(_number)?$/i,
  /^driver_?license$/i,
  /^date_?of_?birth$/i,
  /^dob$/i,
  /^birth_?date$/i,
  /^address(_line)?[_0-9]*$/i,
  /^street(_address)?$/i,
  /^city$/i,
  /^state$/i,
  /^zip(_code)?$/i,
  /^postal(_code)?$/i,
  /^country$/i,
  /^ip_?address$/i,
  /^user_?agent$/i,
  /^employee_?id$/i,
  /^person_?id$/i,
  /^pernr$/i,  // SAP employee number
];

/**
 * Financial field patterns (case-insensitive)
 */
const FINANCIAL_PATTERNS: readonly RegExp[] = [
  /^(credit|debit)_?card(_number)?$/i,
  /^card_?number$/i,
  /^cvv$/i,
  /^cvc$/i,
  /^expir(y|ation)(_date)?$/i,
  /^bank_?account(_number)?$/i,
  /^account_?number$/i,
  /^routing(_number)?$/i,
  /^iban$/i,
  /^swift(_code)?$/i,
  /^bic$/i,
  /^sort_?code$/i,
  /^amount$/i,
  /^balance$/i,
  /^salary$/i,
  /^wage$/i,
  /^payment(_amount)?$/i,
  /^invoice_?total$/i,
  /^dmbtr$/i,  // SAP amount field
];

/**
 * Credential field patterns (case-insensitive)
 */
const CREDENTIAL_PATTERNS: readonly RegExp[] = [
  /^password$/i,
  /^secret$/i,
  /^token$/i,
  /^api_?key$/i,
  /^access_?token$/i,
  /^refresh_?token$/i,
  /^bearer$/i,
  /^auth(orization)?(_header)?$/i,
  /^private_?key$/i,
  /^client_?secret$/i,
];

// =============================================================================
// MASKING FUNCTIONS
// =============================================================================

/**
 * Mask types
 */
export type MaskType = 'pii' | 'financial' | 'credential' | 'none';

/**
 * Masking options
 */
export interface MaskingOptions {
  /** Mask PII fields */
  readonly maskPii?: boolean;
  /** Mask financial fields */
  readonly maskFinancial?: boolean;
  /** Mask credentials */
  readonly maskCredentials?: boolean;
  /** Custom field patterns to mask */
  readonly customPatterns?: readonly RegExp[];
  /** Fields to always preserve (whitelist) */
  readonly preserveFields?: readonly string[];
  /** Replacement string for masked values */
  readonly replacement?: string;
}

const DEFAULT_OPTIONS: MaskingOptions = {
  maskPii: true,
  maskFinancial: true,
  maskCredentials: true,
  replacement: '[REDACTED]',
};

/**
 * Determines the mask type for a field
 */
export function getMaskType(field: string, options: MaskingOptions = DEFAULT_OPTIONS): MaskType {
  // Check preserve list first
  if (options.preserveFields?.some(p => p.toLowerCase() === field.toLowerCase())) {
    return 'none';
  }

  // Check credential patterns (highest priority)
  if (options.maskCredentials !== false) {
    if (CREDENTIAL_PATTERNS.some(p => p.test(field))) {
      return 'credential';
    }
  }

  // Check PII patterns
  if (options.maskPii !== false) {
    if (PII_PATTERNS.some(p => p.test(field))) {
      return 'pii';
    }
  }

  // Check financial patterns
  if (options.maskFinancial !== false) {
    if (FINANCIAL_PATTERNS.some(p => p.test(field))) {
      return 'financial';
    }
  }

  // Check custom patterns
  if (options.customPatterns?.some(p => p.test(field))) {
    return 'pii'; // Default custom to PII category
  }

  return 'none';
}

/**
 * Masks a single value based on its type
 */
function maskValue(value: unknown, maskType: MaskType, replacement: string): unknown {
  if (maskType === 'none' || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // For credentials, completely redact
    if (maskType === 'credential') {
      return replacement;
    }

    // For PII, partially mask if long enough
    if (maskType === 'pii' && value.length > 4) {
      return value.substring(0, 2) + '***' + value.substring(value.length - 2);
    }

    // For financial, show last 4 characters only
    if (maskType === 'financial' && value.length > 4) {
      return '***' + value.substring(value.length - 4);
    }

    return replacement;
  }

  if (typeof value === 'number') {
    // Mask amounts by showing only magnitude
    if (maskType === 'financial') {
      const magnitude = Math.floor(Math.log10(Math.abs(value) || 1));
      return `[~${Math.pow(10, magnitude)}]`;
    }
    return replacement;
  }

  return replacement;
}

/**
 * Recursively masks sensitive fields in an object
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  data: T,
  options: MaskingOptions = DEFAULT_OPTIONS
): T {
  const replacement = options.replacement || '[REDACTED]';

  function maskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const maskType = getMaskType(key, options);

      if (value === null || value === undefined) {
        result[key] = value;
      } else if (Array.isArray(value)) {
        // Recursively mask arrays
        result[key] = value.map(item => {
          if (item !== null && typeof item === 'object') {
            return maskObject(item as Record<string, unknown>);
          }
          return maskValue(item, maskType, replacement);
        });
      } else if (typeof value === 'object') {
        // Recursively mask nested objects
        result[key] = maskObject(value as Record<string, unknown>);
      } else {
        result[key] = maskValue(value, maskType, replacement);
      }
    }

    return result;
  }

  return maskObject(data) as T;
}

/**
 * Creates a masked copy of data for logging
 */
export function maskForLogging<T extends Record<string, unknown>>(data: T): T {
  return maskSensitiveData(data, {
    maskPii: true,
    maskFinancial: true,
    maskCredentials: true,
    replacement: '[MASKED]',
  });
}

/**
 * Creates a masked copy of data for telemetry
 * More aggressive masking than logging
 */
export function maskForTelemetry<T extends Record<string, unknown>>(data: T): T {
  return maskSensitiveData(data, {
    maskPii: true,
    maskFinancial: true,
    maskCredentials: true,
    replacement: '[REDACTED]',
    // Additional patterns for telemetry
    customPatterns: [
      /^(body|payload|data|content)$/i,
      /^(request|response)_?body$/i,
    ],
  });
}

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Detection result for sensitive data
 */
export interface SensitiveDataDetection {
  readonly hasPii: boolean;
  readonly hasFinancial: boolean;
  readonly hasCredentials: boolean;
  readonly detectedFields: {
    readonly pii: readonly string[];
    readonly financial: readonly string[];
    readonly credentials: readonly string[];
  };
}

/**
 * Detects sensitive fields in an object
 */
export function detectSensitiveData(data: Record<string, unknown>): SensitiveDataDetection {
  const piiFields: string[] = [];
  const financialFields: string[] = [];
  const credentialFields: string[] = [];

  function scanObject(obj: Record<string, unknown>, prefix: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const maskType = getMaskType(key);

      switch (maskType) {
        case 'pii':
          piiFields.push(fullKey);
          break;
        case 'financial':
          financialFields.push(fullKey);
          break;
        case 'credential':
          credentialFields.push(fullKey);
          break;
      }

      // Recursively scan nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        scanObject(value as Record<string, unknown>, fullKey);
      }
    }
  }

  scanObject(data);

  return {
    hasPii: piiFields.length > 0,
    hasFinancial: financialFields.length > 0,
    hasCredentials: credentialFields.length > 0,
    detectedFields: {
      pii: piiFields,
      financial: financialFields,
      credentials: credentialFields,
    },
  };
}
