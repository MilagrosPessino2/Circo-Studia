import * as React from 'react'
import Menu from '../../menu/components/Menu'
import { getSP } from '../../../pnpjsConfig'
import type { IOfertaProps } from './IOfertaProps'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import styles from '../../inicio/components/Inicio.module.scss'

interface IOfertaDeMaterias {
    Id: number
    codMateria?: {
        codMateria: string
        nombre: string
        Id: number
    }
    codComision?: {
        descripcion: string
        codComision: string
    }
    modalidad: string
    codigoCarrera?: string
    nombreCarrera?: string
}

interface ICarrera {
    Id: number
    codigoCarrera: string
    nombre: string
}

interface IEstudiante {
    ID: number
    usuario: {
        Id: number
    }
}

interface IInscripto {
    idCarrera: {
        Id: number
        codigoCarrera: string
    }
}

interface IMateriaCarrera {
    CodMateria: {
        Id: number
    }
    codCarrera: {
        Id: number
    }
}
// ... importaciones e interfaces iguales ...

const Oferta: React.FC<IOfertaProps> = ({ context }) => {
    const sp = getSP(context)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])
    const [carreras, setCarreras] = useState<ICarrera[]>([])
    const [selectedCarrera, setSelectedCarrera] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const cargarDatos = async (): Promise<void> => {
            setLoading(true)
            try {
                const user = await sp.web.currentUser()
                const estudiantes: IEstudiante[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select('ID', 'usuario/Id')
                    .expand('usuario')()

                const estudiante = estudiantes.find(
                    (e) => e.usuario.Id === user.Id
                )
                if (!estudiante) throw new Error('Estudiante no encontrado')

                const inscripto: IInscripto[] = await sp.web.lists
                    .getByTitle('Inscripto')
                    .items.filter(`idEstudianteId eq ${estudiante.ID}`)
                    .select('idCarrera/Id', 'idCarrera/codigoCarrera')
                    .expand('idCarrera')()

                const carreraDefault =
                    inscripto[0]?.idCarrera?.codigoCarrera ?? ''
                setSelectedCarrera(carreraDefault)

                const carrerasData: ICarrera[] = await sp.web.lists
                    .getByTitle('Carrera')
                    .items.select('Id', 'codigoCarrera', 'nombre')()
                setCarreras(carrerasData)

                const materiaCarrera: IMateriaCarrera[] = await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.select('CodMateria/Id', 'codCarrera/Id')
                    .expand('CodMateria', 'codCarrera')()

                const ofertasData: IOfertaDeMaterias[] = await sp.web.lists
                    .getByTitle('OfertaDeMaterias')
                    .items.select(
                        'Id',
                        'codMateria/Id',
                        'codMateria/codMateria',
                        'codMateria/nombre',
                        'codComision/descripcion',
                        'codComision/codComision',
                        'modalidad'
                    )
                    .expand('codMateria', 'codComision')
                    .top(4999)()

                const ofertasCompletas: IOfertaDeMaterias[] = []

                for (const oferta of ofertasData) {
                    const relaciones = materiaCarrera.filter(
                        (mc) => mc.CodMateria?.Id === oferta.codMateria?.Id
                    )

                    for (const rel of relaciones) {
                        const carrera = carrerasData.find(
                            (c) => c.Id === rel.codCarrera?.Id
                        )

                        ofertasCompletas.push({
                            ...oferta,
                            codigoCarrera:
                                carrera?.codigoCarrera ?? 'Sin código',
                            nombreCarrera: carrera?.nombre ?? 'Sin nombre',
                        })
                    }
                }

                setOfertas(ofertasCompletas)
            } catch (err) {
                console.error(err)
                setError(
                    (err as { message?: string })?.message ||
                        'Error desconocido'
                )
            } finally {
                setLoading(false)
            }
        }

        cargarDatos().catch(console.error)
    }, [context])

    const ofertasFiltradas = ofertas
        .filter((o) => o.codigoCarrera === selectedCarrera)
        .sort((a, b) => {
            const codA = a.codMateria?.codMateria ?? ''
            const codB = b.codMateria?.codMateria ?? ''
            return codA.localeCompare(codB, 'es', { numeric: true })
        })

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu context={context} />
            <main style={{ padding: 24 }}>
                <h1 className={styles.titulo}>Oferta de Materias</h1>

                {error && <p style={{ color: 'red' }}>{error}</p>}

                <h3>filtrar por carrera:</h3>
                <label htmlFor='carrera-select' />
                <select
                    id='carrera-select'
                    className={styles.seleccionar}
                    value={selectedCarrera}
                    onChange={(e) => setSelectedCarrera(e.target.value)}
                >
                    {carreras.map((c) => (
                        <option key={c.codigoCarrera} value={c.codigoCarrera}>
                            {c.nombre}
                        </option>
                    ))}
                </select>

                {loading ? (
                    <Spinner label='Cargando oferta...' />
                ) : (
                    <table className={styles.tabla}>
                        <thead>
                            <tr>
                                <th>Cód. Materia</th>
                                <th>Nombre Materia</th>
                                <th>Comisión</th>
                                <th>Modalidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ofertasFiltradas.map((o, i) => (
                                <tr
                                    key={`${o.Id}-${i}`}
                                    style={{ borderBottom: '1px solid #ccc' }}
                                >
                                    <td>{o.codMateria?.codMateria ?? '-'}</td>
                                    <td>{o.codMateria?.nombre ?? '-'}</td>
                                    <td>{o.codComision?.descripcion ?? '-'}</td>
                                    <td>{o.modalidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    )
}

export default Oferta
