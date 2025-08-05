import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IMisMateriasProps } from './IMisMateriasProps'
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'
import styles from '../../inicio/components/Inicio.module.scss'
import Boton from '../../../utils/boton/Boton';
import {
  Dialog,
  DialogType,
  DialogFooter,
} from '@fluentui/react';


interface IMateria {
    id: number 
    idCurso?: number 
    idHistorial?: number 
    ofertaId?: number
    codigo: string
    nombre: string
    comision: string
    horario: string
    estado: string
    bloqueada: boolean
}


const MisMaterias: React.FC<IMisMateriasProps> = ({ context }) => {
    const sp = getSP(context)
    const [modoVista, setModoVista] = useState<'curso' | 'historial'>('curso')
    const [loading, setLoading] = useState(true)
    const [materias, setMaterias] = useState<IMateria[]>([])
    const [correlativasInversas, setCorrelativasInversas] = useState<
Record<number, number[]>>({})
    const [mostrarDialogo, setMostrarDialogo] = useState(false);
    const [materiaAEliminar, setMateriaAEliminar] = useState<IMateria | null>(null);
    const [confirmarCallback, setConfirmarCallback] = useState<() => void>(() => () => {});




const fetchMateriasCursando = async (): Promise<void> => {
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

        const cursaEnItems = await sp.web.lists
            .getByTitle('CursaEn')
            .items
            .filter(`idEstudianteId eq ${estudiante.ID}`)
            .select('Id', 'idOferta/Id')
            .expand('idOferta')()

        const ofertaIds = cursaEnItems.map(item => item.idOferta?.Id).filter(id => id !== null)
        if (ofertaIds.length === 0) {
            setMaterias([])
            return
        }

        const filterString = ofertaIds.map(id => `Id eq ${id}`).join(' or ')

        const ofertas = await sp.web.lists
            .getByTitle('OfertaDeMaterias')
            .items
            .filter(filterString)
            .select(
                'Id',
                'codMateria/ID',
                'codMateria/codMateria',
                'codMateria/nombre',
                'codComision/Id',
                'modalidad'
            )
            .expand('codMateria', 'codComision')()

        const comisiones = await sp.web.lists
            .getByTitle('Comision')
            .items
            .select('ID', 'codComision', 'descripcion')()

      const datos: IMateria[] = await Promise.all(
    cursaEnItems.map(async (item) => {
        const oferta = ofertas.find((o) => o.Id === item.idOferta?.Id)
        const com = comisiones.find((c) => c.ID === oferta?.codComision?.Id)

        const codMateriaId = oferta?.codMateria?.ID
        const estudianteId = estudiante.ID

        // Buscar si existe en Estado
        const estadoItems = await sp.web.lists
            .getByTitle('Estado')
            .items.filter(
                `idEstudiante/ID eq ${estudianteId} and codMateria/ID eq ${codMateriaId}`
            )
            .select('ID')()

        return {
            id: item.Id, // id de CursaEn
            idCurso: item.Id,
            idHistorial: estadoItems.length > 0 ? estadoItems[0].ID : undefined,
            ofertaId: item.idOferta?.Id,
            codigo: oferta?.codMateria?.codMateria || '-',
            nombre: oferta?.codMateria?.nombre || '-',
            comision: com?.codComision || '-',
            horario: com?.descripcion || '-',
            estado: 'En curso',
            bloqueada: false,
        }
    })
)


        setMaterias(datos)
    } catch (error) {
        console.error('Error cargando materias EN CURSO:', error)
    } finally {
        setLoading(false)
    }
}

