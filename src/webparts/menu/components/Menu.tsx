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

    useEffect(() => {
        const verificarRolUsuario = async (): Promise<void> => {
            try {
                // 1. Obtener usuario actual
                const usuario = await sp.web.currentUser()
                const emailUsuario = usuario.Email?.toLowerCase()

                // 2. Buscar el estudiante correspondiente al email
                const estudiantes = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/EMail')
                    .expand('usuario')
                    .filter(`usuario/EMail eq '${emailUsuario}'`)()

                if (estudiantes.length === 0) {
                    console.warn('No se encontró un estudiante con ese email')
                    return
                }

                const idEstudiante = estudiantes[0].ID

                // 3. Buscar el rol asignado en la lista AsignadoA
                const asignaciones = await sp.web.lists
                    .getByTitle('AsignadoA')
                    .items.select('idRol/ID')
                    .expand('idRol')
                    .filter(`idEstudiante eq ${idEstudiante}`)()

                if (asignaciones.length === 0) {
                    console.warn('El estudiante no tiene un rol asignado')
                    return
                }

                const idRol = asignaciones[0].idRol?.ID
                setIsAdmin(idRol === 1)
                localStorage.setItem('rol', idRol?.toString() ?? '')
            } catch (error) {
                console.error('❌ Error verificando rol del usuario:', error)
            }
        }

        verificarRolUsuario().catch(console.error)
    }, [])

    return (
        <aside className={menuStyles.menu}>
            <h1 className={menuStyles.titulo}>Circo Studia</h1>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link to='/inicio'>
                    <button className={menuStyles.buttonNav}>Inicio</button>
                </Link>
                <Link to='/oferta'>
                    <button className={menuStyles.buttonNav}>Oferta</button>
                </Link>
                <Link to='/mis-materias'>
                    <button className={menuStyles.buttonNav}>
                        Mis materias
                    </button>
                </Link>
                <Link to='/coincidencias'>
                    <button className={menuStyles.buttonNav}>
                        Coincidencias
                    </button>
                </Link>
                <Link to='/perfil'>
                    <button className={menuStyles.buttonNav}>Perfil</button>
                </Link>

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
            </nav>
        </aside>
    )
}

export default Menu
