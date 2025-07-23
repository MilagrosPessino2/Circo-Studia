import * as React from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSP } from '../../../pnpjsConfig'
import Menu from '../../menu/components/Menu'
import styles from './PerfilColega.module.scss'
import type { IPerfilColegaProps } from './IPerfilColegaProps'

interface IColega {
    ID: number
    emailPersonal?: string
    usuario: {
        Id: number
        Title: string
        Name: string
        EMail: string
    }
    carreraNombre: string
}

interface IMateriaCursando {
    nombre: string
    comision: string
    horario: string
}

const PerfilColega: React.FC<IPerfilColegaProps> = ({ context }) => {
    const { id } = useParams()
    const sp = getSP(context)

    const [colega, setColega] = useState<IColega | null>(null)
    const [materias, setMaterias] = useState<IMateriaCursando[]>([])

    const [Email, setEmail] = useState(false)

    useEffect(() => {
    const cargarPerfil = async (): Promise<void> => {
        if (!id) return

        // 1. Obtener datos del colega
        const estudiante = await sp.web.lists
            .getByTitle('Estudiante')
            .items.getById(Number(id))
            .select(
                'ID',
                'emailPersonal',
                'usuario/Id',
                'usuario/Title',
                'usuario/Name',
                'usuario/EMail'
            )
            .expand('usuario')()

        // 2. Obtener la carrera del colega
        const inscripciones = await sp.web.lists
            .getByTitle('Inscripto')
            .items.select('idEstudiante/ID', 'idCarreraId')
            .expand('idEstudiante')()

        const carreraRelacionada = inscripciones.find(
            (i) => i.idEstudiante?.ID === estudiante.ID
        )

        let carreraNombre = ''
        if (carreraRelacionada) {
            const carrera = await sp.web.lists
                .getByTitle('Carrera')
                .items.getById(carreraRelacionada.idCarreraId)
                .select('nombre')()
            carreraNombre = carrera.nombre
        }

        // 3. Obtener materias desde CursaEn
        const cursaEnItems = await sp.web.lists
            .getByTitle('CursaEn')
            .items
            .filter(`idEstudianteId eq ${estudiante.ID}`)
            .select('Id', 'idOferta/Id')
            .expand('idOferta')()

        const ofertaIds = cursaEnItems.map(item => item.idOferta?.Id).filter(id => id !== null)
        if (ofertaIds.length === 0) {
            setMaterias([])
            setColega({ ...estudiante, carreraNombre })
            return
        }

        const filterString = ofertaIds.map(id => `Id eq ${id}`).join(' or ')

        const ofertas = await sp.web.lists
            .getByTitle('OfertaDeMaterias')
            .items
            .filter(filterString)
            .select(
                'Id',
                'codMateria/nombre',
                'codComision/codComision',
                'codComision/descripcion'
            )
            .expand('codMateria', 'codComision')()

        // 4. Construir las materias
        const materiasFinal: IMateriaCursando[] = ofertas.map((oferta) => ({
            nombre: oferta.codMateria?.nombre ?? '-',
            comision: oferta.codComision?.codComision ?? '-',
            horario: oferta.codComision?.descripcion ?? '-'
        }))

        setColega({ ...estudiante, carreraNombre })
        setMaterias(materiasFinal)
    }

    cargarPerfil().catch(console.error)
}, [context, id])


    if (!colega) return <p>Cargando perfil...</p>

    return (
        <div className={styles.container}>
            <Menu context={context} />

            <div className={styles.perfil}>
                <img
                    className={styles.foto}
                    src={`/_layouts/15/userphoto.aspx?accountname=${encodeURIComponent(
                        colega.usuario?.Name
                    )}&size=L`}
                    alt='Foto del colega'
                />
                <h2 className={styles.nombre}>{colega.usuario?.Title}</h2>
                <p className={styles.carrera}>{colega.carreraNombre}</p>
                <button className={styles.boton} onClick={() => setEmail(true)}>
                    Contactar
                </button>

                {Email && (
                    <div className={styles.popup}>
                        <p>Podés contactar a este usuario por email:</p>
                        <strong>
                            {colega.emailPersonal || colega.usuario?.EMail}
                        </strong>
                        {colega.emailPersonal && (
                            <>
                                <br />
                                <strong>{colega.usuario?.EMail}</strong>
                            </>
                        )}
                        <br />
                        <button onClick={() => setEmail(false)}>Cerrar</button>
                    </div>
                )}

                {materias.length === 0 ? (
                    <p className={styles.sinMaterias}>
                        Este usuario no está inscripto a ninguna materia
                        actualmente.
                    </p>
                ) : (
                    <>
                        <h3 className={styles.subtitulo}>
                            Materias cursando actualmente
                        </h3>
                        <table className={styles.tabla}>
                            <thead>
                                <tr>
                                    <th>Materia</th>
                                    <th>Comisión</th>
                                    <th>Horario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materias.map((m, index) => (
                                    <tr key={index}>
                                        <td>{m.nombre}</td>
                                        <td>{m.comision}</td>
                                        <td>{m.horario}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    )
}

export default PerfilColega
