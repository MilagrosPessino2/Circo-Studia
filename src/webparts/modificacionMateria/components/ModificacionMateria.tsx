// src/webparts/modificacionMateria/components/ModificacionMateria.tsx
import * as React from 'react'
import styles from './ModificacionMateria.module.scss'
import type { IModificacionMateriaProps } from './IModificacionMateriaProps'
import { getSP } from '../../../pnpjsConfig'
import { Spinner } from '@fluentui/react'

interface Materia {
    ID: number
    codMateria: string
    nombre: string
    anio: number
}

const ModificacionMateria: React.FC<IModificacionMateriaProps> = (props) => {
    const sp = getSP(props.context)

    const [materias, setMaterias] = React.useState<Materia[]>([])
    const [materiaSeleccionada, setMateriaSeleccionada] =
        React.useState<Materia | null>(null)
    const [mensaje, setMensaje] = React.useState('')
    const [cargando, setCargando] = React.useState(false)

    const fetchMaterias = async (): Promise<void> => {
        const result = await sp.web.lists
            .getByTitle('Materia')
            .items.select('ID', 'codMateria', 'nombre', 'anio')()
        setMaterias(result)
    }

    React.useEffect(() => {
        fetchMaterias().catch(console.error)
    }, [])

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
            // Verificar si otro registro ya tiene ese código
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

            // Verificar si otro registro ya tiene ese nombre
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

            // Refrescar lista de materias
            const nuevasMaterias = await sp.web.lists
                .getByTitle('Materia')
                .items.select('ID', 'codMateria', 'nombre', 'anio')()
            setMaterias(nuevasMaterias)
        } catch (error: unknown) {
            console.error('Error al actualizar materia:', error)
            if (error instanceof Error) {
                setMensaje(`❌ Error: ${error.message}`)
            } else {
                setMensaje('❌ Error desconocido')
            }
        } finally {
            setCargando(false) // 🔧 IMPORTANTE: desactiva el spinner siempre
        }
    }
    const convertirNombresAMayuscula = async (): Promise<void> => {
        setCargando(true)
        setMensaje('')
        try {
            const items = await sp.web.lists
                .getByTitle('Materia')
                .items.top(5000)()
            for (const item of items) {
                if (
                    typeof item.nombre === 'string' &&
                    item.nombre !== item.nombre.toUpperCase()
                ) {
                    await sp.web.lists
                        .getByTitle('Materia')
                        .items.getById(item.ID)
                        .update({ nombre: item.nombre.toUpperCase() })
                }
            }

            setMensaje('✅ Todos los nombres fueron pasados a mayúscula.')
            await fetchMaterias()
        } catch (error: unknown) {
            console.error('Error al convertir a mayúscula:', error)
            setMensaje('❌ Error al convertir nombres a mayúscula.')
        } finally {
            setCargando(false)
        }
    }

    return (
        <section className={styles.modificacionMateria}>
            <h3 className={styles.titulo}>Modificación de Materia</h3>

            <label>Seleccionar materia:</label>
            <select
                value={materiaSeleccionada?.ID ?? ''}
                onChange={(e) => {
                    const id = Number(e.target.value)
                    const materia = materias.find((m) => m.ID === id) || null
                    setMateriaSeleccionada(materia)
                    setMensaje('')
                }}
            >
                <option value=''>Seleccione una materia</option>
                {materias.map((m) => (
                    <option key={m.ID} value={m.ID}>
                        {m.nombre} ({m.codMateria})
                    </option>
                ))}
            </select>

            {materiaSeleccionada && (
                <div className={styles.formulario}>
                    <label>Nombre:</label>
                    <input
                        type='text'
                        value={materiaSeleccionada.nombre}
                        onChange={(e) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                nombre: e.target.value,
                            })
                        }
                    />

                    <label>Código:</label>
                    <input
                        type='text'
                        value={materiaSeleccionada.codMateria}
                        onChange={(e) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                codMateria: e.target.value,
                            })
                        }
                    />

                    <label>Año:</label>
                    <input
                        type='number'
                        min={1}
                        max={5}
                        value={materiaSeleccionada.anio}
                        onChange={(e) =>
                            setMateriaSeleccionada({
                                ...materiaSeleccionada,
                                anio: Number(e.target.value),
                            })
                        }
                    />

                    <button onClick={handleGuardar}>Guardar cambios</button>
                </div>
            )}

            <button
                onClick={convertirNombresAMayuscula}
                style={{ marginTop: '1rem' }}
            >
                Pasar a mayúscula
            </button>

            {cargando && <Spinner label='Actualizando materia...' />}
            {mensaje && <p className={styles.texto}>{mensaje}</p>}
        </section>
    )
}

export default ModificacionMateria
