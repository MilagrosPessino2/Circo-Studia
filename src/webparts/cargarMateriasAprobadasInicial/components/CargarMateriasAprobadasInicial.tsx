import * as React from 'react'
import { useEffect, useState } from 'react'
import { PrimaryButton, Spinner, Checkbox } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarMateriasAprobadasInicialProps } from './ICargarMateriasAprobadasInicialProps'
import SeleccionarCarrera from '../../seleccionarCarrera/components/SeleccionarCarrera'

const CargarMateriasAprobadasInicial: React.FC<ICargarMateriasAprobadasInicialProps> = ({
  context,
  description,
  isDarkTheme,
  environmentMessage,
  hasTeamsContext,
  userDisplayName,
}) => {
  const sp = getSP(context)

  const [volverASeleccionarCarrera, setVolverASeleccionarCarrera] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('')
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [materias, setMaterias] = useState<{ id: number; nombre: string; checked: boolean }[]>([])

  useEffect(() => {
    const fetchCarrera = async () => {
      try {
        const user = await sp.web.currentUser()
        const currentUserId = user.Id

        const estudianteItems = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id')
          .expand('usuario')()

        const coincidencia = estudianteItems.find(item => item.usuario?.Id === currentUserId)

        if (!coincidencia) {
          console.warn('Estudiante no encontrado')
          return
        }

        const estudianteID = coincidencia.ID

        const inscripciones = await sp.web.lists
          .getByTitle('Inscripto')
          .items.filter(`idEstudianteId eq ${estudianteID}`)
          .select('ID', 'idCarreraId')()

        if (inscripciones.length === 0 || !inscripciones[0].idCarreraId) {
          console.warn('No se encontró inscripción con carrera')
          return
        }

        const idCarrera = inscripciones[0].idCarreraId
        setCarreraId(idCarrera)

        const carreraItem = await sp.web.lists
          .getByTitle('Carrera')
          .items.getById(idCarrera)
          .select('nombre', 'codigoCarrera')()

        const nombreCarrera = carreraItem.nombre
        setCarreraSeleccionada(nombreCarrera)

      } catch (error) {
        console.error('Error al obtener la carrera del estudiante:', error)
      }
    }

    void fetchCarrera()
  }, [])

  useEffect(() => {
    const fetchMaterias = async () => {
      if (!carreraId) return

      try {
        console.log('Obteniendo materias para carrera ID:', carreraId)

        const items = await sp.web.lists
          .getByTitle('MateriaCarrera')
          .items
          .filter(`codCarreraId eq ${carreraId}`)
          .select('ID', 'CodMateria/ID', 'CodMateria/nombre')
          .expand('CodMateria')()

        const materiasFormateadas = items
          .filter((item: any) => item.CodMateria)
          .map((item: any) => ({
            id: item.CodMateria.ID,
            nombre: item.CodMateria.nombre,
            checked: false,
          }))

        setMaterias(materiasFormateadas)
      } catch (error) {
        console.error('Error al obtener materias desde CarreraMateria:', error)
      }
    }

    void fetchMaterias()
  }, [carreraId])

  const handleCheckboxChange = (id: number) => {
    setMaterias(prev =>
      prev.map(m => (m.id === id ? { ...m, checked: !m.checked } : m))
    )
  }

  const handleVolver = async (): Promise<void> => {
    try {
      setEliminando(true)
      const user = await sp.web.currentUser()
      const currentUserId = user.Id

      const estudianteItems = await sp.web.lists
        .getByTitle('Estudiante')
        .items.select('ID', 'usuario/Id')
        .expand('usuario')()

      const coincidencia = estudianteItems.find(
        item => item.usuario?.Id === currentUserId
      )

      if (!coincidencia) {
        console.error('Estudiante no encontrado')
        return
      }

      const estudianteID = coincidencia.ID

      const inscriptos = await sp.web.lists
        .getByTitle('Inscripto')
        .items.filter(`idEstudianteId eq ${estudianteID}`)
        .select('Id')()

      await Promise.all(
        inscriptos.map(item =>
          sp.web.lists.getByTitle('Inscripto').items.getById(item.Id).recycle()
        )
      )

      let retries = 0
      let inscriptosRestantes = [{}]
      while (inscriptosRestantes.length > 0 && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500))
        inscriptosRestantes = await sp.web.lists
          .getByTitle('Inscripto')
          .items.filter(`idEstudianteId eq ${estudianteID}`)
          .select('Id')()
        retries++
      }

      setVolverASeleccionarCarrera(true)
    } catch (error) {
      console.error('Error al volver y eliminar inscripción:', error)
    } finally {
      setEliminando(false)
    }
  }

  const renderTitulo = () => {
    const nombreCarrera = typeof carreraSeleccionada === 'string'
      ? carreraSeleccionada.trim().toLowerCase()
      : ''

    switch (nombreCarrera) {
      case 'tecnicatura en desarrollo web':
        return 'Materias de la Tecnicatura Web'
      case 'ingenieria informatica':
      case 'ingeniería informática':
        return 'Materias de la Ingeniería Informática'
      default:
        return 'No hay materias'
    }
  }

  if (volverASeleccionarCarrera) {
    return (
      <SeleccionarCarrera
        context={context}
        description={description}
        isDarkTheme={isDarkTheme}
        environmentMessage={environmentMessage}
        hasTeamsContext={hasTeamsContext}
        userDisplayName={userDisplayName}
      />
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {eliminando ? (
        <Spinner label="Eliminando inscripción..." />
      ) : (
        <PrimaryButton text="Volver" onClick={handleVolver} />
      )}

      <h2>{renderTitulo()}</h2>

      {materias.length > 0 ? (
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
          {materias.map(materia => (
            <Checkbox
              key={materia.id}
              label={materia.nombre}
              checked={materia.checked}
              onChange={() => handleCheckboxChange(materia.id)}
            />
          ))}
        </div>
      ) : (
        <p>No hay materias para esta carrera.</p>
      )}
    </div>
  )
}

export default CargarMateriasAprobadasInicial
