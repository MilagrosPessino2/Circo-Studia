import * as React from 'react'
import { useEffect, useState } from 'react'
import { Spinner, TextField } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import styles from './Estudiantes.module.scss'
import type { IEstudiantesProps } from './IEstudiantesProps'
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

const Estudiantes: React.FC<IEstudiantesProps> = ({ context }): JSX.Element => {
    const sp = getSP(context)
    const navigate = useNavigate()
    const [estudiantes, setEstudiantes] = useState<IEstudiante[]>([])
    const [filtro, setFiltro] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(true)

    // 🔒 Control de acceso por rol
    useEffect(() => {
        const rol = localStorage.getItem('rol')
        if (rol !== '1') {
            navigate('/inicio') // Redirige si no es admin
        }
    }, [navigate])

    useEffect(() => {
        const cargarEstudiantes = async (): Promise<void> => {
            try {
                const items: IEstudiante[] = await sp.web.lists
                    .getByTitle('Estudiante')
                    .items.select(
                        'Id',
                        'usuario/Title',
                        'usuario/EMail',
                        'usuario/Name'
                    )
                    .expand('usuario')
                    .top(4999)()

                setEstudiantes(items)
            } catch (error) {
                console.error('❌ Error cargando estudiantes:', error)
            } finally {
                setLoading(false)
            }
        }

        cargarEstudiantes().catch(console.error)
    }, [sp])

    const estudiantesFiltrados = estudiantes.filter(
        (e) =>
            e.usuario?.Title?.toLowerCase().includes(filtro.toLowerCase()) ||
            e.usuario?.EMail?.toLowerCase().includes(filtro.toLowerCase())
    )

    return (
        <div className={styles.layout}>
            <Menu context={context} />
            <div className={styles.estudiantes}>
                <h2 className={styles.titulo}>Estudiantes</h2>
                <TextField
                    label='Buscar por nombre o email'
                    onChange={(_, value) => setFiltro(value || '')}
                />
                {loading ? (
                    <Spinner label='Cargando estudiantes...' />
                ) : (
                    <table className={styles.tabla}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Foto</th>
                                <th>Nombre</th>
                                <th>Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estudiantesFiltrados.map((e) => {
                                const imagen = e.usuario?.Name
                                    ? `/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(
                                          e.usuario.Name
                                      )}&size=S`
                                    : 'https://static.thenounproject.com/png/5034901-200.png'
                                return (
                                    <tr key={e.Id}>
                                        <td>{e.Id}</td>
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

export default Estudiantes
