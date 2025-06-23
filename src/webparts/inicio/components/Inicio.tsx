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
    const [coincidencias] = useState([
        { nombre: 'Maria María', materia: 'Tecnología de Redes' },
        { nombre: 'Antonio López', materia: 'Tecnología de Redes' },
        { nombre: 'Sol Vallejos', materia: 'Tecnología de Redes' },
    ])

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
                    <thead style={{ background: '#ddd' }}>
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
                    <h3 style={{ marginBottom: 8 }}>Algunas coincidencias</h3>
                    <p style={{ fontWeight: 'bold' }}>Tecnología de Redes</p>
                    <ul style={{ marginBottom: 16 }}>
                        {coincidencias.map((c, i) => (
                            <li
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <span
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: '#666',
                                    }}
                                />
                                {c.nombre}
                            </li>
                        ))}
                    </ul>
                     <Link to='/coincidencias'>
                                      <button
                        style={{
                            padding: '8px 16px',
                            background: '#bbb',
                            border: 'none',
                            borderRadius: 4,
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
