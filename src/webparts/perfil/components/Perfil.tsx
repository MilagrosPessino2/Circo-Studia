import * as React from 'react'
import type { IPerfilProps } from './IPerfilProps'
import Menu from '../../menu/components/Menu'
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'
import styles from './Perfil.module.scss'
import Mensaje from '../../../utils/mensaje/mensaje'
import Boton from '../../../utils/boton/Boton';

const PerfilEstudiante: React.FC<IPerfilProps> = ({ context }) => {
    const sp = getSP(context)
    const [nombre, setNombre] = useState<string>('Estudiante')
    const [email, setEmail] = useState<string>('Estudiante')
    const [foto, setFoto] = useState<string>('')
    const [emailPersonal, setEmailPersonal] = useState<string>('')
    const [mensaje, setMensaje] = useState<string | null>(null)
    const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)

    useEffect(() => {
        const cargarDatosPerfil = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                setNombre(user.Title)
                setEmail(user.Email)
                const imagen = `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(
                    user.LoginName
                )}&size=M`
                setFoto(imagen)

                const estudiantes = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id', 'emailPersonal')
                    .expand('usuario')()

                const estudiante = estudiantes.find(
                    (e) => e.usuario?.Id === user.Id
                )
                if (estudiante) {
                    setEmailPersonal(estudiante.emailPersonal || '')
                }
            } catch (error) {
                console.error('Error cargando datos del perfil:', error)
                setMensaje('Error al cargar el perfil.')
                setTipoMensaje('error')
            }
        }

        cargarDatosPerfil().catch(console.error)
    }, [context])

    const guardarEmail = async (): Promise<void> => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(emailPersonal.trim())) {
            setMensaje('El email ingresado no tiene un formato válido.')
            setTipoMensaje('error')
            return
        }

        try {
            const user = await sp.web.currentUser()
            const estudiantes = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()

            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )
            if (!estudiante) throw new Error('Estudiante no encontrado')

            await sp.web.lists
                .getByTitle('Estudiante')
                .items.getById(estudiante.ID)
                .update({
                    emailPersonal: emailPersonal,
                })
            
            setMensaje('Email personal guardado correctamente.')
            setTipoMensaje('exito')
        } catch (error) {
            console.error('Error al guardar el email:', error)
            setMensaje('Error al guardar el email personal.')
            setTipoMensaje('error')
        }
    }

    return (
        <div className={styles.perfilContainer}>
            <Menu context={context} />
            <main className={styles.mainContent}>
                <div className={styles.perfilInfo}>
                    <img
                        src={
                            foto ||
                            'https://static.thenounproject.com/png/5034901-200.png'
                        }
                        alt='Foto de perfil'
                        className={styles.foto}
                    />
                    <div className={styles.textos}>
                        <div className={styles.nombre}>{nombre}</div>
                        <div className={styles.email}>{email}</div>
                    </div>
                </div>

                <div className={styles.formulario}>
                    <h3>📬 Email Personal</h3>
                    <input
                        type='email'
                        placeholder='Ingresá tu email personal'
                        value={emailPersonal}
                        onChange={(e) => setEmailPersonal(e.target.value)}
                        className={styles.inputMail}
                    />
                    <Boton onClick={guardarEmail}> Guardar Email </Boton>

                    {mensaje && tipoMensaje && (
                        <Mensaje
                            texto={mensaje}
                            tipo={tipoMensaje}
                            onCerrar={() => setMensaje(null)}
                        />
                    )}
                </div>
            </main>
        </div>
    )
}

export default PerfilEstudiante
