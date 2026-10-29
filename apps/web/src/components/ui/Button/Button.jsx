import { forwardRef } from 'react';
import './Button.css';

export const Button = forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'end',
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  style,
  as: Component = 'button',
  href,
  ...props
}, ref) {
  const isLink = Component === 'a' || href;
  const classNames = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    disabled ? 'btn--disabled' : '',
    loading ? 'btn--loading' : '',
    className
  ].filter(Boolean).join(' ');

  const commonProps = {
    ref: isLink ? undefined : ref,
    className: classNames,
    style,
    disabled: isLink ? undefined : (disabled || loading),
    onClick: isLink ? undefined : onClick,
    ...props
  };

  if (isLink) {
    return (
      <a
        {...commonProps}
        href={href}
        aria-disabled={disabled || loading}
        tabIndex={disabled || loading ? -1 : 0}
        onClick={(e) => { if (disabled || loading) e.preventDefault(); else if (onClick) onClick(e); }}
      >
        {loading && <span className="btn__spinner" aria-hidden="true" />}
        {icon && iconPosition === 'start' && <span className="btn__icon btn__icon--start">{icon}</span>}
        <span className="btn__text">{children}</span>
        {icon && iconPosition === 'end' && <span className="btn__icon btn__icon--end">{icon}</span>}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
      {...props}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {icon && iconPosition === 'start' && <span className="btn__icon btn__icon--start">{icon}</span>}
      <span className="btn__text">{children}</span>
      {icon && iconPosition === 'end' && <span className="btn__icon btn__icon--end">{icon}</span>}
    </button>
  );
});

Button.displayName = 'Button';