import * as React from 'react'
import { useState } from 'react'
import { PrimaryButton, Dropdown, IDropdownOption } from '@fluentui/react'
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

const cuatrimestres: IDropdownOption[] = [
    { key: 1, text: 'Primer cuatrimestre' },
    { key: 2, text: 'Segundo cuatrimestre' },
    { key: 3, text: 'Cuatrimestre de verano' },
]

const CargarOfertaDeMaterias: React.FC<ICargarOfertaDeMateriasProps> = ({
    context,
}) => {
    const sp = getSP(context)
    const [datos, setDatos] = useState<RowData[]>([])
    const [status, setStatus] = useState<string>('')
    const [cuatrimestre, setCuatrimestre] = useState<number>(1)

    const parseCSV = (text: string): void => {
        const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '')
        const resultado: RowData[] = []
        let materiaActual = ''

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i]
            const columnas = line.split(';').map((c) => c.trim())

            if (columnas[0] !== '') materiaActual = columnas[0]
            else columnas[0] = materiaActual

            const row: RowData = {
                codMateria: columnas[0] || '', // Código
                descripcion: columnas[1] || '', // Descripción
                codComision: columnas[2] || '', // Cod. Comisión
                turno: columnas[3] || '', // Turno
                dias: columnas[4] || '', // Días
                modalidad: columnas[5] || '', // Modalidad
            }

            if (
                row.codMateria &&
                row.codComision &&
                row.codComision.toLowerCase() !== 'no ofertada'
            ) {
                resultado.push(row)
            }
        }

        console.log('CSV parseado:', resultado)
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
        reader.readAsText(file, 'utf-8')
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
        let cargadas = 0
        const errores: Set<string> = new Set()

        for (const item of datos) {
            try {
                console.log(
                    `🔄 Procesando ${item.codMateria} / ${item.codComision}`
                )

                // 🔎 Buscar materia
                const materia = await sp.web.lists
                    .getByTitle('Materia')
                    .items.filter(`codMateria eq '${item.codMateria}'`)
                    .top(1)()

                if (materia.length === 0) {
                    console.warn('⚠️ Materia no encontrada:', item.codMateria)
                    errores.add(`${item.codMateria} / ${item.codComision}`)
                    continue
                }

                // 🔎 Buscar comisión
                const comision = await sp.web.lists
                    .getByTitle('Comision')
                    .items.filter(`codComision eq '${item.codComision}'`)
                    .top(1)()

                if (comision.length === 0) {
                    console.warn('⚠️ Comisión no encontrada:', item.codComision)
                    errores.add(`${item.codMateria} / ${item.codComision}`)
                    continue
                }

                // 🔁 Verificar si ya existe oferta
                const ofertaExistente = await sp.web.lists
                    .getByTitle('OfertaDeMaterias')
                    .items.select('Id')
                    .filter(
                        `codMateriaId eq ${materia[0].Id} and codComisionId eq ${comision[0].Id} and Cuatrimestre eq ${cuatrimestre}`
                    )
                    .top(1)()

                console.log('📌 Oferta existente:', ofertaExistente)

                if (ofertaExistente.length > 0) {
                    await sp.web.lists
                        .getByTitle('OfertaDeMaterias')
                        .items.getById(ofertaExistente[0].Id)
                        .update({
                            fechaDePublicacion: new Date().toISOString(),
                            modalidad: item.modalidad,
                        })
                    console.log('📝 Oferta actualizada.')
                } else {
                    await sp.web.lists
                        .getByTitle('OfertaDeMaterias')
                        .items.add({
                            codMateriaId: materia[0].Id,
                            codComisionId: comision[0].Id,
                            fechaDePublicacion: new Date().toISOString(),
                            Cuatrimestre: cuatrimestre.toString(),
                            modalidad: item.modalidad,
                        })
                    console.log('🆕 Oferta insertada.')
                }

                cargadas++
            } catch (error) {
                console.error(
                    `❌ Error al insertar ${item.codMateria} / ${item.codComision}:`,
                    error
                )
                errores.add(`${item.codMateria} / ${item.codComision}`)
            }
        }

        if (errores.size > 0) {
            setStatus(
                `Carga parcial. Errores en: ${Array.from(errores).join(', ')}`
            )
        } else {
            setStatus(
                `Carga exitosa. Registros insertados o actualizados: ${cargadas}`
            )
        }
    }

    return (
        <div style={{ padding: 20 }}>
            <h2>Cargar Oferta de Materias</h2>
            <input type='file' accept='.csv' onChange={handleFileUpload} />
            <p>test 2</p>
            <Dropdown
                label='Seleccionar cuatrimestre'
                options={cuatrimestres}
                selectedKey={cuatrimestre}
                onChange={(_, option) => setCuatrimestre(option?.key as number)}
                styles={{
                    dropdown: { width: 300, marginTop: 10, marginBottom: 10 },
                }}
            />

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