const fetchMateriasHistorial = async (): Promise<void> => {
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

        const estadoItems = await sp.web.lists
            .getByTitle('Estado')
            .items
            .filter(`idEstudianteId eq ${estudiante.ID}`)
            .select(
                'Id',
                'condicion',
                'codMateria/codMateria',
                'codMateria/nombre'
            )
            .expand('codMateria')()


        const datos: IMateria[] = estadoItems.map((item) => ({
            id: item.Id,
            idHistorial: item.Id,
            codigo: item.codMateria?.codMateria || '-',
            nombre: item.codMateria?.nombre || '-',
            comision: '-',
            horario: '-',
            estado:
                item.condicion === 'A'
                    ? 'Aprobada'
                    : item.condicion === 'R'
                    ? 'En final'
                    : '-',
            bloqueada: false,
        }))

        setMaterias(datos)
    } catch (error) {
        console.error('Error cargando materias HISTORIAL:', error)
    } finally {
        setLoading(false)
    }
}

   useEffect(() => {
    const cargarMaterias = async () : Promise<void> => {
        if (modoVista === 'curso') {
            await fetchMateriasCursando()
        } else {
            await fetchMateriasHistorial()
        }
    }

    cargarMaterias().catch((err) => {
        console.error('Error al cargar materias:', err)
    })
}, [modoVista])

    
    const eliminarMateriaHistorial = async (idHistorial: number): Promise<void> => {
    const materia = materias.find((m) => m.idHistorial === idHistorial)
    if (!materia) return

    const correlativas = correlativasInversas[idHistorial] || []
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

    setCorrelativasInversas((correlativasInversas) => ({
        ...correlativasInversas,
        [idHistorial]: [],
    }))

    try {
        await sp.web.lists.getByTitle('Estado').items.getById(idHistorial).recycle()
        await fetchMateriasHistorial()
    } catch (error) {
        if (
            error.message?.includes('El elemento no existe') ||
            error.message?.includes('The item does not exist')
        ) {
            console.warn('Ya se había eliminado el ítem de Estado')
        } else {
            console.error('Error eliminando materia del historial:', error)
        }
    }
}

const confirmarEliminacion = (materia: IMateria, onConfirmar: () => void): void => {
  setMateriaAEliminar(materia);
  setConfirmarCallback(() => onConfirmar);
  setMostrarDialogo(true);
};



