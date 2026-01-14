/**
 * Validated Input Components for Solas
 *
 * Provides real-time validation feedback for form inputs.
 * Uses Zod schemas under the hood for consistency.
 */

import { useState, useCallback } from 'react';
import { getCurrencySymbol } from '../../models/defaults.js';

/**
 * Base validated input component with real-time validation
 */
export const ValidatedInput = ({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  min,
  max,
  step,
  required = false,
  validate,
  helpText,
  error: externalError,
  disabled = false,
  placeholder,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const [internalError, setInternalError] = useState(null);
  const [touched, setTouched] = useState(false);

  // Use external error if provided, otherwise use internal
  const displayError = externalError || (touched ? internalError : null);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;

    // Clear internal error on change
    setInternalError(null);

    // Run custom validation if provided
    if (validate && newValue !== '') {
      const validationResult = validate(newValue);
      if (!validationResult.valid) {
        setInternalError(validationResult.message);
      }
    }

    // Call parent onChange
    if (onChange) {
      onChange(e);
    }
  }, [onChange, validate]);

  const handleBlur = useCallback((e) => {
    setTouched(true);

    const currentValue = e.target.value;

    // Validate on blur
    if (required && !currentValue) {
      setInternalError(`${label} is required`);
    }

    if (type === 'number' && currentValue !== '') {
      const num = parseFloat(currentValue);
      if (isNaN(num)) {
        setInternalError('Must be a valid number');
      } else if (min !== undefined && num < min) {
        setInternalError(`Must be at least ${min}`);
      } else if (max !== undefined && num > max) {
        setInternalError(`Must be at most ${max}`);
      }
    }

    // Run custom validation
    if (validate && currentValue !== '') {
      const validationResult = validate(currentValue);
      if (!validationResult.valid) {
        setInternalError(validationResult.message);
      }
    }

    // Call parent onBlur
    if (onBlur) {
      onBlur(e);
    }
  }, [label, required, type, min, max, validate, onBlur]);

  return (
    <div className={`form-group ${displayError ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required" style={{ color: 'red', marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        className={`form-control ${displayError ? 'error' : ''} ${inputClassName}`}
        aria-label={label}
        aria-invalid={!!displayError}
        aria-describedby={helpText ? `${label}-help` : undefined}
        {...props}
      />

      {helpText && !displayError && (
        <small id={`${label}-help`} className="form-text text-muted" style={{ display: 'block', marginTop: '4px' }}>
          {helpText}
        </small>
      )}

      {displayError && (
        <span className="error-message" style={{ color: 'red', display: 'block', marginTop: '4px', fontSize: '0.875rem' }}>
          {displayError}
        </span>
      )}
    </div>
  );
};

/**
 * Number input with validation constraints
 */
export const NumberInput = ({
  min = 0,
  max,
  step = 1,
  allowNegative = false,
  validate,
  ...props
}) => {
  const numberValidate = useCallback((value) => {
    const num = parseFloat(value);

    if (value === '' || value === '-') {
      return { valid: true }; // Allow empty and partial negative input
    }

    if (isNaN(num)) {
      return { valid: false, message: 'Must be a valid number' };
    }

    if (!allowNegative && num < 0) {
      return { valid: false, message: 'Cannot be negative' };
    }

    if (min !== undefined && num < min) {
      return { valid: false, message: `Minimum value is ${min}` };
    }

    if (max !== undefined && num > max) {
      return { valid: false, message: `Maximum value is ${max}` };
    }

    // Run custom validation if provided
    if (validate) {
      return validate(value);
    }

    return { valid: true };
  }, [min, max, allowNegative, validate]);

  return (
    <ValidatedInput
      type="number"
      min={min}
      max={max}
      step={step}
      validate={numberValidate}
      {...props}
    />
  );
};

/**
 * Percentage input (0-100)
 */
export const PercentageInput = ({
  min = 0,
  max = 100,
  step = 0.1,
  ...props
}) => {
  return (
    <NumberInput
      min={min}
      max={max}
      step={step}
      helpText={props.helpText || 'Enter as percentage (0-100)'}
      {...props}
    />
  );
};

/**
 * Currency input with symbol
 */
export const CurrencyInput = ({
  currency = 'ZAR',
  min = 0,
  max,
  step = 0.01,
  showSymbol = true,
  ...props
}) => {
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="currency-input-wrapper" style={{ position: 'relative' }}>
      {showSymbol && (
        <span
          className="currency-symbol"
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {symbol}
        </span>
      )}
      <NumberInput
        min={min}
        max={max}
        step={step}
        inputClassName={showSymbol ? 'currency-input' : ''}
        style={showSymbol ? { paddingLeft: '32px' } : {}}
        {...props}
      />
    </div>
  );
};

/**
 * Integer input (whole numbers only)
 */
export const IntegerInput = ({
  min = 0,
  max,
  ...props
}) => {
  return (
    <NumberInput
      min={min}
      max={max}
      step={1}
      validate={(value) => {
        const num = parseFloat(value);
        if (value !== '' && !Number.isInteger(num)) {
          return { valid: false, message: 'Must be a whole number' };
        }
        return { valid: true };
      }}
      {...props}
    />
  );
};

/**
 * Age input with reasonable constraints
 */
export const AgeInput = ({
  min = 0,
  max = 120,
  ...props
}) => {
  return (
    <IntegerInput
      min={min}
      max={max}
      helpText={props.helpText || 'Age in years'}
      {...props}
    />
  );
};

/**
 * URL input with validation
 */
export const URLInput = ({
  required = false,
  ...props
}) => {
  const urlValidate = useCallback((value) => {
    if (!value || value === '') {
      return { valid: true }; // Allow empty unless required
    }

    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, message: 'Must be a valid URL (e.g., https://example.com)' };
    }
  }, []);

  return (
    <ValidatedInput
      type="url"
      validate={urlValidate}
      required={required}
      placeholder="https://"
      {...props}
    />
  );
};

/**
 * Text area with character count
 */
export const TextArea = ({
  value,
  onChange,
  maxLength = 1000,
  rows = 3,
  showCount = true,
  label,
  helpText,
  error,
  className = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const charCount = value?.length || 0;
  const isOverLimit = charCount > maxLength;

  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        rows={rows}
        maxLength={maxLength}
        className={`form-control ${error ? 'error' : ''}`}
        aria-label={label}
        aria-invalid={!!error}
        style={{ resize: 'vertical', fontFamily: 'inherit' }}
        {...props}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        {helpText && !error && (
          <small className="form-text text-muted">
            {helpText}
          </small>
        )}
        {error && touched && (
          <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>
            {error}
          </span>
        )}
        {showCount && (
          <small
            className="char-count"
            style={{
              color: isOverLimit ? 'red' : '#666',
              fontSize: '0.875rem',
              marginLeft: 'auto',
            }}
          >
            {charCount} / {maxLength}
          </small>
        )}
      </div>
    </div>
  );
};

/**
 * Select dropdown with validation
 */
export const Select = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
  helpText,
  error,
  disabled = false,
  placeholder = 'Select...',
  className = '',
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const displayError = error || (touched ? internalError : null);

  const handleBlur = () => {
    setTouched(true);
    if (required && !value) {
      setInternalError(`${label} is required`);
    }
  };

  const handleChange = (e) => {
    setInternalError(null);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`form-group ${displayError ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required" style={{ color: 'red', marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <select
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`form-control ${displayError ? 'error' : ''}`}
        aria-label={label}
        aria-invalid={!!displayError}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => {
          // Support both string arrays and {value, label} objects
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>

      {helpText && !displayError && (
        <small className="form-text text-muted" style={{ display: 'block', marginTop: '4px' }}>
          {helpText}
        </small>
      )}

      {displayError && (
        <span className="error-message" style={{ color: 'red', display: 'block', marginTop: '4px', fontSize: '0.875rem' }}>
          {displayError}
        </span>
      )}
    </div>
  );
};

/**
 * Checkbox with label
 */
export const Checkbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  helpText,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group form-check ${className}`}>
      <label className="form-check-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="form-check-input"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          {...props}
        />
        <span>{label}</span>
      </label>

      {helpText && (
        <small className="form-text text-muted" style={{ display: 'block', marginTop: '4px', marginLeft: '24px' }}>
          {helpText}
        </small>
      )}
    </div>
  );
};
