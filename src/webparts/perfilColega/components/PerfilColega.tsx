import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSP } from '../../../pnpjsConfig';
import Menu from '../../menu/components/Menu';
import styles from './PerfilColega.module.scss';
import type { IPerfilColegaProps } from './IPerfilColegaProps';

const PerfilColega: React.FC<IPerfilColegaProps> = ({ context }) => {
  const { id } = useParams();
  const sp = getSP(context);

  const [colega, setColega] = useState<any>(null);
  const [materias, setMaterias] = useState<any[]>([]);
  const [Email, setEmail] = useState(false);


  useEffect(() => {
    const cargarPerfil = async () => {
      if (!id) return;

      const estudiante = await sp.web.lists
        .getByTitle('Estudiante')
        .items.getById(Number(id))
        .select('ID', 'usuario/Id', 'usuario/Title', 'usuario/Name', 'usuario/EMail')
        .expand('usuario')();

      const inscripciones = await sp.web.lists
        .getByTitle('Inscripto')
        .items.select('idEstudiante/ID', 'idCarreraId')
        .expand('idEstudiante')();

      const carreraRelacionada = inscripciones.find(
        i => i.idEstudiante?.ID === estudiante.ID
      );

      let carreraNombre = '';
      if (carreraRelacionada) {
        const carrera = await sp.web.lists
          .getByTitle('Carrera')
          .items.getById(carreraRelacionada.idCarreraId)
          .select('nombre')();
        carreraNombre = carrera.nombre;
      }

      
const estado = await sp.web.lists
  .getByTitle('Estado')
  .items
  .select('idEstudiante/ID', 'codMateria/ID', 'codMateria/codMateria', 'codMateria/nombre', 'condicion')
  .expand('idEstudiante', 'codMateria')();

const materiasCursando = estado.filter(e =>
  e.idEstudiante?.ID === estudiante.ID && e.condicion === 'C'
);

// 2. Obtener todas las ofertas
const ofertas = await sp.web.lists
  .getByTitle('OfertaDeMaterias')
  .items
  .select('codMateria/ID', 'codComision/ID', 'codComision/codComision')
  .expand('codMateria', 'codComision')();

// 3. Obtener todas las comisiones
const comisiones = await sp.web.lists
  .getByTitle('Comision')
  .items
  .select('ID', 'codComision', 'descripcion')();

// 4. Construir las materias con su comisión y horario
const materiasFinal = materiasCursando.map(e => {
  const ofertaRelacionada = ofertas.find(o => o.codMateria?.ID === e.codMateria?.ID);
  const comision = comisiones.find(c => c.ID === ofertaRelacionada?.codComision?.ID);

  return {
    nombre: e.codMateria?.nombre,
    comision: comision?.codComision || '-',
    horario: comision?.descripcion || '-'
  };
});

      setColega({ ...estudiante, carreraNombre });
      setMaterias(materiasFinal);
    };

    void cargarPerfil();
  }, [context, id]);

  if (!colega) return <p>Cargando perfil...</p>;

  return (
    <div className={styles.container}>
      <Menu />

      <div className={styles.perfil}>
        <img
          className={styles.foto}
          src={`/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(colega.usuario?.Name)}&size=L`}
          alt="Foto del colega"
        />
        <h2 className={styles.nombre}>{colega.usuario?.Title}</h2>
        <p className={styles.carrera}>{colega.carreraNombre}</p>
        <button className={styles.boton} onClick={() => setEmail(true)}>Contactar</button>

    {Email && (
  <div className={styles.popup}>
    <p>Podés contactar a este usuario por email:</p>
    <strong>{colega.usuario?.EMail}</strong>
    <br />
    <button onClick={() => setEmail(false)}>Cerrar</button>
    </div>
  )}


    {materias.length === 0 ? (
      <p className={styles.sinMaterias}>
        Este usuario no está inscripto a ninguna materia actualmente.
      </p>
    ) : (
      <>
      <h3 className={styles.subtitulo}>Materias cursando actualmente</h3>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Materia</th>
            <th>Comisión</th>
            <th>Horario</th>
          </tr>
        </thead>
        <tbody>
          {materias.map((m, index) => (
            <tr key={index}>
              <td>{m.nombre}</td>
              <td>{m.comision}</td>
              <td>{m.horario}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </>
    )}
      </div>
    </div>
  );
};

export default PerfilColega;
