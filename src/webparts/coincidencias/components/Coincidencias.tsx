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
  carreraNombre: string;
}

const Coincidencias: React.FC<ICoincidenciasProps> = ({ context }) => {
  const sp = getSP(context);
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarColegas = async () => {
      setLoading(true);
      try {
        const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name')
          .expand('usuario')();

        const inscripciones = await sp.web.lists
        .getByTitle('Inscripto')
        .items.select('idEstudiante/ID', 'idCarreraId')
        .expand('idEstudiante')();

    const carrerasMap = new Map<number, string>();

    const colegas: Colega[] = [];

    for (const ins of inscripciones) {
    const estudianteId = ins.idEstudiante?.ID;
    const carreraId = ins.idCarreraId;

    if (!estudianteId || !carreraId) continue;

    const estudiante = estudiantes.find(e => e.ID === estudianteId);
    if (!estudiante) continue;


   let carreraNombre: any = carrerasMap.get(carreraId);

if (!carreraNombre) {
  try {
    const carreraItem = await sp.web.lists
      .getByTitle('Carrera')
      .items
      .getById(carreraId)
      .select('nombre')();

    carreraNombre = carreraItem.nombre || 'desconocido';
    carrerasMap.set(carreraId, carreraNombre); 
  } catch (e) {
    console.error(`Error al obtener carrera con ID ${carreraId}`, e);
    carreraNombre = 'desconocido';
  }
}



  colegas.push({
    nombre: estudiante.usuario?.Title || 'Desconocido',
    fotoUrl: `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(estudiante.usuario?.Name || '')}&size=S`,
    id: estudiante.ID,
    carreraNombre
  });
}


        setColegas(colegas);
      } catch (err) {
        console.error(err);
        setError((err as { message?: string })?.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    cargarColegas().catch(console.error);
  }, [context]);


  const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const colegasFiltrados = colegas.filter(c => {
  const nombreUsuarioNormalizado = normalizar(c.nombre).trim();
  const busquedaNormalizada = normalizar(busqueda).trim();
  const carreraNombreNormalizado = normalizar(c.carreraNombre).trim();
  const carreraSeleccionadaNormalizado = normalizar(carreraSeleccionada).trim();

  const coincideBusqueda = nombreUsuarioNormalizado.includes(busquedaNormalizada);

  const coincideCarrera =
    carreraSeleccionadaNormalizado === '' ||
    carreraNombreNormalizado === carreraSeleccionadaNormalizado;

  console.log({
    carreraSeleccionada,
    carreraNombre: c.carreraNombre,
    coincideCarrera,
    coincideBusqueda
  });

  return coincideBusqueda && coincideCarrera;
});




  return (
    <div className={styles.container}>
      <Menu />
      <main className={styles.main}>
        <h2 className={styles.titulo}>Listado de estudiantes</h2>

        <div className={styles.controls}>
         <select
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
            >
            <option value="">Todas las carreras</option>
            <option value="Tecnicatura en desarrollo web">Tecnicatura en desarrollo web</option>
            <option value="Ingenieria informatica">Ingeniería informática</option>
            </select>


          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Buscar colegas"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button>Buscar</button>
          </div>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <h3>
          Mostrando estudiantes de {carreraSeleccionada || 'todas las carreras'}
        </h3>

        {loading ? (
          <Spinner label="Cargando estudiantes..." />
        ) : colegasFiltrados.length === 0 ? (
          <p className={styles.noCoincidencias}>No hay estudiantes encontrados.</p>
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
