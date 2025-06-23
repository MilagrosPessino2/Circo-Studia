import * as React from 'react';
import type { IPerfilProps } from './IPerfilProps';
import Menu from '../../menu/components/Menu';
import { getSP } from '../../../pnpjsConfig';
import { useEffect, useState } from 'react';

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        minHeight: '100vh',
      }}
    >
      <Menu />
      <main style={{ padding: 32 }}>
        <h1>Perfil</h1>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src={foto || 'https://static.thenounproject.com/png/5034901-200.png'}
            alt="Foto de perfil"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: '2px solid #000',
              objectFit: 'cover',
              marginBottom: 16,
            }}
          />
          <h2>{nombre}</h2>
          <p>{email}</p>
        </div>
      </main>
    </div>
  );
};

export default PerfilEstudiante;
