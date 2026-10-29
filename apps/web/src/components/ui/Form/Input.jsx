import { ForwardRef, useId } from 'react';
import './Form.css';

export const Input = ForwardRef(function Input({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  disabled = false,
  required = false,
  autoComplete,
  inputMode,
  pattern,
  maxLength,
  minLength,
  autoFocus = false,
  className = '',
  style,
  ...props
}, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${disabled ? 'form-field--disabled' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        pattern={pattern}
        maxLength={maxLength}
        minLength={minLength}
        autoFocus={autoFocus}
        className="form-field__input"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        style={style}
        {...props}
      />
      {error && <p id={errorId} className="form-field__error" role="alert">{error}</p>}
      {helperText && !error && <p id={helperId} className="form-field__helper">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';