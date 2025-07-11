import * as React from 'react'
import { useEffect, useState } from 'react'
import { Checkbox, Spinner } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ISeleccionarCarreraProps } from '../../seleccionarCarrera/components/ISeleccionarCarreraProps'
import { useNavigate } from 'react-router-dom'
import styles from './SeleccionarMateriasEnCurso.module.scss'

interface IOfertaDeMaterias {
  Id: number
  codMateria?: {
    Id: number
    codMateria?: string
    nombre?: string
  }
  codComision?: {
    Id: number
    descripcion?: string
    codComision: string
  }
  fechaDePublicacion: string
  Cuatrimestre: number
  modalidad: string
  codigoCarrera?: string
  nombreCarrera?: string
  checked?: boolean
}

interface IMateriaCarreraExpandida {
  Id: number
  codCarrera: {
    Id: number
    codigoCarrera: string
  }
  CodMateria: {
    Id: number
    codMateria: string
  }
}

interface ICarrera {
  Id: number
  codigoCarrera: string
  nombre: string
}

interface IInscripto {
  Id: number
  idCarrera: {
    Id: number
    codigoCarrera: string
  }
}

interface IEstudiante {
  ID: number
  usuario: {
    Id: number
  }
}

interface IEstadoItem {
  codMateria: {
    ID: number
  }
}

interface ICorrelativaItem {
  codMateria: {
    ID: number
  }
  codMateriaRequerida: {
    ID: number
  }
}

const runAsync = (fn: () => Promise<void>): void => {
  fn().catch(console.error)
}

