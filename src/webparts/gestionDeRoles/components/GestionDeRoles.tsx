import * as React from 'react'
import { useEffect, useState } from 'react'
import { Dropdown, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import styles from './GestionDeRoles.module.scss'
import type { IGestionDeRolesProps } from './IGestionDeRolesProps'
import Menu from '../../menu/components/Menu'
import { useNavigate } from 'react-router-dom'

interface IEstudiante {
    Id: number
    usuario: {
        Title: string
        EMail: string
        Name: string
    }
}

interface IRol {
    Id: number
    nombreRol: string
}

interface IAsignadoA {
    Id: number
    idEstudiante: { Id: number }
    idRol: { Id: number }
}

const GestionDeRoles: React.FC<IGestionDeRolesProps> = ({ context }) => {
    const sp = getSP(context)
    const navigate = useNavigate()

    const [estudiantes, setEstudiantes] = useState<IEstudiante[]>([])
    const [roles, setRoles] = useState<IRol[]>([])
    const [asignaciones, setAsignaciones] = useState<IAsignadoA[]>([])
    const [loading, setLoading] = useState(true)
    const [usuarioActual, setUsuarioActual] = useState<string>('')

    useEffect(() => {
        const rol = localStorage.getItem('rol')
        if (rol !== '1') {
            navigate('/inicio')
        }
    }, [navigate])

    useEffect(() => {
        const cargarDatos = async (): Promise<void> => {
            try {
                const user = await sp.web.currentUser()
                setUsuarioActual(user.Email.toLowerCase())

                const [est, rolesList, asignados] = await Promise.all([
                    sp.web.lists
                        .getByTitle('Estudiante')
                        .items.select(
                            'Id',
                            'usuario/Title',
                            'usuario/EMail',
                            'usuario/Name'
                        )
                        .expand('usuario')
                        .top(4999)(),

                    sp.web.lists
                        .getByTitle('Rol')
                        .items.select('Id', 'nombreRol')
                        .top(4999)(),

                    sp.web.lists
                        .getByTitle('AsignadoA')
                        .items.select('Id', 'idEstudiante/Id', 'idRol/Id')
                        .expand('idEstudiante', 'idRol')
                        .top(4999)(),
                ])

                setEstudiantes(est)
                setRoles(rolesList)
                setAsignaciones(asignados)
            } catch (err) {
                console.error('❌ Error cargando datos:', err)
            } finally {
                setLoading(false)
            }
        }

        cargarDatos().catch(console.error)
    }, [sp])

    const handleRolChange = async (
        estudianteId: number,
        nuevoRolId: number
    ): Promise<void> => {
        try {
            const existente = asignaciones.find(
                (a) => a.idEstudiante?.Id === estudianteId
            )

            if (existente) {
                console.log(
                    '🟡 Registro existente para estudiante:',
                    estudianteId,
                    existente
                )

                await sp.web.lists
                    .getByTitle('AsignadoA')
                    .items.getById(existente.Id)
                    .update({ idRolId: nuevoRolId })

                setAsignaciones((prev) =>
                    prev.map((a) =>
                        a.Id === existente.Id
                            ? { ...a, idRol: { Id: nuevoRolId } }
                            : a
                    )
                )
            } else {
                console.log(
                    '🔵 Creando nueva asignación para estudiante:',
                    estudianteId
                )

                const nuevo = await sp.web.lists
                    .getByTitle('AsignadoA')
                    .items.add({
                        idEstudianteId: estudianteId,
                        idRolId: nuevoRolId,
                    })

                setAsignaciones((prev) => [
                    ...prev,
                    {
                        Id: nuevo.data.Id,
                        idEstudiante: { Id: estudianteId },
                        idRol: { Id: nuevoRolId },
                    },
                ])
            }
        } catch (err) {
            console.error('❌ Error actualizando rol:', err)
        }
    }

    const estudiantesFiltrados = estudiantes.filter(
        (e) => e.usuario?.EMail?.toLowerCase() !== usuarioActual
    )

    return (
        <div className={styles.layout}>
            <Menu context={context} />
            <div className={styles.estudiantes}>
                <h2 className={styles.titulo}>Gestión de Roles</h2>
                {loading ? (
                    <Spinner label='Cargando estudiantes y roles...' />
                ) : (
                    <table className={styles.tabla}>
                        <thead>
                            <tr>
                                <th>Foto</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Rol</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estudiantesFiltrados.map((e) => {
                                const imagen = e.usuario?.Name
                                    ? `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(
                                          e.usuario.Name
                                      )}&size=S`
                                    : 'https://static.thenounproject.com/png/5034901-200.png'

                                const asignacion = asignaciones.find(
                                    (a) => a.idEstudiante?.Id === e.Id
                                )

                                if (asignacion) {
                                    console.log(
                                        '🧩 Asignación encontrada:',
                                        asignacion
                                    )
                                    const rolRelacionado = roles.find(
                                        (r) => r.Id === asignacion.idRol?.Id
                                    )
                                    if (rolRelacionado) {
                                        console.log(
                                            '✅ Rol vinculado:',
                                            rolRelacionado.nombreRol
                                        )
                                    }
                                } else {
                                    console.log(
                                        '🆕 No se encontró asignación para',
                                        e.usuario?.Title
                                    )
                                }

                                const rolAsignado = asignacion?.idRol?.Id ?? ''

                                return (
                                    <tr key={e.Id}>
                                        <td className={styles.fotoColumna}>
                                            <img
                                                src={imagen}
                                                alt={e.usuario?.Title}
                                                width='40'
                                                height='40'
                                            />
                                        </td>
                                        <td>{e.usuario?.Title}</td>
                                        <td>{e.usuario?.EMail}</td>
                                        <td>
                                            <Dropdown
                                                placeholder='Seleccionar rol...'
                                                selectedKey={rolAsignado}
                                                onChange={(_, option) =>
                                                    handleRolChange(
                                                        e.Id,
                                                        option?.key as number
                                                    )
                                                }
                                                options={[
                                                    {
                                                        key: '',
                                                        text: 'Seleccionar rol...',
                                                    },
                                                    ...roles.map((r) => ({
                                                        key: r.Id,
                                                        text: r.nombreRol,
                                                    })),
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default GestionDeRoles
