import * as React from 'react'
import { useEffect, useState, useContext } from 'react'
import { Dropdown, PrimaryButton, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from './ISeleccionarCarreraProps'
import { ICarreraItem } from '../../../interfaces'
import { useNavigate } from 'react-router-dom'
import { UserPresetContext } from '../../../app'

const SeleccionarCarrera: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const navigate = useNavigate()
    const { setIsPreset } = useContext(UserPresetContext)

    const [carreras, setCarreras] = useState<ICarreraItem[]>([])
    const [selectedCarreraId, setSelectedCarreraId] = useState<string>('')
    const [estudianteId, setEstudianteId] = useState<number | null>(null)
    const [loading, setLoading] = useState<boolean>(true)

    const cargarDatos = async (): Promise<void> => {
        try {
            const user = await sp.web.currentUser()
            const currentUserId = user.Id

            const estudianteItems = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()

            const coincidencia = estudianteItems.find(
                (item) => item.usuario?.Id === currentUserId
            )

            if (!coincidencia) {
                console.error('❌ No se encontró el estudiante relacionado.')
                return
            }

            const estudianteID = coincidencia.ID
            setEstudianteId(estudianteID)

            const inscriptoItems = await sp.web.lists
                .getByTitle('Inscripto')
                .items.filter(`idEstudianteId eq ${estudianteID}`)()

            if (inscriptoItems.length > 0) {
                console.log(
                    '✅ Estudiante ya tiene una carrera asociada. Redireccionando...'
                )
                setIsPreset(true)
                localStorage.setItem('userPreset', 'true')
                navigate('/preset/cargar-aprobadas')
                return
            }

            const carrerasData: ICarreraItem[] = await sp.web.lists
                .getByTitle('Carrera')
                .items.select('Id', 'nombre')()

            console.log('📚 Carreras cargadas:', carrerasData)
            setCarreras(carrerasData)
        } catch (error) {
            console.error('Error cargando datos:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarDatos().catch(console.error)
    }, [])

    const guardarSeleccion = async (): Promise<void> => {
        if (!selectedCarreraId || !estudianteId) {
            console.warn('⚠️ Faltan datos para guardar')
            return
        }

        try {
            await sp.web.lists.getByTitle('Inscripto').items.add({
                idEstudianteId: estudianteId,
                idCarreraId: parseInt(selectedCarreraId),
            })

            alert('✅ Carrera seleccionada correctamente.')

            setIsPreset(true)
            localStorage.setItem('userPreset', 'true')
            navigate('/preset/cargar-aprobadas')
        } catch (error) {
            console.error('Error al guardar inscripción:', error)
        }
    }

    if (loading) {
        return <Spinner label='Cargando datos...' />
    }

    return (
        <div style={{ maxWidth: '400px', margin: 'auto' }}>
            <h2 style={{ textAlign: 'center' }}>Bienvenido a Circo Studio</h2>
            <p style={{ textAlign: 'center' }}>
                Seleccioná tu carrera para continuar:
            </p>
            <Dropdown
                label='Carrera'
                placeholder='Elegí una carrera'
                styles={{ root: { zIndex: 1000 } }} // Soluciona problemas de despliegue
                options={carreras.map((c) => ({
                    key: c.Id,
                    text: c.nombre,
                }))}
                selectedKey={
                    selectedCarreraId ? parseInt(selectedCarreraId) : undefined
                }
                onChange={(_, option) =>
                    setSelectedCarreraId(String(option?.key))
                }
            />
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <PrimaryButton
                    text='Confirmar'
                    onClick={guardarSeleccion}
                    disabled={!selectedCarreraId || !estudianteId}
                />
            </div>
        </div>
    )
}

export default SeleccionarCarrera
