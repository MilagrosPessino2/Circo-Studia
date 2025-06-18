import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IOfertaProps } from './IOfertaProps'

const Oferta: React.FC<IOfertaProps> = () => {
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
                <h1>Oferta</h1>
            </main>
        </div>
    )
}

export default Oferta
