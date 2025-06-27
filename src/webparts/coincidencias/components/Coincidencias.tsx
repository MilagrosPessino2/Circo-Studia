import * as React from 'react';
import { useEffect, useState } from 'react';
import Menu from '../../menu/components/Menu';
import { getSP } from '../../../pnpjsConfig';
import { Spinner } from '@fluentui/react';
import styles from './Coincidencias.module.scss';
import type { ICoincidenciasProps } from './ICoincidenciasProps';
import { useNavigate } from 'react-router-dom';

interface Colega {
  nombre: string;
  fotoUrl: string;
  id: number;
  carreraNombre: string;
}

interface CoincidenciaMateria {
  [materia: string]: Colega[];
}

const Coincidencias: React.FC<ICoincidenciasProps> = ({ context }) => {
  const sp = getSP(context);
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoVista, setModoVista] = useState<'carrera' | 'materia'>('carrera');
  const [coincidenciasMateria, setCoincidenciasMateria] = useState<CoincidenciaMateria>({});
  const [filtroCarreraMateria, setFiltroCarreraMateria] = useState<string>('Tecnicatura en desarrollo web');
  const navigate = useNavigate();

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

  useEffect(() => {
    const cargarCoincidenciasMateria = async () => {
      try {
        const [estudiantes, estados, inscripciones, carreras] = await Promise.all([
          sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name').expand('usuario')(),
          sp.web.lists.getByTitle('Estado').items.select('idEstudiante/ID', 'codMateria/nombre').expand('idEstudiante', 'codMateria')(),
          sp.web.lists.getByTitle('Inscripto').items.select('idEstudiante/ID', 'idCarreraId').expand('idEstudiante')(),
          sp.web.lists.getByTitle('Carrera').items.select('ID', 'nombre')()
        ]);

        const carreraMap = new Map<number, string>();
        for (const c of carreras) {
          carreraMap.set(c.ID, c.nombre);
        }

        const estMap = new Map<number, { nombre: string; fotoUrl: string; carreraNombre: string }>();
        for (const est of estudiantes) {
          const insc = inscripciones.find(i => i.idEstudiante?.ID === est.ID);
          const carreraNombre = carreraMap.get(insc?.idCarreraId || 0) || 'Desconocido';
          estMap.set(est.ID, {
            nombre: est.usuario?.Title || 'Desconocido',
            fotoUrl: `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(est.usuario?.Name || '')}&size=S`,
            carreraNombre
          });
        }

        const agrupadas: CoincidenciaMateria = {};

        for (const estado of estados) {
          const estudianteId = estado.idEstudiante?.ID;
          const materiaNombre = estado.codMateria?.nombre;
          if (!estudianteId || !materiaNombre) continue;

          const estudiante: any= estMap.get(estudianteId);
          if (!estudiante || estudiante.carreraNombre !== filtroCarreraMateria) continue;

          if (!agrupadas[materiaNombre]) agrupadas[materiaNombre] = [];
          agrupadas[materiaNombre].push(estudiante);
        }

        setCoincidenciasMateria(agrupadas);
      } catch (err) {
        console.error(err);
      }
    };

    if (modoVista === 'materia') void cargarCoincidenciasMateria();
  }, [context, modoVista, filtroCarreraMateria]);

  const normalizar = (texto: string) =>
    texto.normalize('NFD').replace(/\u0300-\u036f/g, '').toLowerCase();

  const colegasFiltrados = colegas.filter(c => {
    const nombreUsuarioNormalizado = normalizar(c.nombre).trim();
    const busquedaNormalizada = normalizar(busqueda).trim();
    const carreraNombreNormalizado = normalizar(c.carreraNombre).trim();
    const carreraSeleccionadaNormalizado = normalizar(carreraSeleccionada).trim();

    const coincideBusqueda = nombreUsuarioNormalizado.includes(busquedaNormalizada);
    const coincideCarrera =
      carreraSeleccionadaNormalizado === '' ||
      carreraNombreNormalizado === carreraSeleccionadaNormalizado;

    return coincideBusqueda && coincideCarrera;
  });

  return (
    <div className={styles.container}>
      <Menu />
      <main className={styles.main}>
        <div className={styles.vistaHeader}>
          <button
            className={`${styles.tabButton} ${modoVista === 'carrera' ? styles.activo : ''}`}
            onClick={() => setModoVista('carrera')}
          >
            Coincidencias por carrera
          </button>
          <button
            className={`${styles.tabButton} ${modoVista === 'materia' ? styles.activo : ''}`}
            onClick={() => setModoVista('materia')}
          >
            Coincidencias por materia
          </button>
        </div>

        <h2 className={styles.titulo}>Estudiantes por {modoVista}</h2>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar colegas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button>Buscar</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>

        {modoVista === 'carrera' && (
          <div className={styles.controls}>
            <select
              value={carreraSeleccionada}
              onChange={(e) => setCarreraSeleccionada(e.target.value)}
            >
              <option value="">Todas las carreras</option>
              <option value="Tecnicatura en desarrollo web">Tecnicatura en desarrollo web</option>
              <option value="Ingenieria informatica">Ingeniería informática</option>
            </select>
          </div>
        )}

        {modoVista === 'carrera' && (
          <h3>
            Mostrando estudiantes de {carreraSeleccionada || 'todas las carreras'}
          </h3>
        )}

        {modoVista === 'carrera' ? (
          loading ? (
            <Spinner label="Cargando estudiantes..." />
          ) : colegasFiltrados.length === 0 ? (
            <p className={styles.noCoincidencias}>No hay estudiantes encontrados.</p>
          ) : (
            <ul className={styles.listaColegas}>
              {colegasFiltrados.map((c, idx) => (
                <li key={idx} className={styles.colegaItem}>
                  <img src={c.fotoUrl} alt={`Foto de ${c.nombre}`} />
                  <span>{c.nombre}</span>
                  <button onClick={() => navigate(`/perfilColega/${c.id}`)}>Ver perfil</button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className={styles.controls}>
            <label>Seleccionar carrera:</label>
            <select value={filtroCarreraMateria} onChange={e => setFiltroCarreraMateria(e.target.value)}>
              <option value="Tecnicatura en desarrollo web">Tecnicatura en desarrollo web</option>
              <option value="Ingenieria informatica ">Ingeniería informática</option>
            </select>
            {Object.keys(coincidenciasMateria).length === 0 ? (
              <p className={styles.noCoincidencias}>No hay coincidencias para esta carrera.</p>
            ) : (
              <div className={styles.carreraBloque}>
                <h3 className={styles.carreraTitulo}>{filtroCarreraMateria}</h3>
                {Object.entries(coincidenciasMateria).map(([materia, personas], idx) => (
                  <div key={idx} className={styles.bloqueMateria}>
                    <strong className={styles.nombreMateria}>{materia}</strong>
                    <ul>
                      {personas.map((c, i) => (
                        <li
                          key={i}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
                        >
                          <img
                            src={c.fotoUrl}
                            alt={`Foto de ${c.nombre}`}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span>{c.nombre}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Coincidencias;
