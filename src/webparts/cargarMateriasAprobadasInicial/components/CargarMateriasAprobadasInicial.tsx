import * as React from 'react'
import { useState } from 'react'
import { PrimaryButton, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriasAprobadasInicialProps } from './ICargarMateriasAprobadasInicialProps'
import SeleccionarCarrera from '../../seleccionarCarrera/components/SeleccionarCarrera'

const CargarMateriasAprobadasInicial: React.FC<
    ICargarMateriasAprobadasInicialProps
> = ({
    context,
    description,
    isDarkTheme,
    environmentMessage,
    hasTeamsContext,
    userDisplayName,
}) => {
    const sp = getSP(context)

    const [volverASeleccionarCarrera, setVolverASeleccionarCarrera] =
        useState(false)
    const [eliminando, setEliminando] = useState(false)

    const handleVolver = async (): Promise<void> => {
        try {
            setEliminando(true)
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
                console.error('Estudiante no encontrado')
                return
            }

            const estudianteID = coincidencia.ID

            const inscriptos = await sp.web.lists
                .getByTitle('Inscripto')
                .items.filter(`idEstudianteId eq ${estudianteID}`)
                .select('Id')()

            await Promise.all(
                inscriptos.map((item) =>
                    sp.web.lists
                        .getByTitle('Inscripto')
                        .items.getById(item.Id)
                        .recycle()
                )
            )

            let retries = 0
            let inscriptosRestantes = [{}]
            while (inscriptosRestantes.length > 0 && retries < 10) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                inscriptosRestantes = await sp.web.lists
                    .getByTitle('Inscripto')
                    .items.filter(`idEstudianteId eq ${estudianteID}`)
                    .select('Id')()
                retries++
            }

            setVolverASeleccionarCarrera(true)
        } catch (error) {
            console.error('Error al volver y eliminar inscripción:', error)
        } finally {
            setEliminando(false)
        }
    }

    if (volverASeleccionarCarrera) {
        return (
            <SeleccionarCarrera
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
        <div style={{ textAlign: 'center' }}>
            {eliminando ? (
                <Spinner label='Eliminando inscripción...' />
            ) : (
                <PrimaryButton text='Volver' onClick={handleVolver} />
            )}
            <h2>Componente: CargarMateriasAprobadasInicial</h2>
        </div>
    )
}

export default CargarMateriasAprobadasInicial
