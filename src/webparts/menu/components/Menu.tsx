import * as React from 'react'
import { useEffect, useState, FC } from 'react'
import { Link } from 'react-router-dom'
import { getSP } from '../../../pnpjsConfig'
import menuStyles from './Menu.module.scss'
import { WebPartContext } from '@microsoft/sp-webpart-base'

interface MenuProps {
    context: WebPartContext
}

const Menu: FC<MenuProps> = ({ context }): JSX.Element => {
    const sp = getSP(context)
    const [isAdmin, setIsAdmin] = useState<boolean>(false)
    const [isReady, setIsReady] = useState<boolean>(false)

    useEffect(() => {
        const verificarRolUsuario = async (): Promise<void> => {
            try {
                const usuario = await sp.web.currentUser()
                const emailUsuario = usuario.Email?.toLowerCase()

                const estudiantes = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/EMail')
                    .expand('usuario')
                    .filter(`usuario/EMail eq '${emailUsuario}'`)()

                if (estudiantes.length === 0) return

                const idEstudiante = estudiantes[0].ID

                const asignaciones = await sp.web.lists
                    .getByTitle('AsignadoA')
                    .items.select('idRol/ID')
                    .expand('idRol')
                    .filter(`idEstudiante eq ${idEstudiante}`)()

                if (asignaciones.length === 0) return

                const idRol = asignaciones[0].idRol?.ID
                setIsAdmin(idRol === 1)
                localStorage.setItem('rol', idRol?.toString() ?? '')
            } catch (error) {
                console.error('❌ Error verificando rol del usuario:', error)
            } finally {
                setIsReady(true)
            }
        }

        verificarRolUsuario().catch(console.error)
    }, [])

    return (
        <aside className={menuStyles.menu}>
            <h1 className={menuStyles.titulo}>Circo Studia</h1>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!isReady ? null : (
                    <>
                        {/* Links comunes */}
                        {[
                            { to: '/inicio', label: 'Inicio' },
                            { to: '/oferta', label: 'Oferta' },
                            { to: '/mis-materias', label: 'Mis materias' },
                            { to: '/coincidencias', label: 'Coincidencias' },
                            { to: '/perfil', label: 'Perfil' },
                        ].map((link) => (
                            <Link to={link.to} key={link.to}>
                                <button className={menuStyles.buttonNav}>
                                    {link.label}
                                </button>
                            </Link>
                        ))}

                        {/* Links de admin */}
                        {isAdmin && (
                            <>
                                <Link to='/admin/gestionar-plan'>
                                    <button className={menuStyles.buttonNav}>
                                        Gestionar Plan de Estudios
                                    </button>
                                </Link>
                                <Link to='/admin/cargar-oferta'>
                                    <button className={menuStyles.buttonNav}>
                                        Cargar Oferta de Materias
                                    </button>
                                </Link>
                                <Link to='/admin/estudiantes'>
                                    <button className={menuStyles.buttonNav}>
                                        Estudiantes
                                    </button>
                                </Link>
                                <Link to='/admin/gestionar-comision'>
                                    <button className={menuStyles.buttonNav}>
                                        Gestionar Comision
                                    </button>
                                </Link>
                            </>
                        )}
                    </>
                )}
            </nav>
        </aside>
    )
}

export default Menu
