import * as React from 'react'
import styles from './GestionarPlanDeEstudios.module.scss'
import type { IGestionarPlanDeEstudiosProps } from './IGestionarPlanDeEstudiosProps'
import AltaMateria from '../../altaMateria/components/AltaMateria'
import BajaMateria from '../../bajaMateria/components/BajaMateria'
import ModificacionMateria from '../../modificacionMateria/components/ModificacionMateria'
import Menu from '../../menu/components/Menu'
import { useNavigate } from 'react-router-dom'

const GestionarPlanDeEstudios: React.FC<IGestionarPlanDeEstudiosProps> = ({
    context,
}) => {
    const navigate = useNavigate()
    const [vistaActiva, setVistaActiva] = React.useState<
        'alta' | 'baja' | 'modificacion'
    >('alta')

    React.useEffect(() => {
        const rol = localStorage.getItem('rol')
        if (rol !== '1') {
            navigate('/inicio') // Redirige si no es admin
        }
    }, [navigate])

    const renderContenido = (): JSX.Element => {
        switch (vistaActiva) {
            case 'alta':
                return (
                    <AltaMateria
                        context={context}
                        description=''
                        isDarkTheme={false}
                        environmentMessage=''
                        hasTeamsContext={false}
                        userDisplayName='Usuario'
                    />
                )
            case 'baja':
                return (
                    <BajaMateria
                        context={context}
                        description=''
                        isDarkTheme={false}
                        environmentMessage=''
                        hasTeamsContext={false}
                        userDisplayName='Usuario'
                    />
                )
            case 'modificacion':
                return (
                    <ModificacionMateria
                        context={context}
                        description=''
                        isDarkTheme={false}
                        environmentMessage=''
                        hasTeamsContext={false}
                        userDisplayName='Usuario'
                    />
                )
            default:
                return <></>
        }
    }

    return (
        <div className={styles.layout}>
            <Menu context={context} />
            <section className={styles.container}>
                <h2 className={styles.titulo}>Gestionar Plan de Estudios</h2>

                <nav className={styles.navTabs}>
                    <button
                        className={vistaActiva === 'alta' ? styles.active : ''}
                        onClick={() => setVistaActiva('alta')}
                    >
                        Alta
                    </button>
                    <button
                        className={vistaActiva === 'baja' ? styles.active : ''}
                        onClick={() => setVistaActiva('baja')}
                    >
                        Baja
                    </button>
                    <button
                        className={
                            vistaActiva === 'modificacion'
                                ? styles.active
                                : ''
                        }
                        onClick={() => setVistaActiva('modificacion')}
                    >
                        Modificación
                    </button>
                </nav>

                <main className={styles.main}>{renderContenido()}</main>
            </section>
        </div>
    )
}

export default GestionarPlanDeEstudios
