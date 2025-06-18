import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { ICoincidenciasProps } from './ICoincidenciasProps'

const Coincidencias: React.FC<ICoincidenciasProps> = () => {
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
                <h1>Coincidencias</h1>
            </main>
        </div>
    )
}

export default Coincidencias
