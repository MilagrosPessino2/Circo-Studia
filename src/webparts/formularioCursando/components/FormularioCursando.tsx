import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'
import styles from './FormularioCursando.module.scss'
import TablaMateriasEnCurso from '../../../utils/tablaMateriasCursando/TablaMateriasCursando'
import Menu from '../../menu/components/Menu'
import { useNavigate } from 'react-router-dom'
import Boton from '../../../utils/boton/Boton'

interface IMateriaConComisiones {
    materiaId: number
    codMateria: string
    nombreMateria: string
    comisiones: {
        comisionId: number
        codComision: string
        descripcion?: string
    }[]
    comisionSeleccionada?: number
}

interface IOfertaDeMaterias {
    Id: number
    codMateria?: {
        Id: number
        codMateria?: string
        nombre?: string
    }
    codComision?: {
        Id: number
        descripcion?: string
        codComision: string
    }
    fechaDePublicacion: string
    Cuatrimestre: number
    modalidad: string
}

interface ICorrelativaItem {
    codMateria: { Id: number }
    codMateriaRequerida: { Id: number }
}
interface IEstadoItem {
    codMateria: { Id: number }
    condicion: 'A' | 'R' | 'C' | string
}

interface IEstudiante {
    ID: number
    usuario: {
        Id: number
    }
}

interface IInscripto {
    idCarrera: {
        Id: number
        codigoCarrera: string
    }
}

const runAsync = (fn: () => Promise<void>): void => {
    fn().catch(console.error)
}

