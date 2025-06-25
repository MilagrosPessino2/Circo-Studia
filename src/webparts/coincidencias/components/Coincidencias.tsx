import * as React from 'react';
import { useEffect, useState } from 'react';
import Menu from '../../menu/components/Menu';
import { getSP } from '../../../pnpjsConfig';
import { Spinner } from '@fluentui/react';
import styles from './Coincidencias.module.scss';
import type { ICoincidenciasProps } from './ICoincidenciasProps';

interface Colega {
  nombre: string;
  fotoUrl: string;
  id: number;
}

const Coincidencias: React.FC<ICoincidenciasProps> = ({ context }) => {
  const sp = getSP(context);
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('Tecnicatura en desarrollo web');
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarCoincidencias = async () => {
      setLoading(true);
      try {
        const user = await sp.web.currentUser();
        const estudiantes = await sp.web.lists.getByTitle('Estudiante').items
          .select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name')
          .expand('usuario')();

        const yo = estudiantes.find(e => e.usuario?.Id === user.Id);
        if (!yo) throw new Error('Estudiante no encontrado');

        const estado = await sp.web.lists.getByTitle('Estado').items
          .filter(`idEstudianteId eq ${yo.ID} and condicion eq 'C'`)
          .select('codMateria/ID')
          .expand('codMateria')();

        const misMaterias = estado.map(e => e.codMateria?.ID);
        const coincidencias: Colega[] = [];

        for (const materiaID of misMaterias) {
          const estudiantesCoinciden = await sp.web.lists.getByTitle('Estado').items
            .filter(`codMateriaId eq ${materiaID} and condicion eq 'C' and idEstudianteId ne ${yo.ID}`)
            .select('idEstudiante/ID')
            .expand('idEstudiante')();

          for (const coinc of estudiantesCoinciden) {
            const colega = estudiantes.find(e => e.ID === coinc.idEstudiante?.ID);
            if (!colega) continue;
            if (!coincidencias.some(c => c.nombre === colega.usuario?.Title)) {
              coincidencias.push({
                nombre: colega.usuario?.Title || 'Desconocido',
                fotoUrl: `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(colega.usuario?.Name || '')}&size=S`,
                id: colega.ID,
              });
            }
          }
        }

        setColegas(coincidencias);
      } catch (err) {
        console.error(err);
        setError((err as { message?: string })?.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarCoincidencias().catch(console.error);
  }, [context]);

  const colegasFiltrados = colegas.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <Menu />
      <main className={styles.main}>
        <h2 className={styles.titulo}>Coincidencias</h2>
        <div className={styles.controls}>
          <select
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
          >
            <option value="Tecnicatura en desarrollo web">Tecnicatura en desarrollo web</option>
            <option value="Ingeniería Informática">Ingeniería Informática</option>
          </select>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Buscar materias / colegas"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button>Buscar</button>
          </div>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

         <h3>Colegas que cursan la {carreraSeleccionada}</h3>
         
        {loading ? (
          <Spinner label='Buscando coincidencias...' />
        ) : colegasFiltrados.length === 0 ? (
          <p className={styles.noCoincidencias}>No hay coincidencias.</p>
        ) : (
          <ul className={styles.listaColegas}>
            {colegasFiltrados.map((c, idx) => (
              <li key={idx} className={styles.colegaItem}>
                <img src={c.fotoUrl} alt={`Foto de ${c.nombre}`} />
                <span>{c.nombre}</span>
                <button>Ver perfil</button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Coincidencias;
