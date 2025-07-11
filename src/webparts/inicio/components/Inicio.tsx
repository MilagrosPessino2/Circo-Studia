import * as React from 'react';
import { useEffect, useState } from 'react';
import { IInicioProps } from './IInicioProps';
import { Spinner } from '@fluentui/react';
import { getSP } from '../../../pnpjsConfig';
import Menu from '../../menu/components/Menu';
import { Link } from 'react-router-dom';
import styles from './Inicio.module.scss';

const InicioEstudiante: React.FC<IInicioProps> = ({ context }) => {
  const sp = getSP(context);
  const [nombre, setNombre] = useState<string>('Estudiante');
  const [horario, setHorario] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [coincidencias, setCoincidencias] = useState<Record<string, { nombre: string; fotoUrl: string }[]>>({});

  useEffect(() => {
    const fetchHorarioEnCurso = async (): Promise<void> => {
      try {
        const user = await sp.web.currentUser();
        setNombre(user.Title);

        const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id')
          .expand('usuario')();

        const estudiante = estudiantes.find((e) => e.usuario?.Id === user.Id);
        if (!estudiante) return;

        const estado = await sp.web.lists
          .getByTitle('Estado')
          .items.filter(`idEstudianteId eq ${estudiante.ID} and condicion eq 'C'`)
          .select('codMateria/ID', 'codMateria/codMateria', 'codMateria/nombre')
          .expand('codMateria')();

        const materiasCursando = estado.map((e) => ({
          id: e.codMateria?.ID,
          cod: e.codMateria?.codMateria,
          nombre: e.codMateria?.nombre,
        }));

        const oferta = await sp.web.lists
          .getByTitle('OfertaDeMaterias')
          .items.select('codMateria/codMateria', 'codMateria/Id', 'codComision/codComision', 'codComision/Id')
          .expand('codMateria', 'codComision')();

        const comisiones = await sp.web.lists
          .getByTitle('Comision')
          .items.select('codComision', 'diaSemana', 'turno')();

        const franjas = ['08:00 a 12 hs', '14:00 a 18 hs', '19:00 a 23 hs'];
        const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const tabla: string[][] = franjas.map((f) => [f, '', '', '', '', '', '']);

        materiasCursando.forEach((m) => {
          const ofertas = oferta.filter((o) => `${o.codMateria?.codMateria}` === `${m.cod}`);

          ofertas.forEach((of) => {
            const com = comisiones.find((c) => c.codComision === of.codComision?.codComision);
            const col = dias.findIndex((d) => d.toLowerCase() === com.diaSemana.toLowerCase());
            const row = com.turno === 'M' ? 0 : com.turno === 'T' ? 1 : com.turno === 'N' ? 2 : -1;

            if (col >= 0 && row >= 0) {
              if (!tabla[row][col + 1]) {
                tabla[row][col + 1] = m.nombre;
              } else {
                tabla[row][col + 1] += ` / ${m.nombre}`;
              }
            }
          });
        });

        setHorario(tabla);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHorarioEnCurso().catch(console.error);
  }, [context]);

  useEffect(() => {
    const cargarCoincidencias = async (): Promise<void> => {
      try {
        const user = await sp.web.currentUser();
        const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name')
          .expand('usuario')();

        const estudianteActual = estudiantes.find((e) => e.usuario?.Id === user.Id);
        if (!estudianteActual) throw new Error('Estudiante no encontrado');

        const misMaterias = await sp.web.lists
          .getByTitle('Estado')
          .items.filter(`idEstudianteId eq ${estudianteActual.ID} and condicion eq 'C'`)
          .select('codMateria/Id', 'codMateria/nombre')
          .expand('codMateria')();

        const coincidenciasPorMateria: Record<string, { nombre: string; fotoUrl: string }[]> = {};
        const yaAgregado = new Set<string>();

        for (const m of misMaterias) {
          const materiaId = m.codMateria?.Id;
          const nombreMateria = m.codMateria?.nombre;

          const coincidencias = await sp.web.lists
            .getByTitle('Estado')
            .items.filter(
              `codMateriaId eq ${materiaId} and condicion eq 'C' and idEstudianteId ne ${estudianteActual.ID}`
            )
            .select('idEstudiante/ID')
            .expand('idEstudiante')();

          for (const c of coincidencias) {
            const est = estudiantes.find((e) => e.ID === c.idEstudiante?.ID);
            const name = est?.usuario?.Name;
            if (!name || yaAgregado.has(name)) continue;
            yaAgregado.add(name);
            if (!coincidenciasPorMateria[nombreMateria]) {
              coincidenciasPorMateria[nombreMateria] = [];
            }
            coincidenciasPorMateria[nombreMateria].push({
              nombre: est?.usuario?.Title || 'Desconocido',
              fotoUrl: `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(name)}&size=S`,
            });
          }
        }

        setCoincidencias(coincidenciasPorMateria);
      } catch (err) {
        console.error('Error al cargar coincidencias:', err);
      }
    };

    cargarCoincidencias().catch(console.error);
  }, []);

  if (loading) {
    return <Spinner label="Cargando datos..." />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
      <Menu context={context} />
      <main style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className={styles.titulo}>Bienvenido {nombre}, actualmente estás cursando</h2>
          <div />
        </div>

        <div className={styles.tablaWrapper}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Horario</th>
                <th>Lunes</th>
                <th>Martes</th>
                <th>Miércoles</th>
                <th>Jueves</th>
                <th>Viernes</th>
                <th>Sábado</th>
              </tr>
            </thead>
            <tbody>
              {horario.map((fila, i) => (
                <tr key={i}>
                  {fila.map((celda, j) => (
                    <td key={j} style={{ border: '1px solid #ccc', padding: 8 }}>{celda}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section>
          <h3 className={styles.tituloCoincidencias}>Algunas Coincidencias:</h3>
          {(() => {
            const primeraCoincidencia = Object.entries(coincidencias).find(([, personas]) => personas.length > 0);
            if (!primeraCoincidencia) {
              return <p className={styles.noCoincidencias}>No hay coincidencias.</p>;
            }

            const [materia, personas] = primeraCoincidencia;

            return (
              <div className={styles.listaCoincidencias}>
                <div className={styles.bloqueMateria}>
                  <strong className={styles.nombreMateria}>{materia}</strong>
                  <ul>
                    {personas.map((coincidente, i) => (
                      <li
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
                      >
                        <img
                          src={coincidente.fotoUrl || 'https://static.thenounproject.com/png/5034901-200.png'}
                          alt={`Foto de ${coincidente.nombre}`}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span>{coincidente.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}

          <Link to="/coincidencias">
            <button className={styles.boton}>Ver coincidencias</button>
          </Link>
        </section>
      </main>
    </div>
  );
};

export default InicioEstudiante;