const formularioCursando: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)

    const [loading, setLoading] = useState(true)
    const [materiasConComisiones, setMateriasConComisiones] = useState<
        IMateriaConComisiones[]
    >([])
    const navigate = useNavigate()
    const [selectedCarrera, setSelectedCarrera] = useState('')
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(
        null
    )

    useEffect(() => {
        const cargarDatos = async (): Promise<void> => {
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

                const inscriptos: IInscripto[] = await sp.web.lists
                    .getByTitle('Inscripto')
                    .items.filter(`idEstudiante/Id eq ${estudiante.ID}`)
                    .select('idCarrera/Id', 'idCarrera/codigoCarrera')
                    .expand('idCarrera')()

                setSelectedCarrera(
                    inscriptos[0]?.idCarrera?.codigoCarrera || ''
                )

                console.log('Carrera seleccionada:', selectedCarrera)

                // DESPUÉS
                const estado: IEstadoItem[] = await sp.web.lists
                    .getByTitle('Estado')
                    .items.filter(
                        `idEstudianteId eq ${estudiante.ID} and (condicion eq 'A' or condicion eq 'R' or condicion eq 'C')`
                    )
                    .select('codMateria/Id', 'condicion')
                    .expand('codMateria')()

                const idsAprobadas = estado
                    .filter((e) => e.condicion === 'A' || e.condicion === 'R')
                    .map((e) => e.codMateria.Id)

                const idsEnCurso = new Set(
                    estado
                        .filter((e) => e.condicion === 'C')
                        .map((e) => e.codMateria.Id)
                )
                const correlativasItems: ICorrelativaItem[] = await sp.web.lists
                    .getByTitle('Correlativa')
                    .items.select('codMateria/Id', 'codMateriaRequerida/Id')
                    .expand('codMateria', 'codMateriaRequerida')()

                const mapaCorrelativas: Record<number, number[]> = {}
                correlativasItems.forEach((c) => {
                    const mId = c.codMateria?.Id
                    const rId = c.codMateriaRequerida?.Id
                    if (!mId || !rId) return

                    if (!mapaCorrelativas[mId]) {
                        mapaCorrelativas[mId] = []
                    }
                    mapaCorrelativas[mId].push(rId)
                })

                const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
                    .getByTitle('OfertaDeMaterias')
                    .items.select(
                        'Id',
                        'codMateria/Id',
                        'codMateria/codMateria',
                        'codMateria/nombre',
                        'codComision/Id',
                        'codComision/codComision',
                        'codComision/descripcion',
                        'fechaDePublicacion',
                        'Cuatrimestre',
                        'modalidad'
                    )
                    .expand('codMateria', 'codComision')
                    .top(4999)()

                console.log('Oferta de materias:', ofertaItems)
                const materiaCarreraItems = await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.filter(
                        `codCarrera/Id eq ${inscriptos[0].idCarrera.Id}`
                    )
                    .select('CodMateria/Id', 'CodMateria/Title', 'Id')
                    .expand('CodMateria')()

                const idsMateriasDeCarrera = materiaCarreraItems.map(
                    (m) => m.CodMateria?.Id
                )
                console.log('Materias de carrera:', idsMateriasDeCarrera)

                const agrupadas = new Map<number, IMateriaConComisiones>()

                ofertaItems.forEach((o) => {
                    const mId = o.codMateria?.Id
                    if (!mId || !o.codMateria?.codMateria) return

                    if (!idsMateriasDeCarrera.includes(mId)) return

                    const correlativas = mapaCorrelativas[mId] || []
                    const puedeCursar = correlativas.every((id) =>
                        idsAprobadas.includes(id)
                    )

                    if (
                        !puedeCursar ||
                        idsAprobadas.includes(mId) ||
                        idsEnCurso.has(mId)
                    )
                        return

                    if (!agrupadas.has(mId)) {
                        agrupadas.set(mId, {
                            materiaId: mId,
                            codMateria: o.codMateria.codMateria,
                            nombreMateria: o.codMateria.nombre || '',
                            comisiones: [],
                        })
                    }

                    agrupadas.get(mId)?.comisiones.push({
                        comisionId: o.codComision?.Id ?? 0,
                        codComision: o.codComision?.codComision ?? '',
                        descripcion: o.codComision?.descripcion ?? '',
                    })
                })

                setMateriasConComisiones(
                    Array.from(agrupadas.values()).sort((a, b) =>
                        String(a.codMateria).localeCompare(
                            String(b.codMateria),
                            'es',
                            { numeric: true, sensitivity: 'base' }
                        )
                    )
                )
            } catch (error) {
                console.error('Error cargando datos:', error)
            } finally {
                setLoading(false)
            }
        }

        runAsync(cargarDatos)
    }, [context])

    const handleSeleccionComision = (
        materiaId: number,
        comisionId: number
    ): void => {
        console.log('Seleccionada comisión:', { materiaId, comisionId })
        setMateriasConComisiones((prev) =>
            prev.map((m) =>
                m.materiaId === materiaId
                    ? { ...m, comisionSeleccionada: comisionId }
                    : m
            )
        )
    }

    const handleGuardar = async (): Promise<void> => {
        try {
            const user = await sp.web.currentUser()

            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()

            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )
            if (!estudiante) {
                console.warn('Estudiante no encontrado')
                return
            }

            const seleccionadas = materiasConComisiones.filter(
                (m) => m.comisionSeleccionada
            )

            // Obtener materias aprobadas del estudiante
            const estadoItems = await sp.web.lists
                .getByTitle('Estado')
                .items.select('codMateria/Id', 'condicion')
                .expand('codMateria')
                .filter(`idEstudianteId eq ${estudiante.ID}`)()

            const materiasAprobadas = estadoItems
                .filter((e) => e.condicion === 'A' || e.condicion === 'R')
                .map((e) => e.codMateria?.Id)

            // Obtener correlativas
            const correlativasItems = await sp.web.lists
                .getByTitle('Correlativa')
                .items.select('codMateria/Id', 'codMateriaRequerida/Id')
                .expand('codMateria', 'codMateriaRequerida')
                .top(4999)()

            // Verificar correlativas
            const materiasHabilitadas = seleccionadas.filter((m) => {
                const correlativasDeEsta = correlativasItems
                    .filter((c) => c.codMateria?.Id === m.materiaId)
                    .map((c) => c.codMateriaRequerida?.Id)

                const tieneTodoAprobado = correlativasDeEsta.every(
                    (correlativaId) => materiasAprobadas.includes(correlativaId)
                )

                if (!tieneTodoAprobado) {
                    console.warn(
                        `No cumple correlativas para materia ${m.materiaId}`
                    )
                }

                return tieneTodoAprobado
            })

            // Obtener oferta de materias
            const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.select('Id', 'codMateria/Id', 'codComision/Id')
                .expand('codMateria', 'codComision')
                .top(4999)()

            // Guardar en Estado y CursaEn solo materias habilitadas
            await Promise.all(
                materiasHabilitadas.map(async (m) => {
                    const oferta = ofertaItems.find(
                        (o) =>
                            o.codMateria?.Id === m.materiaId &&
                            o.codComision?.Id === Number(m.comisionSeleccionada)
                    )

                    if (!oferta) {
                        console.warn(
                            `No se encontró oferta para materia ${m.materiaId}`
                        )
                        return
                    }

                    await sp.web.lists.getByTitle('Estado').items.add({
                        idEstudianteId: estudiante.ID,
                        codMateriaId: m.materiaId,
                        condicion: 'C',
                    })

                    await sp.web.lists.getByTitle('CursaEn').items.add({
                        idEstudianteId: estudiante.ID,
                        idOfertaId: oferta.Id,
                    })
                })
            )

            const cantidadGuardadas = materiasHabilitadas.length
            const cantidadIgnoradas = seleccionadas.length - cantidadGuardadas

            if (cantidadGuardadas === 0) {
                setMensaje(
                    'No se pudo guardar ninguna materia. Verificá que cumplís con las correlativas.'
                )
                setTipoMensaje('error')
                return
            }

            let mensajeFinal = `${cantidadGuardadas} materia(s) guardadas con éxito.`
            if (cantidadIgnoradas > 0) {
                mensajeFinal += ` ${cantidadIgnoradas} materia(s) no se guardaron por falta de correlativas.`
            }

            setMensaje(mensajeFinal)
            setTipoMensaje('exito')
            navigate('/mis-materias')
        } catch (err) {
            console.error('Error al guardar:', err)
            setMensaje('Ocurrió un error al guardar las materias.')
            setTipoMensaje('error')
        }
    }

    const handleVolver = async (): Promise<void> => {
        navigate('/mis-materias')
    }

    const comisionesSeleccionadas: { [materiaId: number]: number } = {}
    materiasConComisiones.forEach((m) => {
        if (m.comisionSeleccionada !== undefined) {
            comisionesSeleccionadas[m.materiaId] = m.comisionSeleccionada
        }
    })

    return loading ? (
        <Spinner label='Cargando...' />
    ) : (
        <div className={styles.contenedor}>
            <Menu context={context} />
            <div className={styles.contenidoFormularioCursando}>
                <svg
                    onClick={handleVolver}
                    style={{ cursor: 'pointer' }}
                    xmlns='http://www.w3.org/2000/svg'
                    width='20px'
                    height='20px'
                    viewBox='0 0 24 24'
                >
                    <path
                        fill='#009266'
                        d='M10.295 19.715a1 1 0 0 0 1.404-1.424l-5.37-5.292h13.67a1 1 0 0 0 0-2H6.336L11.7 5.714a1 1 0 0 0-1.404-1.424L3.37 11.112a1.25 1.25 0 0 0 0 1.78z'
                    />
                </svg>
                <h2 className={styles.titulo}>Seleccionar Materias en Curso</h2>
                <p>
                    Carrera: <strong>{selectedCarrera}</strong>
                </p>

                {mensaje && (
                    <p
                        style={{
                            color: tipoMensaje === 'exito' ? 'green' : 'red',
                        }}
                    >
                        {mensaje}
                    </p>
                )}

                {materiasConComisiones.length > 0 ? (
                    <TablaMateriasEnCurso
                        materias={materiasConComisiones.map((m) => ({
                            Id: m.materiaId,
                            codMateria: m.codMateria,
                            nombre: m.nombreMateria,
                            comisiones: m.comisiones
                                .slice()
                                .sort((a, b) =>
                                    String(a.codComision).localeCompare(
                                        String(b.codComision),
                                        'es',
                                        { numeric: true, sensitivity: 'base' }
                                    )
                                )
                                .map((c) => ({
                                    id: c.comisionId,
                                    nombre: c.codComision,
                                    horario: c.descripcion ?? '-',
                                })),
                        }))}
                        comisionesSeleccionadas={comisionesSeleccionadas}
                        materiasBloqueadas={new Set()}
                        onComisionChange={handleSeleccionComision}
                    />
                ) : (
                    <p>No hay materias disponibles.</p>
                )}

                <div style={{ marginTop: 16 }}>
                    <Boton
                        className={styles.botonGuardar}
                        onClick={handleGuardar}
                    >
                        Guardar
                    </Boton>
                </div>
            </div>
        </div>
    )
}

export default formularioCursando
