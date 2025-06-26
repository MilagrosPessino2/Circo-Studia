import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSP } from '../../../pnpjsConfig';
import type { IPerfilColegaProps } from './IPerfilColegaProps';
import Menu from '../../menu/components/Menu';
import styles from './PerfilColega.module.scss';
const PerfilColega: React.FC<IPerfilColegaProps> = ({ context }) => {
  const { id } = useParams();
  const sp = getSP(context);

  const [colega, setColega] = useState<any>(null);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        if (!id) return;

        const estudiante = await sp.web.lists
          .getByTitle('Estudiante')
          .items
          .getById(Number(id))
          .select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name')
          .expand('usuario')();

        setColega(estudiante);
      } catch (err) {
        console.error('Error al cargar perfil del colega', err);
      }
    };

    void cargarPerfil();
  }, [context, id]);

  if (!colega) return <p>Cargando...</p>;

  return (
  
 <div className={styles.container}>
  <Menu />

  <main className={styles.perfil}>
    <h2 className={styles.titulo}>Perfil de {colega.usuario?.Title}</h2>

    <img
      className={styles.foto}
      src={`/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(colega.usuario?.Name)}&size=L`}
      alt="Foto del colega"
    />
  </main>
</div>

  );
};

export default PerfilColega;
