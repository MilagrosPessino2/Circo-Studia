import * as React from 'react'
import { useEffect, useState } from 'react'
import Menu from '../../menu/components/Menu'
import { getSP } from '../../../pnpjsConfig'
import type { ICoincidenciasProps } from './ICoincidenciasProps'
import { Spinner } from '@fluentui/react'

interface ICoincidencia {
    materia: string
    codMateria: string
    usuarios: string[]
}

interface IEstadoItem {
    idEstudiante?: { ID: number }
    codMateria?: {
        ID: number
        codMateria: string
        nombre: string
    }
    condicion: string
}

interface IEstudianteItem {
    ID: number
    usuario?: {
        Title?: string
        Id: number
    }
}

const Coincidencias: React.FC<ICoincidenciasProps> = ({ context }) => {
    const sp = getSP(context)
    const [coincidencias, setCoincidencias] = useState<ICoincidencia[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const cargarCoincidencias = async (): Promise<void> => {
            setLoading(true)
            try {
                const currentUser = await sp.web.currentUser()

                const estudiantes: IEstudianteItem[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Title', 'usuario/Id')
                    .expand('usuario')()

                const yo = estudiantes.find(
                    (e) => e.usuario?.Id === currentUser.Id
                )
                if (!yo) throw new Error('Estudiante no encontrado')

                const estadoTodos: IEstadoItem[] = await sp.web.lists
                    .getByTitle('Estado')
                    .items.select(
                        'idEstudiante/ID',
                        'codMateria/ID',
                        'codMateria/codMateria',
                        'codMateria/nombre',
                        'condicion'
                    )
                    .expand('idEstudiante', 'codMateria')()

                const estadoActual = estadoTodos.filter(
                    (e) => e.idEstudiante?.ID === yo.ID && e.condicion === 'C'
                )

                const coincidenciasPorMateria: ICoincidencia[] = estadoActual
                    .map((miEstado) => {
                        const usuariosCoincidentes = estadoTodos
                            .filter(
                                (e) =>
                                    e.codMateria?.ID ===
                                        miEstado.codMateria?.ID &&
                                    e.condicion === 'C' &&
                                    e.idEstudiante?.ID !== yo.ID
                            )
                            .map((e) => {
                                const est = estudiantes.find(
                                    (est) => est.ID === e.idEstudiante?.ID
                                )
                                return est?.usuario?.Title || 'Desconocido'
                            })

                        return {
                            materia:
                                miEstado.codMateria?.nombre ||
                                'Materia sin nombre',
                            codMateria: miEstado.codMateria?.codMateria || '',
                            usuarios: usuariosCoincidentes,
                        }
                    })
                    .filter((c) => c.usuarios.length > 0)

                setCoincidencias(coincidenciasPorMateria)
            } catch (err) {
                console.error(err)
                setError(
                    (err as { message?: string })?.message ||
                        'Error desconocido'
                )
            } finally {
                setLoading(false)
            }
        }

        cargarCoincidencias().catch(console.error)
    }, [context])

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
                <h1>Coincidencias</h1>

                {error && <p style={{ color: 'red' }}>{error}</p>}

                {loading ? (
                    <Spinner label='Buscando coincidencias...' />
                ) : coincidencias.length === 0 ? (
                    <p>No se encontraron coincidencias.</p>
                ) : (
                    <ul>
                        {coincidencias.map((c, i) => (
                            <li key={i} style={{ marginBottom: 16 }}>
                                <strong>
                                    {c.codMateria} - {c.materia}
                                </strong>
                                <ul>
                                    {c.usuarios.map((nombre, j) => (
                                        <li key={j}>{nombre}</li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    )
}

export default Coincidencias
