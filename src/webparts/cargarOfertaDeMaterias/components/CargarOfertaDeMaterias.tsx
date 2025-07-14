import * as React from 'react'
import { useState } from 'react'
import { PrimaryButton } from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarOfertaDeMateriasProps } from './ICargarOfertaDeMateriasProps'

interface RowData {
    codMateria: string
    codComision: string
    modalidad: string
    turno?: string
    dias?: string
    descripcion?: string
}

const CargarOfertaDeMaterias: React.FC<ICargarOfertaDeMateriasProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const [datos, setDatos] = useState<RowData[]>([])
    const [status, setStatus] = useState<string>('')

    const parseCSV = (text: string): void => {
        const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '')
        const resultado: RowData[] = []
        let materiaActual = ''

        for (const line of lines) {
            const columnas = line.split(';').map((c) => c.trim())
            if (columnas[0].toLowerCase().includes('código')) continue
            if (columnas[0] !== '') materiaActual = columnas[0]
            else columnas[0] = materiaActual

            const row: RowData = {
                codMateria: columnas[0] || '',
                codComision: columnas[2] || '',
                modalidad: columnas[5] || '',
                turno: columnas[3] || '',
                dias: columnas[4] || '',
                descripcion: columnas[7] || '',
            }

            if (row.codMateria && row.codComision) resultado.push(row)
        }

        setDatos(resultado)
    }

    const leerArchivo = async (file: File): Promise<void> => {
        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            parseCSV(text)
        }
        reader.onerror = () => {
            setStatus('Error al leer el archivo.')
        }
        reader.readAsText(file)
    }

    const handleFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ): void => {
        const file = event.target.files?.[0]
        if (file) {
            leerArchivo(file).catch((err) => {
                console.error('Error al leer archivo:', err)
                setStatus('Error al leer el archivo.')
            })
        }
    }

    const handleCargarOferta = async (): Promise<void> => {
        if (datos.length === 0) {
            setStatus('No hay datos para cargar.')
            return
        }

        setStatus('Cargando en SharePoint...')

        const comisionesInsertadas: Set<string> = new Set()
        const materiasFaltantes: Set<string> = new Set()
        let cargadas = 0

        for (const item of datos) {
            try {
                const materia = await sp.web.lists
                    .getByTitle('Materia')
                    .items.select('Id')
                    .filter(`codMateria eq '${item.codMateria}'`)
                    .top(1)()

                if (materia.length === 0) {
                    materiasFaltantes.add(item.codMateria)
                    continue
                }

                await sp.web.lists.getByTitle('OfertaDeMaterias').items.add({
                    codMateria: item.codMateria,
                    fechaDePublicacion: new Date(),
                    Cuatrimestre: 1,
                    codComision: item.codComision,
                    modalidad: item.modalidad,
                })
                cargadas++

                if (!comisionesInsertadas.has(item.codComision)) {
                    await sp.web.lists.getByTitle('Comision').items.add({
                        codComision: item.codComision,
                        diaSemana: item.dias || '',
                        turno: item.turno || '',
                        descripcion: item.descripcion || '',
                    })
                    comisionesInsertadas.add(item.codComision)
                }
            } catch (error) {
                console.error('Error al insertar en SharePoint:', error)
            }
        }

        if (materiasFaltantes.size > 0) {
            setStatus(
                `Carga completada parcialmente. Materias no encontradas: ${Array.from(
                    materiasFaltantes
                ).join(', ')}`
            )
        } else {
            setStatus(`Carga exitosa. Se insertaron ${cargadas} registros.`)
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Cargar Oferta de Materias</h2>

            <input type='file' accept='.csv' onChange={handleFileUpload} />
            <br />

            {datos.length > 0 && (
                <>
                    <h3>Vista previa</h3>
                    <table
                        style={{
                            width: '100%',
                            marginBottom: 20,
                            border: '1px solid gray',
                            borderCollapse: 'collapse',
                        }}
                    >
                        <thead>
                            <tr>
                                <th>codMateria</th>
                                <th>codComision</th>
                                <th>modalidad</th>
                                <th>turno</th>
                                <th>días</th>
                                <th>descripción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.map((d, i) => (
                                <tr key={i}>
                                    <td>{d.codMateria}</td>
                                    <td>{d.codComision}</td>
                                    <td>{d.modalidad}</td>
                                    <td>{d.turno}</td>
                                    <td>{d.dias}</td>
                                    <td>{d.descripcion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <PrimaryButton
                        text='Cargar Oferta'
                        onClick={handleCargarOferta}
                        style={{ marginBottom: '1rem' }}
                    />
                </>
            )}

            {status && <p>{status}</p>}
        </div>
    )
}

export default CargarOfertaDeMaterias
