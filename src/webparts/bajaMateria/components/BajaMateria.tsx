// src/webparts/bajaMateria/components/BajaMateria.tsx
import * as React from 'react'
import type { IBajaMateriaProps } from './IBajaMateriaProps'
import styles from './BajaMateria.module.scss'
import { getSP } from '../../../pnpjsConfig'
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog'
import { DefaultButton, PrimaryButton, Spinner } from '@fluentui/react'

interface Materia {
    ID: number
    codMateria: string
    nombre: string
}

const BajaMateria: React.FC<IBajaMateriaProps> = ({ context }) => {
    const sp = getSP(context)

    const [materias, setMaterias] = React.useState<Materia[]>([])
    const [idSeleccionado, setIdSeleccionado] = React.useState<number | null>(
        null
    )
    const [mostrarModal, setMostrarModal] = React.useState(false)
    const [mensaje, setMensaje] = React.useState('')
    const [cargando, setCargando] = React.useState(false)

    React.useEffect(() => {
        const fetchMaterias = async (): Promise<void> => {
            try {
                const result: Materia[] = await sp.web.lists
                    .getByTitle('Materia')
                    .items.select('ID', 'codMateria', 'nombre')()
                setMaterias(result)
            } catch (error) {
                console.error('Error al cargar materias:', error)
            }
        }

        fetchMaterias().catch(console.error)
    }, [])

    const materiaSeleccionada = materias.find((m) => m.ID === idSeleccionado)

    const eliminarMateria = async (): Promise<void> => {
        if (!materiaSeleccionada) return

        setCargando(true)
        setMensaje('')

        try {
            const { ID, codMateria } = materiaSeleccionada

            // 1. Eliminar relaciones en MateriaCarrera
            const relaciones: { ID: number }[] = await sp.web.lists
                .getByTitle('MateriaCarrera')
                .items.filter(`CodMateria/codMateria eq '${codMateria}'`)
                .select('ID')()

            for (const rel of relaciones) {
                await sp.web.lists
                    .getByTitle('MateriaCarrera')
                    .items.getById(rel.ID)
                    .delete()
            }

            // 2. Eliminar correlativas donde esta materia es base
            const correlativas: { ID: number }[] = await sp.web.lists
                .getByTitle('Correlativa')
                .items.filter(`codMateriaId eq ${ID}`)
                .select('ID')()

            for (const corr of correlativas) {
                await sp.web.lists
                    .getByTitle('Correlativa')
                    .items.getById(corr.ID)
                    .delete()
            }

            // 3. Eliminar la materia
            await sp.web.lists.getByTitle('Materia').items.getById(ID).delete()

            setMensaje('✅ Materia eliminada correctamente.')
            setIdSeleccionado(null)

            const nuevasMaterias: Materia[] = await sp.web.lists
                .getByTitle('Materia')
                .items.select('ID', 'codMateria', 'nombre')()
            setMaterias(nuevasMaterias)
        } catch (error: unknown) {
            const mensajeError =
                error instanceof Error ? error.message : 'Error desconocido'
            console.error('Error al eliminar materia:', error)
            setMensaje(`❌ Error: ${mensajeError}`)
        } finally {
            setCargando(false)
            setMostrarModal(false)
        }
    }

    return (
        <section className={styles.bajaMateria}>
            <h3 className={styles.titulo}>Baja de Materia</h3>

            <label>Seleccionar materia a eliminar:</label>
            <select
                value={idSeleccionado ?? ''}
                onChange={(e) => {
                    setIdSeleccionado(Number(e.target.value))
                    setMensaje('')
                }}
            >
                <option value=''>Seleccione una materia</option>
                {materias.map((m) => (
                    <option key={m.ID} value={m.ID}>
                        {m.nombre} ({m.codMateria})
                    </option>
                ))}
            </select>

            {idSeleccionado && (
                <button
                    className={styles.botonEliminar}
                    onClick={() => setMostrarModal(true)}
                >
                    Eliminar materia
                </button>
            )}

            {mensaje && <p className={styles.texto}>{mensaje}</p>}
            {cargando && <Spinner label='Eliminando materia...' />}

            <Dialog
                hidden={!mostrarModal}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: 'Confirmar eliminación',
                    subText: `¿Está seguro de que desea eliminar la materia "${materiaSeleccionada?.nombre}" y todas sus relaciones? Esta acción no se puede deshacer.`,
                }}
                onDismiss={() => setMostrarModal(false)}
            >
                <DialogFooter>
                    <PrimaryButton
                        onClick={eliminarMateria}
                        text='Sí, eliminar'
                    />
                    <DefaultButton
                        onClick={() => setMostrarModal(false)}
                        text='Cancelar'
                    />
                </DialogFooter>
            </Dialog>
        </section>
    )
}

export default BajaMateria
