import * as React from 'react'
import { Link } from 'react-router-dom'

const Menu: React.FC = () => {
    return (
        <aside style={{ background: '#eee', padding: 16 }}>
            <h1>Circo Studia</h1>
            <nav
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 16,
                }}
            >
                <Link to='/inicio'>
                    <button>Inicio</button>
                </Link>
                <Link to='/oferta'>
                    <button>Oferta</button>
                </Link>
                <Link to='/mis-materias'>
                    <button>Mis materias</button>
                </Link>
                <Link to='/coincidencias'>
                    <button>Coincidencias</button>
                </Link>
            </nav>
        </aside>
    )
}

export default Menu
