import './Badge.css';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  style,
  ...props
}) {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} style={style} {...props}>
      {children}
    </span>
  );
}

export function FocusBadge({ tier, profileName, label }) {
  if (!tier) return null;

  const variantMap = {
    high: 'focus-high',
    medium: 'focus-medium',
    lower: 'focus-lower'
  };

  const textMap = {
    high: 'High focus',
    medium: 'Medium focus',
    lower: 'Lower focus'
  };

  return (
    <Badge
      variant={variantMap[tier]}
      size="sm"
      aria-label={`${textMap[tier]} for ${profileName}`}
    >
      {textMap[tier]}
    </Badge>
  );
}

export function DifficultyBadge({ difficulty, size = 'md' }) {
  const variantMap = {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard',
    unknown: 'difficulty-unknown'
  };

  const labelMap = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    unknown: 'Unknown'
  };

  return (
    <Badge
      variant={variantMap[difficulty] || 'difficulty-unknown'}
      size={size}
    >
      {labelMap[difficulty] || 'Unknown'}
    </Badge>
  );
}

export function StatusBadge({ status, size = 'md' }) {
  const variantMap = {
    good: 'status-good',
    warning: 'status-warning',
    error: 'status-error',
    info: 'status-info',
    neutral: 'status-neutral'
  };

  return (
    <Badge variant={variantMap[status] || 'status-neutral'} size={size} />
  );
}