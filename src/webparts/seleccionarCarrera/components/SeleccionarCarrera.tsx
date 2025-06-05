import * as React from 'react'
import { useEffect, useState } from 'react'
import { Dropdown, PrimaryButton, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from './ISeleccionarCarreraProps'
import { ICarreraItem } from '../../../interfaces'
import CargarMateriasAprobadasInicial from '../../cargarMateriasAprobadasInicial/components/CargarMateriasAprobadasInicial'
import styles from './SeleccionarCarrera.module.scss'

const SeleccionarCarrera: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)

    const [carreras, setCarreras] = useState<ICarreraItem[]>([])
    const [selectedCarreraId, setSelectedCarreraId] = useState<string>('')
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
            console.warn('Faltan datos para guardar')
            return
        }

        try {
            await sp.web.lists.getByTitle('Inscripto').items.add({
                idEstudianteId: estudianteId,
                idCarreraId: parseInt(selectedCarreraId),
            })
            alert('Carrera seleccionada correctamente.')
            setMostrarCargaMaterias(true)
        } catch (error) {
            console.error('Error al guardar inscripción:', error)
        }
    }

    if (loading) {
        return <Spinner label='Cargando datos...' />
    }

    if (mostrarCargaMaterias) {
        return (
            <CargarMateriasAprobadasInicial
                context={context}
                description=''
                environmentMessage=''
                hasTeamsContext={false}
                isDarkTheme={false}
                userDisplayName=''
            />
        )
    }

    return (
        <div className={styles.seleccionarCarrera}>
            <h2 className={styles.titulo}>Bienvenido a Circo Studio</h2>
            <p className={styles.descripcion}>
                Seleccioná tu carrera para continuar:
            </p>
            <Dropdown
                className={styles.dropdown}
                label='Carrera'
                placeholder='Elegí una carrera'
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
                    className={styles.boton}
                    text='Confirmar'
                    onClick={guardarSeleccion}
                    disabled={!selectedCarreraId || !estudianteId}
                />
            </div>
        </div>
    )
}

export default SeleccionarCarrera
