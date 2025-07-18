// src/webparts/bajaMateria/components/BajaMateria.tsx
import * as React from 'react'
import type { IBajaMateriaProps } from './IBajaMateriaProps'
import styles from './BajaMateria.module.scss'
import { getSP } from '../../../pnpjsConfig'
import {
    Dialog,
    DialogType,
    DialogFooter,
    DefaultButton,
    PrimaryButton,
    Spinner,
    Dropdown,
    ComboBox,
} from '@fluentui/react'

interface MateriaExpandida {
    ID: number
    codMateria: string
    nombre: string
    codCarrera: string
}

interface Carrera {
    ID: number
    nombre: string
    codigoCarrera: string
}

interface MateriaCarreraItem {
    ID: number
    codCarrera: {
        codigoCarrera: string
    }
    CodMateria: {
        ID: number
        codMateria: string
        nombre: string
    }
}

const BajaMateria: React.FC<IBajaMateriaProps> = ({ context }) => {
    const sp = getSP(context)

    const [todasLasMaterias, setTodasLasMaterias] = React.useState<
        MateriaExpandida[]
    >([])
    const [carreras, setCarreras] = React.useState<Carrera[]>([])
    const [mostrarModal, setMostrarModal] = React.useState(false)
    const [mensaje, setMensaje] = React.useState('')
    const [cargando, setCargando] = React.useState(false)
    const [filtroCarreraId, setFiltroCarreraId] = React.useState<number | null>(
        null
    )
    const [textoSeleccionado, setTextoSeleccionado] = React.useState<
        string | undefined
    >(undefined)
    const [idSeleccionado, setIdSeleccionado] = React.useState<
        number | undefined
    >(undefined)

    React.useEffect(() => {
        const fetchData = async (): Promise<void> => {
            try {
                const carrerasRes: Carrera[] = await sp.web.lists
                    .getByTitle('Carrera')
                    .items.select('ID', 'nombre', 'codigoCarrera')()
                setCarreras(carrerasRes)

                const materiasCarreraRes: MateriaCarreraItem[] =
                    await sp.web.lists
                        .getByTitle('MateriaCarrera')
                        .items.select(
                            'ID',
                            'CodMateria/ID',
                            'CodMateria/codMateria',
                            'CodMateria/nombre',
                            'codCarrera/codigoCarrera'
                        )
                        .expand('CodMateria', 'codCarrera')()

                const materiasMapeadas: MateriaExpandida[] = materiasCarreraRes
                    .map((item) => ({
                        ID: item.CodMateria.ID,
                        codMateria: item.CodMateria.codMateria,
                        nombre: item.CodMateria.nombre,
                        codCarrera: item.codCarrera.codigoCarrera,
                    }))
                    .filter(
                        (m) => m.ID && m.codMateria && m.nombre && m.codCarrera
                    )

                setTodasLasMaterias(materiasMapeadas)
            } catch (error) {
                console.error('Error al cargar datos:', error)
            }
        }

        fetchData().catch(console.error)
    }, [])

    const materiasFiltradas = React.useMemo(() => {
        if (!filtroCarreraId) return []

        const carrera = carreras.find((c) => c.ID === filtroCarreraId)
        if (!carrera) return []

        return todasLasMaterias.filter(
            (m) => m.codCarrera === carrera.codigoCarrera
        )
    }, [todasLasMaterias, filtroCarreraId, carreras])

    const materiaSeleccionada = materiasFiltradas.find(
        (m) => m.ID === idSeleccionado
    )

    const eliminarMateria = async (): Promise<void> => {
        if (!materiaSeleccionada) return

        setCargando(true)
        setMensaje('')

        try {
            const { ID, codMateria } = materiaSeleccionada

            const relaciones: { ID: number }[] = await sp.web.lists
                .getByTitle('MateriaCarrera')
                .items.filter(`CodMateria/codMateria eq '${codMateria}'`)
                .select('ID')()

            for (const rel of relaciones) {
                await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.getById(rel.ID)
                    .delete()
            }

            const correlativas: { ID: number }[] = await sp.web.lists
                .getByTitle('Correlativa')
                .items.filter(`codMateriaId eq ${ID}`)
                .select('ID')()

            for (const corr of correlativas) {
                await sp.web.lists
                    .getByTitle('Correlativa')
                    .items.getById(corr.ID)
                    .delete()
            }

            await sp.web.lists.getByTitle('Materia').items.getById(ID).delete()

            setMensaje('✅ Materia eliminada correctamente.')
            setIdSeleccionado(undefined)
            setTextoSeleccionado(undefined)
            setTodasLasMaterias((prev) => prev.filter((m) => m.ID !== ID))
        } catch (error: unknown) {
            const mensajeError =
                error instanceof Error ? error.message : 'Error desconocido'
            console.error('Error al eliminar materia:', error)
            setMensaje(`❌ Error: ${mensajeError}`)
        } finally {
            setCargando(false)
            setMostrarModal(false)
        }
    }

    return (
        <section className={styles.bajaMateria}>
            <h3 className={styles.titulo}>Baja de Materia</h3>

            <Dropdown
                placeholder='Filtrar por carrera'
                options={carreras.map((c) => ({
                    key: c.ID,
                    text: `${c.nombre} (${c.codigoCarrera})`,
                }))}
                onChange={(_, option) =>
                    setFiltroCarreraId(option ? Number(option.key) : null)
                }
                selectedKey={filtroCarreraId ?? undefined}
                styles={{ root: { maxWidth: 300, marginBottom: 10 } }}
            />

            <ComboBox
                placeholder='Buscar y seleccionar materia'
                options={materiasFiltradas.map((m) => ({
                    key: m.ID,
                    text: `${m.nombre.toUpperCase()} (${m.codMateria.toUpperCase()})`,
                }))}
                text={textoSeleccionado}
                autoComplete='on'
                allowFreeform
                onChange={(_, option, __, value) => {
                    const texto = (value ?? option?.text ?? '')
                        .trim()
                        .toUpperCase()
                    setTextoSeleccionado(texto)

                    const materia = materiasFiltradas.find((m) => {
                        const nombre = m.nombre.toUpperCase()
                        const codigo = m.codMateria.toUpperCase()
                        return (
                            nombre.includes(texto) ||
                            codigo.includes(texto) ||
                            `${nombre} (${codigo})` === texto
                        )
                    })

                    setIdSeleccionado(materia?.ID ?? undefined)
                    setMensaje('')
                }}
                styles={{ root: { maxWidth: 400, marginBottom: 10 } }}
            />

            {idSeleccionado && (
                <PrimaryButton
                    text='Eliminar materia'
                    onClick={() => setMostrarModal(true)}
                    styles={{
                        root: {
                            backgroundColor: '#ff4d4d',
                            borderColor: '#ff4d4d',
                        },
                        rootHovered: {
                            backgroundColor: '#e04343',
                            borderColor: '#e04343',
                        },
                    }}
                />
            )}

            {mensaje && (
                <div
                    style={{
                        marginTop: '20px',
                        padding: '12px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        color: mensaje.startsWith('✅') ? '#0f5132' : '#842029',
                        backgroundColor: mensaje.startsWith('✅')
                            ? '#d1e7dd'
                            : '#f8d7da',
                        border: `1px solid ${
                            mensaje.startsWith('✅') ? '#badbcc' : '#f5c2c7'
                        }`,
                    }}
                >
                    {mensaje}
                </div>
            )}

            {cargando && <Spinner label='Eliminando materia...' />}

            <Dialog
                hidden={!mostrarModal}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Confirmar eliminación',
                    subText: `¿Está seguro de que desea eliminar la materia "${materiaSeleccionada?.nombre}" y todas sus relaciones? Esta acción no se puede deshacer.`,
                }}
                onDismiss={() => setMostrarModal(false)}
            >
                <DialogFooter>
                    <PrimaryButton
                        onClick={eliminarMateria}
                        text='Sí, eliminar'
                    />
                    <DefaultButton
                        onClick={() => setMostrarModal(false)}
                        text='Cancelar'
                    />
                </DialogFooter>
            </Dialog>
        </section>
    )
}

export default BajaMateria
