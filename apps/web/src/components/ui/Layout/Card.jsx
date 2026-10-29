import './Card.css';

export function Card({
  children,
  className = '',
  style,
  padded = true,
  bordered = true,
  hover = false,
  elevated = false,
  radius = 'card',
  ...props
}) {
  const classNames = [
    'card',
    padded ? 'card--padded' : '',
    bordered ? 'card--bordered' : '',
    hover ? 'card--hover' : '',
    elevated ? 'card--elevated' : '',
    `card--radius-${radius}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <article className={classNames} style={style} {...props}>
      {children}
    </article>
  );
}

export function CardHeader({
  children,
  className = '',
  style,
  action,
  ...props
}) {
  return (
    <header className={`card__header ${className}`} style={style} {...props}>
      <div className="card__header-content">{children}</div>
      {action && <div className="card__header-action">{action}</div>}
    </header>
  );
}

export function CardContent({
  children,
  className = '',
  style,
  ...props
}) {
  return (
    <div className={`card__content ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  style,
  align = 'end',
  ...props
}) {
  return (
    <footer className={`card__footer card__footer--${align} ${className}`} style={style} {...props}>
      {children}
    </footer>
  );
}