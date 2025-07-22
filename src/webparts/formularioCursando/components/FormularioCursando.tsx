import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'
import styles from './FormularioCursando.module.scss'
import TablaMateriasEnCurso from '../../../utils/tablaMateriasCursando/TablaMateriasCursando'
import Menu from '../../menu/components/Menu'

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

interface IEstadoItem {
    codMateria: {
        ID: number
    }
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

interface ICorrelativaItem {
    codMateria: {
        ID: number
    }
    codMateriaRequerida: {
        ID: number
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

                const estado: IEstadoItem[] = await sp.web.lists
                    .getByTitle('Estado')
                    .items.filter(`idEstudianteId eq ${estudiante.ID}`)
                    .select('codMateria/ID')
                    .expand('codMateria')()
                const idsAprobadas = estado.map((e) => e.codMateria.ID)

                const correlativasItems: ICorrelativaItem[] = await sp.web.lists
                    .getByTitle('Correlativa')
                    .items.select('codMateria/ID', 'codMateriaRequerida/ID')
                    .expand('codMateria', 'codMateriaRequerida')()

                const mapaCorrelativas: Record<number, number[]> = {}
                correlativasItems.forEach((c) => {
                    const mId = c.codMateria?.ID
                    const rId = c.codMateriaRequerida?.ID
                    if (mId && rId) {
                        if (!mapaCorrelativas[mId]) mapaCorrelativas[mId] = []
                        mapaCorrelativas[mId].push(rId)
                    }
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
                    .expand('codMateria', 'codComision').top(4999)()

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

                    if (!puedeCursar || idsAprobadas.includes(mId)) return

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

                setMateriasConComisiones(Array.from(agrupadas.values()))
                
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
        const user = await sp.web.currentUser();

        // Buscar el estudiante correspondiente al usuario actual
        const estudiantes: IEstudiante[] = await sp.web.lists
            .getByTitle('Estudiante')
            .items.select('ID', 'usuario/Id')
            .expand('usuario')();

        const estudiante = estudiantes.find(
            (e) => e.usuario?.Id === user.Id
        );

        if (!estudiante) {
            console.warn('Estudiante no encontrado');
            return;
        }

        // Materias con comisión seleccionada
        const seleccionadas = materiasConComisiones.filter(
            (m) => m.comisionSeleccionada
        );

        if (seleccionadas.length === 0) {
            setMensaje('No seleccionaste ninguna comisión.');
            setTipoMensaje('error');
            return;
        }

        // Traer todas las ofertas de materias disponibles
        const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
            .getByTitle('OfertaDeMaterias')
            .items.select('Id', 'codMateria/Id', 'codComision/Id')
            .expand('codMateria', 'codComision').top(4999)();

        // Guardar estado y cursada
        await Promise.all(
            seleccionadas.map(async (m) => {
                const oferta = ofertaItems.find(
                    (o) =>
                        o.codMateria?.Id === m.materiaId &&
                        Number(o.codComision?.Id) === Number(m.comisionSeleccionada)
                );

                if (!oferta) {
                    console.warn(
                        `No se encontró la oferta para la materia ${m.materiaId} y comisión ${m.comisionSeleccionada}`
                    );
                    return;
                }

                // Guardar en Estado (condición "C" de cursando)
                await sp.web.lists.getByTitle('Estado').items.add({
                    idEstudianteId: estudiante.ID,
                    codMateriaId: m.materiaId,
                    condicion: 'C',
                });

                // Guardar en CursaEn
                await sp.web.lists.getByTitle('CursaEn').items.add({
                    idEstudianteId: estudiante.ID,
                    idOfertaId: oferta.Id,
                });
            })
        );

        setMensaje(`${seleccionadas.length} materia(s) guardadas con éxito.`);
        setTipoMensaje('exito');
        window.location.reload();
    } catch (err) {
        console.error('Error al guardar:', err);
        setMensaje('Ocurrió un error al guardar las materias.');
        setTipoMensaje('error');
    }
};


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
                            comisiones: m.comisiones.map((c) => ({
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
                    <button
                        className={styles.botonGuardar}
                        onClick={handleGuardar}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default formularioCursando
