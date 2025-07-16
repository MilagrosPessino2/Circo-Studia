import * as React from 'react'
import { useEffect, useState,useContext} from 'react'
import { Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriasAprobadasInicialProps } from './ICargarMateriasAprobadasInicialProps'
import { useNavigate } from 'react-router-dom'
import styles from './CargarMateriasAprobadasInicial.module.scss'
import { UserPresetContext } from '../../../app'

interface IMateria {
  id: number
  nombre: string
  condicion: string
  disabled: boolean
  autoMarkedBy: number[] 
}

interface IEstudiante {
  ID: number
  usuario: { Id: number }
}

interface IInscripcion {
  ID: number
  idCarreraId: number
}

interface IEstadoItem {
  codMateria: { ID: number }
}

const getCorrelativasRequeridasRec = (
  id: number,
  mapa: Record<number, number[]>,
  visitados = new Set<number>()
): number[] => {
  if (visitados.has(id)) return []
  visitados.add(id)

  const requeridas = mapa[id] || []
  let resultado = [...requeridas]

  for (const req of requeridas) {
    resultado = resultado.concat(getCorrelativasRequeridasRec(req, mapa, visitados))
  }

  return Array.from(new Set(resultado))
}

const CargarMateriasAprobadasInicial: React.FC<ICargarMateriasAprobadasInicialProps> = ({ context }) => {
  const sp = getSP(context)
  const navigate = useNavigate()
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materias, setMaterias] = useState<IMateria[]>([])
  const [correlatividades, setCorrelatividades] = useState<Record<number, number[]>>({})
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const { setIsPreset } = useContext(UserPresetContext)

  // Obtener carrera
  useEffect(() => {
    const run = async () => {
      const user = await sp.web.currentUser()
      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
      const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id)
      if (!estudiante) return

      const inscripciones: IInscripcion[] = await sp.web.lists.getByTitle('Inscripto').items
        .filter(`idEstudianteId eq ${estudiante.ID}`).select('ID', 'idCarreraId')()
      setCarreraId(inscripciones[0]?.idCarreraId || null)
    }

    run().catch(console.error)
  }, [])

  // Obtener materias y correlativas
  useEffect(() => {
    if (!carreraId) return
    const run = async () => {
      const materiasRaw = await sp.web.lists.getByTitle('MateriaCarrera').items
        .filter(`codCarreraId eq ${carreraId}`)
        .select('CodMateria/ID', 'CodMateria/nombre')
        .expand('CodMateria')()

      const materias: IMateria[] = materiasRaw.map(item => ({
        id: item.CodMateria.ID,
        nombre: item.CodMateria.nombre,
        condicion: '',
        disabled: false,
        autoMarkedBy: []
      }))

      setMaterias(materias)

      const correlativasRaw = await sp.web.lists.getByTitle('Correlativa').items
        .select('codMateria/ID', 'codMateriaRequerida/ID')
        .expand('codMateria', 'codMateriaRequerida')()

      const mapa: Record<number, number[]> = {}
      correlativasRaw.forEach(c => {
        const m = c.codMateria?.ID
        const r = c.codMateriaRequerida?.ID
        if (m && r) {
          if (!mapa[m]) mapa[m] = []
          mapa[m].push(r)
        }
      })

      setCorrelatividades(mapa)
    }

    run().catch(console.error)
  }, [carreraId])

  const handleCondicionChange = (id: number, valor: string): void => {
    setMaterias(prev => {
      const actual = prev.find(m => m.id === id)
      if (!actual) return prev

      const nuevas = [...prev]

      if (valor === 'A') {
        const correlativas = getCorrelativasRequeridasRec(id, correlatividades)

        for (const corrId of correlativas) {
          const m = nuevas.find(m => m.id === corrId)
          if (m && m.condicion !== 'A') {
            m.condicion = 'A'
            m.disabled = true
            m.autoMarkedBy.push(id)
          }
        }
      } else if (actual.condicion === 'A') {
        // si antes estaba aprobada y ahora no
        const correlativas = getCorrelativasRequeridasRec(id, correlatividades)

        for (const corrId of correlativas) {
          const m = nuevas.find(m => m.id === corrId)
          if (m && m.autoMarkedBy.includes(id)) {
            m.autoMarkedBy = m.autoMarkedBy.filter(x => x !== id)
            if (m.autoMarkedBy.length === 0) {
              m.condicion = ''
              m.disabled = false
            }
          }
        }
      }

      // Actualizamos la materia principal
      const index = nuevas.findIndex(m => m.id === id)
      nuevas[index] = { ...actual, condicion: valor }

      return nuevas
    })
  }

  const handleVolver = async (): Promise<void> => {
  try {
    setEliminando(true)
    const user = await sp.web.currentUser()
    const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
    const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id)
    if (!estudiante) return

    const inscripciones = await sp.web.lists.getByTitle('Inscripto').items
      .filter(`idEstudianteId eq ${estudiante.ID}`).select('Id')()

    await Promise.all(inscripciones.map(item =>
      sp.web.lists.getByTitle('Inscripto').items.getById(item.Id).recycle()
    ))

    setIsPreset(false)
    localStorage.setItem('userPreset', 'false')
    navigate('/preset/select-carrera')
  } catch (error) {
    console.error('Error al eliminar inscripción:', error)
  } finally {
    setEliminando(false)
  }
}

  const handleGuardar = async () => {
    try {
      const user = await sp.web.currentUser()
      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante').items.select('ID', 'usuario/Id').expand('usuario')()
      const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id)
      if (!estudiante) return

      const estados: IEstadoItem[] = await sp.web.lists.getByTitle('Estado').items
        .filter(`idEstudianteId eq ${estudiante.ID}`).select('codMateria/ID').expand('codMateria')()

      const yaGuardadas = estados.map(e => e.codMateria.ID)

      const nuevas = materias.filter(m => m.condicion && !yaGuardadas.includes(m.id))

      await Promise.all(nuevas.map(m =>
        sp.web.lists.getByTitle('Estado').items.add({
          idEstudianteId: estudiante.ID,
          codMateriaId: m.id,
          condicion: m.condicion
        })
      ))

      setMensaje(`${nuevas.length} materia(s) guardadas.`)
      setTipoMensaje('exito')
      navigate('/preset/select-materias-en-curso')
    } catch (err) {
      console.error(err)
      setMensaje('Error al guardar materias.')
      setTipoMensaje('error')
    }
  }

  

  return (
    <div style={{ padding: 24 }}>
      <h2 className={styles.titulo}>Seleccionar Materias Aprobadas y regularizadas </h2>

      {mensaje && (
        <p style={{ color: tipoMensaje === 'exito' ? 'green' : 'red', marginTop: 10 }}>
          {mensaje}
        </p>
      )}

      {materias.length > 0 ? (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Materia</th>
              <th>Condición</th>
            </tr>
          </thead>
          <tbody>
            {materias.map(m => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>
                  <select
                    value={m.condicion}
                    disabled={m.disabled}
                    onChange={e => handleCondicionChange(m.id, e.target.value)}
                  >
                    <option value="">-</option>
                    <option value="A">Aprobada</option>
                    <option value="R">Regularizada</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Spinner label="Cargando materias..." />
      )}

     {eliminando ? (
        <Spinner label="Eliminando inscripción..." />
      ) : (
        <div style={{ marginTop: 20 }}>
          <button className={styles.btnAccion} onClick={handleVolver}>Volver</button>
          <button className={styles.btnAccion} onClick={handleGuardar}>Continuar</button>
        </div>
      )}

    </div>
  )
}

export default CargarMateriasAprobadasInicial
