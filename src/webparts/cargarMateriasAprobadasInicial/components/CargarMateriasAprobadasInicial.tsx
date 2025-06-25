import * as React from 'react'
import { useEffect, useState, useContext } from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriasAprobadasInicialProps } from './ICargarMateriasAprobadasInicialProps'
import { useNavigate } from 'react-router-dom'
import { UserPresetContext } from '../../../app'
import styles from './CargarMateriasAprobadasInicial.module.scss'

interface IMateria {
  id: number
  nombre: string
  checked: boolean
}

interface IEstudiante {
  ID: number
  usuario: {
    Id: number
  }
}

interface IInscripcion {
  ID: number
  idCarreraId: number
}

interface IEstadoItem {
  codMateria: {
    ID: number
  }
}

const runAsync = (fn: () => Promise<void>): void => {
  fn().catch(console.error)
}

const CargarMateriasAprobadasInicial: React.FC<ICargarMateriasAprobadasInicialProps> = ({ context }) => {
  const sp = getSP(context)
  const navigate = useNavigate()
  const { setIsPreset } = useContext(UserPresetContext)

  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('')
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materias, setMaterias] = useState<IMateria[]>([])
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const fetchCarrera = async () => {
      try {
        const user = await sp.web.currentUser()
        const currentUserId = user.Id

        const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
        const coincidencia = estudiantes.find((item) => item.usuario?.Id === currentUserId)
        if (!coincidencia) return

        const estudianteID = coincidencia.ID

        const inscripciones: IInscripcion[] = await sp.web.lists.getByTitle('Inscripto').items.filter(`idEstudianteId eq ${estudianteID}`).select('ID', 'idCarreraId')()
        if (inscripciones.length === 0 || !inscripciones[0].idCarreraId) return

        const idCarrera = inscripciones[0].idCarreraId
        setCarreraId(idCarrera)

        const carreraItem = await sp.web.lists.getByTitle('Carrera').items.getById(idCarrera).select('nombre')()
        setCarreraSeleccionada(carreraItem.nombre)
      } catch (error) {
        console.error('Error al obtener la carrera:', error)
      }
    }

    runAsync(fetchCarrera)
  }, [])

  useEffect(() => {
    const fetchMaterias = async () => {
      if (!carreraId) return

      try {
        const items = await sp.web.lists.getByTitle('MateriaCarrera').items.filter(`codCarreraId eq ${carreraId}`).select('ID', 'CodMateria/ID', 'CodMateria/nombre').expand('CodMateria')()
        const materiasFormateadas: IMateria[] = items.filter(item => item.CodMateria).map(item => ({
          id: item.CodMateria.ID,
          nombre: item.CodMateria.nombre,
          checked: false
        }))
        setMaterias(materiasFormateadas)
      } catch (error) {
        console.error('Error al obtener materias:', error)
      }
    }

    runAsync(fetchMaterias)
  }, [carreraId])

  const handleCheckboxChange = (id: number): void => {
    setMaterias(prev => prev.map(m => m.id === id ? { ...m, checked: !m.checked } : m))
  }

  const handleVolver = async (): Promise<void> => {
    try {
      setEliminando(true)
      const user = await sp.web.currentUser()
      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
      const coincidencia = estudiantes.find(item => item.usuario?.Id === user.Id)
      if (!coincidencia) return

      const estudianteID = coincidencia.ID
      const inscriptos = await sp.web.lists.getByTitle('Inscripto').items.filter(`idEstudianteId eq ${estudianteID}`).select('Id')()
      await Promise.all(inscriptos.map(item => sp.web.lists.getByTitle('Inscripto').items.getById(item.Id).recycle()))

      setIsPreset(false)
      localStorage.setItem('userPreset', 'false')
      navigate('/preset/select-carrera')
    } catch (error) {
      console.error('Error al eliminar inscripción:', error)
    } finally {
      setEliminando(false)
    }
  }

  const handleGuardarMaterias = async (): Promise<void> => {
    try {
      setMensaje(null)
      const user = await sp.web.currentUser()
      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
      const coincidencia = estudiantes.find(item => item.usuario?.Id === user.Id)
      if (!coincidencia) return

      const estudianteID = coincidencia.ID
      const materiasSeleccionadas = materias.filter(m => m.checked)

      const materiasExistentes: IEstadoItem[] = await sp.web.lists.getByTitle('Estado').items.filter(`idEstudianteId eq ${estudianteID}`).select('codMateria/ID').expand('codMateria')()
      const codigosExistentes = materiasExistentes.map(m => m.codMateria.ID)

      const nuevasMaterias = materiasSeleccionadas.filter(m => !codigosExistentes.includes(m.id))

      await Promise.all(nuevasMaterias.map(materia =>
        sp.web.lists.getByTitle('Estado').items.add({
          idEstudianteId: estudianteID,
          codMateriaId: materia.id,
          condicion: 'A',
        })
      ))

      setMensaje(`${nuevasMaterias.length} materia(s) guardadas correctamente.`)
      setTipoMensaje('exito')
      navigate('/preset/cargar-regularizada')
    } catch (error) {
      console.error('Error al guardar materias:', error)
      setMensaje('Hubo un error al guardar las materias.')
      setTipoMensaje('error')
    }
  }

  // const renderTitulo = (): string => {
  const nombre = carreraSeleccionada.trim().toLowerCase()
  console.log('Nombre de la carrera:', nombre)
  //   if (nombre.includes('web')) return 'Materias de la Tecnicatura Web'
  //   if (nombre.includes('ingenier')) return 'Materias de la Ingeniería Informática'
  //   return 'Materias disponibles'
  // }

  return (
    <div style={{ padding: 24 }}>

      <h2 className={styles.titulo}>Seleccionar Materias Aprobadas</h2>

      {mensaje && (
        <p style={{ color: tipoMensaje === 'exito' ? 'green' : 'red', marginTop: 10 }}>
          {mensaje}
        </p>
      )}

      {materias.length > 0 ? (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Materia</th>
              <th style={{ textAlign: 'left' }}>Seleccionar</th>
            </tr>
          </thead>
          <tbody>
            {materias.map(m => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.checked}
                    onChange={() => handleCheckboxChange(m.id)}
                  />
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay materias para esta carrera.</p>
      )}

      {eliminando ? (
        <Spinner label="Eliminando inscripción..." />
      ) : (
        <div style={{ marginTop: 20 }}>
          <button className={styles.btnAccion} onClick={handleVolver}>Volver</button>
          <button className={styles.btnAccion} onClick={handleGuardarMaterias}>Continuar</button>
        </div>
      )}
    </div>
  )
}

export default CargarMateriasAprobadasInicial
