import * as React from 'react'
import { Link } from 'react-router-dom'
import menuStyles from './Menu.module.scss'

const Menu: React.FC = () => {
    return (
        <aside style={{ background: '#1fb286', padding: 16 }}>
            <h1 className={menuStyles.titulo}>Circo Studia</h1>
            <nav
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 16,
                }}
            >
                <Link to='/inicio'>
                    <button className={menuStyles.buttonNav} >Inicio</button>
                </Link>
                <Link to='/oferta'>
                    <button className={menuStyles.buttonNav}>Oferta</button>
                </Link>
                <Link to='/mis-materias'>
                    <button className={menuStyles.buttonNav}>Mis materias</button>
                </Link>
                <Link to='/coincidencias'>
                    <button className={menuStyles.buttonNav}>Coincidencias</button>
                </Link>
                <Link to='/perfil'>
                    <button className={menuStyles.buttonNav}>Perfil</button>
                </Link>
            </nav>
        </aside>
    )
}

export default Menu
