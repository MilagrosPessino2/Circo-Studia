import * as React from 'react';
import styles from './Mensaje.module.scss';

export type TipoMensaje = 'info' | 'exito' | 'error';

export interface IMensajeProps {
  texto: string;
  tipo: TipoMensaje;
  onCerrar?: () => void;
}

const Mensaje: React.FC<IMensajeProps> = ({ texto, tipo, onCerrar }) => {
  return (
    <div className={`${styles.mensaje} ${styles[tipo]}`}>
      <span>{texto}</span>
      {onCerrar && (
        <button className={styles.cerrar} onClick={onCerrar}>
          ×
        </button>
      )}
    </div>
  );
};

export default Mensaje;
