import * as React from 'react'
import styles from './AltaMateria.module.scss'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import type { IAltaMateriaProps } from './IAltaMateriaProps'

interface Carrera {
    ID: number
    codigoCarrera: string
    nombre: string
}

const AltaMateria: React.FC<IAltaMateriaProps> = (props): JSX.Element => {
    const sp = getSP(props.context)

    const [carreras, setCarreras] = React.useState<Carrera[]>([])
    const [selectedCarreraId, setSelectedCarreraId] = React.useState<
        number | null
    >(null)
    const [codMateria, setCodMateria] = React.useState('')
    const [nombreMateria, setNombreMateria] = React.useState('')
    const [anio, setAnio] = React.useState<number>(1)
    const [correlativasInput, setCorrelativasInput] = React.useState('')
    const [mensaje, setMensaje] = React.useState('')
    const [cargando, setCargando] = React.useState(false)

    React.useEffect((): void => {
        const fetchCarreras = async (): Promise<void> => {
            try {
                const result: Carrera[] = await sp.web.lists
                    .getByTitle('Carrera')
                    .items.select('ID', 'codigoCarrera', 'nombre')()
                setCarreras(result)
            } catch (error) {
                console.error('Error al cargar carreras:', error)
            }
        }

        fetchCarreras().catch(console.error)
    }, [])

    const handleSubmit = async (): Promise<void> => {
        setMensaje('')
        setCargando(true)

        const cod = codMateria.trim()
        const nom = nombreMateria.trim()

        if (!selectedCarreraId || !cod || !nom || !anio) {
            setMensaje('Por favor, complete todos los campos.')
            setCargando(false)
            return
        }

        if (!/^[0-9]{3,4}$/.test(cod)) {
            setMensaje('El código de materia debe ser un número de 4 dígitos.')
            setCargando(false)
            return
        }

        try {
            const codigoExiste = await sp.web.lists
                .getByTitle('Materia')
                .items.filter(`codMateria eq '${cod}'`)
                .top(1)()
            if (codigoExiste.length > 0) {
                setMensaje('Error: Ya existe una materia con ese código.')
                setCargando(false)
                return
            }

            const nombreExiste = await sp.web.lists
                .getByTitle('Materia')
                .items.filter(`nombre eq '${nom.replace("'", "''")}'`)
                .top(1)()
            if (nombreExiste.length > 0) {
                setMensaje('Error: Ya existe una materia con ese nombre.')
                setCargando(false)
                return
            }

            await sp.web.lists.getByTitle('Materia').items.add({
                codMateria: cod,
                nombre: nom,
                anio,
            })

            let nuevaMateriaId: number | null = null
            const maxIntentos = 5

            for (let i = 0; i < maxIntentos; i++) {
                const nuevaMateria = await sp.web.lists
                    .getByTitle('Materia')
                    .items.filter(
                        `codMateria eq '${cod}' and nombre eq '${nom.replace(
                            "'",
                            "''"
                        )}'`
                    )
                    .top(1)()
                if (nuevaMateria.length > 0) {
                    nuevaMateriaId = nuevaMateria[0].ID
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }

            if (!nuevaMateriaId) {
                throw new Error(
                    'No se pudo confirmar la creación de la materia.'
                )
            }

            const relacionExiste = await sp.web.lists
                .getByTitle('MateriaCarrera')
                .items.filter(
                    `CodMateriaId eq ${nuevaMateriaId} and codCarreraId eq ${selectedCarreraId}`
                )
                .top(1)()

            if (relacionExiste.length === 0) {
                await sp.web.lists.getByTitle('MateriaCarrera').items.add({
                    CodMateriaId: nuevaMateriaId,
                    codCarreraId: selectedCarreraId,
                })
            }

            const codsCorrelativas = correlativasInput
                .split(',')
                .map((c) => c.trim())
                .filter((c) => c)

            for (const codCorrelativa of codsCorrelativas) {
                const correlativa = await sp.web.lists
                    .getByTitle('Materia')
                    .items.filter(`codMateria eq '${codCorrelativa}'`)
                    .top(1)()

                if (correlativa.length > 0) {
                    await sp.web.lists.getByTitle('Correlativa').items.add({
                        codMateriaId: nuevaMateriaId,
                        codMateriaRequeridaId: correlativa[0].ID,
                    })
                } else {
                    throw new Error(
                        `No se encontró la materia con código ${codCorrelativa} como correlativa.`
                    )
                }
            }

            setMensaje(
                '✅ Materia, relación y correlativas cargadas correctamente.'
            )
            setCodMateria('')
            setNombreMateria('')
            setAnio(1)
            setSelectedCarreraId(null)
            setCorrelativasInput('')
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('❌ Error:', error)
                setMensaje(
                    `Error: ${error.message || 'Ocurrió un error inesperado.'}`
                )
            } else {
                setMensaje('Error desconocido')
            }
        } finally {
            setCargando(false)
        }
    }

    return (
        <section className={styles.altaMateria}>
            <h3>Alta de Materia</h3>

            <div className={styles.controls}>
                <label>Carrera:</label>
                <select
                    value={selectedCarreraId ?? ''}
                    onChange={(e) =>
                        setSelectedCarreraId(Number(e.target.value))
                    }
                >
                    <option value=''>Seleccione una carrera</option>
                    {carreras.map((c) => (
                        <option key={c.ID} value={c.ID}>
                            {c.nombre} ({c.codigoCarrera})
                        </option>
                    ))}
                </select>

                <label>Código de materia:</label>
                <input
                    type='text'
                    value={codMateria}
                    onChange={(e) => setCodMateria(e.target.value)}
                />

                <label>Nombre de la materia:</label>
                <input
                    type='text'
                    value={nombreMateria}
                    onChange={(e) => setNombreMateria(e.target.value)}
                />

                <label>Correlativas (códigos separados por coma):</label>
                <input
                    type='text'
                    value={correlativasInput}
                    onChange={(e) => setCorrelativasInput(e.target.value)}
                    placeholder='Ej: 3621,3623'
                />

                <label>Año:</label>
                <input
                    type='number'
                    min={1}
                    max={5}
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                />

                <button className={styles.botonCargar} onClick={handleSubmit}>
                    Cargar materia
                </button>
            </div>

            {cargando && (
                <div className={styles.loader}>
                    <Spinner label='Cargando materia...' />
                </div>
            )}

            {mensaje && <p className={styles.mensaje}>{mensaje}</p>}
        </section>
    )
}

export default AltaMateria
