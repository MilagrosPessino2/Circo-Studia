import * as React from 'react'
import Menu from '../../menu/components/Menu'
import { getSP } from '../../../pnpjsConfig'
import type { IOfertaProps } from './IOfertaProps'
import { useEffect, useMemo, useState } from 'react'
import {
    Spinner,
    TextField,
    Dropdown,
    IDropdownOption,
    DefaultButton,
} from '@fluentui/react'
import styles from '../../oferta/components/Oferta.module.scss'

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
    Cuatrimestre?: number
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

const Oferta: React.FC<IOfertaProps> = ({ context }) => {
    const sp = getSP(context)
    const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])
    const [carreras, setCarreras] = useState<ICarrera[]>([])
    const [selectedCarrera, setSelectedCarrera] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<string>('')
    const [cuatrimestre, setCuatrimestre] = useState<number>(2)

    // --- NUEVO: paginado ---
    const [page, setPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(20)
    const pageSizeOptions: IDropdownOption[] = [
        { key: 10, text: '10' },
        { key: 20, text: '20' },
        { key: 50, text: '50' },
    ]
    // ------------------------

    const cuatrimestres: IDropdownOption[] = [
        { key: 1, text: 'Primer cuatrimestre' },
        { key: 2, text: 'Segundo cuatrimestre' },
        { key: 3, text: 'Cuatrimestre de verano' },
    ]

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
                        'modalidad',
                        'Cuatrimestre'
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

    // Filtrado + orden (memo para performance)
    const ofertasFiltradas = useMemo(() => {
        const termino = filtro.toLowerCase()
        return ofertas
            .filter((o) => {
                const coincideCarrera = o.codigoCarrera === selectedCarrera
                const coincideBusqueda =
                    termino === '' ||
                    (o.codMateria?.codMateria?.toLowerCase() ?? '').includes(
                        termino
                    ) ||
                    (o.codMateria?.nombre?.toLowerCase() ?? '').includes(
                        termino
                    ) ||
                    (o.codComision?.descripcion?.toLowerCase() ?? '').includes(
                        termino
                    )
                const coincideCuatrimestre =
                    cuatrimestre === undefined ||
                    Number(o.Cuatrimestre) === cuatrimestre
                return (
                    coincideCarrera && coincideBusqueda && coincideCuatrimestre
                )
            })
            .sort((a, b) => {
                const codA = a.codMateria?.codMateria ?? ''
                const codB = b.codMateria?.codMateria ?? ''
                return codA.localeCompare(codB, 'es', { numeric: true })
            })
    }, [ofertas, selectedCarrera, filtro, cuatrimestre])

    // --- NUEVO: lógica de paginado ---
    const totalPages = Math.max(
        1,
        Math.ceil(ofertasFiltradas.length / pageSize)
    )
    const start = (page - 1) * pageSize
    const currentPageItems = useMemo(
        () => ofertasFiltradas.slice(start, start + pageSize),
        [ofertasFiltradas, start, pageSize]
    )

    // Reset a página 1 si cambian los datos/filters o el tamaño de página
    useEffect(() => {
        setPage(1)
    }, [ofertasFiltradas, pageSize])
    // ---------------------------------

    return (
        <div className={styles.layout}>
            <Menu context={context} />

            <main className={styles.main}>
                <div className={styles.content}>
                    <h1 className={styles.titulo}>Oferta de Materias</h1>

                    {error && <p className={styles.error}>{error}</p>}

                    {/* Filtros */}
                    <div className={styles.filtrosContainer}>
                        <div className={styles.filtroItem}>
                            <Dropdown
                                label='Seleccionar carrera'
                                options={carreras.map((c) => ({
                                    key: c.codigoCarrera,
                                    text: c.nombre,
                                }))}
                                selectedKey={selectedCarrera}
                                onChange={(_, option) =>
                                    setSelectedCarrera(
                                        option ? (option.key as string) : ''
                                    )
                                }
                                placeholder='Todas las carreras'
                                styles={{ root: { width: '100%' } }}
                            />
                        </div>

                        <div className={styles.filtroItem}>
                            <TextField
                                label='Buscar materia o comisión'
                                placeholder='Ej: 901, Inglés, Lu08a12'
                                onChange={(_, value) => setFiltro(value || '')}
                                styles={{ root: { width: '100%' } }}
                            />
                        </div>

                        <div className={styles.filtroItem}>
                            <Dropdown
                                label='Seleccionar cuatrimestre'
                                options={cuatrimestres}
                                selectedKey={cuatrimestre}
                                onChange={(_, option) =>
                                    setCuatrimestre(
                                        option ? (option.key as number) : 2
                                    )
                                }
                                placeholder='Todos los cuatrimestres'
                                styles={{ root: { width: '100%' } }}
                            />
                        </div>

                        <div className={styles.filtroItem}>
                            <Dropdown
                                label='Items por página'
                                options={pageSizeOptions}
                                selectedKey={pageSize}
                                onChange={(_, option) =>
                                    setPageSize(
                                        option ? Number(option.key) : 20
                                    )
                                }
                                styles={{ root: { width: '100%' } }}
                            />
                        </div>
                    </div>

                    {/* Tabla */}
                    {loading ? (
                        <div className={styles.loading}>
                            <Spinner label='Cargando oferta...' />
                        </div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            {ofertasFiltradas.length === 0 ? (
                                <div style={{ padding: 12 }}>
                                    No hay resultados para los filtros
                                    seleccionados.
                                </div>
                            ) : (
                                <>
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
                                            {currentPageItems.map((o, i) => (
                                                <tr key={`${o.Id}-${i}`}>
                                                    <td>
                                                        {o.codMateria
                                                            ?.codMateria ?? '-'}
                                                    </td>
                                                    <td>
                                                        {o.codMateria?.nombre ??
                                                            '-'}
                                                    </td>
                                                    <td>
                                                        {o.codComision
                                                            ?.descripcion ??
                                                            '-'}
                                                    </td>
                                                    <td>{o.modalidad}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* NUEVO: barra de paginado */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 12,
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 0',
                                        }}
                                    >
                                        <div style={{ opacity: 0.8 }}>
                                            Mostrando {start + 1}-
                                            {Math.min(
                                                start + pageSize,
                                                ofertasFiltradas.length
                                            )}{' '}
                                            de {ofertasFiltradas.length}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <DefaultButton
                                                text='Anterior'
                                                disabled={page <= 1}
                                                onClick={() =>
                                                    setPage((p) =>
                                                        Math.max(1, p - 1)
                                                    )
                                                }
                                            />
                                            <span
                                                style={{
                                                    minWidth: 60,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {page} / {totalPages}
                                            </span>
                                            <DefaultButton
                                                text='Siguiente'
                                                disabled={page >= totalPages}
                                                onClick={() =>
                                                    setPage((p) =>
                                                        Math.min(
                                                            totalPages,
                                                            p + 1
                                                        )
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default Oferta
