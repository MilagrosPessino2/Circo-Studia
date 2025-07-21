import * as React from 'react';
import styles from './TablaMaterias.module.scss';

interface IMateria {
  Id: number;
  codMateria: string;
  nombre: string;
}

interface TablaMateriasProps {
  materias: IMateria[];
  condiciones: { [materiaId: number]: string };
  materiasBloqueadas: Set<number>;
  onCondicionChange: (materiaId: number, value: string) => void;
}

const TablaMaterias: React.FC<TablaMateriasProps> = ({
  materias,
  condiciones,
  materiasBloqueadas,
  onCondicionChange
}) => {
  return (
    <table className={styles.tabla}>
      <thead>
        <tr>
          <th>Código</th>
          <th>Materia</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {materias.map((m) => (
          <tr key={m.Id}>
            <td>{m.codMateria}</td>
            <td>{m.nombre}</td>
            <td>
              <select
                value={condiciones[m.Id] || ''}
                onChange={(e) => onCondicionChange(m.Id, e.target.value)}
                disabled={materiasBloqueadas.has(m.Id)}
              >
                <option value=''>-</option>
                <option value='A'>Aprobada</option>
                <option value='R'>Regularizada</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TablaMaterias;