const SeleccionarMateriasEnCurso: React.FC<ISeleccionarCarreraProps> = ({ context }) => {
  const sp = getSP(context)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ofertas, setOfertas] = useState<IOfertaDeMaterias[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [tipoMensaje, setTipoMensaje] = useState<'exito' | 'error' | null>(null)

  useEffect(() => {
    const cargarDatos = async (): Promise<void> => {
      try {
        const user = await sp.web.currentUser()
        const currentUserId = user.Id

        const estudianteItems: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id').expand('usuario')()

        const match = estudianteItems.find(e => e.usuario?.Id === currentUserId)
        if (!match) {
          setError('Estudiante no encontrado')
          setLoading(false)
          return
        }

        const estudianteID = match.ID

        const inscriptoItems: IInscripto[] = await sp.web.lists.getByTitle('Inscripto')
          .items.filter(`idEstudianteId eq ${estudianteID}`)
          .select('idCarrera/Id', 'idCarrera/codigoCarrera').expand('idCarrera')()

        const idCarrera = inscriptoItems[0]?.idCarrera?.Id
        const codigoCarrera = inscriptoItems[0]?.idCarrera?.codigoCarrera
        setSelectedCarrera(codigoCarrera ?? 'Sin inscripción')

        const materiasEstado: IEstadoItem[] = await sp.web.lists.getByTitle('Estado')
          .items.filter(`idEstudianteId eq ${estudianteID}`)
          .select('codMateria/ID').expand('codMateria')()

        const idsEstado = materiasEstado.map(m => m.codMateria.ID)

        // 📌 Traer correlatividades
        const correlativasItems: ICorrelativaItem[] = await sp.web.lists.getByTitle('Correlativa')
          .items.select('codMateria/ID', 'codMateriaRequerida/ID')
          .expand('codMateria', 'codMateriaRequerida')()

        const mapaCorrelativas: Record<number, number[]> = {}
        correlativasItems.forEach(item => {
          const materiaID = item.codMateria?.ID
          const correlativaID = item.codMateriaRequerida?.ID
          if (materiaID && correlativaID) {
            if (!mapaCorrelativas[materiaID]) mapaCorrelativas[materiaID] = []
            mapaCorrelativas[materiaID].push(correlativaID)
          }
        })

        const ofertaItems: IOfertaDeMaterias[] = await sp.web.lists.getByTitle('OfertaDeMaterias')
          .items.select(
            'Id',
            'codMateria/Id',
            'codMateria/codMateria',
            'codMateria/nombre',
            'codComision/Id',
            'codComision/codComision',
            'codComision/descripcion',
            'fechaDePublicacion',
            'Cuatrimestre',
            'modalidad'
          ).expand('codMateria', 'codComision')()

        const materiaCarreraItems: IMateriaCarreraExpandida[] = await sp.web.lists.getByTitle('MateriaCarrera')
          .items.select(
            'Id',
            'CodMateria/Id',
            'CodMateria/codMateria',
            'codCarrera/Id',
            'codCarrera/codigoCarrera'
          ).expand('CodMateria', 'codCarrera')()

        const carreraItems: ICarrera[] = await sp.web.lists.getByTitle('Carrera')
          .items.select('Id', 'codigoCarrera', 'nombre')()

        // 📌 Filtrar materias en curso (cuyas correlativas ya fueron aprobadas)
        const ofertasFiltradas = ofertaItems
          .filter(oferta => {
            const codOferta = oferta.codMateria?.codMateria?.trim()
            const idMateria = oferta.codMateria?.Id

            const pertenece = materiaCarreraItems.some(
              mc => mc.CodMateria?.codMateria?.trim() === codOferta &&
                    mc.codCarrera?.Id === idCarrera
            )
            if (!pertenece || !idMateria) return false

            if (idsEstado.includes(idMateria)) return false

            const correlativas = mapaCorrelativas[idMateria] || []
            return correlativas.every(correlativaId => idsEstado.includes(correlativaId))
          })
          .map(oferta => {
            const carrera = carreraItems.find(c => c.Id === idCarrera)
            return {
              ...oferta,
              codigoCarrera: carrera?.codigoCarrera ?? 'Sin código',
              nombreCarrera: carrera?.nombre ?? 'Sin carrera',
              checked: false,
            }
          })

        setOfertas(ofertasFiltradas)
      } catch (err) {
        console.error('❌ Error cargando datos:', err)
        setError((err as { message?: string }).message ?? 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    runAsync(cargarDatos)
  }, [context])

  const handleCheckboxChange = (id: number | undefined): void => {
    if (id === undefined) return
    setOfertas(prev =>
      prev.map(o =>
        o.codMateria?.Id === id ? { ...o, checked: !o.checked } : o
      )
    )
  }

  const handleGuardar = async (): Promise<void> => {
    try {
      setMensaje(null)

      const user = await sp.web.currentUser()
      const currentUserId = user.Id

      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante')
        .items.select('ID', 'usuario/Id').expand('usuario')()

      const estudiante = estudiantes.find(e => e.usuario?.Id === currentUserId)
      if (!estudiante) {
        setMensaje('Estudiante no encontrado.')
        setTipoMensaje('error')
        return
      }

      const materiasSeleccionadas = ofertas.filter(o => o.checked && o.codMateria?.Id)

      await Promise.all(
        materiasSeleccionadas.map(o =>
          sp.web.lists.getByTitle('Estado').items.add({
            idEstudianteId: estudiante.ID,
            codMateriaId: o.codMateria!.Id,
            condicion: 'C',
          })
        )
      )

      setMensaje(`${materiasSeleccionadas.length} materia(s) guardadas como cursando.`)
      setTipoMensaje('exito')
      navigate('/inicio')
    } catch (err) {
      console.error('❌ Error al guardar materias en curso:', err)
      setMensaje('Error al guardar materias.')
      setTipoMensaje('error')
    }
  }

  const handleVolverConBorrado = async (): Promise<void> => {
    try {
      const user = await sp.web.currentUser()
      const currentUserId = user.Id

      const estudiantes: IEstudiante[] = await sp.web.lists.getByTitle('Estudiante')
        .items.select('ID', 'usuario/Id').expand('usuario')()

      const estudiante = estudiantes.find(e => e.usuario?.Id === currentUserId)
      if (!estudiante) return

      const regularizadas = await sp.web.lists.getByTitle('Estado')
        .items.filter(`idEstudianteId eq ${estudiante.ID} and condicion eq 'R'`)
        .select('Id')()

      await Promise.all(
        regularizadas.map(item =>
          sp.web.lists.getByTitle('Estado').items.getById(item.Id).recycle()
        )
      )

      navigate('/preset/cargar-regularizada')
    } catch (err) {
      console.error('❌ Error al eliminar materias regularizadas:', err)
    }
  }

  return loading ? (
    <Spinner label="Cargando datos..." />
  ) : error ? (
    <div>Error: {error}</div>
  ) : (
    <div style={{ padding: '20px' }}>
      <h2 className={styles.titulo}>Seleccionar Materias en Curso</h2>
      <p>
        Carrera del estudiante: <strong>{selectedCarrera}</strong>
      </p>

      {mensaje && (
        <p style={{ color: tipoMensaje === 'exito' ? 'green' : 'red', marginTop: 10 }}>
          {mensaje}
        </p>
      )}

      {ofertas.length > 0 ? (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Materia</th>
              <th>Comisión</th>
              <th>Seleccionar</th>
            </tr>
          </thead>
          <tbody>
            {ofertas.map(o => (
              <tr key={o.Id}>
                <td>[{o.codMateria?.codMateria}] {o.codMateria?.nombre}</td>
                <td>{o.codComision?.codComision}: {o.codComision?.descripcion}</td>
                <td>
                  <Checkbox
                    checked={o.checked}
                    onChange={() => handleCheckboxChange(o.codMateria?.Id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay materias disponibles para cursar.</p>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className={styles.btnAccion} onClick={() => runAsync(handleVolverConBorrado)}>
          Volver
        </button>
        <button className={styles.btnAccion} onClick={handleGuardar}>
          Guardar
        </button>
      </div>
    </div>
  )
}

export default SeleccionarMateriasEnCurso
