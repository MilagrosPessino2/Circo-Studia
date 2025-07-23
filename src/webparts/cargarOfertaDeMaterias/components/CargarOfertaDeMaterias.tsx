import * as React from 'react'
import { useState, useRef } from 'react'
import {
    PrimaryButton,
    Dropdown,
    IDropdownOption,
    DefaultButton,
    Dialog,
    DialogFooter,
    DialogType,
} from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import { ICargarOfertaDeMateriasProps } from './ICargarOfertaDeMateriasProps'
import Menu from '../../menu/components/Menu'
import styles from './CargarOfertaDeMaterias.module.scss'

interface IMateria {
    Id: number
    codMateria: string
    nombre?: string
    anio?: number
}

interface IComision {
    Id: number
    codComision: string
    turno?: string
    diaSemana?: string
    descripcion?: string
}

interface IOfertaExistente {
    Id: number
    codMateriaId: number
    codComisionId: number
    modalidad: string
}

// Tipo de fila cargada desde el CSV
interface RowData {
    codMateria: string
    codComision: string
    modalidad: string
    turno?: string
    dias?: string
    descripcion?: string
}

// Opciones de cuatrimestre
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
    const [mostrarDialogo, setMostrarDialogo] = useState(false)
    const [eliminando, setEliminando] = useState(false)

    // Refs para guardar materias y comisiones
    const materiasRef = useRef<Map<string, number>>(new Map())
    const comisionesRef = useRef<Map<string, number>>(new Map())

    // Eliminar toda la oferta del cuatrimestre seleccionado
    const vaciarOfertaCuatrimestre = async (): Promise<void> => {
        setEliminando(true)
        setStatus('Eliminando registros del cuatrimestre...')
        try {
            const itemsAEliminar = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.filter(`Cuatrimestre eq '${cuatrimestre}'`)
                .top(4999)()

            await Promise.all(
                itemsAEliminar.map((item) =>
                    sp.web.lists
                        .getByTitle('OfertaDeMaterias')
                        .items.getById(item.Id)
                        .recycle()
                )
            )

            setStatus(`🗑️ Se vació la oferta del cuatrimestre ${cuatrimestre}.`)
        } catch (error) {
            console.error('❌ Error al eliminar registros:', error)
            setStatus('Error al eliminar registros del cuatrimestre.')
        } finally {
            setEliminando(false)
            setMostrarDialogo(false)
        }
    }

    // Leer archivo CSV y parsear datos válidos
    const handleFileUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ): Promise<void> => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setStatus('Procesando archivo CSV...')

            // Cargar todas las materias y comisiones de SharePoint
            const [materias, comisiones] = await Promise.all([
                sp.web.lists.getByTitle('Materia').items.top(4999)(),
                sp.web.lists.getByTitle('Comision').items.top(4999)(),
            ])

            // Guardar codigos y sus IDs
            materiasRef.current = new Map(
                (materias as IMateria[]).map((m) => [m.codMateria, m.Id])
            )

            comisionesRef.current = new Map(
                (comisiones as IComision[]).map((c) => [c.codComision, c.Id])
            )

            const text = await file.text()
            const lines = text
                .split(/\r\n|\n/)
                .filter((line) => line.trim() !== '')
            const resultado: RowData[] = []
            let materiaActual = ''

            // Procesar cada línea del CSV
            for (let i = 1; i < lines.length; i++) {
                const columnas = lines[i].split(';').map((c) => c.trim())
                if (columnas[0] !== '') materiaActual = columnas[0]
                else columnas[0] = materiaActual

                const row: RowData = {
                    codMateria: columnas[0] || '',
                    descripcion: columnas[1] || '',
                    codComision: columnas[2] || '',
                    turno: columnas[3] || '',
                    dias: columnas[4] || '',
                    modalidad: columnas[5] || '',
                }

                // Validar existencia local de materia y comisión
                if (
                    row.codMateria &&
                    row.codComision &&
                    row.codComision.toLowerCase() !== 'no ofertada' &&
                    materiasRef.current.has(row.codMateria) &&
                    comisionesRef.current.has(row.codComision)
                ) {
                    resultado.push(row)
                } else {
                    console.warn('Registro inválido:', row)
                }
            }

            setDatos(resultado)
            setStatus(
                `Archivo procesado. ${resultado.length} registros válidos para cargar.`
            )
        } catch (error) {
            console.error('❌ Error al procesar el archivo:', error)
            setStatus('Error al procesar el archivo.')
        }
    }

    // Cargar datos válidos en SharePoint
    const handleCargarOferta = async (): Promise<void> => {
        if (datos.length === 0) {
            setStatus('No hay datos para cargar.')
            return
        }

        setStatus('Cargando nueva oferta en SharePoint...')
        const errores: Set<string> = new Set()
        let cargadas = 0

        // Obtener registros ya existentes para este cuatrimestre
        let ofertasExistentes: IOfertaExistente[] = []
        try {
            ofertasExistentes = await sp.web.lists
                .getByTitle('OfertaDeMaterias')
                .items.filter(`Cuatrimestre eq '${cuatrimestre}'`)
                .select('Id', 'codMateriaId', 'codComisionId', 'modalidad')
                .top(4999)()
        } catch (error) {
            console.error('❌ Error al obtener ofertas existentes:', error)
            setStatus('Error verificando duplicados en la lista.')
            return
        }

        // Mapa de duplicados existentes
        const existentesMap = new Map<string, number>()
        for (const oferta of ofertasExistentes) {
            const key = `${oferta.codMateriaId}-${oferta.codComisionId}-${oferta.modalidad}`
            existentesMap.set(key, oferta.Id)
        }

        // Insertar o actualizar en paralelo
        // Insertar o actualizar en serie usando Promise.all
        await Promise.all(
            datos.map(async (item) => {
                const materiaId = materiasRef.current.get(item.codMateria)
                const comisionId = comisionesRef.current.get(item.codComision)
                if (
                    materiaId === undefined ||
                    comisionId === undefined ||
                    isNaN(materiaId) ||
                    isNaN(comisionId)
                ) {
                    console.warn(
                        '❌ Registro inválido (lookup no resuelto):',
                        item
                    )
                    errores.add(`${item.codMateria} / ${item.codComision}`)
                    return
                }

                const key = `${materiaId}-${comisionId}-${item.modalidad}`
                const existenteId = existentesMap.get(key)

                try {
                    if (existenteId) {
                        // Pisar registro existente con todos los campos
                        await sp.web.lists
                            .getByTitle('OfertaDeMaterias')
                            .items.getById(existenteId)
                            .update({
                                codMateriaId: materiaId,
                                codComisionId: comisionId,
                                modalidad: item.modalidad,
                                Cuatrimestre: cuatrimestre.toString(),
                                fechaDePublicacion: new Date().toISOString(),
                            })
                        console.log('📝 Oferta actualizada:', item)
                    } else {
                        // Insertar nuevo registro
                        await sp.web.lists
                            .getByTitle('OfertaDeMaterias')
                            .items.add({
                                codMateriaId: materiaId,
                                codComisionId: comisionId,
                                modalidad: item.modalidad,
                                Cuatrimestre: cuatrimestre.toString(),
                                fechaDePublicacion: new Date().toISOString(),
                            })
                        cargadas++
                        console.log('🆕 Oferta insertada:', item)
                    }
                } catch (e: unknown) {
                    console.error('❌ Error al procesar registro:', item, e)
                    errores.add(`${item.codMateria} / ${item.codComision}`)
                }
            })
        )

        // Mostrar resultado final
        if (errores.size > 0) {
            setStatus(
                `Carga parcial. Errores en: ${Array.from(errores).join(', ')}`
            )
        } else {
            setStatus(`Carga exitosa. Registros insertados: ${cargadas}`)
        }
    }

    // Render visual
    return (
        <div className={styles.layout}>
            <Menu context={context} />
            <section className={styles.container}>
                <div style={{ padding: 20 }}>
                    <h2>Cargar Oferta de Materias</h2>
                    <input
                        type='file'
                        accept='.csv'
                        onChange={handleFileUpload}
                    />
                    <Dropdown
                        label='Seleccionar cuatrimestre'
                        options={cuatrimestres}
                        selectedKey={cuatrimestre}
                        onChange={(_, option) =>
                            setCuatrimestre(option?.key as number)
                        }
                        styles={{
                            dropdown: {
                                width: 300,
                                marginTop: 10,
                                marginBottom: 10,
                            },
                        }}
                    />

                    {/* Vista previa */}
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

                    {/* Botón para vaciar oferta */}
                    <DefaultButton
                        text='Vaciar oferta para cuatrimestre'
                        onClick={() => setMostrarDialogo(true)}
                        style={{ marginBottom: '1rem', marginLeft: '1rem' }}
                        disabled={eliminando}
                    />

                    {/* Diálogo de confirmación */}
                    <Dialog
                        hidden={!mostrarDialogo}
                        onDismiss={() => setMostrarDialogo(false)}
                        dialogContentProps={{
                            type: DialogType.normal,
                            title: 'Confirmar eliminación',
                            subText: `¿Estás seguro que querés eliminar TODA la oferta del cuatrimestre ${cuatrimestre}? Esta acción no se puede deshacer.`,
                        }}
                    >
                        <DialogFooter>
                            <PrimaryButton
                                onClick={vaciarOfertaCuatrimestre}
                                text='Sí, vaciar oferta'
                                disabled={eliminando}
                            />
                            <DefaultButton
                                onClick={() => setMostrarDialogo(false)}
                                text='Cancelar'
                                disabled={eliminando}
                            />
                        </DialogFooter>
                    </Dialog>

                    {status && <p>{status}</p>}
                </div>
            </section>
        </div>
    )
}

export default CargarOfertaDeMaterias
