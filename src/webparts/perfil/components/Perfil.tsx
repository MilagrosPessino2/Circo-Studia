import * as React from 'react';
import type { IPerfilProps } from './IPerfilProps';
import Menu from '../../menu/components/Menu';
import { getSP } from '../../../pnpjsConfig';
import { useEffect, useState } from 'react';
import styles from './Perfil.module.scss';

const PerfilEstudiante: React.FC<IPerfilProps> = ({ context }) => {
  const sp = getSP(context);
  const [nombre, setNombre] = useState<string>('Estudiante');
  const [email, setEmail] = useState<string>('Estudiante');
  const [foto, setFoto] = useState<string>('');

  useEffect(() => {
    const datosPerfil = async (): Promise<void> => {
      try {
        const user = await sp.web.currentUser();
        setNombre(user.Title);
        setEmail(user.Email);

        const imagenSharePoint = `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(user.LoginName)}&size=M`;
        setFoto(imagenSharePoint);
      } catch (error) {
        console.error('Error cargando datos del perfil:', error);
      }
    };

    datosPerfil().catch(console.error);
  }, [context]);

  return (
    <div className={styles.perfilContainer}>
      <Menu />
      <main className={styles.mainContent}>
        <div className={styles.perfilInfo}>
          <img
            src={foto || 'https://static.thenounproject.com/png/5034901-200.png'}
            alt="Foto de perfil"
            className={styles.foto}
          />
          <div className={styles.textos}>
            <div className={styles.nombre}>{nombre}</div>
            <div className={styles.email}>{email}</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerfilEstudiante;
