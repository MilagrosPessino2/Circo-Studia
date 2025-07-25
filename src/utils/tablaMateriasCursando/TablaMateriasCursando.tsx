import * as React from 'react';
import styles from '../tablaMaterias/TablaMaterias.module.scss';

interface IComision {
  id: number;
  nombre: string;
  horario: string;
}

interface IMateriaEnCurso {
  Id: number;
  codMateria: string;
  nombre: string;
  comisiones: IComision[];
}

interface TablaMateriasEnCursoProps {
  materias: IMateriaEnCurso[];
  comisionesSeleccionadas: { [materiaId: number]: number }; 
  materiasBloqueadas: Set<number>;
  onComisionChange: (materiaId: number, comisionId: number) => void;
}

const TablaMateriasEnCurso: React.FC<TablaMateriasEnCursoProps> = ({
  materias,
  comisionesSeleccionadas,
  materiasBloqueadas,
  onComisionChange
}) => {
  return (
    <table className={styles.tabla}>
      <thead>
        <tr>
          <th>Código</th>
          <th>Materia</th>
          <th>Comisión</th>
          <th>Horario</th>
        </tr>
      </thead>
      <tbody>
        {materias.map((m) => {
          const comisionSeleccionada = m.comisiones.find(
            (c) => c.id === comisionesSeleccionadas[m.Id]
          );

          return (
            <tr key={m.Id}>
              <td>{m.codMateria}</td>
              <td>{m.nombre}</td>
              <td>
                <select
                  value={comisionesSeleccionadas[m.Id] || ''}
                  onChange={(e) =>
                    onComisionChange(m.Id, parseInt(e.target.value))
                  }
                  disabled={materiasBloqueadas.has(m.Id)}
                >
                  <option value="">Seleccionar comisión</option>
                  {m.comisiones.map((com) => (
                    <option key={com.id} value={com.id}>
                        {com.nombre}: {com.horario}
                        </option>

                  ))}
                </select>
              </td>
              <td>{comisionSeleccionada?.horario || '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default TablaMateriasEnCurso;
