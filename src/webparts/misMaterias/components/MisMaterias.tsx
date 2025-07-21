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
    estado: string
    bloqueada: boolean
}

const MisMaterias: React.FC<IMisMateriasProps> = ({ context }) => {
    const sp = getSP(context)
    const [modoVista, setModoVista] = useState<'curso' | 'historial'>('curso')
    const [loading, setLoading] = useState(true)
    const [materias, setMaterias] = useState<IMateria[]>([])
    const [correlativasInversas, setCorrelativasInversas] = useState<
        Record<number, number[]>
    >({})

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

            const aprobadas = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and condicion eq 'A'`
                )
                .select('codMateria/ID')
                .expand('codMateria')()

            const idsAprobadas = aprobadas.map((m) => m.codMateria.ID)

            const correlativas = await sp.web.lists
                .getByTitle('Correlativa')
                .items.select('codMateria/ID', 'codMateriaRequerida/ID')
                .expand('codMateria', 'codMateriaRequerida')()

            const mapaCorrelativas: Record<number, number[]> = {}
            const inverso: Record<number, number[]> = {}
            correlativas.forEach((item) => {
                const materiaID = item.codMateria?.ID
                const correlativaID = item.codMateriaRequerida?.ID
                if (materiaID && correlativaID) {
                    if (!mapaCorrelativas[materiaID])
                        mapaCorrelativas[materiaID] = []
                    mapaCorrelativas[materiaID].push(correlativaID)

                    if (!inverso[correlativaID]) inverso[correlativaID] = []
                    inverso[correlativaID].push(materiaID)
                }
            })
            setCorrelativasInversas(inverso)

            const estadoQuery =
                modoVista === 'curso'
                    ? `condicion eq 'C'`
                    : `(condicion eq 'A' or condicion eq 'R')`

            const estado = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and ${estadoQuery}`
                )
                .select(
                    'ID',
                    'codMateria/ID',
                    'codMateria/codMateria',
                    'codMateria/nombre',
                    'condicion'
                )
                .expand('codMateria')()

            const idsBloqueadas = new Set<number>()
            for (const [materiaID, correlativas] of Object.entries(
                mapaCorrelativas
            )) {
                const id = parseInt(materiaID)
                if (idsAprobadas.includes(id)) {
                    correlativas.forEach((c) => idsBloqueadas.add(c))
                }
            }

            const oferta = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.select('codMateria/Id', 'codComision/Id', 'modalidad')
                .expand('codMateria', 'codComision')()

            const comisiones = await sp.web.lists
                .getByTitle('Comision')
                .items.select(
                    'codComision',
                    'diaSemana',
                    'turno',
                    'descripcion'
                )()

            const datos: IMateria[] = estado
                .filter((e) => {
                    const correlativas = mapaCorrelativas[e.codMateria.ID] || []
                    return correlativas.every((c) => idsAprobadas.includes(c))
                })
                .map((e) => {
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
                            e.condicion === 'C'
                                ? 'En curso'
                                : e.condicion === 'R'
                                ? 'En final'
                                : 'Aprobada',
                        bloqueada: idsBloqueadas.has(e.codMateria.ID),
                    }
                })

            setMaterias(datos)
        } catch (error) {
            console.error('Error cargando materias:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMaterias().catch(console.error)
    }, [modoVista])

    const eliminarMateria = async (id: number): Promise<void> => {
        const materia = materias.find((m) => m.id === id)
        if (!materia) return

        const correlativas = correlativasInversas[materia.id] || []
        if (correlativas.length > 0) {
            const nombresDependientes = materias
                .filter((m) => correlativas.includes(m.id))
                .map((m) => m.nombre)
                .join(', ')
            const confirmar = window.confirm(
                `La materia "${materia.nombre}" es requisito de: ${nombresDependientes}.\n¿Seguro que querés eliminarla?`
            )
            if (!confirmar) return
        }

        try {
            await sp.web.lists.getByTitle('Estado').items.getById(id).recycle()
            await fetchMaterias()
        } catch (error) {
            console.error('Error eliminando materia:', error)
        }
    }

    const eliminarMaterias = async (estadoAEliminar: string): Promise<void> => {
        const materiasAEliminar = materias.filter(
            (m) => m.estado === estadoAEliminar
        )

        if (materiasAEliminar.length === 0) {
            alert(
                `No hay materias en estado "${estadoAEliminar}" para eliminar.`
            )
            return
        }

        const confirmar = window.confirm(
            `Vas a eliminar ${materiasAEliminar.length} materias en estado "${estadoAEliminar}".\n¿Estás seguro?`
        )

        if (!confirmar) return

        try {
            for (const materia of materiasAEliminar) {
                await sp.web.lists
                    .getByTitle('Estado')
                    .items.getById(materia.id)
                    .recycle()
            }
            await fetchMaterias()
        } catch (error) {
            console.error('Error eliminando materias:', error)
        }
    }

    const materiasAgrupadas =
        modoVista === 'historial'
            ? {
                  Aprobadas: materias.filter((m) => m.estado === 'Aprobada'),
                  EnFinal: materias.filter((m) => m.estado === 'En final'),
              }
            : { EnCurso: materias }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu context={context} />
            <div style={{ padding: 24 }}>
                <div className={styles.vistaHeader}>
                    <button
                        className={`${styles.tabButton} ${
                            modoVista === 'curso' ? styles.activo : ''
                        }`}
                        onClick={() => setModoVista('curso')}
                    >
                        Materias en curso
                    </button>
                    <button
                        className={`${styles.tabButton} ${
                            modoVista === 'historial' ? styles.activo : ''
                        }`}
                        onClick={() => setModoVista('historial')}
                    >
                        Historial académico
                    </button>
                </div>

                <h2 className={styles.titulo}>
                    {modoVista === 'curso'
                        ? 'Materias en curso'
                        : 'Historial de materias'}
                </h2>

                {loading ? (
                    <Spinner label='Cargando materias...' />
                ) : (
                    <>
                        {Object.entries(materiasAgrupadas).map(
                            ([grupo, lista]) => (
                                <div key={grupo} style={{ marginBottom: 24 }}>
                                    {modoVista === 'historial' && (
                                        <h3>{grupo}</h3>
                                    )}
                                    <table className={styles.tabla}>
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Materia</th>
                                                <th>Estado</th>
                                                {modoVista === 'curso' && (
                                                    <th>Comision</th>
                                                )}
                                                {modoVista === 'curso' && (
                                                    <th>Horario</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lista.map((m: IMateria) => (
                                                <tr key={m.id}>
                                                    <td>{m.codigo}</td>
                                                    <td>{m.nombre}</td>
                                                    <td>{m.estado}</td>
                                                    {modoVista === 'curso' && (
                                                        <>
                                                            <td>
                                                                {m.comision}
                                                            </td>
                                                            <td>{m.horario}</td>
                                                        </>
                                                    )}

                                                    <td>
                                                        {!m.bloqueada && (
                                                            <button
                                                                onClick={() =>
                                                                    eliminarMateria(
                                                                        m.id
                                                                    )
                                                                }
                                                                style={{
                                                                    background:
                                                                        'transparent',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontSize: 18,
                                                                }}
                                                                title='Eliminar materia'
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}

                        <div style={{ marginTop: 20 }}>
                            <Link
                                to={
                                    modoVista === 'curso'
                                        ? '/formularioCursando'
                                        : '/formulario'
                                }
                            >
                                <button className={styles.boton}>Añadir</button>
                            </Link>

                            {modoVista === 'curso' && (
                                <button
                                    onClick={() => eliminarMaterias('En curso')}
                                    className={styles.boton}
                                    style={{ marginLeft: 20 }}
                                >
                                    Eliminar todas
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default MisMaterias
