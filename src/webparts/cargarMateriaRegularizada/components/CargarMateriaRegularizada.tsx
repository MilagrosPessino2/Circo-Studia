import * as React from 'react'
import { useEffect, useState } from 'react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriaRegularizadaProps } from './ICargarMateriaRegularizadaProps'
import { useNavigate } from 'react-router-dom'
import styles from './CargarMateriaRegularizada.module.scss'

interface IMateria {
    id: number
    nombre: string
    checked: boolean
}

interface IEstudiante {
    ID: number
    usuario: {
        Id: number
    }
}

interface IInscripcion {
    ID: number
    idCarreraId: number
}

interface IEstadoItem {
    codMateria: {
        ID: number
    }
    Id: number
}

interface IMateriaCarreraItem {
    CodMateria: {
        ID: number
        nombre: string
    }
}

interface ICorrelativaItem {
    codMateria: { ID: number }
    codMateriaRequerida: { ID: number }
}

const runAsync = (fn: () => Promise<void>): void => {
    fn().catch(console.error)
}

const CargarMateriaRegularizada: React.FC<ICargarMateriaRegularizadaProps> = ({
    context,
}): JSX.Element => {
    const sp = getSP(context)
    const navigate = useNavigate()

    const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('')
    const [carreraId, setCarreraId] = useState<number | null>(null)
    const [materias, setMaterias] = useState<IMateria[]>([])
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(
        null
    )

    useEffect((): void => {
        const fetchCarrera = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                const estudiantes: IEstudiante[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id')
                    .expand('usuario')()

                const estudiante = estudiantes.find(
                    (e) => e.usuario?.Id === user.Id
                )
                if (!estudiante) return

                const inscripciones: IInscripcion[] = await sp.web.lists
                    .getByTitle('Inscripto')
                    .items.filter(`idEstudianteId eq ${estudiante.ID}`)
                    .select('idCarreraId')()
                const idCarrera = inscripciones[0]?.idCarreraId
                if (!idCarrera) return

                const carrera = await sp.web.lists
                    .getByTitle('Carrera')
                    .items.getById(idCarrera)
                    .select('nombre')()
                setCarreraSeleccionada(carrera.nombre)
                setCarreraId(idCarrera)
            } catch (error) {
                console.error('Error al obtener carrera:', error)
            }
        }

        runAsync(fetchCarrera)
    }, [])

    useEffect((): void => {
        const fetchMaterias = async (): Promise<void> => {
            if (!carreraId) return

            try {
                const user = await sp.web.currentUser()
                const currentUserId = user.Id

                const estudianteItems: IEstudiante[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id')
                    .expand('usuario')()
                const coincidencia = estudianteItems.find(
                    (item) => item.usuario?.Id === currentUserId
                )
                if (!coincidencia) return

                const estudianteID = coincidencia.ID

                const materiasEstado: IEstadoItem[] = await sp.web.lists
                    .getByTitle('Estado')
                    .items.filter(`idEstudianteId eq ${estudianteID}`)
                    .select('codMateria/ID')
                    .expand('codMateria')()
                const idsAprobadas: number[] = materiasEstado.map(
                    (m) => m.codMateria.ID
                )

                const items: IMateriaCarreraItem[] = await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.filter(`codCarreraId eq ${carreraId}`)
                    .select('ID', 'CodMateria/ID', 'CodMateria/nombre')
                    .expand('CodMateria')()

                // Obtener correlatividades
                const correlativasItems: ICorrelativaItem[] = await sp.web.lists
                    .getByTitle('Correlativa')
                    .items.select('codMateria/ID', 'codMateriaRequerida/ID')
                    .expand('codMateria', 'codMateriaRequerida')()

                // Armar mapa de correlativas requeridas por materia
                const mapaCorrelativas: Record<number, number[]> = {}
                correlativasItems.forEach((item) => {
                    const materiaID = item.codMateria?.ID
                    const correlativaID = item.codMateriaRequerida?.ID
                    if (materiaID && correlativaID) {
                        if (!mapaCorrelativas[materiaID])
                            mapaCorrelativas[materiaID] = []
                        mapaCorrelativas[materiaID].push(correlativaID)
                    }
                })

                const materiasFormateadas: IMateria[] = items
                    .filter((item) => {
                        const idMateria = item.CodMateria?.ID
                        if (!idMateria || idsAprobadas.includes(idMateria))
                            return false

                        const correlativasReq =
                            mapaCorrelativas[idMateria] || []
                        return correlativasReq.every((correlativaId) =>
                            idsAprobadas.includes(correlativaId)
                        )
                    })
                    .map((item) => ({
                        id: item.CodMateria.ID,
                        nombre: item.CodMateria.nombre,
                        checked: false,
                    }))

                setMaterias(materiasFormateadas)
            } catch (error) {
                console.error(
                    'Error al obtener materias desde MateriaCarrera:',
                    error
                )
            }
        }

        runAsync(fetchMaterias)
    }, [carreraId])

    const handleCheckboxChange = (id: number): void => {
        setMaterias((prev) =>
            prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
        )
    }

    const handleVolver = async (): Promise<void> => {
        try {
            const user = await sp.web.currentUser()
            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()
            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )
            if (!estudiante) return

            const materiasAprobadas: IEstadoItem[] = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and condicion eq 'A'`
                )
                .select('Id')()

            await Promise.all(
                materiasAprobadas.map((item) =>
                    sp.web.lists
                        .getByTitle('Estado')
                        .items.getById(item.Id)
                        .recycle()
                )
            )

            navigate('/preset/cargar-aprobadas')
        } catch (error) {
            console.error('Error al eliminar materias aprobadas:', error)
        }
    }

    const handleGuardarMaterias = async (): Promise<void> => {
        try {
            setMensaje(null)
            const user = await sp.web.currentUser()
            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()
            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )
            if (!estudiante) {
                setMensaje('Estudiante no encontrado.')
                setTipoMensaje('error')
                return
            }

            const materiasSeleccionadas = materias.filter((m) => m.checked)

            const materiasExistentes: IEstadoItem[] = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(`idEstudianteId eq ${estudiante.ID}`)
                .select('codMateria/ID')
                .expand('codMateria')()
            const codigosExistentes = materiasExistentes.map(
                (m) => m.codMateria.ID
            )

            const nuevasMaterias = materiasSeleccionadas.filter(
                (m) => !codigosExistentes.includes(m.id)
            )

            await Promise.all(
                nuevasMaterias.map((materia) =>
                    sp.web.lists.getByTitle('Estado').items.add({
                        idEstudianteId: estudiante.ID,
                        codMateriaId: materia.id,
                        condicion: 'R',
                    })
                )
            )

            setMensaje(
                `${nuevasMaterias.length} materia(s) guardadas correctamente.`
            )
            setTipoMensaje('exito')
            navigate('/preset/select-materias-en-curso')
        } catch (error) {
            console.error('Error al guardar materias:', error)
            setMensaje('Error al guardar materias.')
            setTipoMensaje('error')
        }
    }

    // const renderTitulo = (): string => {
    const nombre = carreraSeleccionada.trim().toLowerCase()
    console.log('Nombre de carrera:', nombre)
    //     if (nombre.includes('web')) return 'Materias regularizadas - Tecnicatura Web'
    //     if (nombre.includes('ingenier')) return 'Materias regularizadas - Ingeniería Informática'
    //     return 'Materias regularizadas'
    // }

    return (
        <div style={{ padding: 24 }}>
            <h2 className={styles.titulo}>
                Seleccionar Materias regularizadas
            </h2>

            {mensaje && (
                <p
                    style={{
                        color: tipoMensaje === 'exito' ? 'green' : 'red',
                        marginTop: 10,
                    }}
                >
                    {mensaje}
                </p>
            )}

            {materias.length > 0 ? (
                <table className={styles.tabla}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Materia</th>
                            <th style={{ textAlign: 'left' }}>Seleccionar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materias.map((m) => (
                            <tr key={m.id}>
                                <td>{m.nombre}</td>
                                <td>
                                    <input
                                        type='checkbox'
                                        checked={m.checked}
                                        onChange={() =>
                                            handleCheckboxChange(m.id)
                                        }
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No hay materias disponibles.</p>
            )}

            <div style={{ marginTop: 20 }}>
                <button
                    className={styles.btnAccion}
                    onClick={() => runAsync(handleVolver)}
                >
                    Volver
                </button>
                <button
                    className={styles.btnAccion}
                    onClick={handleGuardarMaterias}
                >
                    Continuar
                </button>
            </div>
        </div>
    )
}

export default CargarMateriaRegularizada
