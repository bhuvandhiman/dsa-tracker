import { ForwardRef, useId } from 'react';
import './Form.css';

export const Select = ForwardRef(function Select({
  label,
  id,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled = false,
  required = false,
  options = [],
  autoFocus = false,
  className = '',
  style,
  ...props
}, ref) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${disabled ? 'form-field--disabled' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className="form-field__select"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        style={style}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="form-field__error" role="alert">{error}</p>}
      {helperText && !error && <p id={helperId} className="form-field__helper">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';