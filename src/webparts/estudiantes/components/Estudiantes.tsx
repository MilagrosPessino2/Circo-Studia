import * as React from 'react'
import { IEstudiantesProps } from './IEstudiantesProps'
import { getSP } from '../../../pnpjsConfig'
import Menu from '../../menu/components/Menu'
import styles from './Estudiantes.module.scss'
import { PrimaryButton, Spinner, SpinnerSize, Text } from '@fluentui/react'
import { UserPicker, IUserInfo } from '@pnp/spfx-controls-react/lib/userPicker'

const Estudiantes: React.FC<IEstudiantesProps> = ({ context }) => {
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
                console.log('Procesando usuario:', usuario)

                if (!usuario.userPrincipalName) {
                    console.warn('Usuario sin userPrincipalName, se omite.')
                    continue
                }

                const user = await sp.web.ensureUser(usuario.userPrincipalName)
                const usuarioId = user.Id
                console.log('Usuario asegurado. ID:', usuarioId)

                const yaExiste = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.filter(`usuarioId eq ${usuarioId}`)
                    .top(1)()

                console.log('¿Ya existe estudiante?:', yaExiste.length > 0)

                if (yaExiste.length === 0) {
                    const nuevo = await sp.web.lists
                        .getByTitle('Estudiante')
                        .items.add({
                            usuarioId,
                            emailPersonal: '',
                            preset: false,
                        })

                    console.log('Respuesta completa:', nuevo)
                    console.log('nuevo.data:', nuevo?.data)

                    const idEstudiante = nuevo?.data?.ID
                    console.log(
                        'Nuevo estudiante agregado con ID:',
                        idEstudiante
                    )

                    if (idEstudiante) {
                        try {
                            const asignado = await sp.web.lists
                                .getByTitle('AsignadoA')
                                .items.add({
                                    idEstudianteId: idEstudiante,
                                    idRolId: 2,
                                })
                            console.log(
                                '✅ Registro creado en AsignadoA:',
                                asignado
                            )
                        } catch (asignadoError) {
                            console.error(
                                '❌ Error al crear registro en AsignadoA',
                                asignadoError
                            )
                        }
                    } else {
                        console.warn(
                            'No se pudo obtener el ID del nuevo estudiante.'
                        )
                    }
                }
            }

            setMensaje('✅ Estudiantes agregados correctamente.')
            setUsuariosSeleccionados([])
        } catch (err) {
            console.error('❌ Error general al agregar estudiantes:', err)
            setError('❌ Error al agregar estudiantes.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.layout}>
            <Menu context={context} />
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
        </div>
    )
}

export default Estudiantes
