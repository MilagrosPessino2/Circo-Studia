import * as React from 'react'
import { useEffect, useState } from 'react'
import { IInicioProps } from './IInicioProps'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import Menu from '../../menu/components/Menu'
import { Link } from 'react-router-dom'




const InicioEstudiante: React.FC<IInicioProps> = ({ context }) => {
    const sp = getSP(context)
    const [nombre, setNombre] = useState<string>('Estudiante')
    const [horario, setHorario] = useState<string[][]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [coincidencias, setCoincidencias] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const fetchHorarioEnCurso = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                setNombre(user.Title)

                const estudiantes = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id')
                    .expand('usuario')()

                const estudiante = estudiantes.find(
                    (e) => e.usuario?.Id === user.Id
                )
                if (!estudiante) return

                const estado = await sp.web.lists
                    .getByTitle('Estado')
                    .items.filter(
                        `idEstudianteId eq ${estudiante.ID} and condicion eq 'C'`
                    )
                    .select(
                        'codMateria/ID',
                        'codMateria/codMateria',
                        'codMateria/nombre'
                    )
                    .expand('codMateria')()

                const materiasCursando = estado.map((e) => ({
                    id: e.codMateria?.ID,
                    cod: e.codMateria?.codMateria,
                    nombre: e.codMateria?.nombre,
                }))

                const oferta = await sp.web.lists
                    .getByTitle('OfertaDeMaterias')
                    .items.select(
                        'codMateria/codMateria',
                        'codMateria/Id',
                        'codComision/codComision',
                        'codComision/Id'
                    )
                    .expand('codMateria', 'codComision')()

                const comisiones = await sp.web.lists
                    .getByTitle('Comision')
                    .items.select('codComision', 'diaSemana', 'turno')()

                const franjas = [
                    '08:00 a 12 hs',
                    '14:00 a 18 hs',
                    '19:00 a 23 hs',
                ]
                const dias = [
                    'Lunes',
                    'Martes',
                    'Miercoles',
                    'Jueves',
                    'Viernes',
                    'Sabado',
                ]
                const tabla: string[][] = franjas.map((f) => [
                    f,
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                ])

                materiasCursando.forEach((m) => {
                    const ofertas = oferta.filter(
                        (o) => `${o.codMateria?.codMateria}` === `${m.cod}`
                    )

                    ofertas.forEach((of) => {
                        const com = comisiones.find(
                            (c) => c.codComision === of.codComision?.codComision
                        )
                        const col = dias.findIndex(
                            (d) =>
                                d.toLowerCase() === com.diaSemana.toLowerCase()
                        )
                        const row =
                            com.turno === 'M'
                                ? 0
                                : com.turno === 'T'
                                ? 1
                                : com.turno === 'N'
                                ? 2
                                : -1

                        if (col >= 0 && row >= 0) {
                            if (!tabla[row][col + 1]) {
                                tabla[row][col + 1] = m.nombre
                            } else {
                                tabla[row][col + 1] += ` / ${m.nombre}`
                            }
                        }
                    })
                })

                setHorario(tabla)
            } catch (error) {
                console.error('Error cargando datos:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchHorarioEnCurso().catch(console.error)
    }, [context])

    

useEffect(() => {
  const cargarCoincidencias = async (): Promise<void> => {
    try {
      const user = await sp.web.currentUser();
      const estudiantes = await sp.web.lists
        .getByTitle('Estudiante')
        .items.select('ID', 'usuario/Id', 'usuario/Title')
        .expand('usuario')();
      const estudianteActual = estudiantes.find(e => e.usuario?.Id === user.Id);
      if (!estudianteActual) throw new Error('Estudiante no encontrado');

      // Obtener materias en curso del usuario actual
      const misMaterias = await sp.web.lists
        .getByTitle('Estado')
        .items
        .filter(`idEstudianteId eq ${estudianteActual.ID} and condicion eq 'C'`)
        .select('codMateria/Id', 'codMateria/nombre')
        .expand('codMateria')();

        console.log('Mis materias:', misMaterias);

      const coincidenciasPorMateria: Record<string, string[]> = {};

      for (const m of misMaterias) {
        const materiaId = m.codMateria?.Id;
        const nombreMateria = m.codMateria?.nombre;

        // Buscar otros estudiantes cursando la misma materia
        const coincidencias = await sp.web.lists
        .getByTitle('Estado')
        .items
        .filter(`codMateriaId eq ${materiaId} and condicion eq 'C' and idEstudianteId ne ${estudianteActual.ID}`)
        .select('idEstudiante/ID') 
        .expand('idEstudiante')();

                       

        console.log(`Coincidencias para ${nombreMateria}:`, coincidencias);

        const nombres = coincidencias.map(c => {
        const est = estudiantes.find(e => e.ID === c.idEstudiante?.ID);
        return est?.usuario?.Title || 'Desconocido';
        }).filter(Boolean);



        console.log(`Nombres:`, nombres);
        console.log(`Nombres encontrados para ${nombreMateria}:`, nombres);

        if (nombres.length > 0) {
          coincidenciasPorMateria[nombreMateria] = nombres;
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
        return <Spinner label='Cargando datos...' />
    }


    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu />

            <main style={{ padding: 24 }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 24,
                    }}
                >
                    <h2>Bienvenido {nombre}, actualmente estás cursando</h2>
                    <div/>
                </div>

                <table
                    style={{
                        width: '100%',
                        border: '1px solid #aaa',
                        textAlign: 'center',
                        marginBottom: 40,
                    }}
                >
                    <thead style={{ background: '#1fb286' }}>
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
                                    <td
                                        key={j}
                                        style={{
                                            border: '1px solid #ccc',
                                            padding: 8,
                                        }}
                                    >
                                        {celda}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

               
                <section>
            <h3> Algunas Coincidencias:</h3>
            {Object.entries(coincidencias).length === 0 && <p>No hay coincidencias.</p>}
            {Object.entries(coincidencias).map(([materia, nombres], idx) => (
                <div key={idx}>
                <strong>{materia}</strong>
                <ul>
                    {nombres.map((nombre, i) => (
                    <li key={i}>{nombre}</li>
                    ))}
                </ul>
                </div>
            ))}


            <Link to="/coincidencias">
                <button
                style={{
                    padding: '8px 16px',
                    background: '#009266',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                }}
                >
                Ver coincidencias
                </button>
            </Link>
                </section>

            </main>
        </div>
    )
}

export default InicioEstudiante
