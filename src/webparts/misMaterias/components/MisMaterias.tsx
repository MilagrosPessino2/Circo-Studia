import * as React from 'react'
import Menu from '../../menu/components/Menu'
import type { IMisMateriasProps } from './IMisMateriasProps'
import { getSP } from '../../../pnpjsConfig'
import { useEffect, useState } from 'react'
import { Spinner } from '@fluentui/react'

const MisMaterias: React.FC<IMisMateriasProps> = ({ context }) => {
    const sp = getSP(context)
  const [estadoFiltro, setEstadoFiltro] = useState<'C' | 'A' | 'R'>('C')
  const [loading, setLoading] = useState(true)
  const [materias, setMaterias] = useState<any[]>([])

  useEffect(() => {
    const fetchMaterias = async (): Promise<void> => {
      setLoading(true)
      try {
        const user = await sp.web.currentUser()
        const estudiantes = await sp.web.lists
          .getByTitle('Estudiante')
          .items.select('ID', 'usuario/Id')
          .expand('usuario')()

        const estudiante = estudiantes.find(e => e.usuario?.Id === user.Id)
        if (!estudiante) return

        const estado = await sp.web.lists
          .getByTitle('Estado')
          .items
          .filter(`idEstudianteId eq ${estudiante.ID} and condicion eq '${estadoFiltro}'`)
          .select('codMateria/ID', 'codMateria/codMateria', 'codMateria/nombre', 'condicion')
          .expand('codMateria')()

        const oferta = await sp.web.lists
          .getByTitle('OfertaDeMaterias')
          .items.select('codMateria/Id', 'codComision/Id', 'modalidad')
          .expand('codMateria', 'codComision')()

        const comisiones = await sp.web.lists
          .getByTitle('Comision')
          .items.select('codComision', 'diaSemana', 'turno', 'descripcion')()

        const datos = estado.map((e: any) => {
          const ofertaRelacionada = oferta.find((o: any) => o.codMateria?.Id === e.codMateria?.ID)
          const com = comisiones.find(c => c.codComision === ofertaRelacionada?.codComision?.Id)

          return {
            codigo: e.codMateria?.codMateria,
            nombre: e.codMateria?.nombre,
            comision: com?.codComision || '-',
            horario: com?.descripcion || '-',
            aula: 'Virtual',
            modalidad: ofertaRelacionada?.modalidad || '-',
            estado: estadoFiltro === 'C' ? 'En curso' : estadoFiltro === 'A' ? 'Aprobada' : 'En final'
          }
        })

        setMaterias(datos)
      } catch (error) {
        console.error('Error cargando materias:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchMaterias()
  }, [estadoFiltro])

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                minHeight: '100vh',
            }}
        >
            <Menu />

        <div>
      <aside style={{ background: '', padding: 16 }}>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <button onClick={() => setEstadoFiltro('C')}>Materias en curso</button>
          <button onClick={() => setEstadoFiltro('A')}>Materias aprobadas</button>
          <button onClick={() => setEstadoFiltro('R')}>Materias en final</button>
        </nav>
      </aside>

      <main style={{ padding: 24 }}>
        <h2>Mis materias</h2>

        {loading ? (
          <Spinner label='Cargando materias...' />
        ) : (
          <table style={{ width: '100%', border: '1px solid #aaa', textAlign: 'center', marginTop: 16 }}>
            <thead style={{ background: '#ddd' }}>
              <tr>
                <th>Código</th>
                <th>Materia</th>
                <th>Comisión</th>
                <th>Horario</th>
                <th>Aula</th>
                <th>Modalidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {materias.map((m, i) => (
                <tr key={i}>
                  <td>{m.codigo}</td>
                  <td>{m.nombre}</td>
                  <td>{m.comision}</td>
                  <td>{m.horario}</td>
                  <td>{m.aula}</td>
                  <td>{m.modalidad}</td>
                  <td>{m.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button style={{ marginTop: 16, padding: '8px 16px' }}>Añadir</button>
      </main>
    </div>
        </div>
        
    )
}

export default MisMaterias
