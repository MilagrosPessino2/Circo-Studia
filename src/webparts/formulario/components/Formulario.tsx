import * as React from 'react';
import { useEffect, useState } from 'react';
import { Spinner } from '@fluentui/react';
import { getSP } from '../../../pnpjsConfig';
import type { IFormularioProps } from './IFormularioProps';
import Menu from '../../menu/components/Menu';
import styles from './Formulario.module.scss';

interface IMateria {
  Id: number;
  codMateria: string;
  nombre: string;
}

const Formulario: React.FC<IFormularioProps> = ({ context }) => {
  const sp = getSP(context);
  const [materias, setMaterias] = useState<IMateria[]>([]);
  const [condiciones, setCondiciones] = useState<{ [materiaId: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [materiasAsignadas, setMateriasAsignadas] = useState<Set<number>>(new Set());

  useEffect(() => {
    const cargarMateriasDeCarrera = async () => {
      try {
        const user = await sp.web.currentUser();
        const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id')
          .expand('usuario')();
        const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id);
        if (!estudiante) throw new Error('Estudiante no encontrado');

        const inscripciones = await sp.web.lists
          .getByTitle('Inscripto')
          .items.filter(`idEstudianteId eq ${estudiante.ID}`)
          .select('idCarrera/Id')
          .expand('idCarrera')();

        const idCarrera = inscripciones[0]?.idCarrera?.Id;
        if (!idCarrera) throw new Error('Carrera no encontrada');

        const relaciones = await sp.web.lists
          .getByTitle('MateriaCarrera')
          .items.filter(`codCarrera/Id eq ${idCarrera}`)
          .select('CodMateria/Id', 'CodMateria/codMateria', 'CodMateria/nombre')
          .expand('CodMateria')();

        const todasLasMaterias: IMateria[] = relaciones.map(r => ({
          Id: r.CodMateria.Id,
          codMateria: r.CodMateria.codMateria,
          nombre: r.CodMateria.nombre,
        }));

        // Obtener todas las materias con estado (C, A o R)
        const estados = await sp.web.lists
          .getByTitle('Estado')
          .items
          .filter(`idEstudianteId eq ${estudiante.ID}`)
          .select('codMateria/Id')
          .expand('codMateria')();

        const idsAsignados = new Set(estados.map(e => e.codMateria?.Id));
        setMateriasAsignadas(idsAsignados);

        // Filtrar las que no están en Estado
        const materiasNoAsignadas = todasLasMaterias.filter(m => !idsAsignados.has(m.Id));
        setMaterias(materiasNoAsignadas);
      } catch (err) {
        console.error('Error al cargar materias:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarMateriasDeCarrera().catch(console.error);
  }, [context]);

  const handleCondicionChange = (materiaId: number, value: string) => {
    setCondiciones(prev => ({ ...prev, [materiaId]: value }));
  };

  const guardarCondiciones = async () => {
    try {
      const user = await sp.web.currentUser();
      const estudiantes = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')();
      const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id);
      if (!estudiante) throw new Error('Estudiante no encontrado');

      for (const materia of materias) {
        const condicion = condiciones[materia.Id];
        if (!condicion) continue;

        // Doble chequeo en caso de que la materia haya sido asignada mientras se completaba el formulario
        if (materiasAsignadas.has(materia.Id)) continue;

        await sp.web.lists.getByTitle('Estado').items.add({
          idEstudianteId: estudiante.ID,
          codMateriaId: materia.Id,
          condicion,
        });
      }

      alert('Estados guardados correctamente.');
      window.location.reload(); // recargar para reflejar cambios
    } catch (err) {
      console.error('Error al guardar estados:', err);
      alert('Error al guardar estados.');
    }
  };

  if (loading) return <Spinner label="Cargando materias..." />;

  return (
    <div className={styles.contenedor}>
      <Menu />
      <div className={styles.principal}>
        <h2 className={styles.titulo}>Asignar estado a materias</h2>
        {materias.length === 0 ? (
          <p>No hay materias disponibles para asignar.</p>
        ) : (
          <>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Materia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {materias.map(m => (
                  <tr key={m.Id}>
                    <td>{m.codMateria}</td>
                    <td>{m.nombre}</td>
                    <td>
                      <select
                        value={condiciones[m.Id] || ''}
                        onChange={e => handleCondicionChange(m.Id, e.target.value)}
                      >
                        <option value="">-</option>
                        <option value="C">Cursando</option>
                        <option value="A">Aprobada</option>
                        <option value="R">Regularizada</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className={styles.botonGuardar} onClick={guardarCondiciones}>
              Guardar estados
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Formulario;
