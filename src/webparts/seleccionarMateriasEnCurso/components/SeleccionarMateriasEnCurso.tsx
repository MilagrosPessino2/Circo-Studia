import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'

interface IOfertaDeMaterias {
    Id: number
    codMateria?: {
        Id: number
        codMateria?: string
        nombre?: string
    }
    codComision?: {
        Id: number
        descripcion?: string
    }
    fechaDePublicacion: string
    Cuatrimestre: number
    modalidad: string
    codigoCarrera?: string
    nombreCarrera?: string
}

interface IMateriaCarreraExpandida {
    Id: number
    codCarrera: string
    CodMateria: {
        Id: number
        codMateria: string
    }
}

interface ICarrera {
    Id: number
    codigoCarrera: string
    nombre: string
}

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)

    const [loading, setLoading] = useState(true)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])

    const cargarOfertas = async (): Promise<void> => {
        try {
            console.log('🔄 Iniciando carga paso a paso...')

            const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.select(
                    'Id',
                    'codMateria/Id',
                    'codMateria/codMateria',
                    'codMateria/nombre',
                    'codComision/Id',
                    'codComision/descripcion',
                    'fechaDePublicacion',
                    'Cuatrimestre',
                    'modalidad'
                )
                .expand('codMateria', 'codComision')()
            console.log('✅ OfertaDeMaterias cargada:', ofertaItems)

            const materiaCarreraItems: IMateriaCarreraExpandida[] =
                await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.select(
                        'Id',
                        'codCarrera',
                        'CodMateria/Id',
                        'CodMateria/codMateria'
                    )
                    .expand('CodMateria')()
            console.log('✅ MateriaCarrera cargada:', materiaCarreraItems)

            const carreraItems: ICarrera[] = await sp.web.lists
                .getByTitle('Carrera')
                .items.select('Id', 'codigoCarrera', 'nombre')()
            console.log('✅ Carrera cargada:', carreraItems)

            const ofertasConCarrera = ofertaItems.map((oferta) => {
                const relacion = materiaCarreraItems.find(
                    (mc) =>
                        mc.CodMateria?.codMateria.trim() ===
                        String(oferta.codMateria?.codMateria).trim()
                )

                if (!relacion) {
                    console.warn(
                        `⚠️ No se encontró relación MateriaCarrera para codMateria ${oferta.codMateria?.codMateria}`
                    )
                }

                const carrera = carreraItems.find(
                    (c) => c.codigoCarrera === relacion?.codCarrera
                )

                return {
                    ...oferta,
                    codigoCarrera: relacion?.codCarrera ?? undefined,
                    nombreCarrera: carrera?.nombre ?? 'Sin carrera',
                }
            })

            console.log('🎯 Ofertas mapeadas con carrera:', ofertasConCarrera)
            setOfertas(ofertasConCarrera)
        } catch (error: unknown) {
            const err = error as { message?: string }
            console.error('❌ Error al cargar datos:', err)
            alert(
                'Error cargando datos: ' + (err.message ?? 'Error desconocido')
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
                        <th>nombreMateria</th>
                        <th>descripción Comisión</th>
                        <th>modalidad</th>
                        <th>codigoCarrera</th>
                        <th>nombreCarrera</th>
                    </tr>
                </thead>
                <tbody>
                    {ofertas.map((o) => (
                        <tr key={o.Id}>
                            <td>{o.Id}</td>
                            <td>{o.codMateria?.codMateria ?? 'N/A'}</td>
                            <td>{o.codMateria?.nombre ?? 'Sin nombre'}</td>
                            <td>
                                {o.codComision?.descripcion ??
                                    'Sin descripción'}
                            </td>
                            <td>{o.modalidad}</td>
                            <td>{o.codigoCarrera ?? 'Sin código'}</td>
                            <td>{o.nombreCarrera ?? 'Sin carrera'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default SeleccionarMateriasEnCurso
