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
  disabled: boolean
  autoMarkedBy?: number[]

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

// 🔁 Función para obtener todas las correlativas requeridas recursivamente
const getCorrelativasRequeridas = (id: number, mapa: Record<number, number[]>): Set<number> => {
  const visitados = new Set<number>()
  const stack = [id]

  while (stack.length > 0) {
    const actual = stack.pop()!
    const requisitos = mapa[actual] || []

    requisitos.forEach(req => {
      if (!visitados.has(req)) {
        visitados.add(req)
        stack.push(req)
      }
    })
  }

  return visitados
}

const CargarMateriasAprobadasInicial: React.FC<ICargarMateriasAprobadasInicialProps> = ({ context }) => {
  const sp = getSP(context)
  const navigate = useNavigate()
  const { setIsPreset } = useContext(UserPresetContext)

  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materias, setMaterias] = useState<IMateria[]>([])
  const [correlatividades, setCorrelatividades] = useState<Record<number, number[]>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const fetchCarrera = async () : Promise<void> => {
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
      } catch (error) {
        console.error('Error al obtener la carrera:', error)
      }
    }

    runAsync(fetchCarrera)
  }, [])

  useEffect(() => {
    const fetchMateriasYCorrelativas = async () : Promise<void> => {
      if (!carreraId) return

      try {
        // Materias de la carrera
        const items = await sp.web.lists.getByTitle('MateriaCarrera').items
          .filter(`codCarreraId eq ${carreraId}`)
          .select('ID', 'CodMateria/ID', 'CodMateria/nombre')
          .expand('CodMateria')()

        const materiasFormateadas: IMateria[] = items.filter(item => item.CodMateria).map(item => ({
        id: item.CodMateria.ID,
        nombre: item.CodMateria.nombre,
        checked: false,
        disabled: false,
        autoMarkedBy: []
      }))
        setMaterias(materiasFormateadas)

        // Correlativas de esas materias
        const correlativasItems = await sp.web.lists.getByTitle('Correlativa').items
        .select('codMateria/ID', 'codMateriaRequerida/ID')
        .expand('codMateria', 'codMateriaRequerida')()


        const mapa: Record<number, number[]> = {}

      correlativasItems.forEach(item => {
        const materiaID = item.codMateria?.ID
        const correlativaID = item.codMateriaRequerida?.ID

        if (materiaID && correlativaID) {
          if (!mapa[materiaID]) mapa[materiaID] = []
          mapa[materiaID].push(correlativaID)
        }
      })

      setCorrelatividades(mapa)
      console.log('Mapa de correlatividades:', mapa)

      } catch (error) {
        console.error('Error al obtener materias o correlativas:', error)
      }
    }

    runAsync(fetchMateriasYCorrelativas)
  }, [carreraId])

 const handleCheckboxChange = (id: number): void => {
  setMaterias(prev => {
    const seleccionada = prev.find(m => m.id === id)
    if (!seleccionada) return prev

    // Si está deshabilitada (es una correlativa requerida), no permitir cambios
    if (seleccionada.disabled) return prev

    const correlativas = Array.from(getCorrelativasRequeridas(id, correlatividades))

  if (!seleccionada.checked) {
  return prev.map(m => {
    if (m.id === id) {
      return { ...m, checked: true }
    } else if (correlativas.includes(m.id)) {
      const nuevasMarcas = [...(m.autoMarkedBy || []), id]
      return {
        ...m,
        checked: true,
        disabled: true,
        autoMarkedBy: nuevasMarcas
      }
    }
    return m
  })
}
 else {
  return prev.map(m => {
    if (m.id === id) {
      return { ...m, checked: false }
    } else if (m.autoMarkedBy?.includes(id)) {
      const nuevasMarcas = m.autoMarkedBy.filter(x => x !== id)
      return {
        ...m,
        checked: nuevasMarcas.length > 0,
        disabled: nuevasMarcas.length > 0,
        autoMarkedBy: nuevasMarcas
      }
    }
    return m
  })
}

  })
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
                    disabled={m.disabled}
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
