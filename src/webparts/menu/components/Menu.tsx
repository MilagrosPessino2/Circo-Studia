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
        const checkAdmin = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                const email = user.Email.toLowerCase()
                const adminEmails = [
                    'fvignardel@circostudio.com',
                    'mpessimo@circostudio.com',
                ]
                setIsAdmin(adminEmails.includes(email))
            } catch (err) {
                console.error('Error obteniendo el usuario actual:', err)
            }
        }

        checkAdmin().catch((err) => console.error('Error en checkAdmin:', err))
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
                        <Link to='/estudiantes'>
                            <button className={menuStyles.buttonNav}>
                                Estudiantes
                            </button>
                        </Link>
                        <Link to='/gestionar-plan'>
                            <button className={menuStyles.buttonNav}>
                                Gestionar Plan de Estudios
                            </button>
                        </Link>
                    </>
                )}
            </nav>
        </aside>
    )
}

export default Menu
