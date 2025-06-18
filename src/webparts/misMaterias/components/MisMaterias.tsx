import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IMisMateriasProps } from './IMisMateriasProps'

const MisMaterias: React.FC<IMisMateriasProps> = () => {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu />
            <main style={{ padding: 24 }}>
                <h1>Mis Materias</h1>
            </main>
        </div>
    )
}

export default MisMaterias
