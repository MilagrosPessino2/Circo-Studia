import * as React from 'react'
import { useEffect, useState } from 'react'
import {
    Dropdown,
    IDropdownOption,
    PrimaryButton,
    Spinner,
} from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from './ISeleccionarCarreraProps'
import { ICarreraItem } from '../../../interfaces'
import CargarMateriasAprobadasInicial from '../../cargarMateriasAprobadasInicial/components/CargarMateriasAprobadasInicial'

const SeleccionarCarrera: React.FC<ISeleccionarCarreraProps> = ({
    context,
    description,
    isDarkTheme,
    environmentMessage,
    hasTeamsContext,
    userDisplayName,
}): JSX.Element => {
    const sp = getSP(context)

    const [carreras, setCarreras] = useState<IDropdownOption[]>([])
    const [selectedCarreraId, setSelectedCarreraId] = useState<
        number | undefined
    >()
    const [estudianteId, setEstudianteId] = useState<number | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [mostrarCargaMaterias, setMostrarCargaMaterias] =
        useState<boolean>(false)

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
                console.error('No se encontró el estudiante relacionado.')
                setLoading(false)
                return
            }

            const estudianteID = coincidencia.ID
            setEstudianteId(estudianteID)

            const inscriptoItems = await sp.web.lists
                .getByTitle('Inscripto')
                .items.filter(`idEstudianteId eq ${estudianteID}`)()

            if (inscriptoItems.length > 0) {
                setMostrarCargaMaterias(true)
                return
            }

            const carrerasData: ICarreraItem[] = await sp.web.lists
                .getByTitle('Carrera')
                .items.select('Id', 'nombre')()

            const opciones: IDropdownOption[] = carrerasData.map((carrera) => ({
                key: carrera.Id,
                text: carrera.nombre,
            }))
            setCarreras(opciones)
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
            console.warn('Faltan datos para guardar')
            return
        }

        try {
            await sp.web.lists.getByTitle('Inscripto').items.add({
                idEstudianteId: estudianteId,
                idCarreraId: selectedCarreraId,
            })

            alert('Carrera seleccionada correctamente.')
            setMostrarCargaMaterias(true)
        } catch (error) {
            console.error('Error al guardar inscripción:', error)
        }
    }

    if (loading) {
        return <Spinner label='Cargando opciones...' />
    }

    if (mostrarCargaMaterias) {
        return (
            <CargarMateriasAprobadasInicial
                context={context}
                description={description}
                isDarkTheme={isDarkTheme}
                environmentMessage={environmentMessage}
                hasTeamsContext={hasTeamsContext}
                userDisplayName={userDisplayName}
            />
        )
    }

    return (
        <div>
            <h2>Bienvenido a Circo Studio</h2>
            <p>Seleccioná tu carrera para continuar:</p>
            <Dropdown
                placeholder='Elegí una carrera'
                label='Carrera'
                options={carreras}
                onChange={(_, option): void =>
                    setSelectedCarreraId(Number(option?.key))
                }
            />
            <PrimaryButton
                text='Confirmar'
                onClick={guardarSeleccion}
                disabled={!selectedCarreraId || !estudianteId}
            />
        </div>
    )
}

export default SeleccionarCarrera
