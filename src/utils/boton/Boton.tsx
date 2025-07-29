import * as React from 'react';
import { Link } from 'react-router-dom';
import styles from './Boton.module.scss';

interface BotonProps {
  to?: string; 
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const Boton: React.FC<BotonProps> = ({
  to,
  onClick,
  children,
  className = '',
  style,
  type = 'button',
  disabled = false,
}) => {
  const clases = `${styles.boton} ${className}`.trim();

  if (to) {
    return (
      <Link to={to}>
        <button className={clases} style={style} type={type} disabled={disabled}>
          {children}
        </button>
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={clases}
      style={style}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Boton;
