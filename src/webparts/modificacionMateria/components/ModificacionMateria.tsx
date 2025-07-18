import * as React from 'react'
import styles from './ModificacionMateria.module.scss'
import type { IModificacionMateriaProps } from './IModificacionMateriaProps'
import { getSP } from '../../../pnpjsConfig'
import {
    Dropdown,
    ComboBox,
    Spinner,
    PrimaryButton,
    TextField,
} from '@fluentui/react'

interface MateriaExpandida {
    ID: number
    codMateria: string
    nombre: string
    codCarrera: string
    anio: number
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
        anio: number
    }
}

const ModificacionMateria: React.FC<IModificacionMateriaProps> = (props) => {
    const sp = getSP(props.context)

    const [carreras, setCarreras] = React.useState<Carrera[]>([])
    const [todasLasMaterias, setTodasLasMaterias] = React.useState<
        MateriaExpandida[]
    >([])
    const [filtroCarreraId, setFiltroCarreraId] = React.useState<number | null>(
        null
    )
    const [materiaSeleccionada, setMateriaSeleccionada] =
        React.useState<MateriaExpandida | null>(null)
    const [textoSeleccionado, setTextoSeleccionado] = React.useState<
        string | undefined
    >(undefined)
    const [mensaje, setMensaje] = React.useState('')
    const [cargando, setCargando] = React.useState(false)

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
                            'CodMateria/anio',
                            'codCarrera/codigoCarrera'
                        )
                        .expand('CodMateria', 'codCarrera')()

                const materiasMapeadas: MateriaExpandida[] =
                    materiasCarreraRes.map((item) => ({
                        ID: item.CodMateria.ID,
                        codMateria: item.CodMateria.codMateria,
                        nombre: item.CodMateria.nombre,
                        codCarrera: item.codCarrera.codigoCarrera,
                        anio: item.CodMateria.anio,
                    }))

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

    const handleGuardar = async (): Promise<void> => {
        if (!materiaSeleccionada) return

        const cod = materiaSeleccionada.codMateria.trim()
        const nom = materiaSeleccionada.nombre.trim()
        const anio = materiaSeleccionada.anio

        if (!cod || !nom || !anio) {
            setMensaje('Por favor, complete todos los campos.')
            return
        }

        if (!/^[0-9]{3,4}$/.test(cod)) {
            setMensaje('El código debe ser un número de 4 dígitos.')
            return
        }

        setCargando(true)
        setMensaje('')

        try {
            const codigoExistente = await sp.web.lists
                .getByTitle('Materia')
                .items.filter(
                    `codMateria eq '${cod}' and ID ne ${materiaSeleccionada.ID}`
                )
                .top(1)()

            if (codigoExistente.length > 0) {
                setMensaje('⚠️ Ya existe otra materia con ese código.')
                return
            }

            const nombreExistente = await sp.web.lists
                .getByTitle('Materia')
                .items.filter(
                    `nombre eq '${nom.replace("'", "''")}' and ID ne ${
                        materiaSeleccionada.ID
                    }`
                )
                .top(1)()

            if (nombreExistente.length > 0) {
                setMensaje('⚠️ Ya existe otra materia con ese nombre.')
                return
            }

            await sp.web.lists
                .getByTitle('Materia')
                .items.getById(materiaSeleccionada.ID)
                .update({
                    codMateria: cod,
                    nombre: nom,
                    anio,
                })

            setMensaje('✅ Materia actualizada correctamente.')
        } catch (error: unknown) {
            console.error('Error al actualizar materia:', error)
            if (error instanceof Error) {
                setMensaje(`❌ Error: ${error.message}`)
            } else {
                setMensaje('❌ Error desconocido')
            }
        } finally {
            setCargando(false)
        }
    }

    return (
        <section className={styles.modificacionMateria}>
            <h3 className={styles.titulo}>Modificación de Materia</h3>

            <Dropdown
                placeholder='Seleccionar carrera'
                options={carreras.map((c) => ({
                    key: c.ID,
                    text: `${c.nombre} (${c.codigoCarrera})`,
                }))}
                onChange={(_, option) =>
                    setFiltroCarreraId(option ? Number(option.key) : null)
                }
                selectedKey={filtroCarreraId ?? undefined}
                styles={{ root: { marginBottom: 10 } }}
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

                    setMateriaSeleccionada(materia ?? null)
                    setMensaje('')
                }}
                styles={{ root: { marginBottom: 10 } }}
            />

            {materiaSeleccionada && (
                <div className={styles.formulario}>
                    <TextField
                        label='Nombre'
                        value={materiaSeleccionada.nombre}
                        onChange={(_, newValue) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                nombre: newValue ?? '',
                            })
                        }
                    />

                    <TextField
                        label='Código'
                        value={materiaSeleccionada.codMateria}
                        onChange={(_, newValue) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                codMateria: newValue ?? '',
                            })
                        }
                    />

                    <TextField
                        label='Año'
                        type='number'
                        value={materiaSeleccionada.anio.toString()}
                        onChange={(_, newValue) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                anio: Number(newValue),
                            })
                        }
                    />

                    <PrimaryButton
                        text='Guardar cambios'
                        onClick={handleGuardar}
                        styles={{
                            root: {
                                backgroundColor: '#ffd900ff',
                                borderColor: '#ffd900ff',
                                color: 'black',
                            },
                            rootHovered: {
                                backgroundColor: '#ffd900ff',
                                borderColor: '#ffd900ff',
                            },
                        }}
                    />
                </div>
            )}

            {cargando && <Spinner label='Actualizando materia...' />}
            {mensaje && <p className={styles.texto}>{mensaje}</p>}
        </section>
    )
}

export default ModificacionMateria
