import * as React from 'react'
import { useState, useEffect } from 'react'
import {
    PrimaryButton,
    DefaultButton,
    TextField,
    Dropdown,
    IDropdownOption,
} from '@fluentui/react'
import { getSP } from '../../../pnpjsConfig'
import styles from './GestionarComision.module.scss'
import { IGestionarComisionProps } from './IGestionarComisionProps'
import Menu from '../../menu/components/Menu'
import { useNavigate } from 'react-router-dom'

const dias: IDropdownOption[] = [
    { key: 'LUNES', text: 'Lunes' },
    { key: 'MARTES', text: 'Martes' },
    { key: 'MIERCOLES', text: 'Miércoles' },
    { key: 'JUEVES', text: 'Jueves' },
    { key: 'VIERNES', text: 'Viernes' },
    { key: 'SABADO', text: 'Sábado' },
    { key: 'LUNES Y MIERCOLES', text: 'Lunes y Miércoles' },
    { key: 'MARTES Y VIERNES', text: 'Martes y Viernes' },
    { key: 'MARTES Y JUEVES', text: 'Martes y Jueves' },
    { key: 'LUNES Y SABADO', text: 'Lunes y Sábado' },
    { key: 'JUEVES Y SABADO', text: 'Jueves y Sábado' },
    { key: 'LUNES Y MARTES', text: 'Lunes y Martes' },
    { key: 'MIERCOLES Y SABADO', text: 'Miércoles y Sábado' },
    { key: 'MARTES Y MIERCOLES', text: 'Martes y Miércoles' },
    { key: 'MARTES Y SABADO', text: 'Martes y Sábado' },
]

const turnos: IDropdownOption[] = [
    { key: 'M', text: 'Mañana' },
    { key: 'T', text: 'Tarde' },
    { key: 'N', text: 'Noche' },
]

const GestionarComision: React.FC<IGestionarComisionProps> = ({ context }) => {
    const sp = getSP(context)
    const navigate = useNavigate()

    const [codComision, setCodComision] = useState('')
    const [diaSemana, setDiaSemana] = useState('')
    const [turno, setTurno] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [status, setStatus] = useState('')

    // Redirigir si no es admin
    useEffect(() => {
        const rol = localStorage.getItem('rol')
        if (rol !== '1') {
            navigate('/inicio')
        }
    }, [navigate])

    // Alta de comisión
    const crearComision = async (): Promise<void> => {
        if (!codComision || !diaSemana || !turno || !descripcion) {
            setStatus('Completa todos los campos.')
            return
        }

        try {
            await sp.web.lists.getByTitle('Comision').items.add({
                codComision,
                diaSemana,
                turno,
                descripcion,
            })
            setStatus('✅ Comisión creada con éxito.')
        } catch (error) {
            console.error('❌ Error al crear comisión:', error)
            setStatus('Error al crear la comisión.')
        }
    }

    // Baja de comisión
    const eliminarComision = async (): Promise<void> => {
        try {
            const result = await sp.web.lists
                .getByTitle('Comision')
                .items.filter(`codComision eq '${codComision}'`)
                .top(1)()

            if (result.length === 0) {
                setStatus('⚠️ Comisión no encontrada.')
                return
            }

            await sp.web.lists
                .getByTitle('Comision')
                .items.getById(result[0].Id)
                .recycle()
            setStatus('🗑️ Comisión eliminada con éxito.')
        } catch (error) {
            console.error('❌ Error al eliminar comisión:', error)
            setStatus('Error al eliminar la comisión.')
        }
    }

    return (
        <div className={styles.layout}>
            <Menu context={context} />
            <section className={styles.container}>
                <h2>Gestionar Comisiones</h2>
                <TextField
                    label='Código de Comisión'
                    value={codComision}
                    onChange={(_, val) => setCodComision(val || '')}
                />
                <TextField
                    label='Descripción'
                    value={descripcion}
                    onChange={(_, val) => setDescripcion(val || '')}
                />
                <Dropdown
                    label='Día de la semana'
                    options={dias}
                    selectedKey={diaSemana}
                    onChange={(_, opt) => setDiaSemana(opt?.key as string)}
                />
                <Dropdown
                    label='Turno'
                    options={turnos}
                    selectedKey={turno}
                    onChange={(_, opt) => setTurno(opt?.key as string)}
                />

                <div style={{ marginTop: 20 }}>
                    <PrimaryButton
                        text='Crear Comisión'
                        onClick={crearComision}
                        style={{ marginRight: 10 }}
                    />
                    <DefaultButton
                        text='Eliminar Comisión'
                        onClick={eliminarComision}
                    />
                </div>
                {status && <p style={{ marginTop: 10 }}>{status}</p>}
            </section>
        </div>
    )
}

export default GestionarComision
