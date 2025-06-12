import * as React from 'react'
import { useEffect, useState } from 'react'
import { IInicioProps } from './IInicioProps'
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http'

const InicioEstudiante: React.FC<IInicioProps> = ({ context }) => {
  const [nombre, setNombre] = useState<string>('Estudiante')
  const [horario] = useState<string[][]>([
    ['08:00 a 12 hs', '', '', '', '', '', 'Tecnología de Redes'],
    ['14:00 a 18 hs', '', '', '', '', '', ''],
    ['19:00 a 23 hs', '', '', '', 'Base de Datos II', '', '']
  ])

  const coincidencias = [
    { nombre: 'Maria María', materia: 'Tecnología de Redes' },
    { nombre: 'Antonio López', materia: 'Tecnología de Redes' },
    { nombre: 'Sol Vallejos', materia: 'Tecnología de Redes' },
  ]

  useEffect(() => {
  const fetchNombre = async () => {
    const response: SPHttpClientResponse = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/currentuser`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          'accept': 'application/json;odata=verbose'
        }
      }
    )
    const data = await response.json()
    setNombre(data.d.Title)
  }

  void fetchNombre()
}, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ background: '#eee', padding: 16 }}>
        <h1>Circo Studia</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <button>Inicio</button>
          <button>Oferta</button>
          <button>Mis materias</button>
          <button>Coincidencias</button>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2>
            Bienvenido "{nombre}", actualmente estás cursando
          </h2>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#999' }} />
        </div>

        {/* Tabla de horarios */}
        <table style={{ width: '100%', border: '1px solid #aaa', textAlign: 'center', marginBottom: 40 }}>
          <thead style={{ background: '#ddd' }}>
            <tr>
              <th>Horario</th>
              <th>Lunes</th>
              <th>Martes</th>
              <th>Miércoles</th>
              <th>Jueves</th>
              <th>Viernes</th>
              <th>Sábado</th>
            </tr>
          </thead>
          <tbody>
            {horario.map((fila, i) => (
              <tr key={i}>
                {fila.map((celda, j) => (
                  <td key={j} style={{ border: '1px solid #ccc', padding: 8 }}>{celda}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Coincidencias */}
        <section>
          <h3 style={{ marginBottom: 8 }}>Algunas coincidencias</h3>
          <p style={{ fontWeight: 'bold' }}>Tecnología de Redes</p>
          <ul style={{ marginBottom: 16 }}>
            {coincidencias.map((c, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#666' }}></span>
                {c.nombre}
              </li>
            ))}
          </ul>
          <button style={{ padding: '8px 16px', background: '#bbb', border: 'none', borderRadius: 4 }}>Ver coincidencias</button>
        </section>
      </main>
    </div>
  )
}

export default InicioEstudiante
