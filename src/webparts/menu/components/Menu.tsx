import * as React from 'react'
import { useEffect, useState, FC } from 'react'
import { Link } from 'react-router-dom'
import { getSP } from '../../../pnpjsConfig'
import menuStyles from './Menu.module.scss'
import { WebPartContext } from '@microsoft/sp-webpart-base'

interface MenuProps {
    context: WebPartContext
}

// ====== Cache módulo (vive mientras no recargues toda la página) ======
const NO_ROLE = -1 // sentinela para “sin rol”
let rolCache: number | undefined = undefined // undefined = desconocido, number = rol (incluye NO_ROLE)
let rolLoadingPromise: Promise<number> | undefined = undefined
const STORAGE_KEY = 'rol' // ya lo venías usando

const getRolFromStorage = (): number | undefined => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return undefined
        const n = Number(raw)
        return Number.isFinite(n) ? n : undefined
    } catch (e) {
        console.warn('No se pudo leer localStorage', e)
        return undefined
    }
}

const setRolToStorage = (rolId: number | undefined): void => {
    try {
        if (rolId === undefined) {
            localStorage.removeItem(STORAGE_KEY)
        } else {
            localStorage.setItem(STORAGE_KEY, String(rolId))
        }
    } catch (e) {
        console.warn('No se pudo escribir localStorage', e)
    }
}

const Menu: FC<MenuProps> = ({ context }): JSX.Element => {
    const sp = getSP(context)

    // Estado inicial se resuelve sincrónicamente desde storage/cache para evitar "parpadeo"
    const rolInicial = rolCache !== undefined ? rolCache : getRolFromStorage()
    const [isAdmin, setIsAdmin] = useState<boolean>(rolInicial === 1)
    const [isReady, setIsReady] = useState<boolean>(rolInicial !== undefined)

    useEffect(() => {
        // Si ya tenemos rol en cache, no consultamos
        if (rolCache !== undefined) {
            setIsAdmin(rolCache === 1)
            setIsReady(true)
            return
        }

        // Intento desde storage
        const fromStorage = getRolFromStorage()
        if (fromStorage !== undefined) {
            rolCache = fromStorage
            setIsAdmin(fromStorage === 1)
            setIsReady(true)
            return
        }

        // No hay cache ni storage: consultamos UNA vez y compartimos la promesa
        if (!rolLoadingPromise) {
            rolLoadingPromise = (async (): Promise<number> => {
                try {
                    const usuario = await sp.web.currentUser()
                    const emailUsuario = usuario.Email?.toLowerCase()

                    const estudiantes = await sp.web.lists
                        .getByTitle('Estudiante')
                        .items.select('ID', 'usuario/EMail')
                        .expand('usuario')
                        .filter(`usuario/EMail eq '${emailUsuario}'`)()

                    if (!estudiantes.length) {
                        rolCache = NO_ROLE
                        setRolToStorage(NO_ROLE)
                        return NO_ROLE
                    }

                    const idEstudiante = estudiantes[0].ID

                    const asignaciones = await sp.web.lists
                        .getByTitle('AsignadoA')
                        .items.select('idRol/ID')
                        .expand('idRol')
                        .filter(`idEstudiante eq ${idEstudiante}`)
                        .top(1)()

                    const idRol = asignaciones[0]?.idRol?.ID
                    const resolved = typeof idRol === 'number' ? idRol : NO_ROLE
                    rolCache = resolved
                    setRolToStorage(resolved)
                    return resolved
                } catch (error) {
                    console.error(
                        '❌ Error verificando rol del usuario:',
                        error
                    )
                    rolCache = NO_ROLE
                    setRolToStorage(NO_ROLE)
                    return NO_ROLE
                }
            })()
        }

        // Consumimos la promesa compartida
        rolLoadingPromise
            .then((rid) => {
                setIsAdmin(rid === 1)
                setIsReady(true)
            })
            .catch((e) => {
                console.error('❌ Error de carga de rol:', e)
                setIsAdmin(false)
                setIsReady(true)
            })
    }, [sp])

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
