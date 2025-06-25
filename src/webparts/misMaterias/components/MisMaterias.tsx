import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IMisMateriasProps } from './IMisMateriasProps'
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { Link } from 'react-router-dom'
import styles from '../../inicio/components/Inicio.module.scss'

interface IMateria {
    id: number
    codigo: string
    nombre: string
    comision: string
    horario: string
    aula: string
    modalidad: string
    estado: string
}

const MisMaterias: React.FC<IMisMateriasProps> = ({ context }) => {
    const sp = getSP(context)
    const [estadoFiltro, setEstadoFiltro] = useState<'C' | 'A' | 'R'>('C')
    const [loading, setLoading] = useState(true)
    const [materias, setMaterias] = useState<IMateria[]>([])

    useEffect(() => {
        const fetchMaterias = async (): Promise<void> => {
            setLoading(true)
            try {
                const user = await sp.web.currentUser()
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
                        `idEstudianteId eq ${estudiante.ID} and condicion eq '${estadoFiltro}'`
                    )
                    .select(
                        'ID',
                        'codMateria/ID',
                        'codMateria/codMateria',
                        'codMateria/nombre',
                        'condicion'
                    )
                    .expand('codMateria')()

                const oferta = await sp.web.lists
                    .getByTitle('OfertaDeMaterias')
                    .items.select(
                        'codMateria/Id',
                        'codComision/Id',
                        'modalidad'
                    )
                    .expand('codMateria', 'codComision')()

                const comisiones = await sp.web.lists
                    .getByTitle('Comision')
                    .items.select(
                        'codComision',
                        'diaSemana',
                        'turno',
                        'descripcion'
                    )()

                const datos: IMateria[] = estado.map((e) => {
                    const ofertaRelacionada = oferta.find(
                        (o) => o.codMateria?.Id === e.codMateria?.ID
                    )
                    const com = comisiones.find(
                        (c) =>
                            c.codComision === ofertaRelacionada?.codComision?.Id
                    )

                    return {
                        id: e.ID,
                        codigo: e.codMateria?.codMateria,
                        nombre: e.codMateria?.nombre,
                        comision: com?.codComision || '-',
                        horario: com?.descripcion || '-',
                        aula: 'Virtual',
                        modalidad: ofertaRelacionada?.modalidad || '-',
                        estado:
                            estadoFiltro === 'C'
                                ? 'En curso'
                                : estadoFiltro === 'A'
                                ? 'Aprobada'
                                : 'En final',
                    }
                })

                setMaterias(datos)
            } catch (error) {
                console.error('Error cargando materias:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchMaterias().catch(console.error)
    }, [estadoFiltro])

    const eliminarMateria = async (id: number): Promise<void> => {
        try {
            await sp.web.lists.getByTitle('Estado').items.getById(id).recycle()
            setMaterias(materias.filter((m) => m.id !== id))
        } catch (error) {
            console.error('Error eliminando materia:', error)
        }
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

            <div style={{ padding: 24 }}>
                 <h2 className={styles.titulo} >Mis materias</h2> 

                <aside>
                    <div style={{ marginTop: 16 }}>
                        <h3>Filtrar materias</h3>
                        <section>
                            <select
                                className={styles.seleccionar}
                                value={estadoFiltro}
                                onChange={(e) =>
                                    setEstadoFiltro(
                                        e.target.value as 'C' | 'A' | 'R'
                                    )
                                }
                            >
                                <option value='C'>Materias en curso</option>
                                <option value='A'>Materias aprobadas</option>
                                <option value='R'>Materias en final</option>
                            </select>
                        </section>
                    </div>
                </aside>

                <main>

                    {loading ? (
                        <Spinner label='Cargando materias...' />
                    ) : (
                        <table className={styles.tabla}>
                            <thead >
                                <tr>
                                    <th>Código</th>
                                    <th>Materia</th>
                                    <th>Comisión</th>
                                    <th>Horario</th>
                                    <th>Aula</th>
                                    <th>Modalidad</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materias.map((m) => (
                                    <tr key={m.id}>
                                        <td>{m.codigo}</td>
                                        <td>{m.nombre}</td>
                                        <td>{m.comision}</td>
                                        <td>{m.horario}</td>
                                        <td>{m.aula}</td>
                                        <td>{m.modalidad}</td>
                                        <td>{m.estado}</td>
                                        <td>
                                            <button
                                                onClick={() =>
                                                    eliminarMateria(m.id)
                                                }
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 18,
                                                }}
                                                title='Eliminar materia'
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    
                        <Link to='/formulario'>
                            <button className={styles.boton}>Añadir</button>
                                        </Link>
                    
                </main>
            </div>
        </div>
    )
}

export default MisMaterias
