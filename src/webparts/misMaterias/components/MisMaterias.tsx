import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IMisMateriasProps } from './IMisMateriasProps'
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import { Link } from 'react-router-dom'
import styles from '../../inicio/components/Inicio.module.scss'

interface IMateria {
    id: number
    codigo: string
    nombre: string
    comision: string
    horario: string
    aula: string
    modalidad: string
    estado: string
    bloqueada: boolean
}

const MisMaterias: React.FC<IMisMateriasProps> = ({ context }) => {
    const sp = getSP(context)
    const [estadoFiltro, setEstadoFiltro] = useState<'C' | 'A' | 'R'>('C')
    const [loading, setLoading] = useState(true)
    const [materias, setMaterias] = useState<IMateria[]>([])
    const [correlativasInversas, setCorrelativasInversas] = useState<
        Record<number, number[]>
    >({}) 
    const fetchMaterias = async (): Promise<void> => {
        setLoading(true)
        try {
            const user = await sp.web.currentUser()
            const estudiantes = await sp.web.lists
                .getByTitle('Estudiante')
                .items.select('ID', 'usuario/Id')
                .expand('usuario')()
            const estudiante = estudiantes.find(
                (e) => e.usuario?.Id === user.Id
            )
            if (!estudiante) return

            //  Materias aprobadas
            const aprobadas = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and condicion eq 'A'`
                )
                .select('codMateria/ID')
                .expand('codMateria')()
            const idsAprobadas = aprobadas.map((m) => m.codMateria.ID)

            //  Correlativas
            const correlativas = await sp.web.lists
                .getByTitle('Correlativa')
                .items.select('codMateria/ID', 'codMateriaRequerida/ID')
                .expand('codMateria', 'codMateriaRequerida')()

            const mapaCorrelativas: Record<number, number[]> = {}
            const inverso: Record<number, number[]> = {}
            correlativas.forEach((item) => {
                const materiaID = item.codMateria?.ID
                const correlativaID = item.codMateriaRequerida?.ID
                if (materiaID && correlativaID) {
                    if (!mapaCorrelativas[materiaID])
                        mapaCorrelativas[materiaID] = []
                    mapaCorrelativas[materiaID].push(correlativaID)

                    // construir inverso
                    if (!inverso[correlativaID]) inverso[correlativaID] = []
                    inverso[correlativaID].push(materiaID)
                }
            })
            setCorrelativasInversas(inverso)

            //  Obtener materias según estado seleccionado
            const estado = await sp.web.lists
                .getByTitle('Estado')
                .items.filter(
                    `idEstudianteId eq ${estudiante.ID} and condicion eq '${estadoFiltro}'`
                )
                .select(
                    'ID',
                    'codMateria/ID',
                    'codMateria/codMateria',
                    'codMateria/nombre',
                    'condicion'
                )
                .expand('codMateria')()

            //  Materias bloqueadas (correlativas de aprobadas)
            const idsBloqueadas = new Set<number>()
            for (const [materiaID, correlativas] of Object.entries(
                mapaCorrelativas
            )) {
                const id = parseInt(materiaID)
                if (idsAprobadas.includes(id)) {
                    correlativas.forEach((c) => idsBloqueadas.add(c))
                }
            }

            // 5. Info extra
            const oferta = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.select('codMateria/Id', 'codComision/Id', 'modalidad')
                .expand('codMateria', 'codComision')()

            const comisiones = await sp.web.lists
                .getByTitle('Comision')
                .items.select(
                    'codComision',
                    'diaSemana',
                    'turno',
                    'descripcion'
                )()

            const datos: IMateria[] = estado
                .filter((e) => {
                    const correlativas = mapaCorrelativas[e.codMateria.ID] || []
                    return correlativas.every((c) => idsAprobadas.includes(c))
                })
                .map((e) => {
                    const ofertaRelacionada = oferta.find(
                        (o) => o.codMateria?.Id === e.codMateria?.ID
                    )
                    const com = comisiones.find(
                        (c) =>
                            c.codComision === ofertaRelacionada?.codComision?.Id
                    )

                    return {
                        id: e.ID,
                        codigo: e.codMateria?.codMateria,
                        nombre: e.codMateria?.nombre,
                        comision: com?.codComision || '-',
                        horario: com?.descripcion || '-',
                        aula: 'Virtual',
                        modalidad: ofertaRelacionada?.modalidad || '-',
                        estado:
                            estadoFiltro === 'C'
                                ? 'En curso'
                                : estadoFiltro === 'R'
                                ? 'En final'
                                : 'Aprobada',
                        bloqueada: idsBloqueadas.has(e.codMateria.ID),
                    }
                })

            setMaterias(datos)
        } catch (error) {
            console.error('Error cargando materias:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMaterias().catch(console.error)
    }, [estadoFiltro])

    const eliminarMateria = async (id: number): Promise<void> => {
        const materia = materias.find((m) => m.id === id)
        if (!materia) return

        // advertencia si tiene materias que dependen de ella
        const correlativas = correlativasInversas[materia.id] || []
        if (correlativas.length > 0) {
            const nombresDependientes = materias
                .filter((m) => correlativas.includes(m.id))
                .map((m) => m.nombre)
                .join(', ')
            const confirmar = window.confirm(
                `La materia "${materia.nombre}" es requisito de: ${nombresDependientes}.\n¿Seguro que querés eliminarla?`
            )
            if (!confirmar) return
        }

        try {
            await sp.web.lists.getByTitle('Estado').items.getById(id).recycle()
            await fetchMaterias() // recargar datos actualizados
        } catch (error) {
            console.error('Error eliminando materia:', error)
        }
    }
const eliminarMaterias = async (estadoAEliminar: string): Promise<void> => {
  const materiasAEliminar = materias.filter((m) => m.estado === estadoAEliminar);

  if (materiasAEliminar.length === 0) {
    alert(`No hay materias en estado "${estadoAEliminar}" para eliminar.`);
    return;
  }

  const confirmar = window.confirm(
    `Vas a eliminar ${materiasAEliminar.length} materias en estado "${estadoAEliminar}".\n¿Estás seguro?`
  );

  if (!confirmar) return;

  try {
    for (const materia of materiasAEliminar) {
      await sp.web.lists.getByTitle('Estado').items.getById(materia.id).recycle();
    }

    await fetchMaterias(); 
  } catch (error) {
    console.error('Error eliminando materias:', error);
  }
};


    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu context={context} />

            <div style={{ padding: 24 }}>
                <h2 className={styles.titulo}>Mis materias</h2>

                <aside>
                    <div style={{ marginTop: 16 }}>
                        <h3>Filtrar materias</h3>
                        <section>
                            <select
                                className={styles.seleccionar}
                                value={estadoFiltro}
                                onChange={(e) =>
                                    setEstadoFiltro(
                                        e.target.value as 'C' | 'A' | 'R'
                                    )
                                }
                            >
                                <option value='C'>Materias en curso</option>
                                <option value='A'>Materias aprobadas</option>
                                <option value='R'>Materias en final</option>
                            </select>
                        </section>
                    </div>
                </aside>

                <main>
                    {loading ? (
                        <Spinner label='Cargando materias...' />
                    ) : (
                        <table className={styles.tabla}>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Materia</th>
                                    <th>Comisión</th>
                                    <th>Horario</th>
                                    <th>Aula</th>
                                    <th>Modalidad</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materias.map((m) => (
                                    <tr key={m.id}>
                                        <td>{m.codigo}</td>
                                        <td>{m.nombre}</td>
                                        <td>{m.comision}</td>
                                        <td>{m.horario}</td>
                                        <td>{m.aula}</td>
                                        <td>{m.modalidad}</td>
                                        <td>{m.estado}</td>
                                        <td>
                                            {!m.bloqueada && (
                                                <button
                                                    onClick={() =>
                                                        eliminarMateria(m.id)
                                                    }
                                                    style={{
                                                        background:
                                                            'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: 18,
                                                    }}
                                                    title='Eliminar materia'
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <Link to='/formulario'>
                        <button className={styles.boton}>Añadir</button>
                        <button
                            onClick={() => eliminarMaterias(
                                estadoFiltro === 'C' ? 'En curso' :
                                estadoFiltro === 'R' ? 'En final' :
                                'Aprobada'
                            )}
                            className={styles.boton}
                            style={{marginLeft: 20}}
                            >
                            Eliminar todas
                            </button>

                    </Link>
                </main>
            </div>
        </div>
    )
}

export default MisMaterias
