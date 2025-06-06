import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'

interface IOfertaDeMaterias {
    Id: number
    codMateriaId: number
    codComision?: {
        Id: number
        descripcion?: string
    }
    fechaDePublicacion: string
    Cuatrimestre: number
    modalidad: string
}

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)

    const [loading, setLoading] = useState(true)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])

    const cargarOfertas = async (): Promise<void> => {
        try {
            console.log(
                '🔄 Cargando datos de OfertaDeMaterias con descripción de comisión...'
            )

            const items = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.select(
                    'Id',
                    'codMateriaId',
                    'codComision/Id',
                    'codComision/descripcion',
                    'fechaDePublicacion',
                    'Cuatrimestre',
                    'modalidad'
                )
                .expand('codComision')()

            console.log('📦 Datos obtenidos con comisión expandida:', items)
            setOfertas(items)
        } catch (error) {
            console.error(
                '❌ Error al cargar datos de OfertaDeMaterias:',
                error
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOfertas().catch(console.error)
    }, [])

    if (loading) {
        return <Spinner label='Cargando ofertas de materias...' />
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Tabla de OfertaDeMaterias</h2>
            <p>
                Total registros: <strong>{ofertas.length}</strong>
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>codMateria</th>
                        <th>descripcion Comisión</th>
                        <th>fecha</th>
                        <th>cuatrimestre</th>
                        <th>modalidad</th>
                    </tr>
                </thead>
                <tbody>
                    {ofertas.map((o) => (
                        <tr key={o.Id}>
                            <td>{o.Id}</td>
                            <td>{o.codMateriaId}</td>
                            <td>
                                {o.codComision?.descripcion ??
                                    'Sin descripción'}
                            </td>
                            <td>{o.fechaDePublicacion}</td>
                            <td>{o.Cuatrimestre}</td>
                            <td>{o.modalidad}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default SeleccionarMateriasEnCurso