const eliminarMateriaCurso = async (idCurso: number, idHistorial?: number): Promise<void> => {
    try {
        if (idHistorial) {
            try {
                await sp.web.lists.getByTitle('Estado').items.getById(idHistorial).recycle()
            } catch (error) {
                if (
                    error.message?.includes('El elemento no existe') ||
                    error.message?.includes('The item does not exist')
                ) {
                    console.warn('Ya se había eliminado el ítem de Estado')
                } else {
                    throw error
                }
            }
        }

        await sp.web.lists.getByTitle('CursaEn').items.getById(idCurso).recycle()
        await fetchMateriasCursando()
    } catch (error) {
        console.error('Error eliminando materia de CursaEn y Estado:', error)
    }
}


    const eliminarMaterias = async (estadoAEliminar: string): Promise<void> => {
    const materiasAEliminar = materias.filter(
        (m) => m.estado === estadoAEliminar
    )

    if (materiasAEliminar.length === 0) {
        alert(`No hay materias en estado "${estadoAEliminar}" para eliminar.`)
        return
    }



  confirmarEliminacion(
        { nombre: `${materiasAEliminar.length} materias` } as IMateria,
        async () => {

    try {
        for (const materia of materiasAEliminar) {
            if (modoVista === 'historial') {
                // En modo historial, los ids sí son de la lista 'Estado'
                if (materia.idHistorial) {
                    await sp.web.lists
                        .getByTitle('Estado')
                        .items.getById(materia.idHistorial)
                        .recycle()
                }
            } else {
                // En modo curso: primero borrar de Estado si existe
                if (materia.idHistorial) {
                    try {
                        await sp.web.lists
                            .getByTitle('Estado')
                            .items.getById(materia.idHistorial)
                            .recycle()
                    } catch (error) {
                        console.warn(
                            `Error eliminando de Estado (idHistorial: ${materia.idHistorial}):`,
                            error
                        )
                    }
                }

                // Luego borrar de CursaEn
                if (materia.idCurso) {
                    await sp.web.lists
                        .getByTitle('CursaEn')
                        .items.getById(materia.idCurso)
                        .recycle()
                }
            }
        }

        // Refrescar según vista
        if (modoVista === 'curso') {
            await fetchMateriasCursando()
        } else {
            await fetchMateriasHistorial()
        }
    } catch (error) {
        console.error('Error eliminando materias:', error)
    }
}
   )
}

    const materiasAgrupadas =
        modoVista === 'historial'
            ? {
                  Aprobadas: materias.filter((m) => m.estado === 'Aprobada'),
                  EnFinal: materias.filter((m) => m.estado === 'En final'),
              }
            : { EnCurso: materias }

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
                <div className={styles.vistaHeader}>
                    <button
                        className={`${styles.tabButton} ${modoVista === 'curso' ? styles.activo : ''}`}
                        onClick={() => setModoVista('curso')}
                    >
                        Materias en curso
                    </button>
                    
                    <button
                        className={`${styles.tabButton} ${modoVista === 'historial' ? styles.activo : ''}`}
                        onClick={() => setModoVista('historial')}
                    >
                        Historial académico
                    </button>
                </div>

                <h2 className={styles.titulo}>
                    {modoVista === 'curso'
                        ? 'Materias en curso'
                        : 'Historial de materias'}
                </h2>

                {loading ? (
                    <Spinner label='Cargando materias...' />
                ) : (
                    <>
                        {Object.entries(materiasAgrupadas).map(
                            ([grupo, lista]) => (
                                <div key={grupo} style={{ marginBottom: 24 }}>
                                    {modoVista === 'historial' && (
                                        <h3>{grupo}</h3>
                                    )}
                                    <table className={styles.tabla}>
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Materia</th>
                                                <th>Estado</th>
                                                {modoVista === 'curso' && (
                                                    <th>Comision</th>
                                                )}
                                                {modoVista === 'curso' && (
                                                    <th>Horario</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lista.map((m: IMateria) => (
                                                <tr key={m.id}>
                                                    <td>{m.codigo}</td>
                                                    <td>{m.nombre}</td>
                                                    <td>{m.estado}</td>
                                                    {modoVista === 'curso' && (
                                                        <>
                                                            <td>
                                                                {m.comision}
                                                            </td>
                                                            <td>{m.horario}</td>
                                                        </>
                                                    )}

                                                   <td>
                                        {modoVista === 'curso' ? (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        confirmarEliminacion(m, async () => {
                                                        await eliminarMateriaCurso(m.idCurso!, m.idHistorial);
                                                        });

                                                    } catch (error) {
                                                        console.error('Error al eliminar:', error)
                                                    }
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 18,
                                                }}
                                                title='Eliminar materia'
                                            >
                                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z" fill="#009266"/></svg>
                                            </button>
                                        ) : !m.bloqueada && m.idHistorial && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        confirmarEliminacion(m, async () => {
                                                        await eliminarMateriaHistorial(m.idHistorial!);
                                                        });
                                                    } catch (error) {
                                                        console.error('Error al eliminar del historial:', error)
                                                    }
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 18,
                                                }}
                                                title='Eliminar materia'
                                            >
                                              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M21.5 6a1 1 0 0 1-.883.993L20.5 7h-.845l-1.231 12.52A2.75 2.75 0 0 1 15.687 22H8.313a2.75 2.75 0 0 1-2.737-2.48L4.345 7H3.5a1 1 0 0 1 0-2h5a3.5 3.5 0 1 1 7 0h5a1 1 0 0 1 1 1Zm-7.25 3.25a.75.75 0 0 0-.743.648L13.5 10v7l.007.102a.75.75 0 0 0 1.486 0L15 17v-7l-.007-.102a.75.75 0 0 0-.743-.648Zm-4.5 0a.75.75 0 0 0-.743.648L9 10v7l.007.102a.75.75 0 0 0 1.486 0L10.5 17v-7l-.007-.102a.75.75 0 0 0-.743-.648ZM12 3.5A1.5 1.5 0 0 0 10.5 5h3A1.5 1.5 0 0 0 12 3.5Z" fill="#009266"/></svg>
                                            </button>
                                        )}
                                    </td>

                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}

                        <div style={{ marginTop: 20 }}>
                            <Boton style={{ marginRight: 20 }}
                                to={
                                    modoVista === 'curso'
                                        ? '/formularioCursando'
                                        : '/formulario'
                                }
                            > Añadir
                            </Boton>
                            {modoVista === 'curso' && materias.some((m) => m.estado === 'En curso') && (
                                <Boton onClick={() => eliminarMaterias('En curso')}>
                                    Eliminar todas
                                </Boton>
                            )}

                        </div>
                    </>
                )}
            </div>
            <Dialog
                hidden={!mostrarDialogo}
                onDismiss={() => setMostrarDialogo(false)}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Confirmar eliminación',
                    closeButtonAriaLabel: 'Cerrar',
                   subText: materiaAEliminar
                ? `¿Estás seguro que querés eliminar ${
                    materiaAEliminar.nombre.includes('materias')
                        ? materiaAEliminar.nombre
                        : `la materia "${materiaAEliminar.nombre}"`
                }?`
                : ''

                }}
                >
                <DialogFooter>
                    <Boton
                    onClick={async () => {
                        setMostrarDialogo(false);
                        await confirmarCallback();
                    }}>Sí, eliminar </Boton>

                    <Boton onClick={() => setMostrarDialogo(false)}>Cancelar </Boton>
                </DialogFooter>
                </Dialog>

        </div>
    )
}

export default MisMaterias
