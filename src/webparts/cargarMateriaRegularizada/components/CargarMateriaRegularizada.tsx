import * as React from 'react'
import { useEffect, useState } from 'react'
import { PrimaryButton, Checkbox } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriaRegularizadaProps } from './ICargarMateriaRegularizadaProps'
import { useNavigate } from 'react-router-dom'

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
}

const runAsync = (fn: () => Promise<void>): void => {
    fn().catch(console.error)
}

const CargarMateriasRegularizadas: React.FC<
    ICargarMateriaRegularizadaProps
> = ({
    context,
    description,
    isDarkTheme,
    environmentMessage,
    hasTeamsContext,
    userDisplayName,
}) => {
    const sp = getSP(context)
    const navigate = useNavigate()

    const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('')
    const [carreraId, setCarreraId] = useState<number | null>(null)
    const [materias, setMaterias] = useState<IMateria[]>([])
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(
        null
    )

    useEffect(() => {
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

    useEffect(() => {
        const fetchMaterias = async (): Promise<void> => {
            if (!carreraId) return
            try {
                const items = await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.filter(`codCarreraId eq ${carreraId}`)
                    .select('CodMateria/ID', 'CodMateria/nombre')
                    .expand('CodMateria')()

                const materiasFormateadas: IMateria[] = items
                    .filter((item) => item.CodMateria)
                    .map((item) => ({
                        id: item.CodMateria.ID,
                        nombre: item.CodMateria.nombre,
                        checked: false,
                    }))
                setMaterias(materiasFormateadas)
            } catch (error) {
                console.error('Error al obtener materias:', error)
            }
        }
        runAsync(fetchMaterias)
    }, [carreraId])

    const handleCheckboxChange = (id: number): void => {
        setMaterias((prev) =>
            prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
        )
    }

    const handleVolver = (): void => {
        navigate('/preset/cargar-aprobadas') // ✅ Redirige al paso anterior
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

            if (nuevasMaterias.length === 0) {
                setMensaje('Todas las materias ya estaban registradas.')
                setTipoMensaje('error')
                return
            }

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

            // ✅ Redirigir al próximo paso
            navigate('/preset/select-materias-en-curso')
        } catch (error) {
            console.error('Error al guardar materias:', error)
            setMensaje('Error al guardar materias.')
            setTipoMensaje('error')
        }
    }

    const renderTitulo = (): string => {
        const nombre = carreraSeleccionada.trim().toLowerCase()
        if (nombre.includes('web'))
            return 'Materias regularizadas - Tecnicatura Web'
        if (nombre.includes('ingenier'))
            return 'Materias regularizadas - Ingeniería Informática'
        return 'Materias regularizadas'
    }

    return (
        <div style={{ textAlign: 'center' }}>
            <PrimaryButton text='Volver' onClick={handleVolver} />
            <PrimaryButton
                text='Guardar'
                onClick={handleGuardarMaterias}
                disabled={materias.every((m) => !m.checked)}
                style={{ marginLeft: 10, marginTop: 20 }}
            />
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

            <h2>{renderTitulo()}</h2>

            {materias.length > 0 ? (
                <div
                    style={{
                        maxWidth: '400px',
                        margin: '0 auto',
                        textAlign: 'left',
                    }}
                >
                    {materias.map((materia) => (
                        <Checkbox
                            key={materia.id}
                            label={materia.nombre}
                            checked={materia.checked}
                            onChange={() => handleCheckboxChange(materia.id)}
                        />
                    ))}
                </div>
            ) : (
                <p>No hay materias disponibles.</p>
            )}
        </div>
    )
}

export default CargarMateriasRegularizadas
