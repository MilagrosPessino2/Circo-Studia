import * as React from 'react'
import { useEffect, useState } from 'react'
import { Checkbox, PrimaryButton, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'
import { useNavigate } from 'react-router-dom'

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
    codigoCarrera?: string
    nombreCarrera?: string
    checked?: boolean
}

interface IMateriaCarreraExpandida {
    Id: number
    codCarrera: {
        Id: number
        codigoCarrera: string
    }
    CodMateria: {
        Id: number
        codMateria: string
    }
}

interface ICarrera {
    Id: number
    codigoCarrera: string
    nombre: string
}

interface IInscripto {
    Id: number
    idCarrera: {
        Id: number
        codigoCarrera: string
    }
}

interface IEstudiante {
    ID: number
    usuario: {
        Id: number
    }
}

interface IEstadoItem {
    codMateria: {
        ID: number
    }
}

const runAsync = (fn: () => Promise<void>): void => {
    fn().catch(console.error)
}

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const navigate = useNavigate()

    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])
    const [selectedCarrera, setSelectedCarrera] = useState<string>('')
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(
        null
    )

    useEffect(() => {
        const cargarDatos = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                const currentUserId = user.Id

                const estudianteItems: IEstudiante[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id')
                    .expand('usuario')()

                const match = estudianteItems.find(
                    (e) => e.usuario?.Id === currentUserId
                )
                if (!match) {
                    setError('Estudiante no encontrado')
                    setLoading(false)
                    return
                }

                const estudianteID = match.ID

                const inscriptoItems: IInscripto[] = await sp.web.lists
                    .getByTitle('Inscripto')
                    .items.filter(`idEstudianteId eq ${estudianteID}`)
                    .select('idCarrera/Id', 'idCarrera/codigoCarrera')
                    .expand('idCarrera')()

                const idCarrera = inscriptoItems[0]?.idCarrera?.Id
                const codigoCarrera =
                    inscriptoItems[0]?.idCarrera?.codigoCarrera

                setSelectedCarrera(codigoCarrera ?? 'Sin inscripción')

                const materiasEstado: IEstadoItem[] = await sp.web.lists
                    .getByTitle('Estado')
                    .items.filter(`idEstudianteId eq ${estudianteID}`)
                    .select('codMateria/ID')
                    .expand('codMateria')()

                const idsEstado = materiasEstado.map((m) => m.codMateria.ID)

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
                    .expand('codMateria', 'codComision')()

                const materiaCarreraItems: IMateriaCarreraExpandida[] =
                    await sp.web.lists
                        .getByTitle('MateriaCarrera')
                        .items.select(
                            'Id',
                            'CodMateria/Id',
                            'CodMateria/codMateria',
                            'codCarrera/Id',
                            'codCarrera/codigoCarrera'
                        )
                        .expand('CodMateria', 'codCarrera')()

                const carreraItems: ICarrera[] = await sp.web.lists
                    .getByTitle('Carrera')
                    .items.select('Id', 'codigoCarrera', 'nombre')()

                const ofertasFiltradas: IOfertaDeMaterias[] = ofertaItems
                    .filter((oferta) => {
                        const codOferta = oferta.codMateria?.codMateria?.trim()
                        return materiaCarreraItems.some(
                            (mc) =>
                                mc.CodMateria?.codMateria?.trim() ===
                                    codOferta && mc.codCarrera?.Id === idCarrera
                        )
                    })
                    .filter(
                        (oferta) =>
                            oferta.codMateria?.Id !== undefined &&
                            !idsEstado.includes(oferta.codMateria.Id)
                    )
                    .map((oferta) => {
                        const carrera = carreraItems.find(
                            (c) => c.Id === idCarrera
                        )
                        return {
                            ...oferta,
                            codigoCarrera:
                                carrera?.codigoCarrera ?? 'Sin código',
                            nombreCarrera: carrera?.nombre ?? 'Sin carrera',
                            checked: false,
                        }
                    })

                setOfertas(ofertasFiltradas)
            } catch (err) {
                console.error('❌ Error cargando datos:', err)
                setError(
                    (err as { message?: string }).message ?? 'Error desconocido'
                )
            } finally {
                setLoading(false)
            }
        }

        runAsync(cargarDatos)
    }, [context])

    const handleCheckboxChange = (id: number | undefined): void => {
        if (id === undefined) return
        setOfertas((prev) =>
            prev.map((o) =>
                o.codMateria?.Id === id ? { ...o, checked: !o.checked } : o
            )
        )
    }

    const handleGuardar = async (): Promise<void> => {
        try {
            setMensaje(null)

            const user = await sp.web.currentUser()
            const currentUserId = user.Id

            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()

            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === currentUserId
            )
            if (!estudiante) {
                setMensaje('Estudiante no encontrado.')
                setTipoMensaje('error')
                return
            }

            const materiasSeleccionadas = ofertas.filter(
                (o) => o.checked && o.codMateria?.Id
            )

            await Promise.all(
                materiasSeleccionadas.map((o) =>
                    sp.web.lists.getByTitle('Estado').items.add({
                        idEstudianteId: estudiante.ID,
                        codMateriaId: o.codMateria!.Id,
                        condicion: 'C',
                    })
                )
            )

            setMensaje(
                `${materiasSeleccionadas.length} materia(s) guardadas como cursando.`
            )
            setTipoMensaje('exito')

            navigate('/inicio')
        } catch (err) {
            console.error('❌ Error al guardar materias en curso:', err)
            setMensaje('Error al guardar materias.')
            setTipoMensaje('error')
        }
    }

    const handleVolverConBorrado = async (): Promise<void> => {
        try {
            const user = await sp.web.currentUser()
            const currentUserId = user.Id

            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()

            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === currentUserId
            )
            if (!estudiante) {
                console.error('Estudiante no encontrado')
                return
            }

            const regularizadas = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and condicion eq 'R'`
                )
                .select('Id')()

            await Promise.all(
                regularizadas.map((item) =>
                    sp.web.lists
                        .getByTitle('Estado')
                        .items.getById(item.Id)
                        .recycle()
                )
            )

            navigate('/preset/cargar-regularizada')
        } catch (err) {
            console.error('❌ Error al eliminar materias regularizadas:', err)
        }
    }

    return loading ? (
        <Spinner label='Cargando datos...' />
    ) : error ? (
        <div>Error: {error}</div>
    ) : (
        <div style={{ padding: '20px' }}>
            <h2>Seleccionar Materias en Curso</h2>
            <p>
                Carrera del estudiante: <strong>{selectedCarrera}</strong>
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <PrimaryButton
                    text='Volver'
                    onClick={() => runAsync(handleVolverConBorrado)}
                />
                <PrimaryButton
                    text='Guardar materias en curso'
                    onClick={handleGuardar}
                />
            </div>

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

            {ofertas.length > 0 ? (
                <div
                    style={{
                        maxWidth: '600px',
                        margin: '20px auto',
                        textAlign: 'left',
                    }}
                >
                    {ofertas.map((o) => (
                        <Checkbox
                            key={o.Id}
                            label={`[${o.codMateria?.codMateria}] ${o.codMateria?.nombre} - Comisión${o.codComision?.codComision} - ${o.codComision?.descripcion}`}
                            checked={o.checked}
                            onChange={() =>
                                handleCheckboxChange(o.codMateria?.Id)
                            }
                        />
                    ))}
                </div>
            ) : (
                <p>No hay materias disponibles para cursar.</p>
            )}
        </div>
    )
}

export default SeleccionarMateriasEnCurso
