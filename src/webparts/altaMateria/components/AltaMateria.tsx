import * as React from 'react'
import styles from './AltaMateria.module.scss'
import {
    Spinner,
    TextField,
    Dropdown,
    IDropdownOption,
} from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import type { IAltaMateriaProps } from './IAltaMateriaProps'
import Boton from '../../../utils/boton/Boton'

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
    const [errores, setErrores] = React.useState({
        codMateria: false,
        nombreMateria: false,
        correlativas: false,
    })

    React.useEffect(() => {
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
        const codsCorrelativas = correlativasInput
            .split('/')
            .map((c) => c.trim())
            .filter((c) => c)

        const nuevosErrores = {
            codMateria: !/^\d{3,4}$/.test(cod),
            nombreMateria: !nom,
            correlativas:
                correlativasInput.trim() !== '' &&
                codsCorrelativas.some((c) => !/^\d{3,4}$/.test(c)),
        }

        if (
            !selectedCarreraId ||
            !cod ||
            !nom ||
            !anio ||
            Object.values(nuevosErrores).some(Boolean)
        ) {
            setErrores(nuevosErrores)
            if (nuevosErrores.codMateria) {
                setMensaje(
                    'El código de materia debe ser un número de 3 o 4 dígitos.'
                )
            } else if (nuevosErrores.nombreMateria) {
                setMensaje('Por favor, completá el nombre de la materia.')
            } else if (nuevosErrores.correlativas) {
                setMensaje(
                    'Error: Se ingresaron códigos de correlativas no válidos.'
                )
            } else {
                setMensaje('Por favor, completá todos los campos.')
            }
            setCargando(false)
            return
        }

        setErrores({
            codMateria: false,
            nombreMateria: false,
            correlativas: false,
        })

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

            await sp.web.lists
                .getByTitle('Materia')
                .items.add({ codMateria: cod, nombre: nom, anio })

            let nuevaMateriaId: number | null = null
            for (let i = 0; i < 5; i++) {
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

            if (!nuevaMateriaId)
                throw new Error(
                    'No se pudo confirmar la creación de la materia.'
                )

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

    const opcionesCarrera: IDropdownOption[] = carreras.map((c) => ({
        key: c.ID,
        text: `${c.nombre} (${c.codigoCarrera})`,
    }))

    return (
        <section className={styles.altaMateria}>
            <h3 className={styles.titulo}>Alta de Materia</h3>
            

            <div className={styles.controls}>
                <Dropdown
                    label='Carrera'
                    placeholder='Seleccionar carrera'
                    options={opcionesCarrera}
                    selectedKey={selectedCarreraId ?? undefined}
                    onChange={(_, option) =>
                        setSelectedCarreraId(Number(option?.key))
                    }
                />

                <TextField
                    label='Código de materia'
                    value={codMateria}
                    onChange={(_, newValue) =>
                        setCodMateria((newValue ?? '').replace(/\D/g, ''))
                    }
                    errorMessage={
                        errores.codMateria
                            ? 'Debe ser un número de 3 o 4 dígitos.'
                            : undefined
                    }
                />

                <TextField
                    label='Nombre de la materia'
                    value={nombreMateria}
                    onChange={(_, newValue) =>
                        setNombreMateria((newValue ?? '').toUpperCase())
                    }
                    errorMessage={
                        errores.nombreMateria ? 'Campo requerido' : undefined
                    }
                />

                <TextField
                    label='Correlativas (códigos separados por /)'
                    value={correlativasInput}
                    onChange={(_, newValue) =>
                        setCorrelativasInput(newValue ?? '')
                    }
                    placeholder='Ej: 3621/3623'
                    errorMessage={
                        errores.correlativas ? 'Formato inválido' : undefined
                    }
                />

                <TextField
                    label='Año'
                    type='number'
                    value={anio.toString()}
                    min={1}
                    max={5}
                    onChange={(_, newValue) => setAnio(Number(newValue))}
                />

               <Boton onClick={handleSubmit}>Cargar materia</Boton>
            </div>

            {cargando && (
                <div className={styles.loader}>
                    <Spinner label='Cargando materia...' />
                </div>
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
        </section>
    )
}

export default AltaMateria
