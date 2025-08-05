import * as React from 'react'
import { IEstudiantesProps } from './IEstudiantesProps'
import { getSP } from '../../../pnpjsConfig'
import styles from './Estudiantes.module.scss'
import { PrimaryButton, Spinner, SpinnerSize, Text } from '@fluentui/react'
import { UserPicker, IUserInfo } from '@pnp/spfx-controls-react/lib/userPicker'

interface Props extends IEstudiantesProps {
    onEstudianteAgregado?: () => void
}

const Estudiantes: React.FC<Props> = ({ context, onEstudianteAgregado }) => {
    const [usuariosSeleccionados, setUsuariosSeleccionados] = React.useState<
        IUserInfo[]
    >([])
    const [mensaje, setMensaje] = React.useState('')
    const [error, setError] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const sp = getSP(context)

    const onUsuariosSeleccionados = (usuarios: IUserInfo[]): void => {
        setUsuariosSeleccionados(usuarios)
        setMensaje('')
        setError('')
    }

    const agregarEstudiantes = async (): Promise<void> => {
        setMensaje('')
        setError('')
        setLoading(true)

        if (usuariosSeleccionados.length === 0) {
            setError('Seleccioná al menos un usuario.')
            setLoading(false)
            return
        }

        try {
            for (const usuario of usuariosSeleccionados) {
                if (!usuario.userPrincipalName) continue

                const user = await sp.web.ensureUser(usuario.userPrincipalName)
                const usuarioId = user.Id

                const yaExiste = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.filter(`usuarioId eq ${usuarioId}`)
                    .top(1)()

                if (yaExiste.length > 0) continue

                const nuevo = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.add({
                        usuarioId,
                        emailPersonal: '',
                        preset: false,
                    })

                let idEstudiante: number | null = nuevo?.data?.ID || null
                let intentos = 0
                while (!idEstudiante && intentos < 10) {
                    await new Promise((resolve) => setTimeout(resolve, 500))
                    const consulta = await sp.web.lists
                        .getByTitle('Estudiante')
                        .items.filter(`usuarioId eq ${usuarioId}`)
                        .top(1)()
                    idEstudiante = consulta?.[0]?.ID || null
                    intentos++
                }

                if (idEstudiante) {
                    await sp.web.lists.getByTitle('AsignadoA').items.add({
                        idEstudianteId: idEstudiante,
                        idRolId: 2,
                    })
                } else {
                    throw new Error('No se pudo obtener el ID del estudiante.')
                }
            }

            setMensaje('✅ Estudiantes agregados correctamente.')
            setUsuariosSeleccionados([])
            onEstudianteAgregado?.()
        } catch (err) {
            console.error('❌ Error al agregar estudiantes:', err)
            setError('❌ Error al agregar estudiantes.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.containerEstudiantes}>
            <h2>Agregar nuevos estudiantes</h2>

            <UserPicker
                context={context}
                label='Buscar usuarios'
                placeholder='Escribí nombre o mail'
                onSelectedUsers={onUsuariosSeleccionados}
                secondaryTextPropertyName='mail'
                userSelectionLimit={10}
            />

            <PrimaryButton
                text='Agregar Estudiantes'
                onClick={agregarEstudiantes}
                disabled={usuariosSeleccionados.length === 0 || loading}
                style={{ marginTop: 12 }}
            />

            {loading && (
                <Spinner
                    label='Agregando estudiantes...'
                    size={SpinnerSize.medium}
                    style={{ marginTop: 10 }}
                />
            )}

            <br />

            {mensaje && <Text style={{ color: 'green' }}>{mensaje}</Text>}
            {error && <Text style={{ color: 'red' }}>{error}</Text>}
        </div>
    )
}

export default Estudiantes
