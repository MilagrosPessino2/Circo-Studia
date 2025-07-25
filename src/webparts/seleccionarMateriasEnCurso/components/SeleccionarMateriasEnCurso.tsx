import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'
import { useNavigate } from 'react-router-dom'
import styles from './SeleccionarMateriasEnCurso.module.scss'
import TablaMateriasEnCurso from '../../../utils/tablaMateriasCursando/TablaMateriasCursando'
import Mensaje from '../../../utils/mensaje/mensaje'

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
    correlativasFaltantes?: number[]
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

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [materiasConComisiones, setMateriasConComisiones] = useState<IMateriaConComisiones[]>([])
    const [selectedCarrera, setSelectedCarrera] = useState('')
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)

    useEffect(() => {
    const cargarDatos = async (): Promise<void> => {
        try {
            const user = await sp.web.currentUser();

            const estudiantes: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')();

            const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id);
            if (!estudiante) return;

            const inscriptos: IInscripto[] = await sp.web.lists
                .getByTitle('Inscripto')
                .items
                .filter(`idEstudiante/Id eq ${estudiante.ID}`)
                .select('idCarrera/Id', 'idCarrera/codigoCarrera')
                .expand('idCarrera')();

            const carreraSeleccionada = inscriptos[0]?.idCarrera;
            if (!carreraSeleccionada) return;

            setSelectedCarrera(carreraSeleccionada.codigoCarrera);

            const estado: IEstadoItem[] = await sp.web.lists
                .getByTitle('Estado')
                .items
                .filter(`idEstudianteId eq ${estudiante.ID}`)
                .select('codMateria/ID')
                .expand('codMateria')();

            const idsAprobadas = estado.map(e => e.codMateria.ID);

            const correlativasItems: ICorrelativaItem[] = await sp.web.lists
                .getByTitle('Correlativa')
                .items
                .select('codMateria/ID', 'codMateriaRequerida/ID')
                .expand('codMateria', 'codMateriaRequerida')();

            const mapaCorrelativas: Record<number, number[]> = {};
            correlativasItems.forEach(c => {
                const mId = c.codMateria?.ID;
                const rId = c.codMateriaRequerida?.ID;
                if (mId && rId) {
                    if (!mapaCorrelativas[mId]) mapaCorrelativas[mId] = [];
                    mapaCorrelativas[mId].push(rId);
                }
            });

            const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items
                .select(
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
                .top(4999)();

            const materiaCarreraItems = await sp.web.lists
                .getByTitle('MateriaCarrera')
                .items
                .filter(`codCarrera/Id eq ${carreraSeleccionada.Id}`)
                .select('CodMateria/Id', 'CodMateria/Title', 'Id')
                .expand('CodMateria')();

            const idsMateriasDeCarrera = materiaCarreraItems.map(
                m => m.CodMateria?.Id
            );

            const agrupadas = new Map<number, IMateriaConComisiones>();

            ofertaItems.forEach(o => {
                const mId = o.codMateria?.Id;
                if (!mId || !o.codMateria?.codMateria) return;
                if (!idsMateriasDeCarrera.includes(mId)) return;
                if (idsAprobadas.includes(mId)) return;

                const faltanCorrelativas = (mapaCorrelativas[mId] || []).filter(
                    id => !idsAprobadas.includes(id)
                );

                if (!agrupadas.has(mId)) {
                    agrupadas.set(mId, {
                        materiaId: mId,
                        codMateria: o.codMateria.codMateria,
                        nombreMateria: o.codMateria.nombre || '',
                        comisiones: [],
                        correlativasFaltantes: faltanCorrelativas
                    });
                }

                agrupadas.get(mId)?.comisiones.push({
                    comisionId: o.codComision?.Id ?? 0,
                    codComision: o.codComision?.codComision ?? '',
                    descripcion: o.codComision?.descripcion ?? ''
                });
            });

            setMateriasConComisiones(Array.from(agrupadas.values()));
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    runAsync(cargarDatos);
}, [context]);


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

        const estudiantes: IEstudiante[] = await sp.web.lists
            .getByTitle('Estudiante')
            .items.select('ID', 'usuario/Id')
            .expand('usuario')();

        const estudiante = estudiantes.find((e) => e.usuario?.Id === user.Id);
        if (!estudiante) {
            console.warn('Estudiante no encontrado');
            return;
        }

        const seleccionadas = materiasConComisiones.filter(
            (m) => m.comisionSeleccionada
        );

        if (seleccionadas.length === 0) {
            navigate('/inicio');
            return;
        }

        // Obtener materias aprobadas del estudiante
        const estadoItems = await sp.web.lists
            .getByTitle('Estado')
            .items.select('codMateria/Id', 'condicion')
            .expand('codMateria')
            .filter(`idEstudianteId eq ${estudiante.ID}`)();

        const materiasAprobadas = estadoItems
            .filter((e) => e.condicion === 'A')
            .map((e) => e.codMateria?.Id);

        // Obtener correlativas
        const correlativasItems = await sp.web.lists
            .getByTitle('Correlativa')
            .items.select('codMateria/Id', 'codMateriaRequerida/Id')
            .expand('codMateria', 'codMateriaRequerida')
            .top(4999)();

        // Verificar correlativas
        const materiasHabilitadas = seleccionadas.filter((m) => {
            const correlativasDeEsta = correlativasItems
                .filter((c) => c.codMateria?.Id === m.materiaId)
                .map((c) => c.codMateriaRequerida?.Id);

            const tieneTodoAprobado = correlativasDeEsta.every((correlativaId) =>
                materiasAprobadas.includes(correlativaId)
            );

            if (!tieneTodoAprobado) {
                console.warn(`No cumple correlativas para materia ${m.materiaId}`);
            }

            return tieneTodoAprobado;
        });

        if (materiasHabilitadas.length === 0) {
            navigate('/inicio');
            return;
        }

        // Obtener oferta de materias
        const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
            .getByTitle('OfertaDeMaterias')
            .items.select('Id', 'codMateria/Id', 'codComision/Id')
            .expand('codMateria', 'codComision')
            .top(4999)();

        // Guardar en Estado y CursaEn solo materias habilitadas
        await Promise.all(
            materiasHabilitadas.map(async (m) => {
                const oferta = ofertaItems.find(
                    (o) =>
                        o.codMateria?.Id === m.materiaId &&
                        o.codComision?.Id === Number(m.comisionSeleccionada)
                );

                if (!oferta) {
                    console.warn(`No se encontró oferta para materia ${m.materiaId}`);
                    return;
                }

                await sp.web.lists.getByTitle('Estado').items.add({
                    idEstudianteId: estudiante.ID,
                    codMateriaId: m.materiaId,
                    condicion: 'C',
                });

                await sp.web.lists.getByTitle('CursaEn').items.add({
                    idEstudianteId: estudiante.ID,
                    idOfertaId: oferta.Id,
                });
            })
        );

        const cantidadGuardadas = materiasHabilitadas.length;
        const cantidadIgnoradas = seleccionadas.length - cantidadGuardadas;

        let mensajeFinal = `${cantidadGuardadas} materia(s) guardadas con éxito.`;
        if (cantidadIgnoradas > 0) {
            mensajeFinal += ` ${cantidadIgnoradas} materia(s) no se guardaron por falta de correlativas.`;
        }

        setMensaje(mensajeFinal);
        setTipoMensaje('exito');
        navigate('/inicio');
    } catch (err) {
        console.error('Error al guardar:', err);
        setMensaje('Ocurrió un error al guardar las materias.');
        setTipoMensaje('error');
    }
};




    const handleVolver = async (): Promise<void> => {
        navigate('/preset/cargar-aprobadas')
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
        <div style={{ padding: 20 }}>
            <h2 className={styles.titulo}>Seleccionar Materias en Curso</h2>
            <p>
                Carrera: <strong>{selectedCarrera}</strong>
            </p>

           {mensaje && tipoMensaje && (
                        <Mensaje
                            texto={mensaje}
                            tipo={tipoMensaje}
                            onCerrar={() => setMensaje(null)}
                        />
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
            ) : (<p>No hay materias disponibles.</p>)}

            <div style={{ marginTop: 16 }}>
                <button className={styles.btnAccion} onClick={handleVolver}>
                    Volver
                </button>
                <button className={styles.btnAccion} onClick={handleGuardar}>
                    Guardar
                </button>
            </div>
        </div>
    )
}

export default SeleccionarMateriasEnCurso
