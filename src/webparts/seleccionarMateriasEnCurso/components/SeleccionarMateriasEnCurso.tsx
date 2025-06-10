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
    codCarrera: {
        Id: number
        codigoCarrera: string
    }
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

interface IInscripto {
    Id: number
    idCarrera: {
        Id: number
        codigoCarrera: string
    }
}

interface IEstudiante {
    ID: number
    usuario: {
        Id: number
    }
}

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])
    const [selectedCarrera, setSelectedCarrera] = useState<string>('')

    const cargarDatos = async (): Promise<void> => {
        try {
            console.log('🔄 Cargando datos...')

            // Obtener usuario actual
            const user = await sp.web.currentUser()
            const currentUserId = user.Id

            // Obtener estudiante asociado al usuario
            const estudianteItems: IEstudiante[] = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()
            const match = estudianteItems.find(
                (e) => e.usuario?.Id === currentUserId
            )
            if (!match) {
                console.error('Estudiante no encontrado')
                setError('Estudiante no encontrado')
                setLoading(false)
                return
            }
            const estudianteID = match.ID

            // Obtener carrera mediante lista Inscripto
            const inscriptoItems: IInscripto[] = await sp.web.lists
                .getByTitle('Inscripto')
                .items.filter(`idEstudianteId eq ${estudianteID}`)
                .select('idCarrera/Id', 'idCarrera/codigoCarrera')
                .expand('idCarrera')()
            if (inscriptoItems.length === 0) {
                console.warn(
                    'No se encontraron inscripciones para el estudiante'
                )
                setSelectedCarrera('Sin inscripción')
            } else {
                setSelectedCarrera(inscriptoItems[0].idCarrera.codigoCarrera)
            }

            // Cargar datos de OfertaDeMaterias
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

            // Cargar relaciones MateriaCarrera y Carrera
            const materiaCarreraItems: IMateriaCarreraExpandida[] =
                await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.select(
                        'Id',
                        'CodMateria/Id',
                        'CodMateria/codMateria',
                        'codCarrera/Id',
                        'codCarrera/codigoCarrera'
                    )
                    .expand('CodMateria', 'codCarrera')()
            const carreraItems: ICarrera[] = await sp.web.lists
                .getByTitle('Carrera')
                .items.select('Id', 'codigoCarrera', 'nombre')()

            // Mapear ofertas con datos de carrera
            const ofertasConCarrera = ofertaItems.map((oferta) => {
                const relacion = materiaCarreraItems.find(
                    (mc) =>
                        mc.CodMateria.codMateria.trim() ===
                        String(oferta.codMateria?.codMateria).trim()
                )
                const carrera = carreraItems.find(
                    (c) =>
                        c.codigoCarrera === relacion?.codCarrera.codigoCarrera
                )
                return {
                    ...oferta,
                    codigoCarrera: relacion?.codCarrera.codigoCarrera,
                    nombreCarrera: carrera?.nombre ?? 'Sin carrera',
                }
            })
            setOfertas(ofertasConCarrera)
        } catch (err) {
            console.error('❌ Error cargando datos:', err)
            setError(
                (err as { message?: string }).message ?? 'Error desconocido'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarDatos().catch(console.error)
    }, [])

    if (loading) return <Spinner label='Cargando datos...' />
    if (error) return <div>Error: {error}</div>

    return (
        <div style={{ padding: '20px' }}>
            <h2>Oferta de Materias</h2>
            <p>
                Carrera del estudiante: <strong>{selectedCarrera}</strong>
            </p>
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
                            <td>{o.nombreCarrera}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default SeleccionarMateriasEnCurso
